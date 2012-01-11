var redis = require('redis')
  , Seed = require('seed');

var uid = new Seed.ObjectId();

var RedisStore = Seed.Store.extend({

    name: 'RedisStore'

  , MIN_SEED_VERSION: '0.1.8'

  , initialize: function (opts) {
      this.client = redis.createClient();
    }

  , set: function (seed) {
      var promise = new this.Promise()
        , id = seed.data.id;

      if (!id) {
        id = uid.gen();
        seed.data.id = id;
      }
      
      var key = '/' + seed.collection + '/' + id
        , data = JSON.stringify(seed.data);
      this.client.set(key, data, function (err, res) {
        if (err) promise.reject(err);
        promise.resolve(seed.data);
      });
      return promise.promise;
    }

  , get: function (seed) {
      var promise = new this.Promise()
        , sid = '/' + seed.collection + '/' + seed.data.id;
      this.client.get(sid, function (err, data) {
        try {
          if (!data) promise.resolve();
          promise.resolve(JSON.parse(data));
        } catch (err) {
          promise.reject(err);
        }
      });
      return promise.promise;
    }

  , destroy: function (seed) {
      var promise = new this.Promise()
        , sid = '/' + seed.collection + '/' + seed.data.id;
      this.client.del(sid, function (err) {
        if (err) promise.reject();
        promise.resolve()
      });
      return promise.promise;
    }
});

module.exports = RedisStore;
