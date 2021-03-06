process.env.VERBOSE = 'true';

const getOrder = require('../coinbase/get.order');
const log = require('../lib/log');

const id = process.argv[2];
log.zap('checking order', id);
(async () => {
  const response = await getOrder({ id });
  log.ok({ response });
})();
