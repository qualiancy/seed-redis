module.exports = process.env.SEEDREDIS_COV
  ? require('./lib-cov/store')
  : require('./lib/store');
