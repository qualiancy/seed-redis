module.exports = process.env.SEEDREDIS_COV
  ? require('./lib-cov/seed-redis')
  : require('./lib/seed-redis');
