FROM node

USER node

ADD --chown=node:node . /app/
WORKDIR /app/
RUN npm install --only=prod

CMD npm start
