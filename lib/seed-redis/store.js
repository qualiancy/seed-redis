var redis = require('redis')
  , Seed = require('seed')
  , debug = require('debug')('seed-redis');

var uid = new Seed.ObjectId();

var RedisStore = Seed.Store.extend({

    name: 'RedisStore'

  , MIN_SEED_VERSION: '0.2.0'

  , initialize: function (options) {
      var self = this;
      options = options || {};

      debug('OPTIONS', options);
      this.client = options.client || new redis.createClient(options.port || options.socket, options.host, options);

      if (options.pass) {
        debug('CLIENT attempting to authorize');
        this.client.auth(options.pass, function (err) {
          if (err) throw err;
          debug('CLIENT authorization complete');
        });
      }

      this.client.on('ready', function () {
        debug('CLIENT event `ready`');
        self.emit('ready');
      });

      this.client.on('connect', function () {
        debug('CLIENT event `connect`');
        self.emit('connect');
      });

      this.client.on('idle', function () {
        debug('CLIENT event `idle`');
        self.emit('idle');
      });

      if (options.db) {
        this.client.select(options.db);
        this.client.on('connect', function () {
          self.client.send_anyways = true;
          self.client.select(options.db);
          self.client.send_anyways = false;
          debug('CLIENT using database %d', options.db);
        });
      }
    }

  , set: function (seed) {
      var promise = new Seed.Promise()
        , self = this
        , id = seed.data._id;
      if (!id) {
        id = uid.gen();
        seed.data._id = id;
      }
      var key = ':' + seed.collection + ':' + id
        , data = JSON.stringify(seed.data);
      this.client.set(key, data, function (err, res) {
        if (err) return promise.reject(err);
        self.client.sadd(seed.collection, id, function (err) {
          if (err) return promise.reject(err);
          promise.resolve(seed.data);
        });
      });
      return promise.promise;
    }

  , get: function (seed) {
      var promise = new Seed.Promise()
        , sid = ':' + seed.collection + ':' + seed.data._id;
      if (!seed.data._id) {
        promise.reject(new Seed.SeedError('No Id defined', { code: 'ENOID' }));
        return promise.promise;
      }
      this.client.get(sid, function (err, data) {
        if (!data) return promise.resolve();
        try {
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
        if (err) return promise.resolve(err);
        var count = res.length - 1
          , results = new Seed.Hash()
          , arr = [];
        function load (id, next) {
          self.client.get(':' + seed.collection + ':' + id, next);
        }
        function after (err, data) {
          try {
            data = JSON.parse(data);
            results.set(':' + seed.collection + ':' + data._id, data);
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
        , sid = ':' + seed.collection + ':' + seed.data._id;
      this.client.srem(seed.collection, seed.data.id, function (err) {
        if (err) promise.reject(err);
        self.client.del(sid, function (err) {
          if (err) return promise.reject();
          promise.resolve();
        });
      });
      return promise.promise;
    }
});

module.exports = RedisStore;
