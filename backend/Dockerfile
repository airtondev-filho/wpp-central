FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node src/db/seed.js && node src/index.js"]
