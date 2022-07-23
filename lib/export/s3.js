const Stream = require('stream');
const AWS = require('aws-sdk');
const config = require('../../config');


module.exports = (exportId, userId, progressCallback, contentType = 'text/csv', extension = 'csv') => {
    const pass = new Stream.PassThrough();
    const s3 = new AWS.S3();
    const params = {
        Body: pass,
        Bucket: config.export.s3Bucket,
        Key: exportId,
        ContentType: contentType,
        ContentDisposition: `attachment;filename=${exportId}.${extension}`
    };
    const options = {
        partSize: config.export.partSize
    };
    const uploadStream = s3.upload(params, options, function (err, data) {

        if (err) {
            console.error("upload error", err);
            return progressCallback(exportId, userId, {event: 'error', errorMessage: 'Upload error'})
        }

        s3.getSignedUrl('getObject', {
            Bucket: config.export.s3Bucket,
            Key: exportId
        }, (err, url) => {
            let body;
            if (err) {
                console.error("export failed: ", err);
                body = {
                    event: 'error',
                    errorMessage: 'Export failed'
                }
            } else {
                body = {
                    event: 'complete',
                    percent: 100,
                    location: url
                };
            }
            progressCallback(exportId, userId, body);
        });
    });

    uploadStream.on('httpUploadProgress', progress => {
        const percent = Math.floor(progress.loaded / progress.total * 100);
        const body = {
            event: 'progress',
            ...progress,
            percent
        };
        progressCallback(exportId, userId, body);
    });
    return pass;
};
