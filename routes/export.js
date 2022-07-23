const express = require('express');
const AWS = require('aws-sdk');
const router = express.Router();
const ex = require('../lib/export');
const crypto = require('crypto');
const config = require('../config');
const { getWebsocket } = require('../lib/websocket');
const contentType = require('../lib/export/contentTypes');
const queryConstructor = require('forecaster-common/lib/memsql/query');
const SQLStream = require('forecaster-common/lib/memsql/stream');
const { getPool } = require('../lib/database');
const union = require('lodash/union');
const monitoring = require('forecaster-common/lib/monitoring')(config.monitoring);
const { getLogger } = require('../lib/logger');
const logger = getLogger();
const authoriser = require('forecaster-common/middleware/authoriser')(config);
const tableauExportController = require('../controllers/tableau-export-controller');
const tableauHookController = require('../controllers/tableau-hook-controller');
const tableauExportControllerV2 = require('../controllers/tableau-export-controller-v2');

function uploadQueryToS3(query, userId) {
  const params = {
    Body: JSON.stringify(query),
    Bucket: config.export.s3BucketAllExports,
    Key: `${userId}-${new Date().getTime()}.json`
  };

  const s3 = new AWS.S3();
  s3.upload(params, function(err, data) {
    if (err) {
      console.log(err);
    }
    console.log(`File uploaded successfully. ${data.Location}`);
  });
}

function execute(args) {

  const type = args.req.accepts([contentType.CSV, contentType.EXCEL]);
  const isTableau = !!args.tableau;

  // generate fileName/exportId
  let exportId;

  if (!isTableau) {
    logger.info({ name: '[export] start_execute', args });
    exportId = 
      config.export.filePrefix +
      crypto.createHash('md5')
      .update(JSON.stringify({
        query: args.req.body.query,
        subscriptions: args.req.auth.subscriptions
      }))
      .digest('hex') +
      type;
  }
  else {
    exportId = config.export.filePrefix +
      crypto.createHash('md5')
      .update(JSON.stringify({
        date: new Date()
      }))
      .digest('hex') + 
      type;
  }

  generateDownload({ ...args, exportId });
}

// Query database, then initiate download...
function generateDownload(args) {
  const { exportStrategy, recordLimit, req, res, next, exportId, tableau } = args
  const { io } = getWebsocket();
  let startTime = new Date();
  let endTime;
  const isTableau = !!args.tableau;
  
  if (tableau) {
    res.setHeader('Content-Type', 'application/json');
      res.status(200).send({
          exportId
      }).end();

    const params = {
      range: 0,
      columnKeys: req.body.columns,
      filters: req.body.filters || [],
      parameters: req.body.params || []
    };
    exportStrategy(null, exportId, null, params, progressCallback, true, req.body.data);

    return;
  }

  function progressCallback(exportId, userId, data) {
    if (data.percent === 100 && data.location) {
        const socketClientId = req.body.client_id;
        io.sockets.in(socketClientId).emit('state', {
          state: 'download',
          location: data.location
        });
        try {
            endTime = new Date();
            const duration = endTime - startTime;
            monitoring.recordMetric({
                MetricName: 'EXPORT_DURATION',
                Unit: 'Milliseconds',
                Value: duration
            });
        }
        catch (e) {
            console.log(e);
        }
    }
}

  const sqloptions = Object.assign({}, config.memsql, {
    logger: {
      cloudwatch: config.cloudwatch,
      logLevel: config.logLevel
    }
  });
  const sqlStream = new SQLStream(sqloptions, getPool(config.memsql));
  const userId = req.auth.sub;

  // save the query to a general s3 bucket for analytics purposes
  // this does not need to block the rest of the export
  uploadQueryToS3(req.body.query, req.auth.account.salesforceUserId);

  sqlStream.connect().then(() => {
      const params = req.body.query;

      logger.info({ name: '[export] sql_start_stream', args });

      // The column order is represented by the union of
      // the pinned column and columnKey set.
      params.order = union(
        req.body.pinned || [],
        req.body.query.columnKeys || []
      );

      // Add non-trail subscriptions
    params.subscriptions = req.auth.subscriptions.map(subscription => subscription.value);

      if (params.subscriptions.length) {
        const query = (params.columnFilters && Object.keys(params.columnFilters).length > 0)
            ? queryConstructor(params, recordLimit, false, false, true)
            : queryConstructor(params, recordLimit);

          exportStrategy(sqlStream, exportId, userId, params, progressCallback);
          sqlStream.query(query);
      }

      logger.info({ name: '[export] sql_start_stream_2', args, params });

      res.setHeader('Content-Type', 'application/json');
      res.status(200).send({
          exportId,
          empty: !params.subscriptions.length,
          hasTrial: false
      }).end();
  }).catch((err) => {
      console.log(err);
      next(err);
  });
}

module.exports = () => {
  router.post('/export/tableau', tableauExportController);
  router.post('/export/tableau-hook', tableauHookController);
  router.post('/export/tableau-v2', tableauExportControllerV2);

  router.post('/export', authoriser, (req, res, next) => {
    res.format({
      [contentType.CSV]: () => execute({
        exportStrategy: ex.csv, recordLimit: 100000, req, res, next
      }),
      [contentType.EXCEL]: () => execute({
        exportStrategy: ex.excel, recordLimit: 20000, req, res, next
      }),
      'default': () => { res.status(406).send('Not Acceptable'); }
    });
  });

  return router;
};
