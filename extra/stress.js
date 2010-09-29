var orm        = require('../'),
    iterations = 10000,
    user,
    comment,
    comment2;

orm.connect();

var User = orm.model('User', {
  name: {type: 'string', required: true},
  email: {type: 'email', email: true},
  key: {type: 'number', unique: true},
  image: {type: 'binary'},

  has_many: ['comments'],
  indexes: ['name']
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
    if (counter % 2) ret.push('old');
    return ret;
  }
});

var buffer = new Buffer('some randome data alksjd as jdlkasj dlaksj dlkas jdkl ajslkd jaslkj doaisjoiawj doi awjd owa');

var counter = 0, done = 0;
var collection = new orm.Collection();

for (var i = 0; i < iterations; i++) {
  counter++;

  user = new User({
    name: 'Tim',
    email: 'test@example.com',
    key: counter,
    image: buffer
  });
  comment = new Comment({
    text: 'This is a comment 1',
    date: Date.now()
  });
  comment2 = new Comment({
    text: 'This is a comment 2',
    date: Date.now()
  });

  user.addComment(comment);
  user.addComment(comment2);

  collection.push(user);
}

collection.save(function (error) {
  User.clear(function (error) {
    Comment.clear(function (error) {
      console.log('done');
    });
  });
});

