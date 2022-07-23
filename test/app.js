const proxyquire = require('proxyquire');
const { Duplex } = require('stream');

const App = proxyquire('./../app', {
  'forecaster-common/middleware/authoriser': () => {
    return (req, res, next) => {
      req.auth = {
          sub: 1,
          subscriptions: [{value: 'PT0101-1', dataset: 'PT0101', trial: false}],
          account: {samsAccountId: 'mockedAccount'}
      };
      next();
    };
  }
});

module.exports = {
  create: () => {
    const sqlStream = new Duplex({
      read() {}
    });
    sqlStream.query = () => {};

    return App(() => {}, () => {
      return {
        getRequestStream() {
          return Promise.resolve(sqlStream);
        }
      };
    });
  }
};
