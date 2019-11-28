FROM    node:12-alpine

ENV     WORKDIR /snek
WORKDIR $WORKDIR

COPY    package.json package-lock.json ./

RUN     npm install \
    &&  adduser -D snek

COPY    . ./
RUN     chown snek:snek .

USER    snek
CMD     npm start
