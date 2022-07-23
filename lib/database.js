const mysql = require('mysql');
const { getLogger } = require('./logger');
let pool;

const getPool = (config) => {
  if (pool) return pool;
  
  const logger = getLogger();
  logger.info(`[MemSQL] Connecting to ${config.host}`);

  pool = mysql.createPool(config);
  return pool;
};

module.exports = {
  getPool: getPool
};