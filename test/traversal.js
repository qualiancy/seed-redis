var chai = require('chai')
  , should = chai.should();

var Seed = require('seed')
  , Hash = Seed.Hash
  , Model = Seed.Model
  , Graph = Seed.Graph;

var Edge = require(require.resolve('seed/lib/seed/graph/edge/model'));

var RedisStore = require('..');

var testopts = {
    auto_connect: false
  , host: 'localhost'
  , port: 27017
  , db: 'mongostore_test_graph_traversal'
}

describe('Graph Traversal', function () {
  var Person = Model.extend('person')
    , store = new RedisStore({ db: 6 })
    , g = new Graph({ type: 'redis', store: store })
    , doctor = new Person({ name: 'The Doctor' })
    , song = new Person({ name: 'River Song' })
    , pond = new Person({ name: 'Amy Pond' })
    , williams = new Person({ name: 'Rory Williams' });

  before(function (done) {
    g.define(Person);

    g.set(doctor);
    g.set(song);
    g.set(pond);
    g.set(williams);

    g.relate(doctor, song, 'married');
    g.relate(song, doctor, 'married');
    g.relate(pond, williams, 'married');
    g.relate(williams, pond, 'married');
    g.relate(pond, doctor, 'companion');
    g.relate(williams, pond, 'companion');

    g.push(function (err) {
      if (err) throw err;
      done();
    });
  });

  beforeEach(function () {
    g.flush();
  });

  after(function (done) {
    store.client.flushdb();
    store.client.quit(done);
  });

  it('should allow for a `out` EDGES', function (done) {
    g.should.have.length(0);
    g._edges.should.have.length(0);

    g.set(pond);

    var traverse = g.traverse({ live: true });
    traverse
      .select(pond)
      .outE
      .end(function (err, hash) {
        should.not.exist(err);
        hash.should.be.instanceof(Hash);
        hash.should.have.length(2);
        hash.each(function (e) {
          e.should.be.instanceof(Edge);
          e.get('x').should.eql(pond);
        });
        done();
      });
  });

  it('should allow for a `out` relation filtered EDGES', function (done) {
    g.should.have.length(0);
    g._edges.should.have.length(0);

    g.set(pond);

    var traverse = g.traverse({ live: true });
    traverse
      .select(pond)
      .outE('married')
      .end(function (err, hash) {
        should.not.exist(err);
        hash.should.be.instanceof(Hash);
        hash.should.have.length(1);

        var edge = hash.at(0);
        edge.should.be.instanceof(Edge);
        edge.get('x').should.eql(pond);
        edge.get('y.$id').should.equal(williams.id);
        done();
      });
  });

  it('should allow for `in` EDGES', function (done) {
    g.should.have.length(0);
    g._edges.should.have.length(0);

    g.set(pond);

    var traverse = g.traverse({ live: true });
    traverse
      .select(pond)
      .inE
      .end(function (err, hash) {
        should.not.exist(err);
        hash.should.be.instanceof(Hash);
        hash.should.have.length(2);
        hash.each(function (e) {
          e.should.be.instanceof(Edge);
          e.get('y').should.eql(pond);
        });
        done();
      });
  });

  it('should allow for a `in` relation filtered EDGES', function (done) {
    g.should.have.length(0);
    g._edges.should.have.length(0);

    g.set(pond);

    var traverse = g.traverse({ live: true });
    traverse
      .select(pond)
      .inE('married')
      .end(function (err, hash) {
        should.not.exist(err);
        hash.should.be.instanceof(Hash);
        hash.should.have.length(1);

        var edge = hash.at(0);
        edge.should.be.instanceof(Edge);
        edge.get('y').should.eql(pond);
        edge.get('x.$id').should.equal(williams.id);
        done();
      });
  });

  it('should allow for `out` VERTICES', function (done) {
    g.should.have.length(0);
    g._edges.should.have.length(0);

    g.set(pond);

    var traverse = g.traverse({ live: true });
    traverse
      .select(pond)
      .out
      .end(function (err, hash) {
        should.not.exist(err);
        hash.should.be.instanceof(Hash);
        hash.should.have.length(2);
        hash.keys.should.include('/person/' + williams.id, '/person/' + doctor.id);
        done();
      });
  });

  it('should allow for `out` filtered VERTICES', function (done) {
    g.should.have.length(0);
    g._edges.should.have.length(0);

    g.set(pond);

    var traverse = g.traverse({ live: true });
    traverse
      .select(pond)
      .out('married')
      .end(function (err, hash) {
        should.not.exist(err);
        hash.should.be.instanceof(Hash);
        hash.should.have.length(1);
        hash.at(0).id.should.equal(williams.id);
        hash.at(0).get('name').should.equal(williams.get('name'));
        done();
      });
  });

  it('should allow for `in` VERTICES', function (done) {
    g.should.have.length(0);
    g._edges.should.have.length(0);

    g.set(doctor);

    var traverse = g.traverse({ live: true });
    traverse
      .select(doctor)
      .in
      .end(function (err, hash) {
        should.not.exist(err);
        hash.should.be.instanceof(Hash);
        hash.should.have.length(2);
        hash.keys.should.include('/person/' + pond.id, '/person/' + song.id);
        done();
      });
  });

  it('should allow for `in` filtered VERTICES', function (done) {
    g.should.have.length(0);
    g._edges.should.have.length(0);

    g.set(doctor);

    var traverse = g.traverse({ live: true });
    traverse
      .select(doctor)
      .in('married')
      .end(function (err, hash) {
        should.not.exist(err);
        hash.should.be.instanceof(Hash);
        hash.should.have.length(1);
        hash.at(0).id.should.equal(song.id);
        hash.at(0).get('name').should.equal(song.get('name'));
        done();
      });
  });
});
