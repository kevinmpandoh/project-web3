FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NODE_ENV=production
ENV PORT=2567
EXPOSE 2567
CMD ["npm", "run", "start"]
