const request = require('supertest');

const App = require('../test/app');
const contentType = require('../lib/export/contentTypes');

describe('Export', () => {
  let app;

  before(() => {
    app = App.create();
  });

  const queryParams = {"query":{"filters":{},"compositeFilters":{"metric":["Subscriptions"]},"range":{"interval":"yearly","start":1420070400000,"end":1672444800000},"sortedColumnId":"geographylevel1","sortDirection":"asc","columnKeys":["geographylevel1","geographylevel2","serviceslevel1","dataset","metriclevel1","metriclevel2","metricindicator","currency","unit"]},"page_size":200,"fields":["geographylevel1","geographylevel2","serviceslevel1","dataset","metriclevel1","metriclevel2","metricindicator","currency","unit"],"sort_field":{"type":"dimension_sort","value":"geographylevel1","direction":"asc"},"timeframe_interval":"yearly"};

  describe('/export', () => {
    it('csv should return 200', (done) => {
      request(app).post('/export').set('Accept', contentType.CSV).send(queryParams).expect(200, done);
    });

    it('excel should return 200', (done) => {
      request(app).post('/export').set('Accept', contentType.EXCEL).send(queryParams).expect(200, done);
    });

    it('unhandled content should return 406', (done) => {
      request(app).post('/export').set('Accept', 'application/json').send(queryParams).expect(406, 'Not Acceptable', done);
    });

    it('should return 500', (done) => {
      request(app).post('/export').send('invalid').expect(500, done);
    });
  });
});
