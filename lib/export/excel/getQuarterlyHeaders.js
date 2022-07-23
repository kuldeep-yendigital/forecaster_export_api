const lodashRange = require('lodash/range');

const range = (start, end) => lodashRange(start, end + 1, 1);

const zeroFill = (number, digits) => {
  number = parseInt(number, 10).toString();
  let l = digits - number.length;
  while (l-- > 0) {
    number = '0' + number;
  }
  return number;
};

const dateKey = date => `${zeroFill(date.getUTCDate(), 2)}/${zeroFill(date.getUTCMonth() + 1, 2)}/${date.getUTCFullYear()}`;
const quarterLabel = index => ['Q1', 'Q2', 'Q3', 'Q4'][index];
const quarterKey = (year, quarter) => dateKey(new Date(Date.UTC(year, (quarter + 1) * 3, 0)));

/**
 * NOTE: This function accepts the UTC dates for the start and end
 * of the selected range and so must generate headers using the
 * UTC date parts and not local time parts. Otherwise the UTC time
 * can land on a different year or quarter than expected compared
 * to local time.
 */
module.exports = (startDate, endDate) => {
    const startYear = startDate.getUTCFullYear();
    const startQuarter = Math.floor(startDate.getUTCMonth() / 3);
    const endYear = endDate.getUTCFullYear();
    const endQuarter = Math.floor(endDate.getUTCMonth() / 3);
    const l = (endYear - startYear) * 4 + endQuarter - startQuarter;
    const result = range(0, l).map(i => {
        let year = startYear + Math.floor((startQuarter + i) / 4);
        let quarter = (startQuarter + i) % 4;
        return {
            key: quarterKey(year, quarter),
            header: `${quarterLabel(quarter)} ${year}`
        }
    });
    return result;
};
