const http = require('https');
const log = require('../lib/log');
module.exports = params => {
  const makeRequest = function (resolve, reject) {
    log.debug({ params });
    const req = http.request(params, function (res) {
      const body = [];
      res.on('data', function (chunk) {
        body.push(chunk);
      });
      res.on('end', function () {
        const responseBody = Buffer.concat(body).toString();
        let json;
        try {
          json = JSON.parse(responseBody);
        } catch (e) {
          log.error('failed to parse response from API', e);
          reject({ reason: e.message });
        }
        if (res.statusCode === 429) {
          log.error(
            'Error 429: rate limited. Please file an issue here: https://github.com/jasonedison/coinbase_position_builder_bot/issues'
          );
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          if (json && json.message === 'invalid signature') {
            log.error(
              'invalid signature. Check your CPBB_APIKEY, CPBB_APISEC, CPBB_APIPASS settings!'
            );
            process.exit();
          }
          log.debug(`${res.statusCode} error:`, responseBody);
          return reject({ reason: res.statusCode, json });
        }
        resolve({ json, headers: res.headers });
        // resolve(json);
      });
    });
    // reject on request error
    req.on('error', function (err) {
      // This is not a "Second reject", just a different sort of failure
      log.error(`error in API request/response`, err);
      reject({ reason: err });
    });
    if (params.body) {
      // log.info(`write body`, params.body);
      req.write(params.body);
    }
    req.end();
  };
  return new Promise(makeRequest);
};
