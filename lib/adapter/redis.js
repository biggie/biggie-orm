var redis  = require('redis'),
    utils  = require('../utils'),
    config = require('../config'),
    noop   = utils.noop;

var client = exports.client = redis.createClient(config.db_port, config.db_host);

exports.end = function end () {
  client.quit();
};

// Generic handleError function for prototypes.
var handleError = function handleError (error) {
  if (this.errorHandled) return false;

  // Error D:
  if (error) {
    this.errorHandled = true;
    this.callback(error);
    this.callback = noop;
    return true;
  }

  // No error!
  return false;
};

// Save a model. Includes:
// * Getting the id if non-existant
// * Updating the views
// * Updating the indexes
// * Update collection
// * Insert model itself

// Wrap to protect namespace from the grips of polution.
(function () {
  var SaveQuery = function SaveQuery (model, callback) {
    this.model    = model;
    this.callback = callback;
  };

  exports.saveModel = function saveModel (model, callback) {
    var query = new SaveQuery(model, callback);

    // Return early if we aren't new and have id
    if (model.id) return query.gotId();

    // Get a model ID
    exports.getId(model.type, function (error, id) {
      if (error) return callback(error);
      model.id = id;
      query.gotId();
    });
  };

  // Extend SaveQuery prototype
  (function () {
    // Chuck on the handleError function
    this.handleError = handleError;

    // We have ID :D
    this.gotId = function gotId () {
      var model = this.model;

      // Make the args array for the redis client
      var attrs_arr = hashToArray(model.attributes, [model.type + ':' + model.id]),
          self      = this;

      // Save the mofo. Use a multi transaction here.
      client.multi([
        ['hmset', attrs_arr, function (error) {
          self.handleError(error);
        }],
        ['sadd', ['collection:' + model.type, model.id], function (error) {
          self.onModelSave(error);
        }]
      ]);
    };

    // On model save - we are done.
    this.onModelSave = function onModelSave (error) {
      if (this.handleError(error)) return;

      // Callback time
      this.callback(null, this.model);
    };
  }).call(SaveQuery.prototype);
})();

// Delete a model. We have to:
// * Remove from indexes
// * Remove from views
// * Remove from collection
// * Remove self

// Wrap to avoid polution.
(function () {
  var RemoveQuery = function RemoveQuery (model, callback) {
    this.model    = model;
    this.callback = callback;
  };

  // Assume we have a model.id
  exports.removeModel = function removeModel (model, callback) {
    var query = new RemoveQuery(model, callback);

    // Multi-time!
    client.multi([
      ['srem', ['collection:' + model.type, model.id], function (error, result) {
        query.handleError(error);
      }],
      ['del', [model.type + ':' + model.id], function (error, result) {
        query.onModelDelete(error, result);
      }]
    ]);
  };

  // RemoveQuery prototype
  (function () {
    // Handle errors.
    this.handleError = handleError;

    // Model delete. Done :)
    this.onModelDelete = function onModelDelete (error, result) {
      if (this.handleError(error)) return;

      // Callback time!
      this.callback(null, this.model);
    };
  }).call(RemoveQuery.prototype);
})();

// Clear a model type.
// * Remove indexes.
// * Remove views
// * Remove collection
// * Remove models

// Wrap to avoid polution.
(function () {
  var ClearQuery = function ClearQuery (type, callback) {
    this.type     = type;
    this.callback = callback;
  };

  // Assume we have a model.id
  exports.clearModelType = function clearModelType (type, callback) {
    var query = new ClearQuery(type, callback);

    // Multi-time!
    client.multi([
      ['del', ['collection:' + type], function (error, result) {
        query.handleError(error);
      }],
      ['del', ['id:' + type], function (error, result) {
        query.handleError(error);
      }]
    ]);

    // Keys
    client.keys(type + ':*', function (error, result) {
      query.onModelKeys(error, result);
    });
  };

  // ClearQuery prototype
  (function () {
    // Handle errors.
    this.handleError = handleError;

    // We have the model keys! They shall die!
    this.onModelKeys = function onModelKeys (error, keys) {
      if (this.handleError(error)) return;

      // Do we event have keys?
      if (!keys) return this.callback();

      // Make the multi transaction
      var trans = [],
          $     = this,
          key,
          fn;

      // Callback fn
      fn = function fn (error) {
        if (error) $.handleError(error);
      };

      // Loop over every model id, and add to transaction
      // We skip the last one so we can add the final callback
      for (var i = 0, il = keys.length - 1; i < il; i++) {
        key = keys[i].toString();
        trans.push(['del', [key], fn]);
      }

      // Our last callback
      trans.push(['del', [keys[keys.length - 1].toString()], function (error) {
        $.onModelsDeleted(error);
      }]);

      // Multi time!
      client.multi(trans);
    };

    // Models deleted. Done.
    this.onModelsDeleted = function onModelsDeleted (error) {
      if (this.handleError(error)) return;

      // Callback the callback yo.
      this.callback();
    };
  }).call(ClearQuery.prototype);
})();

exports.getId = function getId (type, callback) {
  return client.incr('id:' + type, callback);
};

// Convert a hash/object to an array ready for a
// query.
var hashToArray = function hashToArray (hash, ret) {
  ret || (ret = []);
  var keys = Object.keys(hash),
      key;

  // We only want defined attributes
  for (var i = 0, il = keys.length; i < il; i++) {
    key = keys[i];
    if (typeof hash[key] !== 'undefined') {
      ret.push(key);
      ret.push(hash[key]);
    }
  }

  return ret;
};
