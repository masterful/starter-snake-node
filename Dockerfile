FROM    node:12-alpine

ENV     WORKDIR /snek
WORKDIR $WORKDIR

COPY    package.json package-lock.json ./

RUN     adduser -D snek \
    &&  chown snek:snek .

USER    snek
RUN     npm install
COPY    . ./

CMD     npm start
