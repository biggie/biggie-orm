var orm = require('orm');

orm.pending || (orm.pending = 0);
++orm.pending;

module.exports = {
  'orm exports correct methods': function (assert) {
    assert.ok(typeof orm.createServer === 'function');
  },
  after: function () {
    --orm.pending || orm.db.end();
  }
};
