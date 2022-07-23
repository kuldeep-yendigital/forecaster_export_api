const argv = require('minimist')(process.argv.slice(2));
const env = argv.env || (process.env.ENVIRONMENT || process.env.environment || 'local');
const config = require(`./${env}.json`);
config.env = env;
module.exports = config;
