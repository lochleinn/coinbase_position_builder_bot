# 2.1.1
- aborting script immediately if we failed to load account via the API (shows message about loading keys properly)
- If you cannot start the app due to this message, ensure your API keys are loaded into the environment or api.keys.js file properly then do: `pm2 kill && pm2 start [YOUR_CONFIG_NAME].js`

# 2.1.0
- Added Rebuy Feature: https://github.com/jasonedison/coinbase_position_builder_bot/pull/7
- removed excess "stable" npm package
- now `stable` is the stable branch
- now `develop` is the development branch
- `tax_fifo.js` tool
- `project.changes.js` tool

# 2.0.0
- `adjust.apy.js` tool
- Corrected target growth calculation to omit adding funding value from a sell action

## Updating to Version 2.0.0

Version `2.0.0` contains a change to the `Target` growth calculation. In older versions, the `Target` growth is calculated as `Prior Target` + `Period Gain` + `Funds` for this round. This makes sense when you are always buying because we are adding to the account, and we want to make sure that if we are over our `Target`, we only sell if the `Value` of the account is greater than `Target` by more than the `Funds` we would be cashing out. However, if you sold on the last round, we now have a target on record that includes `Funds` we didn't add into the system. This still gave us a good algorithmic result since it manifests as a higher than configured `APY` growth in our target calculation, but this creates confusion because the APY isn't the only thing being used to calculate the long term `Target`.

In 2.0.0+, we only add `Funds` to `Target` if the last round was a buy, not a sell.
You can simply upgrade the code and keep running with your existing history log (which likely has a slightly inflated `Target` because any sells still added an expected growth to the baseline). If you decide not to correct historical data, new data will still use the new algorithm. However, if you want to rectify your records, there is an optional script that will do this for you:

(optional)
1. Backup your data directory
2. For each pair you are tracking, run `CPBB_TICKER=BTC CPBB_CURRENCY=USD node adjust.target.js`
3. Examine the new '...fixed.tsv' file to make sure the records look satisfactory
4. Overwrite your history with the fixed version
5. restart your app: `pm2 reload all`