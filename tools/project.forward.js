/**
 * CPBB_VOL=20 CPBB_APY=20 node project.forward.js
 * CPBB_VOL=10 CPBB_APY=15 node project.forward.js
 * CPBB_VOL=10 CPBB_APY=10 node project.forward.js
 */
const fs = require('fs');
const { divide } = require('../lib/math');

const config = require('../config');
const calcAction = require('../lib/calculate.action');
const history = require('../lib/history');
const log = require('../lib/log');
const logSave = require('../lib/log.save');
// const memory = require('../lib/memory')
const ticker = `${config.ticker}-${config.currency}`;

const historyFile = `${__dirname}/../data/history.${ticker}.tsv`;
const projectedFile = `${__dirname}/../data/history.${ticker}.projected.tsv`;

// override config.historyFile so we save new logs in this script
// to the new projectedFile
config.history_file = projectedFile;

log.now(`projecting ${ticker}`);
// copy existing history file to new projected file
fs.copyFileSync(historyFile, projectedFile);

const reverseHistory = history.all().reverse();
// now go from the state of the last history log through the reverse history
// to project actions using the settings provided
const now = new Date().getTime();

const processLog = async idx => {
  if (idx >= reverseHistory.length) return log.ok(`projection complete`);
  const d = reverseHistory[idx];
  // calculate the projected future date when this will occur
  const dateOverride = new Date(now + (now - new Date(d.Time).getTime()));
  const action = await calcAction({
    price: d.Price,
    reverse: true,
    dateOverride,
  });
  action.dateNow = dateOverride;
  logSave({
    action,
    response: {
      filled_size: divide(config.vol, d.Price).toFixed(8),
    },
  });
  processLog(++idx);
};

processLog(0);
