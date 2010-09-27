var orm = require('orm'),
    v   = require('../lib/validations');

var Collection = orm.Collection;

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
  'test type string': function (assert) {
    assert.isNull(orm.property_types.string(function () {}));
    assert.equal('test', orm.property_types.string('test'));
    assert.equal('{"test":123}', orm.property_types.string({test: 123}));
  },
  'test type number': function (assert) {
    assert.isNull(orm.property_types.number(function () {}));
    assert.isNull(orm.property_types.number('test'));
    assert.equal(123, orm.property_types.number('123'));
    assert.equal(321, orm.property_types.number(321));
  },
  'test type binary': function (assert) {
    assert.isNull(orm.property_types.binary(function () {}));
    assert.equal('test', orm.property_types.binary('test').toString());
    assert.equal('test', orm.property_types.binary(new Buffer('test')).toString());
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
  'test require fail': function (assert, done) {
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
  'test type fail': function (assert, done) {
    var car = new Car({
      name:   string,
      count:  string,
      dealer: email,
      owner:  email,
      data:   buffer
    });

    var errors = car.validate();
    assert.ok(errors);
    assert.equal(errors, car.errors);
    assert.eql(['count'], Object.keys(errors));
    assert.equal(v.ETYPE, errors.count.errno);

    car.validate(function (error) {
      assert.equal(error, true);
      assert.eql(['count'], Object.keys(car.errors));
      assert.equal(v.ETYPE, car.errors.count.errno);
      done();
    });
  },
  'test valid fail': function (assert, done) {
    var car = new Car({
      name:   string,
      count:  number,
      dealer: string,
      owner:  email,
      data:   buffer
    });

    var errors = car.validate();
    assert.ok(errors);
    assert.equal(errors, car.errors);
    assert.eql(['dealer'], Object.keys(errors));
    assert.equal(v.EVALID, errors.dealer.errno);

    car.validate(function (error) {
      assert.equal(error, true);
      assert.eql(['dealer'], Object.keys(car.errors));
      assert.equal(v.EVALID, errors.dealer.errno);
      done();
    });
  },
  'test unique fail': function (assert, done) {
    var car = new Car({
      name:   string,
      count:  number,
      dealer: email,
      owner:  email,
      data:   buffer
    });
    var car2 = new Car({
      name:   string,
      count:  number,
      dealer: email,
      owner:  email,
      data:   buffer
    });

    var errors = car.validate();
    assert.ok(!errors);

    car.save(function (error) {
      assert.ok(!error);

      car2.save(function (error) {
        assert.eql(['name', 'count', 'owner'], error);

        assert.equal(v.EUNIQUE, car2.errors.name.errno);

        done();
      });
    });
  },
  'test collection unique fail': function (assert, done) {
    var car = new Car({
      name:   string,
      count:  number,
      dealer: email,
      owner:  email,
      data:   buffer
    });
    var car2 = new Car({
      name:   string,
      count:  number,
      dealer: email,
      owner:  email,
      data:   buffer
    });

    var cars = new Collection([car, car2]);

    cars.save(function (error) {
      assert.ok(error);

      assert.equal(error.length, 1);
      assert.equal(car2, error[0]);
      assert.equal(v.EUNIQUE, car2.errors.name.errno);

      done();
    });
  },
  'test collection unique fail': function (assert, done) {
    var car = new Car({
      name:   string,
      count:  number,
      dealer: email,
      owner:  email,
      data:   buffer
    });
    var car2 = new Car({
      name:   string + 'different',
      count:  number + 123,
      dealer: email,
      owner:  email + '.nz',
      data:   buffer
    });
    var car3 = new Car({
      name:   string,
      count:  number,
      dealer: email,
      owner:  email,
      data:   buffer
    });

    var cars = new Collection([car2, car3]);

    car.save(function (error) {
      assert.ok(!error);

      cars.save(function (error) {
        assert.ok(error);

        assert.equal(1, error.length);
        assert.equal(car3, error[0]);
        assert.equal(v.EUNIQUE, car3.errors.name.errno);
        assert.equal(v.EUNIQUE, car3.errors.count.errno);
        assert.equal(v.EUNIQUE, car3.errors.owner.errno);
        done();
      });
    });
  },
  'test collection type fail': function (assert, done) {
    var car = new Car({
      name:   string,
      count:  'fail',
      dealer: email,
      owner:  email,
      data:   buffer
    });
    var car2 = new Car({
      name:   string + 'different',
      count:  'fail also',
      dealer: email,
      owner:  email + '.nz',
      data:   buffer
    });

    var cars = new Collection([car, car2]);

    cars.save(function (error) {
      assert.ok(error);

      assert.equal(error.length, 2);
      assert.equal(car, error[0]);
      assert.equal(car2, error[1]);
      assert.equal(v.ETYPE, car.errors.count.errno);
      assert.equal(v.ETYPE, car2.errors.count.errno);

      done();
    });
  },
  'test collection valid fail': function (assert, done) {
    var car = new Car({
      name:   string,
      count:  number,
      dealer: email,
      owner:  email,
      data:   buffer
    });
    var car2 = new Car({
      name:   string + 'different',
      count:  number + 123,
      dealer: email,
      owner:  string,
      data:   buffer
    });

    var cars = new Collection([car, car2]);

    cars.save(function (error) {
      assert.ok(error);

      assert.equal(error.length, 1);
      assert.equal(car2, error[0]);
      assert.equal(v.EVALID, car2.errors.owner.errno);

      done();
    });
  },
  'test collection required fail': function (assert, done) {
    var car = new Car({
      name:   string,
      count:  number,
      dealer: email,
      owner:  email,
      data:   buffer
    });
    var car2 = new Car({
      count:  number + 123,
      dealer: email,
      owner:  email + '.nz',
      data:   buffer
    });

    var cars = new Collection([car, car2]);

    cars.save(function (error) {
      assert.ok(error);

      assert.equal(error.length, 1);
      assert.equal(car2, error[0]);
      assert.equal(v.EREQUIRED, car2.errors.name.errno);

      done();
    });
  },
  after: function () {
    --orm.pending || orm.db.end();
  }
};
