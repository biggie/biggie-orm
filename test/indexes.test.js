var orm = require('orm');

orm.connect();

var Collection = orm.Collection;

orm.pending || (orm.pending = 0);
++orm.pending;

var Cat = orm.model('Cat', {
  name: {type: 'string', required: true, unique: true},
  age: {type: 'number'},
  kittens: {type: 'number'},
  tail: {type: 'string'},

  indexes: ['age'],
  has_many: ['toys']
});

var Toy = orm.model('Toy', {
  name: {type: 'string', required: true, unique: true},
  votes: {type: 'number'},

  indexes: ['votes'],
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
  'test find range': function (assert, done) {
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

      Cat.find().some(1, 2, function (error, coll) {
        assert.ok(!error);

        assert.equal(2, coll.length);
        assert.equal('Elmo', coll[0].name);

        done();
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
        assert.equal(5, coll[0].votes);
        done();
      });
    });
  },
  'test find children number': function (assert, done) {
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

      cat.findToys({ votes: 10 }).all(function (error, coll) {
        assert.ok(!error);
        assert.equal(1, coll.length);
        assert.equal('mouse', coll[0].name);
        done();
      });
    });
  },
  'test find children range': function (assert, done) {
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

      cat.findToys({ votes: {gt: 3, lt: 6} }).all(function (error, coll) {
        assert.ok(!error);
        assert.equal(1, coll.length);
        assert.equal('ball', coll[0].name);
        done();
      });
    });
  },
  'test find children some': function (assert, done) {
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

      cat.findToys({ votes: {gt: 3, lt: 12} }).limit(1, function (error, coll) {
        assert.ok(!error);
        assert.equal(1, coll.length);
        assert.equal('mouse', coll[0].name);
        done();
      });
    });
  },
  'test find children intersection': function (assert, done) {
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

      cat.findToys({ name: 'ball', votes: {gt: 6, lt: 12} }).all(function (error, coll) {
        assert.ok(!error);
        assert.equal(0, coll.length);
        done();
      });
    });
  },
  'test find children intersection2': function (assert, done) {
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

      cat.findToys({ name: 'ball', votes: {gt: 2, lt: 12} }).all(function (error, coll) {
        assert.ok(!error);
        assert.equal(1, coll.length);
        assert.equal(5, coll[0].votes);
        done();
      });
    });
  },
  'test find fn': function (assert, done) {
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

      Cat.find(function (cat) {
        if (3 === cat.age) return true;
        return false;
      }).first(function (error, cat) {
        assert.ok(!error);

        assert.equal('Elmo', cat.name);

        done();
      });
    });
  },
  'test find user level': function (assert, done) {
    var cat = new Cat({
      name: 'Tinkerbell',
      age: 5,
      kittens: 12,
      tail: 'fluffy'
    });
    var cat2 = new Cat({
      name: 'Elmo',
      age: 3,
      kittens: 7,
      tail: 'short'
    });
    var cat3 = new Cat({
      name: 'Basil',
      age: 1,
      kittens: 2,
      tail: 'lanky'
    });
    var cats = new Collection([cat, cat2, cat3]);

    cats.save(function (error) {
      assert.ok(!error);

      Cat.find({
        tail: 'short',
        kittens: {
          gt: 8,
          lt: 10
        }
      }).all(function (error, coll) {
        assert.ok(!error);

        assert.equal(0, coll.length)

        done();
      });
    });
  },
  'test find user level2': function (assert, done) {
    var cat = new Cat({
      name: 'Tinkerbell',
      age: 5,
      kittens: 12,
      tail: 'fluffy'
    });
    var cat2 = new Cat({
      name: 'Elmo',
      age: 3,
      kittens: 7,
      tail: 'short'
    });
    var cat3 = new Cat({
      name: 'Basil',
      age: 1,
      kittens: 2,
      tail: 'lanky'
    });
    var cats = new Collection([cat, cat2, cat3]);

    cats.save(function (error) {
      assert.ok(!error);

      Cat.find({
        kittens: {
          gt: 9,
          lt: 15
        }
      }).all(function (error, coll) {
        assert.ok(!error);

        assert.equal(1, coll.length)
        assert.equal('Tinkerbell', coll[0].name);

        done();
      });
    });
  },
  'test find user level3': function (assert, done) {
    var cat = new Cat({
      name: 'Tinkerbell',
      age: 5,
      kittens: 12,
      tail: 'fluffy'
    });
    var cat2 = new Cat({
      name: 'Elmo',
      age: 3,
      kittens: 7,
      tail: 'short'
    });
    var cat3 = new Cat({
      name: 'Basil',
      age: 1,
      kittens: 2,
      tail: 'lanky'
    });
    var cats = new Collection([cat, cat2, cat3]);

    cats.save(function (error) {
      assert.ok(!error);

      Cat.find({
        kittens: 7
      }).all(function (error, coll) {
        assert.ok(!error);

        assert.equal(1, coll.length)
        assert.equal('Elmo', coll[0].name);

        done();
      });
    });
  },
  after: function () {
    --orm.pending || orm.db.end();
  }
};
