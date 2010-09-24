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

// A template to use for making Query prototypes
var QueryTemplate = function QueryTemplate (callback) {
  var self = this;
  this.callback = callback || noop;
  this.fn = function (error) {
    if (error) self.handleError(error);
  };
};

QueryTemplate.prototype.handleError = handleError;

// Save a model. Includes:
// * Getting the id if non-existant
// * Updating the views
// * Updating the indexes
// * Update collection
// * Insert model itself

// Wrap to protect namespace from the grips of polution.
(function () {
  var Query = function Query (model, callback) {
    this.model = model;
    QueryTemplate.call(this, callback);
  };
  Query.prototype = Object.create(QueryTemplate.prototype);

  exports.saveModel = function saveModel (model, callback) {
    callback || (callback = noop);

    // Has the model actually changed?
    if (!model.changed) return callback(null, model);

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
    // We have ID :D
    this.gotId = function gotId () {
      var model = this.model;

      // Make the args array for the redis client
      var attrs_arr = hashToArray(model.attributes, [model.type + ':' + model.id]),
          self      = this,
          trans     = [];

      // Save the mofo. Use a multi transaction here.
      addModelSaveToTransaction(this, trans, model, function (error) {
        if (self.handleError(error)) return;

        // Mark model as saved and return.
        markModelAsSaved(model);
        self.callback(null, model);
      });

      // Multi time
      client.multi(trans);
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
      ret    = new this.model(ret);
      ret.id = this.id;
      markModelAsSaved(ret);

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

// Assume we have a model.id
exports.removeModel = function removeModel (model, callback) {
  callback || (callback = noop);
  var query = new QueryTemplate(callback);

  // Multi-time!
  client.multi([
    ['srem', ['collection:' + model.type, model.id], query.fn],
    ['del', [model.type + ':' + model.id], function (error, result) {
      if (query.handleError(error)) return;

      // Mark the model as removed
      model.id      = null;
      model.isNew   = true;
      model.removed = true;

      // Callback time!
      callback(null, model);
    }]
  ]);
};

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
    QueryTemplate.call(this, callback);
  };
  Query.prototype = Object.create(QueryTemplate.prototype);

  exports.clearModelType = function clearModelType (type, callback) {
    callback || (callback = noop);
    var query = new Query(type, callback);

    // Get id's, delete the collection and the id counter.
    client.multi([
      ['smembers', ['collection:' + type], function (error, result) {
        if (query.handleError(error)) return;
        query.onModelKeys(result);
      }],
      ['del', ['collection:' + type], query.fn],
      ['del', ['id:' + type], query.fn]
    ]);
  };

  // Query prototype
  (function () {
    // We have the model keys! They shall die!
    this.onModelKeys = function onModelKeys (keys) {
      // Do we even have keys?
      // A array with a null member is sent from a multi.
      if (!keys || (keys.length === 1 && keys[0] === null)) {
        return this.callback();
      }

      // Make the multi transaction
      var trans = [],
          $     = this,
          key;

      // Loop over every model id, and add to transaction
      // We skip the last one so we can add the final callback
      for (var i = 0, il = keys.length; i < il; i++) {
        key = this.type + ':' + keys[i].toString();
        trans.push(['del', [key], this.fn]);
      }

      // The last task!
      trans[trans.length - 1][2] = function (error) {
        if ($.handleError(error)) return;
        $.callback();
      };

      // Multi time!
      client.multi(trans);
    };
  }).call(Query.prototype);
})();

// Save a collection. Which includes:
// * Getting the ids if non-existant
// * Updating the views
// * Updating the indexes
// * Update collection
// * Insert models

// Wrap to protect namespace from the grips of polution.
(function () {
  var Query = function Query (collection, callback) {
    var self         = this;
    this.collection  = collection;
    this.indexes     = [];
    this.counter     = -1;

    // When we get a new id
    this.onModelId = function onModelId (error, id) {
      ++self.counter;
      if (error) return self.handleError(error);

      // Get model
      var model = self.collection[self.indexes[self.counter]];
      model.id  = id;
    };

    // On a model save
    this.onModelSave = function onModelSave (error) {
      ++self.counter;
      if (error) return self.handleError(error);

      // Get model
      var model = self.collection[self.indexes[self.counter]];

      // Update state
      markModelAsSaved(model);
    };

    QueryTemplate.call(this, callback);
  };
  Query.prototype = Object.create(QueryTemplate.prototype);

  // The API.
  exports.saveCollection = function saveCollection (collection, callback) {
    callback || (callback = noop);

    // Yay for shortcuts.
    if (!collection || 0 >= collection.length) return callback(null, collection);

    var query = new Query(collection, callback),
        trans = [],
        last;

    // Right. First we need to split models into two groups:
    //
    // * Models that are new
    // * Models that need updates only
    //
    // We will seperate them depending if they have an id or not.
    // We then grab new ids and save the updates in one multi, then
    // save the rest (if we need to) in another.
    for (var i = 0, il = collection.length; i < il; i++) {
      model = collection[i];

      // Has it changed?
      if (!model.changed) continue;
 
      // We have an id, so we are just updating a model.
      if (!model.isNew) {
        addModelSaveToTransaction(query, trans, model, query.fn);
      } else {
        // We have a new model. We need to get an id for it.
        query.indexes.push(i);
        trans.push(['incr', ['id:' + model.type], query.onModelId]);
      }
    }

    // Return early if there is nothing to do.
    if (0 >= trans.length) return callback(null, collection);

    // Add the final callback, ready for the second stage.
    last = trans[trans.length - 1];
    if (last[0] === 'incr') {
      // Last op is for a new model
      query.last = query.onModelId;
    } else {
      // Model update
      query.last = noop;
    }

    last[2] = function (error, result) {
      if (query.handleError(error)) return;
      query.last(error, result);

      // Reset state
      query.counter = -1;

      query.onFirstStage();
    };

    // Do the multi.
    client.multi(trans);
  };

  // Extend Query prototype
  (function () {
    // First stage done. Now we either:
    // 
    // * No nothing, as there were no new models.
    // * Insert the new models.
    this.onFirstStage = function onFirstStage () {
      var trans   = [],
          indexes = [],
          $       = this,
          index,
          model;

      // Make the transaction, if there is anything to make.
      for (var i = 0, il = this.indexes.length; i < il; i++) {
        index = this.indexes[i];
        model = this.collection[index];

        // If the id retrieval was a success, add to transaction.
        if (model.id) {
          indexes.push(index);
          addModelSaveToTransaction(this, trans, model, this.onModelSave);
        }
      }

      // Do we have anything to add? If not, return now.
      if (0 >= indexes) {
        return this.callback(null, this.collection);
      }

      // Over-ride the last callback
      trans[trans.length - 1][2] = function (error) {
        if ($.handleError(error)) return;

        // Update the last model
        $.onModelSave();

        // Callback time.
        $.callback(null, $.collection);
      };

      // Over-ride indexes
      this.indexes = indexes;

      // Do the multi transaction
      client.multi(trans);
    };
  }).call(Query.prototype);
})();

// Remove a collection.
// * Remove indexes.
// * Remove views
// * Remove collection ids
// * Remove models

// Wrap to avoid polution.
(function () {
  var Query = function Query (collection, callback) {
    var self           = this;
    this.collection    = collection;
    this.indexes       = [];
    this.counter       = -1;
    this.onModelDelete = function onModelDelete (error) {
      ++self.counter;
      if (error) return self.handleError(error);

      // Get the relevant model
      var model = self.collection[self.indexes[self.counter]];

      // Mark the model as deleted
      model.id      = null;
      model.isNew   = true;
      model.removed = true;
    };
    QueryTemplate.call(this, callback);
  };
  Query.prototype = Object.create(QueryTemplate.prototype);

  // The API.
  exports.removeCollection = function removeCollection (collection, callback) {
    callback || (callback = noop);

    // Do we even have something to remove
    if (!collection || 0 >= collection.length) return callback(null, collection);

    var model,
        query = new Query(collection),
        trans = [];

    // What needs removing?
    // Only remove a model if it has an id.
    for (var i = 0, il = collection.length; i < il; i++) {
      model = collection[i];

      if (model.id) {
        query.indexes.push(i);

        // Remove from model collection.
        trans.push(['srem', ['collection:' + model.type, model.id], query.fn]);
        // Remove model itself
        trans.push(['del', [model.type + ':' + model.id], query.onModelDelete]);
      }
    }

    // The last callback
    trans[trans.length - 1][2] = function (error) {
      if (query.handleError(error)) return;

      // Process the remove
      query.onModelDelete();

      // Callback
      callback(null, collection);
    };

    // Multi time!
    client.multi(trans);
  };
})();

// Use this to get all of one type of model.
// Returns a collection object, populated with all the
// models.

// Wrap that sucker!
(function () {
  var Query = function Query (collection, model, callback) {
    var self      = this;
    this.model    = model;
    this.keys     = Object.keys(model.prototype.properties);
    this.ids      = [];
    this.counter  = -1;
    this.results  = collection;
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

      ret    = new self.model(ret);
      ret.id = self.ids[self.counter];
      markModelAsSaved(ret);
      self.results.push(ret);
    };
  };

  // Export the api
  exports.getCollection = function getCollection (collection, model, callback) {
    callback || (callback = noop);

    // Get the model id's
    client.smembers('collection:' + model.type, function (error, result) {
      if (error)   return callback(error);
      if (!result) return callback(null, collection);

      var query = new Query(collection, model, callback);
      query.onModelIds(result);
    });
  };

  // Extend the query prototype
  (function () {
    // Handle errors
    this.handleError = handleError;

    // We have the id's. Construct the get query.
    this.onModelIds = function onModelIds (ids) {
      var key_array = [],
          trans     = [],
          $         = this,
          array,
          id;

      // Make a template key array for use in queries.
      for (var i = 0, il = this.keys.length; i < il; i++) {
        key_array.push(this.keys[i]);
      }

      // Make the query, putting ids into this.ids.
      for (i = 0, il = ids.length; i < il; i++) {
        id = +ids[i].toString();
        this.ids.push(id);
        array = [this.model.type + ':' + id];
        array.push.apply(array, key_array);
        trans.push(['hmget', array, this.onModel]);
      }

      // Over-ride the final callback
      trans[trans.length - 1][2] = function (error, result) {
        if (error) return $.callback(error);

        // Process
        $.onModel(error, result);
        // I'm on call... So be there! Or whatever.
        $.callback(null, $.results);
      };

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

// Add a model save / update to a transaction.
var addModelSaveToTransaction = function addModelSaveToTransaction (query, trans, model, callback) {
  // New models need to be added to the collection.
  if (model.isNew) {
    trans.push(['sadd', ['collection:' + model.type, model.id], query.fn]);
  }

  // Add the model.
  trans.push(['hmset', modelToQuery(model), callback]);

  return trans;
};

// Set a model as saved.
var markModelAsSaved = function markModelAsSaved (model) {
  // Update previous attributes.
  var keys = model.changed_attributes,
      key;

  for (var i = 0, il = keys.length; i < il; i++) {
    key = keys[i];
    model.previous.attributes[key] = model.attributes[key];
  }

  // We are no longer changed.
  model.changed                   = false;
  model.changed_attributes.length = 0;

  // We are no longer new, or removed.
  model.isNew = model.removed = false;

  return model;
};

// Shortcut for making a model hmset query.
var modelToQuery = function modelToQuery (model) {
  // Add the db key first up.
  var keys = model.changed_attributes,
      key,
      ret = [model.type + ':' + model.id];

  // Make the array
  for (var i = 0, il = keys.length; i < il; i++) {
    key = keys[i];
    ret.push(key);
    ret.push(model.attributes[key]);
  }

  // Return it!
  return ret;
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
