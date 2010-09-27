var orm = require('orm'),
    v   = require('../lib/validations');

orm.pending || (orm.pending = 0);
++orm.pending;

var string = 'testing',
    buffer = new Buffer(string + 'buffer'),
    number = 321,
    email  = 'tim@fostle.com';

var SafeCar = orm.model('SafeCar', {
  name:  {type: 'string'},
  count: {type: 'number'},
  data:  {type: 'binary'}
});

var Car = orm.model('Car', {
  name:   {type: 'string', unique: true, required: true},
  count:  {type: 'number', unique: true},
  dealer: {type: 'string', email: true},
  owner:  {type: 'string', unique: true, email: true},
  data:   {type: 'binary'}
});

module.exports = {
  setup: function (callback) {
    Car.clear(callback);
  },
  'Can pass validation sync': function (assert) {
    var car = new Car({
      name:   string,
      count:  number,
      dealer: email,
      owner:  email,
      data:   buffer
    });

    var errors = car.validate();
    assert.equal(errors, false);
  },
  'Can pass validation async': function (assert, done) {
    var car = new Car({
      name:   string,
      count:  number,
      dealer: email,
      owner:  email,
      data:   buffer
    });

    car.validate(function (error) {
      assert.equal(error, false);
      done();
    });
  },
  'test basic model sync': function (assert) {
    var car = new SafeCar({
      name: string,
      count: number,
      data: buffer
    });

    var errors = car.validate();

    assert.equal(errors, false);
  },
  'test require fail sync': function (assert, done) {
    var car = new Car({
      count:  number,
      dealer: email,
      owner:  email,
      data:   buffer
    });

    var errors = car.validate();
    assert.ok(errors);
    assert.equal(errors, car.errors);
    assert.equal(v.EREQUIRED, errors.name.errno);

    car.validate(function (error) {
      assert.equal(error, true);
      assert.eql(['name'], Object.keys(car.errors));
      assert.equal(v.EREQUIRED, car.errors.name.errno);
      done();
    });
  },
  after: function () {
    --orm.pending || orm.db.end();
  }
};
