FROM node:current-alpine

USER node

ADD --chown=node:node . /app/
WORKDIR /app/
RUN npm ci --only=prod

CMD npm start
