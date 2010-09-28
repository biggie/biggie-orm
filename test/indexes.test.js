var orm = require('orm');

orm.pending || (orm.pending = 0);
++orm.pending;

module.exports = {
  after: function () {
    --orm.pending || orm.db.end();
  }
};
