var orm        = require('../'),
    iterations = 100, // Around 1k total model inserts.
    user,
    comment,
    comment2;

orm.connect();

require('./models');
var User    = orm.model('User');
var Comment = orm.model('Comment');

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
  //comment = new Comment({
    //text: 'This is a comment 1',
    //date: Date.now()
  //});
  //comment2 = new Comment({
    //text: 'This is a comment 2',
    //date: Date.now()
  //});

  //user.addComment(comment);
  //user.addComment(comment2);

  collection.push(user);
}

collection.save(function (error) {
  User.all(function (error, coll) {
    var user;
    for (var i = 0, il = coll.length; i < il; i++) {
      user = coll[i];
      user.name = 'Bob';
    }
    coll.save(function (error) {
      //orm.db.end();
      console.log('done');
    });
  });
});

