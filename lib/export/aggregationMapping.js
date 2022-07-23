const moment = require('moment');

const RECORD_STATUS_DELETED = 'Deleted';
const RECORD_STATUS_NEW = 'New';
const RECORD_STATUS_UPDATED = 'Updated';

const isRecordStatusKey = key => key.match(/^recordstatus_\d+\/\d+\/\d+$/gi);

const calculateStatus = concatStatus => {
  if (!concatStatus) {
    return '';
  }

  const statuses = concatStatus.split(',');
  const deletedFiltered = statuses.filter(x => x === RECORD_STATUS_DELETED);
  const updatedFiltered = statuses.filter(x => x === RECORD_STATUS_UPDATED);
  const newFiltered = statuses.filter(x => x === RECORD_STATUS_NEW);

  if (deletedFiltered.length === statuses.length) {
    return RECORD_STATUS_DELETED;
  }
  if (updatedFiltered.length === statuses.length) {
    return RECORD_STATUS_UPDATED;
  }
  if (newFiltered.length === statuses.length) {
    return RECORD_STATUS_NEW;
  }

  return RECORD_STATUS_UPDATED;
};

const calculateLastUpdatedDate = concatLastUpdatedDate => {
  if (!concatLastUpdatedDate) {
    return concatLastUpdatedDate;
  }
  const moments = concatLastUpdatedDate.split(',').map(x => moment(x));
  return moment.max(moments).format('DD/MM/YYYY');
};

const isWholeDeletedRow = row => {
  let wholeDeleted = true;
  Object.keys(row).forEach((key) => {
    if (isRecordStatusKey(key)) {
      if ( row[key] && (row[key] !== RECORD_STATUS_DELETED) ) {
        wholeDeleted = false;
      }
    }
  });
  return wholeDeleted;
};


module.exports = {
  calculateStatus,
  calculateLastUpdatedDate,
  isWholeDeletedRow
};