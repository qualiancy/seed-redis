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
      var promise = new Seed.Promise()
        , self = this
        , id = seed.data.id;
      if (!id) {
        id = uid.gen();
        seed.data.id = id;
      }
      var key = '/' + seed.collection + '/' + id
        , data = JSON.stringify(seed.data);
      this.client.set(key, data, function (err, res) {
        if (err) promise.reject(err);
        self.client.sadd(seed.collection, id, function (err) {
          if (err) promise.reject(err);
          promise.resolve(seed.data);
        });
      });
      return promise.promise;
    }

  , get: function (seed) {
      var promise = new Seed.Promise()
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

  , fetch: function (seed) {
      var promise = new Seed.Promise()
        , self = this
        , query = seed.query;
      this.client.smembers(seed.collection, function (err, res) {
        if (err) promise.resolve(err);
        var count = res.length - 1
          , results = new Seed.Hash()
          , arr = [];
        function load (id, next) {
          self.client.get('/' + seed.collection + '/' + id, next);
        }
        function after (err, data) {
          try {
            data = JSON.parse(data);
            results.set('/' + seed.collection + '/' + data.id, data);
          } catch (err) {};
          count-- || done();
        }
        function done() {
          results.find(query).each(function (value) {
            arr.push(value);
          });
          promise.resolve(arr);
        } 
        for (var i = 0; i < res.length; i++ ) {
          load(res[i], after);
        }
      });
      return promise.promise;
    }

  , destroy: function (seed) {
      var promise = new Seed.Promise()
        , self = this
        , sid = '/' + seed.collection + '/' + seed.data.id;
      this.client.srem(seed.collection, seed.data.id, function (err) {
        if (err) promise.reject(err);
        self.client.del(sid, function (err) {
          if (err) promise.reject();
          promise.resolve();
        });
      });
      return promise.promise;
    }
});

module.exports = RedisStore;
