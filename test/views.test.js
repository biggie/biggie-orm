var orm = require('orm');

orm.connect();

orm.pending || (orm.pending = 0);
++orm.pending;

var Town = orm.model('Town', {
  name: {type: 'string'},

  has_many: ['houses']
});

var House = orm.model('House', {
  age: {type: 'number'},

  views: ['old', 'new'],
  viewCallback: function () {
    var views = [];

    if (+this.age > 10)     views.push('old');
    else if (+this.age < 5) views.push('new');

    return views;
  },
  belongs_to: ['town']
});

module.exports = {
  setup: function (callback) {
    Town.clear(function () {
      House.clear(callback);
    });
  },
  'test create model with views': function (assert) {
    var house = new House({
      age: 20
    });

    assert.equal(false, house.validate());
    assert.eql(['old', 'new'], house.views);
    assert.eql(['old'], house.viewCallback());
  },
  'test save model with views': function (assert, done) {
    var house = new House({
      age: 20
    });

    house.save(function (error) {
      assert.ok(!error);

      assert.eql(['old', 'new'], house.views);
      assert.eql(['old'], house.viewCallback());

      done();
    });
  },
  'test get view collection': function (assert, done) {
    var house = new House({
      age: 20
    });

    house.save(function (error) {
      assert.ok(!error);

      House.getOld(function (error, coll) {
        assert.ok(!error);

        assert.equal(1, coll.length);
        assert.equal(20, coll[0].age);
        done();
      });
    });
  },
  'test save associations with views': function (assert, done) {
    var town = new Town({
      name: 'Feilding'
    });

    var house = new House({
      age: 20
    });
    var new_house = new House({
      age: 3
    });

    town.addHouse(house);
    town.addHouse(new_house);

    town.save(function (error) {
      assert.ok(!error);
      done();
    });
  },
  'test get associations with views': function (assert, done) {
    var town = new Town({
      name: 'Feilding'
    });

    var house = new House({
      age: 20
    });
    var new_house = new House({
      age: 3
    });

    town.addHouse(house);
    town.addHouse(new_house);

    town.save(function (error) {
      assert.ok(!error);

      town.getNewHouses(function (error, coll) {
        assert.ok(!error);

        assert.equal(1, coll.length);
        assert.equal(3, coll[0].age);
        done();
      });
    });
  },
  after: function () {
    --orm.pending || orm.db.end();
  }
};
