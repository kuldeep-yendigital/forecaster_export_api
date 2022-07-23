const { getLogger } = require('../lib/logger-v2');
const logger = getLogger();
const { getWebsocket } = require('../lib/websocket');

module.exports = async (req, res) => {
  logger.info('Received hook from Lambda...');
  const { io } = getWebsocket();

  const {
    socketId,
    downloadUrl,
    downloadId
  } = req.body;

  res.status(202).json({
    message: 'Hook received.'
  });

  const emitObject = {
    state: !downloadUrl ? 'error' : 'download',
    [`${!downloadUrl ? 'errorMessage' : 'location'}`]: !downloadUrl ? `Request too large` : downloadUrl,
    downloadId
  }

  io.sockets.in(socketId).emit('state', emitObject);
}