var orm = require('orm');

var User = orm.model('User', {
  name: {type: 'string'},
  email: {type: 'string'},

  getName: function getName () {
    return this.name;
  }
});

module.exports = {
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
  }
};
