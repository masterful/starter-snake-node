FROM    node:12-alpine

ENV     WORKDIR /snek
WORKDIR $WORKDIR
CMD     npm start

COPY    package.json package-lock.json ./

RUN     npm install

COPY    . ./
