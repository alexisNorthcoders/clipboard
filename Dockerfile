FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN mkdir -p /app/DB /app/uploads
VOLUME ["/app/DB"]

ENV NODE_ENV=production
EXPOSE 4500

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "listen.js"]