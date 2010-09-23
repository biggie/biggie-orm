var orm = require('orm');

orm.pending || (orm.pending = 0);
++orm.pending;

var Collection = orm.Collection;

var User = orm.model('User', {
  name: {type: 'string'},
  email: {type: 'string'},
});

module.exports = {
  setup: function (callback) {
    User.clear(callback);
  },
  'Can create collection': function (assert) {
    var user = new User({
      name: 'Tim'
    });
    var user2 = new User({
      name: 'Bob'
    });
    var users = new Collection([user, user2]);

    assert.ok(users);
    assert.equal(users.length, 2);
    assert.equal(users[0], user);
    assert.equal(users[1], user2);
    assert.equal(users[0].isNew, true);
    assert.equal(users[1].isNew, true);
  },
  'Can save collection': function (assert, done) {
    var user = new User({
      name: 'Tim'
    });
    var user2 = new User({
      name: 'Bob'
    });
    var users = new Collection([user, user2]);

    users.save(function (error, coll) {
      assert.ok(!error);
      assert.equal(users, coll);
      assert.equal(users.length, 2);
      assert.equal(users[0], user);
      assert.equal(users[1], user2);
      assert.equal(users[0].id, 1);
      assert.equal(users[1].id, 2);
      assert.equal(users[0].isNew, false);
      assert.equal(users[1].isNew, false);
      done();
    });
  },
  'Can save mixed collection': function (assert, done) {
    var user = new User({
      name: 'Tim'
    });
    var user2 = new User({
      name: 'Bob'
    });
    var users = new Collection([user, user2]);

    user.save(function (error, model) {
      assert.ok(!error);
      users.save(function (error, coll) {
        assert.ok(!error);
        assert.equal(users, coll);
        assert.equal(users.length, 2);
        assert.equal(users[0], user);
        assert.equal(users[1], user2);
        assert.equal(users[0].id, 1);
        assert.equal(users[1].id, 2);
        assert.equal(users[0].isNew, false);
        assert.equal(users[1].isNew, false);
        done();
      });
    });
  },
  'Can get collection from all()': function (assert, done) {
    var user = new User({
      name: 'Tim'
    });
    var user2 = new User({
      name: 'Bob'
    });
    var users = new Collection([user, user2]);

    users.save(function (error, coll) {
      assert.ok(!error);
      User.all(function (error, users) {
        assert.ok(!error);
        assert.ok(users);
        assert.equal(users.length, 2);
        assert.equal(users[0].id, 1);
        assert.equal(users[1].id, 2);
        assert.equal(users[0].name, 'Tim');
        assert.equal(users[1].name, 'Bob');
        done();
      });
    });
  },
  'Can remove collection': function (assert, done) {
    var user = new User({
      name: 'Tim'
    });
    var user2 = new User({
      name: 'Bob'
    });
    var users = new Collection([user, user2]);

    users.save(function (error, coll) {
      assert.ok(!error);
      users.remove(function (error, coll) {
        assert.ok(!error);
        assert.ok(coll);
        assert.equal(users, coll);
        assert.equal(users.length, 2);
        assert.ok(!users[0].id);
        assert.ok(!users[1].id);
        assert.equal(users[0].isRemoved, true);
        assert.equal(users[1].isRemoved, true);
        assert.equal(users[0].isNew, true);
        assert.equal(users[1].isNew, true);
        User.all(function (error, users) {
          assert.ok(!error);
          assert.ok(users);
          assert.equal(users.length, 0);
          done();
        });
      });
    });
  },
  after: function () {
    --orm.pending || orm.db.end();
  }
};
