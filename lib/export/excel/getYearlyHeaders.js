const lodashRange = require('lodash/range');

const range = (start, end) => lodashRange(start, end + 1, 1);

module.exports = (startDate, endDate) => {
  const yearRange = range(startDate.getUTCFullYear(), endDate.getUTCFullYear());
  return yearRange.map(x => {
    return {key:  `31/12/${x}`, header: x.toString()};
  });
}
