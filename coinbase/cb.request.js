const config = require('../config');
const log = require('../lib/log');
const request = require('./http.request');
const requestSign = require('./request.sign');
const { URL } = require('url');

const { hostname } = new URL(config.api);
/**
 * wrapper for http request specific to coinbase pro header requirements
 */
module.exports = async opts => {
  const timestamp = Date.now() / 1000;

  const body = opts.body ? JSON.stringify(opts.body) : '';

  const requestConfig = {
    port: 443,
    hostname,
    path: opts.requestPath,
    method: opts.method,
    headers: {
      'Content-Length': body.length,
      'CB-ACCESS-KEY': process.env.CPBB_APIKEY,
      'CB-ACCESS-SIGN': requestSign({
        timestamp,
        requestPath: opts.requestPath,
        body: body,
        method: opts.method,
      }),
      'CB-ACCESS-PASSPHRASE': process.env.CPBB_APIPASS,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'User-Agent': 'CBPP',
    },
  };
  if (body) {
    requestConfig.body = body;
    requestConfig.headers['Content-Type'] = 'application/json';
  }
  // log.debug({ requestConfig });
  return request(requestConfig).catch(({ reason, json }) => {
    log.error(
      opts.method,
      opts.requestPath,
      `status error`,
      reason,
      json || ''
    );
  });
};
