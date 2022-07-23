const red = 'db0a35';
const gray = '444957';
const blue = '1291D1';
const green = '5AB031';

const font = colour => ({ font: { color: { argb: colour } } });

const styles = {
  header: {
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: {
        argb: 'E1E3E7'
      }
    },
    font: {
      color: {
        argb: 'black'
      },
      size: 14,
      bold: true
    }
  },
  subHeader: {
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: {
        argb: 'F3F4F5'
      }
    },
    font: {
      color: {
        argb: 'black'
      },
      size: 14
    }
  },
  real: font(gray),
  restatement: font(gray),
  un: font(gray),
  imf: font(gray),
  nospecific: font(gray),
  marketintelligence: font(blue),
  estimated: font(red),
  estimate: font(red),
  computed: font(red),
  forecast: font(green)
};


// Add styles to headers
function decorateHeaders(worksheet, subHeader, header) {
  if (subHeader) {
    worksheet.getRow(2).values = subHeader.map(el => el.header);
    worksheet.getRow(2).font = styles.subHeader.font;
    worksheet.getRow(2).fill = styles.subHeader.fill;

    const newSubHeader = subHeader.map(header => ({...header, width: 30 }));
    worksheet.columns = newSubHeader;
  }

  if (header) {
    const newHeader = header.map(el => el.header);
    worksheet.getRow(1).values = newHeader;

    if (!subHeader) {
      const newSubHeader = header.map(head => ({...head, width: 30 }));
      worksheet.columns = newSubHeader;
    }
    worksheet.getRow(1).font = styles.header.font;
    worksheet.getRow(1).fill = styles.header.fill;
  }

  return worksheet;
}

module.exports = { decorateHeaders, ...styles };