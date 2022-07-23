const fetch = require('node-fetch');

const { getWebsocket } = require('../lib/websocket');
const config = require('../config');
const { getLogger } = require('../lib/logger-v2');
const logger = getLogger();

module.exports = async (req, res) => {
  logger.info('Exporting from Tableau...');
  const env = config.env === 'local' ? 'dev' : config.env;
  const url = `https://tableau-export-rest.${env}.tmt.informa-labs.com/wis/generate-download-file`;
  const { io } = getWebsocket();

  res.status(202).json({
    message: 'Query accepted, file link will follow in the socket.'
  });

  // trigger the lambda
  fetch(url, { 
    method: 'POST', 
    body: JSON.stringify({ ...req.body, socketId: req.body.client_id }),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  })
    .catch(e => {
      logger.info('lambda failed response:');
      logger.info(e);
      io.sockets.in(req.body.client_id).emit('state', {
        state: 'error',
        errorMessage: `Something went wrong...`
      });
    });
}
