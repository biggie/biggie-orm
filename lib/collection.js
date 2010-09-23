var db     = require('./db'),
    utils  = require('./utils'),
    config = require('./config'),
    noop   = utils.noop;

// A collection is just an array, with some extra methods.
var Collection = function Collection (array) {
  if (array) this.push.apply(this, array);
};

// Export it
module.exports = Collection;

// Inherit from Array.prototype
Collection.prototype = Object.create(Array.prototype);

// Extend the prototype
(function () {
  // TODO: Implement:
  // * save()
  // * remove()

  // Save / update all models in a collection.
  // We could just call save() on all the models,
  // but we want to make sure the query is optimised.
  this.save = function save (callback) {
    return db.saveCollection(this, callback);
  };

  // Remove models in collection where we can
  this.remove = function remove (callback) {
    return db.removeCollection(this, callback);
  };
}).call(Collection.prototype);
