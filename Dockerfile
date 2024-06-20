FROM node:18

WORKDIR /usr/src/app

RUN apt-get update && \
    apt-get install -y redis-server

RUN apt-get update && apt-get install -y git

RUN git clone https://github.com/alexisNorthcoders/clipboard.git .

RUN mkdir -p ./uploads

RUN mkdir -p ./DB

RUN npm install

RUN npm run createDB

EXPOSE 4321
CMD ["bash", "-c", "service redis-server start && npm start"]