const os = require('os');
const cloudwatch = require('forecaster-common/lib/logger');
const config = require('../config');
let logger;

const getLogger = () => {
  if (logger) return logger;

  const format = value => value.toString();
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = format(date.getUTCMonth() + 1);
  const dd = format(date.getUTCDate());

  if (config.cloudwatch && config.logLevel) {
    const loggerConfig = {
      level: config.logLevel,
      cloudwatch: config.cloudwatch && {
          ...config.cloudwatch,
          logStreamName: `${yyyy}/${mm}/${dd}/${os.hostname()}`
      }
    }
  
    logger = cloudwatch(loggerConfig);
    return logger;
  }
}

module.exports = {
  getLogger: getLogger
};
