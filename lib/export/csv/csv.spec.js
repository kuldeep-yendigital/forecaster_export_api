const {expect} = require('chai');
const {Observable} = require('rxjs');
const {rxToStream, streamToRx} = require('rxjs-stream');

const csv = require('./csv');
const EOL = require('os').EOL;

const streamFromArray = arr => rxToStream(Observable.from(arr), {objectMode: true});

const streamToString = (result, cb) =>
    streamToRx(result)
        .map(buffer => buffer.toString('utf8'))
        .reduce((a, b) => a + b)
        .subscribe(result => cb(null, result), err => cb(err));

describe('export/csv', () => {
    it('converts the records to a CSV stream', done => {
        const transform = csv();
        const stream = streamFromArray([
            {
                'geographylevel1': 'Africa',
                '31/12/2017': 123
            }
        ])
            .pipe(transform);

        streamToString(stream, (err, result) => {
            expect(err).to.not.exist;
            expect(result).to.equal(
                `geographylevel1,31/12/2017${EOL}` +
                '"Africa","123"'
            );
            done()
        });
    });

    it('strips out the source type columns', done => {
        const transform = csv();
        const stream = streamFromArray([
            {
                'geographylevel1': 'Western Europe',
                'geographylevel2': 'United Kingdom',
                '31/12/2017': 123456,
                'avg_31/12/2017': 104395301
            }
        ])
            .pipe(transform);

        streamToString(stream, (err, result) => {
            expect(err).to.not.exist;
            expect(result).to.equal(
                `geographylevel1,geographylevel2,31/12/2017${EOL}` +
                '"Western Europe","United Kingdom","123456"'
            );
            done()
        });
    });
});
