FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install -g ts-node  
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "ts-node ./index.ts init p-b=${COOKIE} ${CHANNEL} && ts-node ./index.ts"]