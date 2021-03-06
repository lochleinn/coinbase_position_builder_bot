/**
 * Handles rebuying after a sell by setting up limit orders on the books using special config vars
 * Sample env config:
// should the engine only create and manage the limit orders and not make normal accumulation trades
// useful for testing this feature
CPBB_REBUY_ONLY: false,
// maximum dollar value consumed by limit order placements
CPBB_REBUY_MAX: 50,
// rebuy logic will place up to  orders at this size until CPBB_REBUY_MAX is reached
CPBB_REBUY_SIZE: ".0001,.0001,.0002,.0002,.0003,.0003,.0004,.0004,.0005,.0005",
// rebuy at these percentage drop targets(-4%, etc)
// note: you have to define at least the number of points in CPBB_REBUY_SIZE
CPBB_REBUY_AT: "-4,-6,-8,-10,-12,-15,-20,-25,-50,-80",
 */
const { add, divide, multiply, subtract } = require('./math');
const config = require('../config');
const fs = require('fs');
const log = require('./log');
const memory = require('./memory');
const processOrder = require('./process.order');
const sleep = require('./sleep');
module.exports = async (basePrice, maxFundsOverride) => {
  // starting percentage down from basePrice to place limit orders
  const dropPoints = config.rebuy.drops;
  // only set orders until they reach this threshold total
  const maxFunds = maxFundsOverride || config.rebuy.max;
  const sizes = config.rebuy.sizes;
  log.zap(
    `Creating limit orders to rebuy from $${basePrice} up to $${maxFunds} worth of ${config.ticker}`
  );
  let usedFunds = 0;
  let lastOrder;
  const orders = [];

  // first construct the set of orders
  for (let i = 0; i < sizes.length; i++) {
    if (usedFunds >= maxFunds) {
      break; // done
    }
    let percentageDrop = dropPoints[i];
    let size = sizes[i];
    let price = add(basePrice, multiply(basePrice, percentageDrop)).toFixed(2);
    let funds = multiply(size, price).toFixed(4);
    if (add(usedFunds, funds) > maxFunds) {
      // this attmept would exceed the allowed limit
      // use whatever is left of the funds on this last drop point
      funds = subtract(maxFunds, usedFunds);
      // size now depends on the funds used
      size = divide(funds, price).toFixed(8);
      // if this order would be too small, add the funds to the last order
      if (Number(size) < Number(memory.product.base_min_size)) {
        if (!lastOrder) {
          // obscure scenario: first order is too small
          log.now(
            `Funds (${funds}) would make order size ${size}, too small for ${memory.product.base_min_size}. Cannot place order.`
          );
          break;
        }
        lastOrder.funds = add(lastOrder.funds, funds);
        lastOrder.size = add(lastOrder.size, size);
        usedFunds = add(usedFunds, funds);
        break;
      }
    }
    usedFunds = add(usedFunds, funds);
    lastOrder = {
      funds,
      percentageDrop,
      price,
      size,
      type: 'limit',
    };
    orders.push(lastOrder);
  }
  // now place all the orders
  let addedOrders = 0;
  for (let i = 0; i < orders.length; i++) {
    let order = orders[i];
    let orderResponse = await processOrder(order);
    log.debug({ order, orderResponse });
    await sleep(1000); // avoid rate limiting
    if (!orderResponse) {
      log.error(
        `Failed to place limit order for ${order.size} ${config.ticker} @ ${
          order.price
        } = $${order.funds} (${order.percentageDrop * 100}% drop)`
      );
      continue;
    }
    log.now(
      `⬇️  posted limit order for ${order.size} ${config.ticker} @ ${
        order.price
      } = $${order.funds} (${order.percentageDrop * 100}% drop)`
    );
    addedOrders++;
    memory.makerOrders.orders.push({
      created_at: orderResponse.created_at,
      pair: config.productID,
      funds: order.funds,
      id: orderResponse.id,
      price: order.price,
      size: order.size,
    });
  }
  const limitTotal = memory.makerOrders.orders.reduce(
    (sum, order) => add(sum, order.funds),
    0
  );
  log.ok(
    `REBUY: Added ${addedOrders} limit buys totaling $${usedFunds}. Now ${memory.makerOrders.orders.length} limit orders totaling $${limitTotal}`
  );
  // save makerOrders to disk in case this process crashes
  fs.writeFileSync(
    config.maker_file,
    JSON.stringify(memory.makerOrders, null, 2)
  );
};
