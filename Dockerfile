FROM node:18

RUN mkdir -p /data/logs

# RUN npm run build

# Create app directory
WORKDIR /app
ADD . /app

EXPOSE 8080

# RUN npm install --registry=http://registry.npm.baidu-int.com

CMD [ "npm", "run", "start" ]