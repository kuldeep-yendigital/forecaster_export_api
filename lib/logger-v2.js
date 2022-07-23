
const bunyan = require('bunyan');
const createCWStream = require('bunyan-cloudwatch');
const config = require('../config');
const os = require('os');
let logger;

const getLogger = () => {
  if (logger) return logger;

  const format = value => value.toString();
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = format(date.getUTCMonth() + 1);
  const dd = format(date.getUTCDate());

  if (config.cloudwatch && config.logLevel) {
    const stream = createCWStream({
      logGroupName: config.cloudwatch.logGroupName,
      logStreamName: `${yyyy}-${mm}-${dd}-${os.hostname()}`,
      cloudWatchLogsOptions: {
        region: config.cloudwatch.cloudWatchLogsOptions.region
      }
    });

    return bunyan.createLogger({
      name: 'forecaster',
      streams: [
        {
          stream: stream,
          type: 'raw'
        }
      ]
    });
  }
}

module.exports = {
  getLogger: getLogger
};
