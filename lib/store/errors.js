var exports = module.exports = require('dragonfly')('SeedMongoError');

exports.register('no db', {
    message: 'MongoStore requires a db options'
  , code: 'EBADOPTION'
  , ctx: 'RedisStore'
});

exports.register('no conn', {
    message: 'MongoStore is not connected'
  , code: 'ENOCONN'
  , ctx: 'RedisStore'
});

exports.register('no id', {
    message: 'Missing id parameter for storage operation.'
  , code: 'ENOID'
  , ctx: 'RedisStore'
});
