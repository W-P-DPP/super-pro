const { buildPm2Apps } = require('./scripts/workspace-deploy.cjs')

module.exports = {
  apps: buildPm2Apps(__dirname),
}
