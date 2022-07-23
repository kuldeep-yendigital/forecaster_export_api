const app = require('./app');
const config = require('./config');
const { getWebsocket } = require('./lib/websocket');

const port = process.env.PORT || 3000;
const server = app().listen(port, () => {
  console.log(`Server is listening to port: ${port} (${config.env})`);
});

getWebsocket(server);