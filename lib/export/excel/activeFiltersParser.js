const forEach = require('lodash/forEach');
const capitalize = require('lodash/capitalize');

const parse = (params) => {
  const result = [];

  if (params.compositeFilters) {
    forEach(params.compositeFilters, (val, key) => {
      if (val) {
        forEach(val, (filter) => {
          result.push({
            [key]: filter
          });
        });
      }
    });
  }

  if (params.filters) {
    forEach(params.filters, (val, key) => {
      result.push({
        [key]: val
      });
    });
  }

  if (params.range) {
    const startDate = new Date(params.range.start).toUTCString();
    const endDate = new Date(params.range.end).toUTCString();

    result.push({
      interval: params.range.interval,
      start: startDate,
      end: endDate
    });
  }

  return result;
};

module.exports = (params, callback) => {
  forEach(parse(params), filter => {
    forEach(filter, (value, key) => {
      callback(`${capitalize(key)}: ${value}`);
    });
  });
};
