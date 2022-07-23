FROM node:8.9.1-alpine
MAINTAINER Informa plc <info@informa.com>

ENV APP_PATH /var/www/forecaster-export-api

RUN apk add --update bash && \
    apk add --update git && \
    apk add --update g++ && \
    apk add --update make && \
    apk add --update python2 && \
    rm -rf /var/cache/apk/*

# Create app directory
RUN mkdir -p $APP_PATH
WORKDIR $APP_PATH

# Install app dependencies
COPY . $APP_PATH
RUN rm -rf node_modules/
RUN npm install

CMD ["npm", "run", "dev"]
