const _ = require('lodash');
const mapping = require('./mapping');
const expect = require('chai').expect;
const pkg = require('./../../../package.json');
const styles = require('./styles');

describe(`${pkg.name}/lib/export/excel`, () => {

  const defaultRange = {
    start: Date.parse('12/31/2012'),
    interval: 'yearly',
    end: Date.parse('12/31/2012'),
  };

  const defaultColumnKeys = [
    'geographylevel1',
    'geographylevel2',
    'geographylevel3',
    'serviceslevel1',
    'datasetlevel1',
    'datasetlevel2',
    'datasetlevel3',
    'metriclevel1',
    'metriclevel2',
    'unit',
    'metricindicator',
    'currency',
  ];

  // Map to test to default values...
  const map = (range = defaultRange, keys = defaultColumnKeys) => (
    mapping(range , keys)
  );

  it('default', () => {
    const result =  map(undefined, []);

    expect(result).to.eql({
      header: [],
      subHeader: [{
        header: "2012",
        key: "31/12/2012",
      }],
    });
  });

  describe('mapping headers', () => {
    it('returns correct length', () => {

      // 3 years
      const range = {
        start: Date.parse('12/31/2010'),
        interval: 'yearly',
        end: Date.parse('12/31/2012'),
      };

      const { header, subHeader } = map(range, undefined);
      expect(subHeader.length).to.eq(defaultColumnKeys.length + 3);
      expect(header.length).to.eq(defaultColumnKeys.length);
    });

    it('returns correct amount of blank/merged columns on header', () => {

      const columnKeys = [
        'geographylevel1',
        'geographylevel2',
        'geographylevel3',
        'metricindicator',
        'datasetlevel1',
        'datasetlevel2',
        'datasetlevel3',
        'datasetlevel4',
        'datasetlevel5',
        
      ];

      const { header } = map(undefined, columnKeys);
      const result = header.map(el => el.header)
      expect(result[1]).to.eq('');
      expect(result[2]).to.eq('');
      expect(result[3]).to.not.eq('');
      expect(result[5]).to.eq('');
      expect(result[6]).to.eq('');
    });


    it('returns two types of subHeaders lebels from columnKeys', () => {

      const columnKeys = [
        'geographylevel1',
        'geographylevel2',
        'geographylevel3',
        'metricindicator',
        'datasetlevel1',
        'datasetlevel2',
        'datasetlevel3',
        'datasetlevel4',
        'datasetlevel5',
        'metriclevel1',
        'metriclevel2',
      ];

      const { subHeader } = map(undefined, columnKeys);

      expect(subHeader[4].header).to.eq('Level1');
      expect(subHeader[5].header).to.eq('Level2');
      expect(subHeader[8].header).to.eq('Level5');
      expect(subHeader[9].header).to.eq('Level1');
      expect(subHeader[10].header).to.eq('Level2');
    });

    it('returns correct amount of quaterly range', () => {

      const range = {
        start: Date.parse('12/31/2012'),
        interval: 'quarterly',
        end: Date.parse('12/31/2014'),
      };

      const { subHeader } = map(range, undefined);
      const { length } = subHeader.filter(el => el.key.includes('/'));
      expect(length).to.eq(9);
    });


    it('returns no range if start and end in wrong order', () => {

      const range = {
        start: Date.parse('12/31/2015'),
        interval: 'quarterly',
        end: Date.parse('12/31/2011'),
      };

      const { subHeader } = map(range, undefined);
      const { length } = subHeader.filter(el => el.key.includes('/'));
      expect(length).to.eq(0);
    });
  });
});