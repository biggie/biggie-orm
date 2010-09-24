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
    Project.clear(callback);
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

    console.dir(project.diff.associations);
    console.dir(task.diff.associations);
    console.dir(comment.diff.associations);
    console.dir(comment2.diff.associations);
  },
  'test has_one + belongs_to': function (assert, done) {
    // FIXME: Remove
    return done();
    var project = Project.new({
      name: 'test'
    });

    var task = Task.new({
      name: 'do it'
    });

    assert.ok(!project.has_errors);
    assert.ok(!task.has_errors);

    project.setTask(task);

    project.getTask(function (error, model) {
      assert.ok(!error);
      assert.equal(model, task);

      project.save(function (error) {
        assert.ok(!error);

        assert.equal(task.is_new, false);
        assert.ok(task.id);
        assert.equal(project.task_id, task.id);
        assert.ok(task.project_id, project.id);

        done();
      });
    });

  },
  'test has_many and belongs_to': function (assert, done) {
    // FIXME: Remove
    return done();
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

    project.save(function (error) {
      assert.ok(!error);

      project.setComments(comments, function (error) {
        assert.ok(!error);

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
  after: function () {
    --orm.pending || orm.db.end();
  }
};
