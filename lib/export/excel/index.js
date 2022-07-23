
const excel = require('node-excel-export');
const map = require('./mapping');
const s3 = require('../s3');
const contentType = require('../contentTypes');
const exceljs = require('exceljs');
const sourceMapType = require('./sourceTypeMap');
const sourceMapTypeReverse = require('./sourceTypeMapReverse');
const styles = require('./styles');
const key = require('./key');
const copyright = require('./copyright');
const activeFiltersParser = require('./activeFiltersParser');
const remove = require('lodash/remove');
const findIndex = require('lodash/findIndex');
const pullAt = require('lodash/pullAt');
const crypto = require('crypto');
const forEach = require('lodash/forEach');

const aggregationMapping = require('../aggregationMapping');

const RECORD_STATUS_DELETED = 'Deleted';
const isDateKey = key => key.match(/^\d+\/\d+\/\d+$/gi);
const isRecordStatusKey = key => key.match(/^recordstatus_\d+\/\d+\/\d+$/gi);
const isLastUpdatedDateKey = key => key.match(/^lastupdateddate_\d+\/\d+\/\d+$/gi);

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

module.exports = (sqlStream, exportId, userId, params, progressCallback, noStream = false, rows = []) => {
  // Map raw headers
  let { subHeader, header } = map(params.range, params.columnKeys);

  const colouriseRow = (newRow) => {
    // Colourize/format the numbers/dates
    newRow.eachCell((cell, colNumber) => {
      const header = subHeader[colNumber-1];

      if (cell.value !== cell.value) {
        cell.value = null;
      }

      // If cell is dateRange
      if(!isNaN(parseInt(header.key.replace(/\//g, '').replace(/\Q/g, '').replace(/\s/g, '')))) {
        // Try and parse the cell.value to check if it's a number
        if (typeof cell.value === 'string') {
          const noPunct = cell.value.replace(',', '').replace('.', '');
          if (!isNaN(noPunct)) {
            cell.value = parseFloat(noPunct);
          }
        }

        const color = sourceMapType[newRow[`avg_${header.key}`]] || sourceMapType['mixed'];
        cell.style = styles[color];

        if(typeof cell.value === 'number' && (newRow.unit === '%' || newRow.currency)) {
          cell.value = Number(cell.value.toFixed(2));
          cell.numFmt = "#,##0.00";
        }
        else if(typeof cell.value === 'number') {
          cell.value = Number(cell.value.toFixed(0));
          cell.numFmt = "#,##";
        }
      }
    });
  };

  const s3Stream = s3(exportId, userId, progressCallback, contentType.EXCEL, 'xlsx');

  if (noStream) {
    // This is tableau. We need to re-format the data before we start adding it to the excel file.
    // First, we need to tidy up the columns. 
    // The first column is invariably null
    // Second column is the time point (either yearly or quarterly)
    // so we remove that, too, as we'll re-build this from the rows
    let tidyHeaders;
    let splitComp = -1;
    let removedColumns = 0;
    remove(header, (item, i) => {
      if (item.key.indexOf('to Split Company') > -1) {
        removedColumns++;
        splitComp = i;
        return true;
      }
    });

    // Find the index of the date column
    const dateColIdx = findIndex(header, (col) => {
      return col.key.toLowerCase().indexOf('date') > -1;
    });
    // And remove it
    pullAt(header, dateColIdx);

    // Now we need to remove the AGG and MIN columns
    // But save the first AGG index so we know what's where
    let aggStartIdx = -1;
    remove(header, (item, i) => {
      if (aggStartIdx === -1 && item.key.indexOf('AGG(') > -1) {
        aggStartIdx = i;
      }
      if (item && (item.key.indexOf('AGG(') > -1 || item.key.indexOf('MIN(') > -1)) {
        return true;
      }
    });

    // Now go through the rows, and build our date columns
    const dateColumns = [];
    const avgColumns = [];
    rows.forEach(row => {
      const rowDateCol = row[dateColIdx + removedColumns];
      if (dateColumns.indexOf(rowDateCol.formattedValue) === -1) {
        // Add it
        dateColumns.push(rowDateCol.formattedValue);
      }
    });

    // Sort the date columns
    dateColumns.sort((a, b) => {
      const aSplitDates = a.split(' ');
      const bSplitDates = b.split(' ');
      let aInt = 0;
      let bInt = 0;

      if (aSplitDates.length > 1) {
        const aRearranged = `${aSplitDates[1]}${aSplitDates[0].replace('Q', '')}`;
        const bRearranged = `${bSplitDates[1]}${bSplitDates[0].replace('Q', '')}`;
        aInt = parseInt(aRearranged);
        bInt = parseInt(bRearranged);
      }
      else {
        aInt = parseInt(a);
        bInt = parseInt(b);
      }
      
      if (aInt > bInt) {
        return 1;
      }

      if (bInt > aInt) {
        return -1;
      }
    });
  
    // And push them to the header
    dateColumns.forEach(dateColumn => {
      header.push({
        key: dateColumn,
        header: dateColumn
      });

      avgColumns.push(`avg_${dateColumn}`);
    });

    tidyHeaders = header;
    subHeader = tidyHeaders;
    
    const workbook = new exceljs.Workbook();
    const worksheet = styles.decorateHeaders(workbook.addWorksheet('Sheet01'), null, subHeader);

    const newRows = [];
    rows.forEach(row => {
      // Extract the date column
      if (splitComp > -1) {
        pullAt(row, splitComp);
      }
      const dateCol = row[dateColIdx].formattedValue;
      pullAt(row, dateColIdx);
      
      // Now, store the colour type
      let colourType = row[aggStartIdx].formattedValue;
      colourType = colourType.toLowerCase().replace(/\s/g, '');
      // The value
      const val = parseFloat((row[aggStartIdx + 1].formattedValue).replace(/\,/g, ''));

      // And remove them from the array
      row.splice(aggStartIdx, (row.length - aggStartIdx));
      const originalRowLength = row.length;

      // Hash the row main components. That's the data between idx 2 and (aggStartIdx - 1)
      let hashText = '';
      for (let i = 0; i < aggStartIdx; i++) {
        hashText += row[i].formattedValue;
      }
      const hash = crypto.createHash('md5').update(hashText).digest('hex');
      const flatRow = row.map(obj => obj.formattedValue);

      // Look for the hash in the newRows array
      const newRowIdx = findIndex(newRows, item => {
        return item[0] === hash;
      });

      // Map the value to the correct date column
      // Find the date column index
      const dateColumnIndex = dateColumns.indexOf(dateCol);
      const avgColumnIndex = dateColumnIndex + dateColumns.length;

      if (newRowIdx > -1) {
        // Add the value to the row's mapped date column
        newRows[newRowIdx][dateColumnIndex + originalRowLength + 1] = val;
        newRows[newRowIdx][avgColumnIndex + originalRowLength + 1] = colourType;
      }
      else {
        // build a date array and inject the value to the index
        const rowValueCols = [];
        const avgValueCols = [];
        for (let x = 0; x < dateColumns.length; x++) {
          if (x === dateColumnIndex) {
            rowValueCols.push(val);
            avgValueCols.push(colourType);
          }
          else {
            rowValueCols.push(null);
            avgValueCols.push(null);
          }
        }

        // Add the row
        newRows.push([
          hash,
          ...flatRow,
          ...rowValueCols,
          ...avgValueCols
        ]);
      }
    });

    newRows.forEach(newRow => {
      // Remove the first column, it's the hash and it's no longer needed
      newRow.splice(0, 1);

      // Extract the avgValueCols and remove them from the newRow
      const avgValues = newRow.splice(newRow.length - avgColumns.length, avgColumns.length);

      const newWSRow = worksheet.addRow(newRow);
      newWSRow.unit = '%';

      // Now re-add the sourceType but as an object
      avgValues.forEach((val, i) => {
        newWSRow[avgColumns[i]] = sourceMapTypeReverse[val];
      });
      

      colouriseRow(newWSRow);
      // newRow.commit();
    });

    // Add filters and params here
    worksheet.addRow([]);
    key(line => worksheet.addRow([line]));

    worksheet.addRow([]);
    worksheet.addRow(['Filters and Consolidation level']);

    const parameters = params.parameters;
    parameters.forEach((parameter) => {
      worksheet.addRow([parameter.name, parameter.value]);
    })
    worksheet.addRow([]);

    const filters = params.filters;
    const ignoreFilters = [
      'filter_date',
      'filter_currency',
      'filter_complex metrics',
      'null_metrics',
      'filter_null metrics'
    ];
    filters.forEach((filter) => {
      if (ignoreFilters.indexOf(filter.name.toLowerCase()) > -1) {
        return;
      }
      const filterValues = [];
      filter.name = filter.name.replace('Concat_', '').replace('Filter_', '');
      filter.value.forEach((filterValue) => {
        filterValues.push(filterValue.value);
      })
      worksheet.addRow([filter.name, filterValues.length > 50 ? '>50 selected' : filterValues.join('\n')]);
    });

    worksheet.addRow([]);
    copyright(line => worksheet.addRow([line]));
    workbook.xlsx.write(s3Stream);

    return;
  }

  

  // Setup Writeable stream to pipe to S3
  const workbook = new exceljs.stream.xlsx.WorkbookWriter({ stream: s3Stream, useStyles: true });

  const worksheet = styles.decorateHeaders(workbook.addWorksheet('Sheet01'), subHeader, header);

  // Add data to worksheet
  sqlStream.on('data', row => {
    forEach(row, (val, key) => {
      if (isRecordStatusKey(key)) {
        row[key] = aggregationMapping.calculateStatus(val);
      }
      if (isLastUpdatedDateKey(key)) {
        row[key] = aggregationMapping.calculateLastUpdatedDate(val);
      }
    });

    if (! aggregationMapping.isWholeDeletedRow(row)) {
      removeDeletedRecord(row);
      const newRow = worksheet.addRow(row);
      newRow.unit = row.unit;
      newRow.currency = row.currency;

      forEach(row, (val, key) => {
        if (key.indexOf('avg_') > -1) {
          newRow[key] = val;
        }
      });

      colouriseRow(newRow);
      // Pipe to S3 on each row commit
      newRow.commit();
    }
  });
  sqlStream.on('end', () => {

    // Append at the end
    key(line => worksheet.addRow([line]));
    activeFiltersParser(params, line => worksheet.addRow([line]));
    copyright(line => worksheet.addRow([line]));

    workbook.commit();
  });
};
