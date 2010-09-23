var redis      = require('redis'),
    utils      = require('../utils'),
    config     = require('../config'),
    Collection = require('../collection'),
    noop       = utils.noop;

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
  var Query = function Query (model, callback) {
    this.model    = model;
    this.callback = callback;
  };

  exports.saveModel = function saveModel (model, callback) {
    callback || (callback = noop);
    var query = new Query(model, callback);

    // Return early if we aren't new and have id
    // We are just doing an update.
    if (model.id) return query.gotId();

    // Get a model ID
    exports.getId(model.type, function (error, id) {
      if (error) return callback(error);

      model.id = id;
      query.gotId();
    });
  };

  // Extend Query prototype
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
  }).call(Query.prototype);
})();

// Get a model.
// We need a prototype query as it seems hmget behaves the same
// whether the key exists or not.

// Wrap to prevents the likes of the BP oil spill.
(function () {
  var Query = function Query (model, id, callback) {
    this.model    = model;
    this.id       = +id;
    this.keys     = Object.keys(model.prototype.properties);
    this.callback = callback;
  };

  exports.getModel = function getModel (model, id, callback) {
    callback || (callback = noop);
    // Return early if we have a bad id
    if (!id) return callback(null, new model());

    // Do we has action?
    client.exists(model.type + ':' + id, function (error, exists) {
      if (error)   return callback(error);
      if (!exists) return callback(null, null);

      // Next step...
      var query = new Query(model, id, callback);
      query.onModelExists();
    });
  };

  // Extend the query prototype
  (function () {
    // ZOMG. It really does exist!
    this.onModelExists = function onModelExists () {
      var model      = this.model,
          id         = this.id;
          query      = [model.type + ':' + id],
          $          = this;

      // Make the query
      for (var i = 0, il = this.keys.length; i < il; i++) {
        query.push(this.keys[i]);
      }

      // Get the goods
      client.hmget(query, function (error, results) {
        if (error)    return $.callback(error);
        if (!results) return $.callback(null, results);

        $.onModelGet(results);
      });
    };

    // We have our dataz. Loverly dataz.
    this.onModelGet = function onModelGet (results) {
      var ret = {},
          key;

      // hmget returns a array of values
      for (var i = 0, il = this.keys.length; i < il; i++) {
        key      = this.keys[i];
        ret[key] = Buffer.isBuffer(results[i]) ? results[i].toString() : results[i];
      }

      // Make the model
      ret       = new this.model(ret);
      ret.id    = this.id;
      ret.isNew = false;

      // Callback
      this.callback(null, ret);
    };
  }).call(Query.prototype);
})();

// Delete a model. We have to:
// * Remove from indexes
// * Remove from views
// * Remove from collection
// * Remove self

// Wrap to avoid polution.
(function () {
  var Query = function Query (model, callback) {
    this.model    = model;
    this.callback = callback;
  };

  // Assume we have a model.id
  exports.removeModel = function removeModel (model, callback) {
    callback || (callback = noop);
    var query = new Query(model, callback);

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

  // Query prototype
  (function () {
    // Handle errors.
    this.handleError = handleError;

    // Model delete. Done :)
    this.onModelDelete = function onModelDelete (error, result) {
      if (this.handleError(error)) return;

      // Callback time!
      this.callback(null, this.model);
    };
  }).call(Query.prototype);
})();

// Clear a model type.
// * Remove indexes.
// * Remove views
// * Remove collection
// * Remove models

// Wrap to avoid polution.
(function () {
  var Query = function Query (type, callback) {
    var self      = this;
    this.type     = type;
    this.callback = callback;
    this.fn       = function (error) {
      if (error) self.handleError(error);
    };
  };

  // Assume we have a model.id
  exports.clearModelType = function clearModelType (type, callback) {
    callback || (callback = noop);
    var query = new Query(type, callback);

    // FIXME: Bug in redis client, where multi was hanging. Update
    // when it is fixed

    // Get all the model id's.
    client.smembers('collection:' + type, function (error, result) {
      if (query.handleError(error)) return;
      query.onModelKeys(result);
    });

    // Delete the collection and the id counter.
    client.multi([
      ['del', ['collection:' + type], query.fn],
      ['del', ['id:' + type], query.fn]
    ]);
  };

  // Query prototype
  (function () {
    // Handle errors.
    this.handleError = handleError;

    // We have the model keys! They shall die!
    this.onModelKeys = function onModelKeys (keys) {
      // Do we even have keys?
      if (!keys) return this.callback();

      // Make the multi transaction
      var trans = [],
          $     = this,
          key;

      // Loop over every model id, and add to transaction
      // We skip the last one so we can add the final callback
      for (var i = 0, il = keys.length - 1; i < il; i++) {
        key = this.type + ':' + keys[i].toString();
        trans.push(['del', [key], this.fn]);
      }

      // The last task!
      trans.push(['del', [this.type + ':' + keys[keys.length - 1].toString()], function (error) {
        if ($.handleError(error)) return;
        $.callback();
      }]);

      // Multi time!
      client.multi(trans);
    };
  }).call(Query.prototype);
})();

// Use this to get all of one type of model.
// Returns a collection object, populated with all the
// models.

// Wrap that sucker!
(function () {
  var Query = function Query (model, callback) {
    var self      = this;
    this.model    = model;
    this.keys     = Object.keys(model.prototype.properties);
    this.ids      = [];
    this.counter  = -1;
    this.results  = new Collection();
    this.callback = callback;
    this.onModel  = function onModel (error, result) {
      ++self.counter;
      if (error)   return self.handleError(error);
      if (!result) return;
      var ret = {},
          key;

      // Populate a model and push it to the results.
      for (var i = 0, il = self.keys.length; i < il; i++) {
        key = self.keys[i];
        ret[key] = Buffer.isBuffer(result[i]) ? result[i].toString() : result[i];
      }

      ret       = new self.model(ret);
      ret.id    = self.ids[self.counter];
      ret.isNew = false;
      self.results.push(ret);
    };
  };

  // Export the api
  exports.getCollection = function getCollection (model, callback) {
    callback || (callback = noop);

    // Get the model id's
    client.smembers('collection:' + model.type, function (error, result) {
      if (error)   return callback(error);
      if (!result) return callback(null, null);

      var query = new Query(model, callback);
      query.onModelIds(result);
    });
  };

  // Extend the query prototype
  (function () {
    // Handle errors
    this.handleError = handleError;

    // We have the id's. Construct the get query.
    this.onModelIds = function onModelIds (ids) {
      var key_array = [null],
          trans     = [],
          $         = this,
          id;

      // Make a template key array for use in queries.
      for (var i = 0, il = this.keys.length; i < il; i++) {
        key_array.push(this.keys[i]);
      }

      // Make the query, putting ids into this.ids.
      for (i = 0, il = ids.length - 1; i < il; i++) {
        id = +ids[i].toString();
        this.ids.push(id);
        key_array[0] = this.model.type + ':' + id;
        trans.push(['hmget', key_array, this.onModel]);
      }

      // Last one, with final callback
      id = +ids[i].toString();
      this.ids.push(id);
      key_array[0] = this.model.type + ':' + id;
      trans.push(['hmget', key_array, function (error, result) {
        if (error) return $.callback(error);

        // Process
        $.onModel(null, result);
        // I'm on call... So be there! Or whatever.
        $.callback(null, self.results);
      }]);

      // Do the multi.
      client.multi(trans);
    };
  }).call(Query.prototype);
})();

// Get the number of any one type of model.
exports.countCollection = function countCollection (type, callback) {
  callback || (callback = noop);
  return client.scard('collection:' + type, function (error, count) {
    if (error)  return callback(error);
    if (!count) return callback(null, 0);
    callback(null, count);
  });
};

exports.getId = function getId (type, callback) {
  callback || (callback = noop);
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
