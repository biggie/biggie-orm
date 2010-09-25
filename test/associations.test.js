var orm        = require('orm'),
    Collection = orm.Collection;

orm.pending || (orm.pending = 0);
++orm.pending;

var Project = orm.model('Project', {
  name: {type: 'string'},

  has_one: ['task'],
  has_many: ['comments']
});

var Task = orm.model('Task', {
  name: {type: 'string'},

  belongs_to: ['project'],
  has_many: ['comments']
});

var Comment = orm.model('Comment', {
  text: {type: 'string'},

  plural: 'comments',
  belongs_to: ['project', 'task']
});

module.exports = {
  setup: function (callback) {
    Project.clear(function (error) {
      Task.clear(function (error) {
        Comment.clear(callback);
      });
    });
  },
  'test association creation': function (assert) {
    var project = Project.new({
      name: 'test'
    });

    var task = Task.new({
      name: 'do it'
    });

    var comment = Comment.new({
      text: 'do it'
    });
    var comment2 = Comment.new({
      text: 'do it again'
    });

    assert.ok(!project.has_errors);
    assert.ok(!task.has_errors);
    assert.ok(!comment.has_errors);
    assert.ok(!comment2.has_errors);

    var comments  = new Collection([comment]);
    var comments2 = new Collection([comment2]);

    project.setTask(task);
    project.addComments(comments);

    task.addComments(comments2);

    assert.equal(project.diff.associations['comment'], comments);
  },
  'test has_one + belongs_to': function (assert, done) {
    var project = Project.new({
      name: 'test'
    });

    var task = Task.new({
      name: 'do it'
    });

    assert.ok(!project.has_errors);
    assert.ok(!task.has_errors);

    project.setTask(task);

    project.save(function (error) {
      assert.ok(!error);

      assert.equal(task.is_new, false);
      assert.ok(task.id);
      assert.equal(project.task_id, task.id);
      assert.ok(task.project_id, project.id);

      done();
    });
  },
  'test has_many and belongs_to': function (assert, done) {
    var project = Project.new({
      name: 'test'
    });

    var comment = Comment.new({
      text: 'do it'
    });
    var comment2 = Comment.new({
      text: 'do it again'
    });

    assert.ok(!project.has_errors);
    assert.ok(!comment.has_errors);
    assert.ok(!comment2.has_errors);

    var comments = new Collection([comment, comment2]);

    project.addComments(comments);

    project.save(function (error) {
      assert.ok(!error);

      assert.equal(comment.is_new, false);
      assert.equal(comment2.is_new, false);
      assert.ok(comment.id);
      assert.ok(comment2.id);
      assert.equal(comment.project_id,  project.id);
      assert.equal(comment2.project_id, project.id);

      done();
    });
  },
  'test has_one + get': function (assert, done) {
    var project = Project.new({
      name: 'test'
    });

    var task = Task.new({
      name: 'do it'
    });

    assert.ok(!project.has_errors);
    assert.ok(!task.has_errors);

    project.setTask(task);

    project.save(function (error) {
      assert.ok(!error);

      project.getTask(function (error, task) {
        assert.ok(!error);
        assert.ok(task);

        assert.equal(task.is_new, false);
        assert.ok(task.id);
        assert.equal(project.task_id, task.id);
        assert.ok(task.project_id, project.id);

        done();
      });
    });
  },
  'test has_many and get': function (assert, done) {
    var project = Project.new({
      name: 'test'
    });

    var comment = Comment.new({
      text: 'do it'
    });
    var comment2 = Comment.new({
      text: 'do it again'
    });

    assert.ok(!project.has_errors);
    assert.ok(!comment.has_errors);
    assert.ok(!comment2.has_errors);

    var comments = new Collection([comment, comment2]);

    project.addComments(comments);

    project.save(function (error) {
      assert.ok(!error);

      project.getComments(function (error, comments) {
        assert.ok(!error);
        assert.ok(comments);

        assert.equal(comments.length, 2);
        comment = comments[0];
        comment2 = comments[1];

        assert.equal(comment.is_new, false);
        assert.equal(comment2.is_new, false);
        assert.ok(comment.id);
        assert.ok(comment2.id);
        assert.equal(comment.project_id,  project.id);
        assert.equal(comment2.project_id, project.id);

        done();
      });
    });
  },
  'test has_one + get + remove': function (assert, done) {
    var project = Project.new({
      name: 'test'
    });

    var task = Task.new({
      name: 'do it'
    });

    assert.ok(!project.has_errors);
    assert.ok(!task.has_errors);

    project.setTask(task);

    project.save(function (error) {
      assert.ok(!error);

      project.getTask(function (error, task) {
        assert.ok(!error);

        task.remove(function (error) {
          assert.ok(!error);

          assert.equal(task.removed, true);
          assert.ok(!task.id);
          done();
        });
      });
    });
  },
  'test has_many and get + remove': function (assert, done) {
    var project = Project.new({
      name: 'test'
    });

    var comment = Comment.new({
      text: 'do it'
    });
    var comment2 = Comment.new({
      text: 'do it again'
    });

    assert.ok(!project.has_errors);
    assert.ok(!comment.has_errors);
    assert.ok(!comment2.has_errors);

    var comments = new Collection([comment, comment2]);

    project.addComments(comments);

    project.save(function (error) {
      assert.ok(!error);

      project.getComments(function (error, comments) {
        assert.ok(!error);

        comments.remove(function (error, coll) {
          assert.ok(!error);

          assert.equal(comments.length, 2);
          assert.equal(comments, coll);
          comment = comments[0];
          comment2 = comments[1];

          assert.equal(comment.is_new,  true);
          assert.equal(comment2.is_new, true);
          assert.equal(comment.removed,  true);
          assert.equal(comment2.removed, true);
          assert.ok(!comment.id);
          assert.ok(!comment2.id);

          done();
        });
      });
    });
  },
  after: function () {
    --orm.pending || orm.db.end();
  }
};
