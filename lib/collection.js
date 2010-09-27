var utils      = require('./utils'),
    config     = require('./config'),
    validator  = require('./validations').validateCollection,
    Task       = require('parallel').Task,
    noop       = utils.noop;

// A collection is just an array, with some extra methods.
var Collection = function Collection (array) {
  if (array) this.push.apply(this, array);
  this.has_errors = false;
  this.errors     = [];
};

// These get set by orm.js
Collection.orm = null;
Collection.db  = null;

// Export it
module.exports = Collection;

// Inherit from Array.prototype
Collection.prototype = Object.create(Array.prototype);

// Extend the prototype
(function () {
  this.validate = function validate (callback) {
    // Validate collection.
    callback || (callback = noop);

    var self = this;

    validator(this, function (has_errors, errors) {
      self.has_errors = has_errors;
      self.errors     = errors;
      callback(has_errors, errors);
    });
  };

  // Save / update all models in a collection.
  // We could just call save() on all the models,
  // but we want to make sure the query is optimised.
  this.save = function save (callback) {
    callback || (callback = noop);
    var self = this;

    if (self.has_errors) {
      return callback(self.errors);
    }

    this.validate(function () {
      // If it has model's with errors, don't save.
      if (self.has_errors) {
        return callback(self.errors);
      }

      Collection.db.saveCollection(self, callback);
    });
  };

  // Remove models in collection where we can
  this.remove = function remove (callback) {
    return Collection.db.removeCollection(this, callback);
  };
}).call(Collection.prototype);
