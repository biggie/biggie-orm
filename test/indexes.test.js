var orm = require('orm');

var Collection = orm.Collection;

orm.pending || (orm.pending = 0);
++orm.pending;

var Cat = orm.model('Cat', {
  name: {type: 'string', required: true, unique: true},
  age:  {type: 'number'},

  indexes: ['age'],
  has_many: ['toys']
});

var Toy = orm.model('Toy', {
  name: {type: 'string', required: true, unique: true},
  votes: {type: 'number'},

  indexes: ['votes'],
  plural: 'toys',
  belongs_to: ['cat']
});

module.exports = {
  setup: function (callback) {
    Cat.clear(function () {
      Toy.clear(callback);
    });
  },
  'test create indexes': function (assert, done) {
    var cat = new Cat({
      name: 'Tinkerbell',
      age: 5
    });

    cat.save(function (error) {
      assert.ok(!error);
      assert.ok(!cat.has_errors);
      done();
    });
  },
  'test find simple query': function (assert, done) {
    var cat = new Cat({
      name: 'Tinkerbell',
      age: 5
    });

    cat.save(function (error) {
      assert.ok(!error);

      Cat.find({ name: 'Tinkerbell' }).all(function (error, coll) {
        done();
      });
    });
  },
  'test find set query': function (assert, done) {
    var cat = new Cat({
      name: 'Tinkerbell',
      age: 5
    });

    cat.save(function (error) {
      assert.ok(!error);

      Cat.find({ age: 5 }).all(function (error, coll) {
        done();
      });
    });
  },
  'test find range query': function (assert, done) {
    var cat = new Cat({
      name: 'Tinkerbell',
      age: 5
    });

    cat.save(function (error) {
      assert.ok(!error);

      Cat.find({ age: {lt: 10, gt: 3} }).all(function (error, coll) {
        done();
      });
    });
  },
  'test find multiple': function (assert, done) {
    var cat = new Cat({
      name: 'Tinkerbell',
      age: 5
    });
    var cat2 = new Cat({
      name: 'Elmo',
      age: 3
    });
    var cat3 = new Cat({
      name: 'Basil',
      age: 1
    });
    var cats = new Collection([cat, cat2, cat3]);

    cats.save(function (error) {
      assert.ok(!error);

      Cat.find({ age: 3 }).all(function (error, coll) {
        assert.ok(!error);

        assert.equal(1, coll.length);
        assert.equal('Elmo', coll[0].name);

        Cat.find({ age: {gt: 0, lt: 10} }).limit(2, function (error, coll) {
          assert.ok(!error);

          assert.equal(2, coll.length);
          done();
        });
      });
    });
  },
  'test find children simple': function (assert, done) {
    var cat = new Cat({
      name: 'Elmo',
      age: 5
    });
    var toy = new Toy({
      name: 'ball',
      votes: 5
    });
    var toy2 = new Toy({
      name: 'mouse',
      votes: 10
    });

    cat.addToy(toy);
    cat.addToy(toy2);

    cat.save(function (error) {
      assert.ok(!error);

      cat.findToys({ name: 'ball' }).all(function (error, coll) {
        assert.ok(!error);
        assert.equal(1, coll.length);
        done();
      });
    });
  },
  after: function () {
    --orm.pending || orm.db.end();
  }
};
