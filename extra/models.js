var orm = require('../');

var counter = 0;

var User = orm.model('User', {
  name: {type: 'string', required: true},
  email: {type: 'string', email: true},
  //key: {type: 'number', unique: true},
  key: {type: 'number'},
  image: {type: 'binary'},

  //has_many: ['comments'],
  //indexes: ['name']
});

var Comment = orm.model('Comment', {
  text: {type: 'string'},
  date: {type: 'number'},

  plural: 'comments',
  indexes: ['date'],
  belongs_to: ['user'],
  views: ['old'],
  viewCallback: function () {
    var ret = [];
    if (++counter % 2) ret.push('old');
    return ret;
  }
});
