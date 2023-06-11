# poeapi

## Usage
```bash
npm install
npm install -g ts-node
ts-node index.ts init "my cookie" "my channel"
ts-node index.ts
```
如果没有nodejs环境：
```bash
docker build -t poeapi .
docker run -p 3000:3000 -e COOKIE= -e CNANNEL= --name poeapi poeapi
```
my cookie: `...`
my channel: `poe-...`

## Test
```bash
curl 'http://localhost:3000/v1/chat/completions' \
-X POST \
-H 'Content-Type: application/json' \
--data-raw '{"stream":true,"model":"Sage","messages":[{"role":"user","content":"你好"}]}'
```
## Todo
- [ ] model change support
- [ ] [chat-next-web](https://github.com/Yidadaa/ChatGPT-Next-Web) support