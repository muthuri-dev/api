FROM node:24-alpine
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

COPY . .
RUN npm run build
RUN npm prune --production

EXPOSE 3000

CMD ["node", "dist/main.js"]
