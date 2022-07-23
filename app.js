const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config');
const status = require('./routes/status');
const exportRoute = require('./routes/export');
const events = require('./routes/events');
const { getPool } = require('./lib/database');
const Raven = require('raven');
const error = require('forecaster-common/middleware/error');
const logger = require('forecaster-common/middleware/logger')(config);
const authoriser = require('forecaster-common/middleware/authoriser')(config);
const monitoring = require('forecaster-common/lib/monitoring')(config.monitoring);
const SQLStream = require('forecaster-common/lib/memsql/stream');

if (process.env.ENVIRONMENT !== 'local' && process.env.environment !== 'local') {
  Raven.config(config.sentry.ravenDSN, {
    environment: process.env.ENVIRONMENT || process.env.environment
  }).install();
}

module.exports = () => {
  getPool(config.memsql);

  const app = express();
  if (process.env.ENVIRONMENT !== 'local' && process.env.environment !== 'local') {
    app.use(Raven.requestHandler());
  }


  const corsWhitelist = [
    'http://localhost:9000',
    'https://forecaster-ui.dev.tmt.informa-labs.com',
    'https://forecaster-ui.qa.tmt.informa-labs.com',
    'https://forecaster-ui.prod.tmt.informa-labs.com',
    'https://forecaster.ovum.com'
  ];
  const corsOptions = {
    origin: function (origin, callback) {
      if (corsWhitelist.indexOf(origin) !== -1) {
        callback(null, true);
      }
      else {
        callback(null, true); // Whatevs, can't be worse than * (I hate myself)
      }
    },
    credentials: true
  }

  app.use(cors(corsOptions));
  app.use(bodyParser.json({
    limit: '50mb'
  }));
  app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true
  }));
  app.use(logger);
  app.use(status);
  // app.use(authoriser);
  app.use(exportRoute());
  app.use(events);

  if (process.env.ENVIRONMENT !== 'local' && process.env.environment !== 'local') {
    app.use(Raven.errorHandler());
  }
  app.use(error);

  return app;
};
