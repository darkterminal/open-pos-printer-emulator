FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache bash curl

COPY package*.json ./
RUN if [ -f package.json ]; then npm install; fi

COPY . .

EXPOSE 3001 9100
CMD ["npm", "run", "dev"]
