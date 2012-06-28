var redis = require('redis')
  , Seed = require('seed');

var errors = require('./errors')
  , uid = new Seed.ObjectId();

var proto = module.exports = {};

proto.name = 'RedisStore'

proto.initialize = function (opts) {
  opts = opts || {};

  this.client = opts.client
    ? opts.client
    : new redis.createClient(opts.port || opts.socket, opts.host, opts);

  this.proxyEvent('ready', this.client);
  this.proxyEvent('connect', this.client);
  this.proxyEvent('idle', this.client);

  if (opts.pass) {
    this.client.auth(opts.pass, function (err) {
      if (err) throw err;
    });
  }

  if (opts.db) {
    var self = this;
    this.client.select(opts.db);
    this.client.on('connect', function () {
      self.client.send_anyways = true;
      self.client.select(opts.db);
      self.client.send_anyways = false;
    });
  }
};

proto.set = function (seed) {
  var self = this
    , defer = new Seed.Promise()
    , id = seed.data._id;

  if (!id) {
    id = uid.gen();
    seed.data._id = id;
  }

  var key = seed.collection + ':' + id
    , data;

  try { data = JSON.stringify(seed.data); }
  catch (ex) { defer.reject(ex); }

  this.client.set(key, data, function (err, res) {
    if (err) return defer.reject(err);
    self.client.sadd(seed.collection, id, function (err) {
      if (err) return defer.reject(err);
      defer.resolve(seed.data);
    });
  });

  return defer.promise;
};

proto.get = function (seed) {
  var defer = new Seed.Promise()
    , sid = seed.collection + ':' + seed.data._id;

  if (!seed.data._id) {
    defer.reject(errors.create('no id'));
    return defer.promise;
  }

  this.client.get(sid, function (err, data) {
    if (!data) return defer.resolve();
    try { defer.resolve(JSON.parse(data)); }
    catch (ex) { defer.reject(ex); }
  });

  return defer.promise;
};

proto.fetch = function (seed) {
  var self = this
    , defer = new Seed.Promise()
    , query = seed.query;

  this.client.smembers(seed.collection, function (err, res) {
    if (err) return defer.reject(err);

    var count = res.length - 1
      , results = new Seed.Hash()
      , arr = [];

    function load (id, next) {
      self.client.get(seed.collection + ':' + id, next);
    }

    function after (err, data) {
      var json;
      try { json = JSON.parse(data); }
      catch (ex) { return defer.reject(ex); };
      results.set(seed.collection + ':' + json._id, json);
      count-- || done();
    }

    function done() {
      results
        .find(query)
        .each(function (value) {
          arr.push(value);
        });
      defer.resolve(arr);
    }

    if (!res.length) return defer.resolve([]);
    for (var i = 0; i < res.length; i++)
      load(res[i], after);
  });

  return defer.promise;
};

proto.destroy = function (seed) {
  var self = this
    , defer = new Seed.Promise()
    , sid = seed.collection + ':' + seed.data._id;

  this.client.srem(seed.collection, seed.data.id, function (err) {
    if (err) return defer.reject(err);
    self.client.del(sid, function (err) {
      if (err) return defer.reject();
      defer.resolve();
    });
  });

  return defer.promise;
};
