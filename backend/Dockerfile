# MansaRent — backend API (Express + Prisma). Needs DATABASE_URL at runtime.
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
ENV PORT=4000
EXPOSE 4000
# Create tables on start (matches the documented `npx prisma db push` flow), then serve.
CMD ["sh", "-c", "npx prisma db push && node src/index.js"]
