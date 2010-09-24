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
    assert.equal(user.changed, false);
    assert.equal(user.is_new,   true);
    assert.equal(user.removed, false);
  },
  'Can create model with new()': function (assert) {
    var user = User.new();

    assert.ok(typeof user === 'object');
    assert.equal(user.changed, false);
    assert.equal(user.is_new,   true);
    assert.equal(user.removed, false);
  },
  'Can create model with attributes': function (assert) {
    var user = new User({
      name: 'Tim'
    });

    assert.ok(user.name === 'Tim');
    assert.equal(user.changed, true);
    assert.equal(user.is_new,   true);
    assert.equal(user.removed, false);

    assert.equal(user.diff.attributes[0], 'name');
  },
  'Can add custom props to models': function (assert) {
    var user = new User({
      name: 'Tim'
    });

    assert.equal(user.getName(), 'Tim');
  },
  'Can save model': function (assert, done) {
    var user = new User({
      name: 'Tim'
    });

    assert.ok(!user.id);
    assert.ok(!user.has_errors);

    user.save(function (error, model) {
      assert.ok(!error);
      assert.equal(user, model);
      assert.ok(!user.is_new);
      assert.ok(user.id);
      assert.equal(user.name, 'Tim');
      assert.equal(user.changed, false);
      assert.equal(user.diff.attributes.length, 0);
      assert.eql(user.previous.attributes, user.attributes);
      done();
    });
  },
  'Can update model': function (assert, done) {
    var user = new User({
      name: 'Tim'
    });

    assert.ok(user.is_new);
    assert.ok(!user.id);
    assert.ok(!user.has_errors);

    user.save(function (error, model) {
      assert.ok(!error);
      user.name = 'Bob';
      user.save(function (error, model) {
        assert.equal(user, model);
        assert.ok(!user.is_new);
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

    assert.ok(!user.has_errors);

    user.save(function (error, model) {
      assert.ok(!error);
      User.get(model.id, function (error, user) {
        assert.ok(!error);
        assert.ok(!user.is_new);
        assert.ok(!user.changed);
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
      assert.ok(user.is_new);
      assert.ok(!user.removed);
      done();
    });
  },
  'Can remove model': function (assert, done) {
    var user = new User({
      name: 'Tim'
    });

    assert.ok(user.is_new);
    assert.ok(!user.id);
    assert.ok(!user.has_errors);

    user.save(function (error, model) {
      assert.ok(!error);
      var id = user.id;
      user.remove(function (error, model) {
        assert.ok(!error);
        assert.equal(model.removed, true);
        assert.ok(model.is_new);
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
