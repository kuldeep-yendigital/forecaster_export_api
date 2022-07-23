const replaceTransform = require('replacestream');

const s3 = require('../s3');
const csv = require('./csv');
const mapping = require('./../columnMapping');

const mappingTransform = stream => Object.keys(mapping).reduce((acc, curr) =>
    acc.pipe(replaceTransform(curr, mapping[curr])), stream);

module.exports = (sqlStream, exportId, userId, params, progressCallback) => {
  return mappingTransform(sqlStream.pipe(csv()))
    .pipe(s3(exportId, userId, progressCallback));
};
