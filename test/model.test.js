var orm = require('orm');

orm.pending || (orm.pending = 0);
++orm.pending;

var User = orm.model('User', {
  name: {type: 'string'},
  email: {type: 'string'},

  getName: function getName () {
    return this.name;
  }
});

module.exports = {
  setup: function (callback) {
    User.clear(callback);
  },
  'Can create model': function (assert) {
    var user = new User();

    assert.ok(typeof user === 'object');
  },
  'Can create model with attributes': function (assert) {
    var user = new User({
      name: 'Tim'
    });

    assert.ok(user.name === 'Tim');
  },
  'Can add custom props to models': function (assert) {
    var user = new User({
      name: 'Tim'
    });

    assert.ok(user.getName() === 'Tim');
  },
  'Can save model': function (assert, done) {
    var user = new User({
      name: 'Tim'
    });

    assert.ok(user.isNew);
    assert.ok(!user.id);
    assert.ok(!user.hasErrors);

    user.save(function (error, model) {
      assert.ok(!error);
      assert.equal(user, model);
      assert.ok(!user.isNew);
      assert.ok(user.id);
      assert.equal(user.name, 'Tim');
      done();
    });
  },
  'Can save model': function (assert, done) {
    var user = new User({
      name: 'Tim'
    });

    assert.ok(user.isNew);
    assert.ok(!user.id);
    assert.ok(!user.hasErrors);

    user.save(function (error, model) {
      assert.ok(!error);
      assert.equal(user, model);
      assert.ok(!user.isNew);
      assert.ok(user.id);
      assert.equal(user.name, 'Tim');
      done();
    });
  },
  'Can update model': function (assert, done) {
    var user = new User({
      name: 'Tim'
    });

    assert.ok(user.isNew);
    assert.ok(!user.id);
    assert.ok(!user.hasErrors);

    user.save(function (error, model) {
      assert.ok(!error);
      user.name = 'Bob';
      user.save(function (error, model) {
        assert.equal(user, model);
        assert.ok(!user.isNew);
        assert.ok(user.id);
        assert.equal(user.name, 'Bob');
        done();
      });
    });
  },
  'Can get model': function (assert, done) {
    var user = new User({
      name: 'Tim'
    });

    assert.ok(!user.hasErrors);

    user.save(function (error, model) {
      assert.ok(!error);
      User.get(model.id, function (error, user) {
        assert.ok(!error);
        assert.ok(!user.isNew);
        assert.ok(user.id);
        assert.equal(user.name, 'Tim');
        done();
      });
    });
  },
  'Can remove unsaved model': function (assert, done) {
    var user = new User({
      name: 'Tim'
    });

    user.remove(function (error, model) {
      assert.ok(!error);
      assert.equal(user, model);
      assert.ok(user.isNew);
      assert.ok(!user.isRemoved);
      done();
    });
  },
  'Can remove model': function (assert, done) {
    var user = new User({
      name: 'Tim'
    });

    assert.ok(user.isNew);
    assert.ok(!user.id);
    assert.ok(!user.hasErrors);

    user.save(function (error, model) {
      assert.ok(!error);
      var id = user.id;
      user.remove(function (error, model) {
        assert.ok(!error);
        assert.equal(model.isRemoved, true);
        assert.ok(model.isNew);
        User.get(id, function (error, model) {
          assert.ok(!error);
          assert.ok(!model);
          done();
        });
      });
    });
  },
  after: function () {
    --orm.pending || orm.db.end();
  }
};
