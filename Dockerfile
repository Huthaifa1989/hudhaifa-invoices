FROM node:20-alpine

WORKDIR /usr/src/app

# ثبّت فقط الإنتاج
COPY package*.json ./
RUN npm ci --omit=dev

# انسخ السورس
COPY . .

# لا تنسخ .env أبداً داخل الصورة
# ENV تدخل من Cloud Run وقت النشر

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]
