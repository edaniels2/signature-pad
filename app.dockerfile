FROM 727482340929.dkr.ecr.us-east-1.amazonaws.com/docker-hub/node12:latest

ENV PATH=$PATH:/usr/src/app/node_modules/.bin \
    NODE_ENV=development

RUN npm i npm@next-7 -g

EXPOSE 4200

WORKDIR /usr/src/app

COPY package.json ./
COPY package-lock.json ./

RUN npm ci

COPY . /usr/src/app

CMD ["tail", "-f", "/dev/null"]
