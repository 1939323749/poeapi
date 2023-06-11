import { POESettings, QuerySender } from "./poe_http";
import { POESocketManager, MessageAdded, AuthorEnum, StateEnum } from "./poe_socket";
import express from 'express';

export class POEClient {
    query_sender: QuerySender
    socket_manager: POESocketManager
    now_text: string = ""
    answer_complete: boolean = false
    app: express
    res: any
    stream: boolean = false

    constructor(poe_settings: POESettings) {
        this.query_sender = new QuerySender()
        this.socket_manager = new POESocketManager(poe_settings, this.message_handler.bind(this))
    }

    message_handler(message: MessageAdded) {
        // console.log(message)
        if (message.author === AuthorEnum.human) {
            this.human_message_handler(message)
        } else {
            this.bot_message_handler(message)
        }
    }

    human_message_handler(message: MessageAdded) {
    }

    set_answer_complete() {
        this.answer_complete = true
        this.now_text = ""
    }

    bot_message_handler(message: MessageAdded) {
        const new_chars = message.text.slice(this.now_text.length);
        if (new_chars && !this.answer_complete) {
            this.now_text = message.text;
            if (this.stream) {
                if (!this.res.headersSent) {
                    this.res.setHeader('Content-Type', 'text/event-stream');
                    this.res.setHeader('Cache-Control', 'no-cache');
                    this.res.setHeader('Connection', 'keep-alive');

                    // Send initial stream message
                    const initialResponse = {
                        id: "chatcmpl-7M5yZ8MUFmSOLDWKx5arnnHyitfvw",
                        object: "chat.completion.chunk",
                        created: Math.floor(Date.now() / 1000),
                        model: "gpt-3.5-turbo-0301",
                        choices: [{
                            delta: {
                                role: "assistant"
                            },
                            index: 0,
                            finish_reason: null
                        }]
                    };
                    this.res.write('data: ' + JSON.stringify(initialResponse) + '\n');
                }

                const response = {
                    id: "chatcmpl-7M4WcbwqMNTVI88Rdy4NUP9MGffR9",
                    object: "chat.completion.chunk",
                    created: Date.now() / 1000,
                    model: "gpt-3.5-turbo-0301",
                    choices: [{
                        delta: {
                            content: new_chars
                        },
                        index: 0,
                        finish_reason: null
                    }]
                };
                this.res.write('data: ' + JSON.stringify(response) + '\n\n');
            }
        }
        if (message.state === StateEnum.complete && !this.answer_complete) {
            if (this.stream) {
              const response = {
                id: "chatcmpl-7M4WcbwqMNTVI88Rdy4NUP9MGffR9",
                object: "chat.completion.chunk",
                created: Date.now() / 1000,
                model: "gpt-3.5-turbo-0301",
                choices: [{
                  delta: {},
                  index: 0,
                  finish_reason: "stop"
                }]
              };
              this.res.write('data: ' + JSON.stringify(response) + '\n\n');
          
              const doneResponse = 'data: [DONE]\n\n';
              this.res.write(doneResponse);
          
              this.res.end();
            }
            console.log("Answer:", this.now_text)
            this.set_answer_complete();
          }
    }


    async start() {
        this.socket_manager.message_handler = this.message_handler.bind(this)
        this.socket_manager.start()
        this.app = express()
        this.app.use(express.json());

        this.app.get('/v1/models', (req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              "object": "list",
              "data": [
                {
                  "id": "gpt-3.5-turbo-0301",
                  "object": "model",
                  "created": 1677649963,
                  "owned_by": "openai",
                  "permission": [
                    {
                      "id": "modelperm-uk0JzgymvAJhyN6bMm1GHMop",
                      "object": "model_permission",
                      "created": 1685049951,
                      "allow_create_engine": false,
                      "allow_sampling": true,
                      "allow_logprobs": true,
                      "allow_search_indices": false,
                      "allow_view": true,
                      "allow_fine_tuning": false,
                      "organization": "*",
                      "group": null,
                      "is_blocking": false
                    }
                  ],
                  "root": "gpt-3.5-turbo-0301",
                  "parent": null
                }
              ]
            }));
          });

        this.app.post('/v1/chat/completions', async (req, res) => {
            // 从请求体中提取 model 和 messages
            this.stream = req.body.stream
            const model = req.body.model;
            const messages = req.body.messages

            // 检查 model 和 messages 是否存在
            if (!model || !messages) {
                res.status(400).send('Model and messages fields are required in the request body.');
                return;
            }

            // 从 messages 中提取 content
            var input = messages[0].content;
            if (messages.length > 1) input = messages[1].content
            if (!input) {
                res.status(400).send('Content field is required in the messages object.');
                return;
            }

            try {

                await this.sendInputAndGetAnswer(input, res);

            } catch (error) {
                res.status(500).send('An error occurred while processing the request.');
            }
        });

        this.app.listen(3000, () => console.log('Listening on port 3000'));
        process.on('SIGINT', this.exit.bind(this));
    }
    async stdin_handler(data: Buffer) {
        const query = data.toString().trim()
        if (query) {
            await this.send_query(query)
            this.answer_complete = false
        }
    }

    exit() {
        this.stop()
        process.exit()
    }

    stop() {
        this.socket_manager.stop()
    }

    async send_query(query: string) {
        return await this.query_sender.send_query(query)
    }

    async sendInputAndGetAnswer(input: string, res: any) {
        this.res = res;
        this.answer_complete = false; // Reset the answer_complete flag
        console.log('Sending query:', input,"\n"); // Debug message
        try {
            await this.send_query(input);
        } catch (error) {
            console.log('Error while sending query:', error); // Debug message
            this.res.status(500).send('An error occurred while processing the request.');
            this.res = null;
        }
    }
}