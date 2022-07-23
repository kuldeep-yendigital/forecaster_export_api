const fs = require('fs');

module.exports = function (callback) {
  var key = fs.readFileSync(`${__dirname}/key.txt`, 'utf8');
  key.split('\n').forEach(callback);
}
