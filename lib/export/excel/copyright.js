const fs = require('fs');

module.exports = function (callback) {
  var copyright = fs.readFileSync(`${__dirname}/copyright.txt`, 'utf8');

  copyright = copyright.replace('{date}', new Date().toUTCString());
  copyright = copyright.replace('{year}', new Date().getFullYear());

  copyright.split('\n').forEach(callback);
}
