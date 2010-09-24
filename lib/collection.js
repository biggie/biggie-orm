var utils  = require('./utils'),
    config = require('./config'),
    noop   = utils.noop;

// A collection is just an array, with some extra methods.
var Collection = function Collection (array) {
  if (array) this.push.apply(this, array);
};

// These get set by orm.js
var db = Collection.db = null;

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
    return Collection.db.saveCollection(this, callback);
  };

  // Remove models in collection where we can
  this.remove = function remove (callback) {
    return Collection.db.removeCollection(this, callback);
  };
}).call(Collection.prototype);
