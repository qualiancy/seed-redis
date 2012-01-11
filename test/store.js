var should = require('chai').should()
  , Seed = require('seed')
  , RedisStore = require('..');

describe('Seed FileStore', function () {

  var Store = new RedisStore.Store();
  
  it('should have a version', function () {
    RedisStore.version.should.match(/^\d+\.\d+\.\d+$/);
  });

  describe('Models', function () {

    var Person = Seed.Model.extend('traveller', {
        store: Store
    });

    var arthur = new Person({
        name: 'Arthur Dent'
      , occupation: 'traveller'
    });

    it('should allow saving', function (done) {
      arthur.save(function (err) {
        var id = this.id;
        should.not.exist(err);
        done();
      });
    });

    it('should allow retrieval', function (done) {
      var arthur2 = new Person({
          id: arthur.id
      });

      arthur2.fetch(function (err) {
        should.not.exist(err);
        arthur2.get('name').should.equal(arthur.get('name'));
        done();
      });
    });

    it('should allow for removal', function (done) {
      arthur.destroy(function (err) {
        var id = this.id;
        should.not.exist(err);
        done();
      });
    });

  });

});
