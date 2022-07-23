const stream  = require('stream');
const combine = require('stream-combiner2');
const JSON2CSVStream = require('json2csv-stream');
const { streamToRx, rxToStream } = require('rxjs-stream');
const duplexer = require('duplexer2');
const aggregationMapping = require('../aggregationMapping');

const FIELD_DELIMITER = ',';
const TEXT_DELIMITER = '"';
const RECORD_STATUS_DELETED = 'Deleted';
const isDateKey = key => key.match(/^\d+\/\d+\/\d+$/gi);
const isIdKey = key => key.match(/^ID_\d+\/\d+\/\d+$/gi);
const isRecordStatusKey = key => key.match(/^recordstatus_\d+\/\d+\/\d+$/gi);
const isLastUpdatedDateKey = key => key.match(/^lastupdateddate_\d+\/\d+\/\d+$/gi);

const isNotSourceTypeField = key => !key.startsWith('avg_');

const filterSourceTypeFields = record => {
  const serializableKeys = Object.keys(record).filter(isNotSourceTypeField);
  const processedRecord = serializableKeys
    .reduce((acc, key) => Object.assign(acc, {
      [key]: record[key]
    }), {});
    
    if (record.currency || record.unit === "%") {
      Object.keys(processedRecord).forEach(rec => {
        if (typeof processedRecord[rec] === 'number')
          processedRecord[rec] = Number(processedRecord[rec].toFixed(2));
      })
    }
  return processedRecord;
};

const csvEncodeObjectValues = obj => {
  return Object.keys(obj)
    .reduce((acc, key) => Object.assign(acc, {
      [key]: `${TEXT_DELIMITER}${obj[key]}${TEXT_DELIMITER}`
    }), {});
};

const removeDeletedRecord = row => {
  Object.keys(row).forEach((key) => {
    if (isDateKey(key)) {
      if ( (row[`recordstatus_${key}`] === RECORD_STATUS_DELETED) ) {
        row[key] = null;
      }
    }
  });
  return row;
};

const removeIdColumns = row => {
  Object.keys(row).forEach((key) => {
    if (isIdKey(key)) {
      delete row[key];
    }
  });
  return row;
};

const aggregationMap = row => {
  let res = {...row};
  Object.keys(row).forEach(key => {
    if (isRecordStatusKey(key)) {
      res[key] = aggregationMapping.calculateStatus(res[key]);
    }
    if (isLastUpdatedDateKey(key)) {
      res[key] = aggregationMapping.calculateLastUpdatedDate(res[key]);
    }
  });
  return res;
};

const removeStatusAndLastUpdatedDateKey = row => {
  let res = {...row};
  Object.keys(row).forEach(key => {
    if (isRecordStatusKey(key) || isLastUpdatedDateKey(key)) {
      delete res[key];
    }
  });
  return res;
};

module.exports = () => {

  // This is the write end of the stream that will accept the
  // records, it is a duplex stream, we are going to use the
  // read interface and the write interface will be returned
  // for the stream of records / rows to be piped into it.
  const writable = new stream.PassThrough({ objectMode: true });

  // This is our transform stream defined as an Rx transformation.
  // The helper rxToStream produces a readable stream. The source
  // is our passthrough stream which will emit records / rows.
  const transform = rxToStream(streamToRx(writable)
    .map(filterSourceTypeFields)
    .map(aggregationMap)
    .filter(x => !aggregationMapping.isWholeDeletedRow(x))
    .map(removeStatusAndLastUpdatedDateKey)
    .map(removeDeletedRecord)
    .map(removeIdColumns)
    .map(csvEncodeObjectValues)
    .map(JSON.stringify));

  // Combine the stages of the transformation pipeline
  return combine.obj(

    // Duplex the writable end of the stream and the
    // readable end of the transform stream. Unlike combine object
    // duplexer does not connect the streams by piping them, our
    // streams are already connected. It only stitches the interfaces
    // of the two streams together to act as a single duplex stream.
    duplexer({ objectMode: true }, writable, transform),
    
    new JSON2CSVStream({ del: FIELD_DELIMITER })
  );
};
