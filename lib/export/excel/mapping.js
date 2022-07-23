const capitalize = require('lodash/capitalize');
const getYearlyHeaders = require('./getYearlyHeaders');
const getQuarterlyHeaders = require('./getQuarterlyHeaders');
const mapping = require('./../columnMapping');
const sourceTypeMap = require('./sourceTypeMap.json');
const styles = require('./styles');

function mergeDistance(column, columns, acc) {
  const cur = columns.indexOf(column);
  if (-1 === cur) return acc;

  const curMergeKey = mergeables.filter(key => column.startsWith(key)).pop();
  if (! curMergeKey) return acc;

  const next = columns.hasOwnProperty(cur + 1) ? cur + 1 : -1;
  if (-1 === next) return acc;

  const nextMergeKey = mergeables.filter(key => columns[next].startsWith(key)).pop();
  if (curMergeKey !== nextMergeKey) return acc;

  return mergeDistance(columns[next], columns, acc + 1);
}

// Columns that will be mergable
const mergeables = [
  'billingtype',
  'channel',
  'customertype',
  'device',
  'geography',
  'metric',
  'dataset',
  'networkstatus',
  'services',
  'technology'
];

module.exports = (range = {}, columnKeys) =>  {

  const keys = columnKeys;
  const header = [];
  const subHeader = [];

  for (let i = 0; i < keys.length; i += 1) {
    const column = keys[i];

    const mergeable = mergeables.filter(key => column.startsWith(key)).pop();
    const heading = mergeable
      ? mergeable
      : (mapping[column] ? mapping[column] : column);
    const specification = mapping[column]
      ? mapping[column]
      : (mergeable ? column.replace(mergeable, '') : column);

    const currentDistance = mergeDistance(keys[i], keys, 1);
    const prevDistance = keys.hasOwnProperty(i - 1) ? mergeDistance(keys[i - 1], keys, 0) : 0;

    header.push({
      key: column,
      header: currentDistance - prevDistance >= 1 ? capitalize(heading) : ''
    });

    subHeader.push({
      key: column,
      header: capitalize(specification),
    });
  }

  // Append headers for dates
  const getHeaders = range.interval === 'quarterly'
    ? getQuarterlyHeaders
    : getYearlyHeaders;
  const rangeHeaders = getHeaders(new Date(range.start), new Date(range.end));
  subHeader.push(...rangeHeaders);

  return {
    header,
    subHeader,
  };
};
