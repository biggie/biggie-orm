var orm = require('orm');

orm.pending || (orm.pending = 0);
++orm.pending;

var Project = orm.model('Project', {
  name: {type: 'string'},

  has_one: ['task']
});

var Task = orm.model('Task', {
  name: {type: 'string'},

  belongs_to: ['project'],
  has_many: ['comments']
});

var Comment = orm.model('Comment', {
  text: {type: 'string'},

  belongs_to: ['task']
});

module.exports = {
  setup: function (callback) {
    Project.clear(callback);
  },
  after: function () {
    --orm.pending || orm.db.end();
  }
};
