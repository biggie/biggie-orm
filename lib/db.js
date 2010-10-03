var redis       = require('../deps/redis'),
    utils       = require('./util'),
    Model       = require('./model'),
    Collection  = require('./collection'),
    validations = require('./validations'),
    Task        = require('../deps/parallel').Task,
    noop        = utils.noop;

var markModelAsSaved = utils.markModelAsSaved;

var client = exports.client = null;

exports.connect = function connect (port, host) {
  if (!client) {
    client = exports.client = redis.createClient(port, host);
  }

  return client;
};

exports.end = function end () {
  client.quit();
};

// Generic handleError function for prototypes.
var handleError = function handleError (error) {
  if (this.error_handled) return false;

  // Error D:
  if (error) {
    this.error_handled = true;
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

// A transaction prototype for fast queries.
var Trans = function Trans (array) {
  this.ops = array;
};

Trans.prototype.add = function (array) {
  this.ops.push.apply(this.ops, array);
  return this.ops;
};

Trans.prototype.exec = function (fn) {
  var op, callback;

  if (0 === this.ops.length) return fn(null);

  for (var i = 0, il = this.ops.length - 1; i < il; i++) {
    op      = this.ops[i];
    command = op[0].toUpperCase();

    if (op[1] instanceof Array) {
      client.sendCommand(command, op[1], op[2]);
    } else {
      callback = 'function' === typeof op[op.length - 1] ? op.pop() : null;
      client.sendCommand(command, op.slice(1), callback);
    }
  }

  op      = this.ops[i];
  command = op[0].toUpperCase();

  if (op[1] instanceof Array) {
    client.sendCommand(command, op[1], function (error, results) {
      if (op[2]) op[2](error, results);
      if (fn)    fn();
    });
  } else {
    callback = 'function' === typeof op[op.length - 1] ? op.pop() : null;
    client.sendCommand(command, op.slice(1), function (error, results) {
      if (callback) callback(error, results);
      if (fn)       fn();
    });
  }

  this.ops.length = 0;
};

// Validate a model.
// The only fields we care about are:
//
// * `unique`
var ValidateModelQuery = function Query (model, callback) {
  var self     = this;
  this.model   = model;
  this.links   = [];
  this.counter = -1;
  this.errors  = [];
  this.found   = false;

  // When a model has been checked.
  this.onModelKey = function onModelKey (error, exists) {
    ++self.counter;

    var link = self.links[self.counter],
        prop = link[0];

    // For zsets exists is an array. Otherwise a integer.
    if (Array.isArray(exists)) {
      if (exists[0]) {
        exists = true;
      } else {
        exists = false;
      }
    }

    // Instead on the normal handleError, we will mark it as a
    // validation error, if we got a db error.
    // Same if it exists, of course.
    if (error || exists) {
      self.errors.push(prop);
      self.found              = true;
      self.model.has_errors   = true;
      self.model.errors[prop] = new validations.ValidationError(validations.EUNIQUE, prop);
    }
  };

  QueryTemplate.call(this, callback);
};

ValidateModelQuery.prototype = Object.create(QueryTemplate.prototype);

// API. Assume the models has at least one model.
exports.validateModel = function validateModel (model, callback) {
  var query = new ValidateModelQuery(model, callback),
      trans = [];

  addModelValidations(trans, query.links, model, query.onModelKey);

  // Make sure empty multis aren't made.
  if (0 >= trans) return callback(null);

  new Trans(trans).exec(function (error, results) {
    callback(query.found ? query.errors : null);
  });
};

// Save a model. Includes:
// * Getting the id if non-existant
// * Updating the views
// * Updating the indexes
// * Update collection
// * Insert model itself

// Wrap to protect namespace from the grips of polution.
var SaveModelQuery = function Query (model, callback) {
  this.model = model;
  this.links = [];
  QueryTemplate.call(this, callback);
};
SaveModelQuery.prototype = Object.create(QueryTemplate.prototype);

exports.saveModel = function saveModel (model, callback) {
  callback || (callback = noop);

  // Has the model actually changed?
  if (!model.changed) return callback(null, model);

  // Got errors?
  if (model.has_errors) return callback(null, model);

  var query = new SaveModelQuery(model, callback);

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
// We have ID :D
SaveModelQuery.prototype.gotId = function gotId () {
  // Make the args array for the redis client
  var self  = this,
      trans = [];

  // Save the mofo. Use a multi transaction here.
  addModelSave(trans, this.model);

  // Multi time
  new Trans(trans).exec(function (error) {
    if (self.handleError(error)) return;

    // Callback if there is no associations.
    if (self.model.diff.associations) {
      self.assoc_coll = addModelAssociations(self.model, null, self.links);
      markModelAsSaved(self.model);
      return self.onModelSave(self.model);
    }

    // Mark model as saved and return.
    markModelAsSaved(self.model);

    self.callback(null, self.model);
  });
};

// We have saved the model, now do associations and the like.
SaveModelQuery.prototype.onModelSave = function onModelSave () {
  var self = this;
  var fn   = function (error) {
    if (self.handleError(error)) return;
    if (self.model.has_one) {
      utils.setHasOneLinks(self.links);
    }
    self.callback(null, self.model);
  };

  // Single model? Do a model save.
  if (this.assoc_coll.length === 1) {
    return this.assoc_coll[0].save(fn);
  }

  // Save the associations, then callback.
  this.assoc_coll.save(fn);
};

// Get a model.
// We need a prototype query as it seems hmget behaves the same
// whether the key exists or not.

var GetModelQuery = function Query (model, id, callback) {
  this.model    = model;
  this.id       = +id;
  this.keys     = Object.keys(model.prototype.properties);
  this.callback = callback;
};

exports.getModel = function getModel (type, id, callback) {
  callback || (callback = noop);

  // Return if we can't find the model type.
  var model = Model.model_names[type];
  if (!model) return callback(null, null);

  // Return early if we have a bad id
  if (!id) return callback(null, new model());

  // Do we has action?
  client.exists(model.type + ':' + id, function (error, exists) {
    if (error)   return callback(error);
    if (!exists) return callback(null, null);

    // Next step...
    var query = new GetModelQuery(model, id, callback);
    query.onModelExists();
  });
};

// Extend the query prototype
// ZOMG. It really does exist!
GetModelQuery.prototype.onModelExists = function onModelExists () {
  var query = [this.model.type + ':' + this.id],
      $     = this;

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
GetModelQuery.prototype.onModelGet = function onModelGet (results) {
  var ret = {},
      type,
      key;

  // hmget returns a array of values
  for (var i = 0, il = this.keys.length; i < il; i++) {
    key  = this.keys[i];
    type = this.model.prototype.properties[key].type;

    if (validations.property_types[type].in) {
      ret[key] = validations.property_types[type].in(results[i]);
    } else ret[key] = results[i];
  }

  // Make the model
  ret    = new this.model(ret);
  ret.id = this.id;
  markModelAsSaved(ret);

  // Callback
  this.callback(null, ret);
};

// Delete a model. We have to:
// * Remove from indexes
// * Remove from views
// * Remove from collection
// * Remove self

var DeleteModelQuery = function Query (model, callback) {
  var self        = this;
  this.model      = model;
  this.assoc_coll = {};

  // On association keys.
  this.onAssociationUnion = function onAssociationUnion (error, type, ids) {
    if (error) return self.handleError(error);
    if (!ids || (ids.length === 1 && !ids[0])) return;

    var id;

    // Add the id keys
    for (var i = 0, il = ids.length; i < il; i++) {
      id = +utils.bufferToString(ids[i]);
      self.assoc_coll[type] || (self.assoc_coll[type] = []);
      self.assoc_coll[type].push(id);
    }
  };

  QueryTemplate.call(this, callback);
};
DeleteModelQuery.prototype = Object.create(QueryTemplate.prototype);

// Assume we have a model.id
exports.removeModel = function removeModel (model, callback, is_assoc) {
  callback || (callback = noop);

  var query = new DeleteModelQuery(model, callback),
      trans = [],
      union = {};

  addAssociationIds(model, union, query.assoc_coll);
  removeUnionHash(union, trans, query.onAssociationUnion);

  addModelRemove(trans, model, false, is_assoc);

  new Trans(trans).exec(function (error) {
    if (query.handleError(error)) return;

    // Mark the model as removed
    utils.markModelAsRemoved(model);

    // Got associations to remove?
    var keys = Object.keys(query.assoc_coll);
    if (keys.length > 0) {
      return query.onModelRemove(keys);
    }

    // Callback time!
    callback(null, model);
  });
};

DeleteModelQuery.prototype.onModelRemove = function onModelRemove (keys) {
  var key,
      get_task = new Task(),
      $        = this;

  // Remove the chilren.
  for (var i = 0, il = keys.length; i < il; i++) {
    key = keys[i];
    get_task.add(key, [exports.getCollection, this.assoc_coll[key], key]);
  }

  // Reset assoc_coll for re-population.
  this.assoc_coll = new Collection();

  // Run the task, and if we have bits and pieces attached to the assoc_task,
  // run that.
  get_task.run(function (type, error, collection) {
    if (null === type) {
      if (0 < $.assoc_coll.length) {
        return $.onGetAssociations();
      }

      return $.callback(null, $.collection);
    } else if (error) {
      return $.handleError(error);
    }
    $.onAssociationsCollection(collection);
  });
};

// When we populate a collection of associations to remove.
DeleteModelQuery.prototype.onAssociationsCollection = function (collection) {
  this.assoc_coll.push.apply(this.assoc_coll, collection.slice());
};

// We have all the associations.
DeleteModelQuery.prototype.onGetAssociations = function () {
  var $ = this;

  // Remove the associations.
  exports.removeCollection(this.assoc_coll, true, function (type, error) {
    if (null === type) {
      $.callback(null, $.collection);
    } else if (error) return $.handleError(error);
  });
};

// Clear a model type.
// * Remove indexes.
// * Remove views
// * Remove collection
// * Remove models

var ClearModelQuery = function Query (model, callback) {
  var self        = this;
  this.model      = model;
  this.assoc_coll = {};

  // Every time a association union is done.
  this.onAssociationUnion = function onAssociationUnion (error, type, ids) {
    if (error) return self.handleError(error);
    if (!ids || (ids.length === 1 && !ids[0])) return;

    var id;

    // Add the id keys
    for (var i = 0, il = ids.length; i < il; i++) {
      id = +utils.bufferToString(ids[i]);
      self.assoc_coll[type] || (self.assoc_coll[type] = []);
      self.assoc_coll[type].push(id);
    }
  };

  QueryTemplate.call(this, callback);
};
ClearModelQuery.prototype = Object.create(QueryTemplate.prototype);

exports.clearModelType = function clearModelType (type, callback) {
  callback || (callback = noop);

  // Assume we have a valid type
  var model = Model.model_names[type],
      trans

  // Get the collection of models.
  model.all(function (error, collection) {
    if (error) return callback(error);

    var query = new ClearModelQuery(model, callback);
    query.onCollection(collection);
  });
};

// Query prototype
ClearModelQuery.prototype.onCollection = function onCollection (collection) {
  var trans       = [],
      assoc_trans = [],
      union       = {},
      $           = this;

  // Got associations?
  if (this.model.associations) {
    // Loop over collection and add a remove action for each model.
    for (var i = 0, il = collection.length; i < il; i++) {
      addAssociationIds(collection[i], union, this.assoc_coll);
      addModelRemove(trans, collection[i], true);
    }

    // Add unions (if any)
    removeUnionHash(union, assoc_trans, this.onAssociationUnion);
    assoc_trans.push.apply(assoc_trans, trans);

    trans       = assoc_trans;
    assoc_trans = null;
  } else {
    // Add the last bits and pieces.
    if (0 >= collection.length) {
      addModelTypeRemove(trans, this.model.prototype);
    } else {
      // Simple case: removeCollection + clear flag.
      return exports.removeCollection(collection, false, function (error) {
        if (error) return $.callback(error);
        $.callback(null);
      }, true);
    }
  }

  // Do it!
  new Trans(trans).exec(function (error) {
    // Did we get any ids? Remove those cheeky children..
    var keys = Object.keys($.assoc_coll);
    if (keys.length > 0) {
      return $.onCollectionRemove(keys);
    }

    $.callback(error);
  });
};

// We had more model keys to remove.
ClearModelQuery.prototype.onCollectionRemove = function onCollectionRemove (keys) {
  var key,
      get_task = new Task(),
      $        = this;

  // Remove the chilren.
  for (var i = 0, il = keys.length; i < il; i++) {
    key = keys[i];
    get_task.add(key, [exports.getCollection, this.assoc_coll[key], key]);
  }

  // Reset assoc_coll for re-population.
  this.assoc_coll = new Collection();

  // Run the task, and if we have bits and pieces attached to the assoc_task,
  // run that.
  get_task.run(function (type, error, collection) {
    if (null === type) {
      if (0 < $.assoc_coll.length) {
        return $.onGetAssociations();
      }

      return $.callback(null, $.collection);
    } else if (error) {
      return $.handleError(error);
    }
    $.onAssociationsCollection(collection);
  });
};

// When we populate a collection of associations to remove.
ClearModelQuery.prototype.onAssociationsCollection = function (collection) {
  this.assoc_coll.push.apply(this.assoc_coll, collection.slice());
};

// We have all the associations.
ClearModelQuery.prototype.onGetAssociations = function () {
  var $ = this;

  // Remove the associations.
  exports.removeCollection(this.assoc_coll, true, function (type, error) {
    if (null === type) {
      $.callback(null, $.collection);
    } else if (error) return $.handleError(error);
  }, true);
};

// Validate a collection. Similar to validateModel,
// except we do everything in one transaction. <3 multi.
var ValidateCollectionQuery = function Query (models, callback) {
  var self     = this;
  this.models  = models;
  this.links   = [];
  this.counter = -1;
  this.errors  = [];

  // When a model has been checked.
  this.onModelKey = function onModelKey (error, exists) {
    ++self.counter;

    var link  = self.links[self.counter],
        model = link[1],
        prop  = link[0];

    // For zsets exists is an array. Otherwise a integer.
    if (Array.isArray(exists)) {
      if (exists[0]) {
        exists = true;
      } else {
        exists = false;
      }
    }

    // Instead on the normal handleError, we will mark it as a
    // validation error, if we got a db error.
    // Same if it exists, of course.
    if (error || exists) {
      if (-1 === self.errors.indexOf(model)) {
        self.errors.push(model);
      }
      model.has_errors = true;
      model.errors[prop] = new validations.ValidationError(validations.EUNIQUE, prop);
    }
  };

  QueryTemplate.call(this, callback);
};

ValidateCollectionQuery.prototype = Object.create(QueryTemplate.prototype);

// API. Assume the models has at least one model.
exports.validateCollection = function validateCollection (models, callback, collection) {
  callback || (callback = noop);

  // Return fast if nothing to validate.
  if (0 >= models.length) return callback(false);

  var query = new ValidateCollectionQuery(models, callback),
      trans = [],
      props,
      key,
      prop,
      model;

  // Go through each model, and add the transactions.
  for (var i = 0, il = models.length; i < il; i++) {
    model = models[i];
    addModelValidations(trans, query.links, model, query.onModelKey);
  }

  // Nothing to validate?
  if (0 >= trans.length) return callback(false);

  // It's multi-time! Take that Mr. T.
  new Trans(trans).exec(function (error) {
    if (query.errors.length > 0) {
      if (collection) {
        collection.has_errors = true;
        collection.errors     = query.errors;
      }
      return callback(query.errors);
    }
    callback(false);
  });
};

// Save a collection. Which includes:
// * Getting the ids if non-existant
// * Updating the views
// * Updating the indexes
// * Update collection
// * Insert models

// Wrap to protect namespace from the grips of polution.
var SaveCollectionQuery = function Query (collection, callback) {
  var self         = this;
  this.collection  = collection;
  this.indexes     = [];
  this.counter     = -1;
  this.assoc_coll  = new Collection();
  this.links       = [];

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

    // Add associations to collection.
    addModelAssociations(model, self.assoc_coll, self.links);

    // Update state
    markModelAsSaved(model);
  };

  QueryTemplate.call(this, callback);
};
SaveCollectionQuery.prototype = Object.create(QueryTemplate.prototype);

// The API.
exports.saveCollection = function saveCollection (collection, callback) {
  callback || (callback = noop);

  // Yay for shortcuts.
  if (!collection || 0 >= collection.length) return callback(null, collection);

  var query = new SaveCollectionQuery(collection, callback),
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

    // Got errors?
    if (model.has_errors) continue;

    // We have an id, so we are just updating a model.
    if (!model.is_new) {
      query.indexes.push(i);
      addModelSave(trans, model, query.onModelSave);
    } else {
      // We have a new model. We need to get an id for it.
      query.indexes.push(i);
      trans.push(['incr', 'id:' + model.type, query.onModelId]);
    }
  }

  // Return early if there is nothing to do.
  if (0 >= trans.length) return callback(null, collection);

  // Do the multi.
  new Trans(trans).exec(function (error, result) {
    if (query.handleError(error)) return;

    // Reset state
    query.counter = -1;

    query.onFirstStage();
  });
};

// Extend Query prototype
// First stage done. Now we either:
// 
// * No nothing, as there were no new models.
// * Insert the new models.
SaveCollectionQuery.prototype.onFirstStage = function onFirstStage () {
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
      addModelSave(trans, model, this.onModelSave);
    }
  }

  // Do we have anything to add? If not, return now.
  if (0 >= indexes.length) {
    // Only callback if no associations were found.
    if (0 < $.assoc_coll.length) {
      return $.onCollectionSave();
    }

    return this.callback(null, this.collection);
  }

  // Over-ride indexes
  this.indexes = indexes;

  // Do the multi transaction
  new Trans(trans).exec(function (error) {
    if ($.handleError(error)) return;

    // Only callback if no associations were found.
    if (0 < $.assoc_coll.length) {
      return $.onCollectionSave();
    }

    // Callback time.
    $.callback(null, $.collection);
  });
};

// Save the associations etc.
SaveCollectionQuery.prototype.onCollectionSave = function onCollectionSave () {
  var $ = this;

  this.assoc_coll.save(function (error) {
    if ($.handleError(error)) return;
    $.callback(null, $.collection);
  });
};

// Remove a collection.
// * Remove indexes.
// * Remove views
// * Remove collection ids
// * Remove models

// Wrap to avoid polution.
var RemoveCollectionQuery = function Query (collection, callback) {
  var self           = this;
  this.collection    = collection;
  this.indexes       = [];
  this.counter       = -1;
  this.assoc_coll    = {};
  this.onModelDelete = function onModelDelete (error) {
    ++self.counter;
    if (error) return self.handleError(error);

    // Get the relevant model
    var model = self.collection[self.indexes[self.counter]];

    // Mark the model as deleted
    utils.markModelAsRemoved(model);
  };

  // Every time a association union is done.
  this.onAssociationUnion = function onAssociationUnion (error, type, ids) {
    if (error) return self.handleError(error);
    if (!ids || (ids.length === 1 && !ids[0])) return;

    var id;

    // Add the id keys
    for (var i = 0, il = ids.length; i < il; i++) {
      id = +utils.bufferToString(ids[i]);
      self.assoc_coll[type] || (self.assoc_coll[type] = []);
      self.assoc_coll[type].push(id);
    }
  };

  // When we get a collection of associations, we need to remove them.

  QueryTemplate.call(this, callback);
};
RemoveCollectionQuery.prototype = Object.create(QueryTemplate.prototype);

// The API.
exports.removeCollection = function (collection, is_assoc, callback, is_clear) {
  callback || (callback = noop);

  // Do we even have something to remove
  if (!collection || 0 >= collection.length) return callback(null, collection);

  var model, key, parent,
      query       = new RemoveCollectionQuery(collection, callback),
      trans       = [],
      assoc_trans = [],
      union       = {},
      indexes     = {},
      types       = {};

  // What needs removing?
  // Only remove a model if it has an id.
  for (var i = 0, il = collection.length; i < il; i++) {
    model = collection[i];

    if (!model.is_new) {
      query.indexes.push(i);

      // Got association model id's to get?
      // SUNION <3
      addAssociationIds(model, union, query.assoc_coll);

      // This function does it all, hot!
      addModelRemove(trans, model, is_clear, is_assoc, query.onModelDelete);

      // Remove parent association indexes if we haven't already
      if (is_assoc && model.belongs_to) {
        // Go through each belongs_to, and find has_many relationships
        for (var j = 0, jl = model.belongs_to.length; j < jl; j++) {
          key    = model.belongs_to[j];
          parent = Model.model_names[key].prototype;

          // Remove the indexes.
          if (Model.ASSOC_MANY === parent.associations[model.type]) {
            addModelRemoveSetIndex(trans, model, key, indexes);
          }
        }
      }

      // Is a clear? Remove the last bits and pieces.
      if (is_clear && !types[model.type]) {
        addModelTypeRemove(trans, model);
        types[model.type] = true;
      }
    }
  }

  // Nothing to do? Exit now.
  if (0 >= trans.length) {
    return callback(null, collection);
  }

  // Add unions (if any)
  removeUnionHash(union, assoc_trans, query.onAssociationUnion);
  assoc_trans.push.apply(assoc_trans, trans);

  // Multi time!
  new Trans(assoc_trans).exec(function (error) {
    if (query.handleError(error)) return;

    // Did we get any ids? Remove those cheeky children..
    var keys = Object.keys(query.assoc_coll);
    if (keys.length > 0) {
      return query.onCollectionRemove(keys);
    }

    // Callback
    callback(null, collection);
  });
};

// We had more model keys to remove.
RemoveCollectionQuery.prototype.onCollectionRemove = function onCollectionRemove (keys) {
  var key,
      get_task = new Task(),
      $        = this;

  // Remove the chilren.
  for (var i = 0, il = keys.length; i < il; i++) {
    key = keys[i];
    get_task.add(key, [exports.getCollection, this.assoc_coll[key], key]);
  }

  // Reset assoc_coll for re-population.
  this.assoc_coll = new Collection();

  // Run the task, and if we have bits and pieces attached to the assoc_task,
  // run that.
  get_task.run(function (type, error, collection) {
    if (null === type) {
      if (0 < $.assoc_coll.length) {
        return $.onGetAssociations();
      }

      return $.callback(null, $.collection);
    } else if (error) {
      return $.handleError(error);
    }
    $.onAssociationsCollection(collection);
  });
};

// When we populate a collection of associations to remove.
RemoveCollectionQuery.prototype.onAssociationsCollection = function (collection) {
  this.assoc_coll.push.apply(this.assoc_coll, collection.slice());
};

// We have all the associations.
RemoveCollectionQuery.prototype.onGetAssociations = function onGetAssociations () {
  var $ = this;

  // Remove the associations.
  exports.removeCollection(this.assoc_coll, true, function (type, error) {
    if (null === type) {
      $.callback(null, $.collection);
    } else if (error) return $.handleError(error);
  });
};

// Use this to get a collection of models from a id set.
// Returns a collection object, populated with all the
// models.

// Wrap that sucker!
var GetCollectionQuery = function Query (model, callback) {
  var self        = this;
  this.model      = model;
  this.keys       = Object.keys(model.prototype.properties);
  this.ids        = [];
  this.counter    = -1;
  this.results    = new Collection();
  this.callback   = callback;
  this.onModel    = function onModel (error, result) {
    ++self.counter;
    if (error)   return self.handleError(error);
    if (!result) return;
    var ret = {},
        type,
        key;

    // hmget returns a array of values
    for (var i = 0, il = self.keys.length; i < il; i++) {
      key  = self.keys[i];
      type = self.model.prototype.properties[key].type;

      if (validations.property_types[type].in) {
        ret[key] = validations.property_types[type].in(result[i]);
      } else ret[key] = result[i];
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

  model = Model.model_names[model];

  // Are we populating a collection, or getting one?
  if (typeof collection === 'string') {
    // Get the model id's
    client.smembers(collection, function (error, result) {
      if (error)   return callback(error);
      if (!result) return callback(null, new Collection());

      var query = new GetCollectionQuery(model, callback);
      query.onModelIds(result);
    });
  } else if (collection.length && collection.length > 0) {
    // Assume we are a collection of models with id's.
    var query = new GetCollectionQuery(model, callback);
    query.onModelIds(collection);
  } else {
    callback(null, new Collection());
  }
};

// Extend the query prototype
// We have the id's. Construct the get query.
GetCollectionQuery.prototype.onModelIds = function onModelIds (ids) {
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
  // If we are an array of plain ids. No conversion is
  // needed from buffers.
  if (Buffer.isBuffer(ids[0])) {
    for (i = 0, il = ids.length; i < il; i++) {
      id = +utils.bufferToString(ids[i]);
      this.ids.push(id);
      array = [this.model.type + ':' + id];
      array.push.apply(array, key_array);
      trans.push(['hmget', array, this.onModel]);
    }
  } else {
    this.ids = ids;
    for (i = 0, il = ids.length; i < il; i++) {
      id    = ids[i];
      array = [this.model.type + ':' + id];
      array.push.apply(array, key_array);
      trans.push(['hmget', array, this.onModel]);
    }
  }

  // Do the multi.
  new Trans(trans).exec(function (error, result) {
    if (error) return $.callback(error);

    // I'm on call... So be there! Or whatever.
    $.callback(null, $.results);
  });
};

// Get the number of any one type of model.
exports.countCollection = function countCollection (type, callback) {
  callback || (callback = noop);
  return client.scard('collection:' + type, function (error, count) {
    if (error)  return callback(error);
    if (!count) return callback(null, 0);
    callback(null, count);
  });
};

// Limit the amount of returned results.
exports.getCollectionRange = function getCollectionRange (collection, model, start, length, callback, asc) {
  if ('string' === typeof collection) {
    client.sort(collection, 'limit', start, length, asc ? 'ASC' : 'DESC', function (error, results) {
      if (error) return callback(error);

      var ids = [];

      for (var i = 0, il = results.length; i < il; i++) {
        ids.push(+utils.bufferToString(results[i]));
      }

      exports.getCollection(ids, model, callback);
    });
  } else {
    collection = collection.sort(asc ? utils.ascSort : utils.descSort);
    ids.slice(start, -1 === length ? ids.length : start + length);
    return exports.getCollection(collection, model, callback);
  }
};

// Query methods:
//
// * getCollectionRange
// * getCollectionFromQuery

// getCollectionFromQuery
// Queries are arrays, like so:
// [['range', 'key', 0, 5], ['setmatch', 'key', 5], ['match', 'key', 'string']]
// Queries are run against a index set / collection.
var QueryCollectionQuery = function Query (callback) {
  var self     = this;
  this.results = null;

  // Reduce results on each call.
  this.onModelIds = function onModelIds (error, ids) {
    if (error) return self.handleError(error);

    // Only reduce if we have something to reduce.
    if (self.results) {
      ids = self.resultToArray(ids);

      // Null ids?
      if (!ids) return;

      var ret = [],
          id;

      // Reduce the shizzle.
      for (var i = 0, il = self.results.length; i < il; i++) {
        id = self.results[i];

        // The id is in both arrays. Keep it.
        if (-1 !== ids.indexOf(id)) {
          ret.push(id);
        }
      }

      // OK reducing done.
      self.results = ret;
    } else {
      self.results = self.resultToArray(ids);
    }
  };

  QueryTemplate.call(this, callback);
};

QueryCollectionQuery.prototype = Object.create(QueryTemplate.prototype);

exports.getCollectionFromQuery = function (query, collection, model, start, length, callback, asc) {
  var trans    = [],
      instance = new QueryCollectionQuery(callback),
      cond,
      key,
      value;

  // Loop through query, adding stuff to the transaction that will
  // emit either an array of ids, or a single id.
  // We reduce the ids after each result.
  for (var i = 0, il = query.length; i < il; i++) {
    cond  = query[i];
    key   = cond[1];
    value = cond[2];

    switch (cond[0]) {
    case 'match':
      trans.push(['smembers', collection + ':' + key + ':' + value, instance.onModelIds]);
      break;
    case 'setmatch':
      trans.push(['zrangebyscore', collection + ':' + key, value, value, instance.onModelIds]);
      break;
    case 'range':
      trans.push(['zrangebyscore', collection + ':' + key, value, cond[3], instance.onModelIds]);
      break;
    }
  }

  if (0 >= trans.length) return callback(null, new Collection);

  // Run the query
  new Trans(trans).exec(function (error) {
    if (instance.handleError(error)) return;

    if (!instance.results ||
        (instance.results && 0 >= instance.results.length)) {
      return callback(null, new Collection());
    }

    // Largest id first.
    instance.results = instance.results.sort(asc ? utils.ascSort : utils.descSort);

    // Limit?
    if ((start === 0 || start) && (length === 0 || length)) {
      instance.results = instance.results.slice(start, -1 === length ?
                                  instance.results.length : start + length);
    }

    exports.getCollection(instance.results, model, callback);
  });
};

// Convert a result to an array.
// Possible `result` values:
//
// * null
// * buffer
// * [ null ]
// * [ buffer, buffer ... ]
QueryCollectionQuery.prototype.resultToArray = function resultToArray (result) {
  var ret, id;

  if (result instanceof Array) {
    if (!result[0]) return null;

    // Array of buffers
    ret = [];
    for (var i = 0, il = result.length; i < il; i++) {
      ret.push(+utils.bufferToString(result[i]));
    }
  } else {
    if (null === result) return null;
    ret = [+utils.bufferToString(result)];
  }

  return ret;
};

exports.getId = function getId (type, callback) {
  callback || (callback = noop);
  return client.incr('id:' + type, callback);
};

// Add a model save / update to a transaction.
var addModelSave = function addModelSave (trans, model, callback) {
  // New models need to be added to the collection.
  if (model.is_new) {
    trans.push(['sadd', 'collection:' + model.type, model.id]);
  }

  // If it has a view callback, we will want to update the view indexes.
  var indexes = [[], [], [], [], [], []];

  if (model.views && model.viewCallback) {
    var views = model.viewCallback(model.attributes),
        view;

    // Remove old views
    for (var i = 0, il = model.views.length; i < il; i++) {
      view = model.views[i];

      // If it isn't in the views it is supposed to be in,
      // we need to remove it.
      // Otherwise it is already there, no need to update.
      if (-1 === views.indexOf(view)) {
        trans.push(['srem', 'view:' + model.type + ':' + view, model.id]);
        indexes[0].push(view);
      } else {
        // Assume the callback emitted valid views.
        trans.push(['sadd', 'view:' + model.type + ':' + view, model.id]);
        indexes[1].push(view);
      }
    }
  }

  // Update indexes.
  // We add number indexes to a zset,
  // normal indexes are a :key set system.
  if (model.indexes) {
    var index;

    for (var i = 0, il = model.indexes.length; i < il; i++) {
      index = model.indexes[i];

      // Only update the indexes if we are either new, or the attribute has changed.
      if (model.is_new || ~model.diff.attributes.indexOf(index)) {
        if ('number' === model.properties[index].type) {
          if (!model.is_new && null !== model.previous.attributes[index] &&
              undefined !== model.previous.attributes[index]) {
            trans.push(['zrem', 'index:' + model.type + ':' + index, model.id]);
            indexes[4].push(index);
          }

          // Add the new index, if we can.
          if (null !== model.attributes[index] &&
              undefined !== model.attributes[index]) {
            trans.push(['zadd', 'index:' + model.type + ':' + index, model.get(index), model.id]);
            indexes[5].push(index);
          }
        } else {
          // Remove the previous index.
          if (!model.is_new && null !== model.previous.attributes[index] &&
              undefined !== model.previous.attributes[index]) {
            trans.push(['srem', 'index:' + model.type + ':' + index + ':' +
                        model.previous.attributes[index], model.id]);
            indexes[2].push(index);
          }

          // Add the new index, if we can.
          if (null !== model.attributes[index] &&
              undefined !== model.attributes[index]) {
            trans.push(['sadd', 'index:' + model.type + ':' + index + ':' +
                        model.get(index), model.id]);
            indexes[3].push(index);
          }
        }
      }
    }
  }

  // Do we have associations?
  if (model.belongs_to) {
    var key, type, id, index, assocs;

    // Find out the type of each association, and update as
    // necessary.
    for (var i = 0, il = model.belongs_to.length; i < il; i++) {
      key    = model.belongs_to[i];
      assocs = model.diff.associations[key];

      // Continue if no different associations
      if (!assocs) continue;

      type = Model.model_names[key].prototype.associations[model.type];

      // Depending on model type:
      //
      // * If many to many, add to set.
      // * If has_many, add to set.
      // * If has_one, add to parent.
      if (type === Model.ASSOC_MANY_MANY) {
        var brother,
            diff = new Collection;

        // For each brother / sister, yo, add both our indexes and thiers.
        for (var i = 0, il = assocs.length; i < il; i++) {
          brother = assocs[i];

          // Serves as both a flag, and for passing our indexes to our
          // relations.
          if (!model.previous.indexes) {
            brother.previous.indexes = indexes;
            continue;
          }

          // Add our relations assoc indexes.
          addModelHasMany(trans, model, brother, indexes);

          // Add our own assocs, handed to us by our parent.
          addModelHasMany(trans, brother, model, model.previous.indexes);
        }

        if (model.previous.indexes) {
          // Make sure we don't get caught in a loop.
          model.diff.associations = {};
          model.previous.indexes  = undefined;
        }
      } else if (type === Model.ASSOC_MANY && assocs.id) {
        if (!assocs.id) continue;
        addModelHasMany(trans, model, assocs, indexes);
      } else if (type === Model.ASSOC_ONE && assocs.id) {
        trans.push(['hset', key + ':' + assocs.id, model.type + '_id', model.id]);
      }
    }
  }

  // Add the model.
  if (callback) {
    trans.push(['hmset', modelToQuery(model), callback]);
  } else {
    trans.push(['hmset', modelToQuery(model)]);
  }

  return trans;
};

// Add assoc indexes and relationships for has_many
var addModelHasMany = function addModelHasMany (trans, model, parent, indexes) {
  var index, rem_views, add_views, rem_indexes, add_indexes, rem_num_indexes,
      add_num_indexes, key, id;

  // Set all the stuff
  key = parent.type;
  id  = parent.id;

  rem_views       = indexes[0];
  add_views       = indexes[1];
  rem_indexes     = indexes[2];
  add_indexes     = indexes[3];
  rem_num_indexes = indexes[4];
  add_num_indexes = indexes[5];

  trans.push(['sadd', 'assoc:' + key + ':' + id + ':' + model.type, model.id]);

  // Add/remove views for has_many associations.
  // Diff has already been done. We just mirror it.
  for (var j = 0, jl = rem_views.length; j < jl; j++) {
    trans.push(['srem', 'view:' + key + ':' + id + ':' +
                model.type + ':' + rem_views[j], model.id]);
  }

  // Add views
  for (j = 0, jl = add_views.length; j < jl; j++) {
    trans.push(['sadd', 'view:' + key + ':' + id + ':' +
                model.type + ':' + add_views[j], model.id]);
  }

  // Remove number indexes.
  for (j = 0, jl = rem_num_indexes.length; j < jl; j++) {
    index = rem_num_indexes[j];
    trans.push(['zrem', 'index:' + key + ':' + id + ':' + model.type +
                ':' + index, model.id]);
  }

  // Remove normal indexes
  for (j = 0, jl = rem_indexes.length; j < jl; j++) {
    index = rem_indexes[j];
    trans.push(['srem', 'index:' + key + ':' + id + ':' + model.type + ':' +
                index + ':' + model.previous.attributes[index], model.id]);
  }

  // Add number indexes.
  for (j = 0, jl = add_num_indexes.length; j < jl; j++) {
    index = add_num_indexes[j];
    trans.push(['zadd', 'index:' + key + ':' + id + ':' + model.type + ':' +
                index, model.get(index), model.id]);
  }

  // Add normal indexes
  for (j = 0, jl = add_indexes.length; j < jl; j++) {
    index = add_indexes[j];
    trans.push(['sadd', 'index:' + key + ':' + id + ':' + model.type + ':' +
                index + ':' + model.get(index), model.id]);
  }
};

// Add a model remove to a transaction.
// Need to make sure you set the assocname_id attributes
// on the model, otherwise it won't bother removing parent associations.
var addModelRemove = function addModelRemove (trans, model, is_clear, is_assoc, callback) {
  // Remove view indexes.
  // If we are being cleared, then something else will just wipe the
  // set completely.
  if (!is_clear && model.views) {
    var view;

    // Loop through every view and remove from index.
    // Also push to views array for associations etc.
    for (var i = 0, il = model.views.length; i < il; i++) {
      trans.push(['srem', 'view:' + model.type + ':' + model.views[i], model.id]);
    }
  }

  // Remove indexes.
  // For number types, remove ourself from the zset. (on `is_clear` we can ignore
  // this type, as it only has one key that doesn't require child knowledge)
  // For other types, remove ourself from the :key set.
  // Make sure we use the saved data (previous.attributes), otherwise
  // we might miss the :key.
  var num_indexes = [],
      indexes     = [];

  if (model.indexes) {
    var index;

    for (var i = 0, il = model.indexes.length; i < il; i++) {
      index = model.indexes[i];

      // Number indexes use sorted sets.
      if ('number' === model.properties[index].type) {
        if (!is_clear && !is_assoc) {
          trans.push(['zrem', 'index:' + model.type + ':' + index, model.id]);
          num_indexes.push(index);
        }
      } else {
        // Normal indexes use a :key set system.
        trans.push(['srem', 'index:' + model.type + ':' + index + ':' +
                    model.previous.attributes[index], model.id]);
        indexes.push(index + ':' + model.previous.attributes[index]);
      }
    }
  }

  // Do we have associations to remove?
  if (model.associations) {
    var key, id, views, child;

    // Remove all our id sets if we has_many.
    // Assume all the models have been previously removed.
    if (model.has_many) {
      for (var i = 0, il = model.has_many.length; i < il; i++) {
        child = Model.plurals[model.has_many[i]].prototype;
        key   = child.type;
        trans.push(['del', 'assoc:' + model.type + ':' + model.id + ':' + key]);

        // Remove views.
        if (views = child.views) {
          var view;

          // Remove child view indexes.
          for (var j = 0, jl = views.length; j < jl; j++) {
            view = views[j];
            trans.push(['del', 'view:' + model.type + ':' + model.id + ':' + key + ':' + view]);
          }
        }

        if (child.indexes) {
          var index;

          for (var i = 0, il = child.indexes.length; i < il; i++) {
            index = child.indexes[i];

            // Number indexes use sorted sets.
            if ('number' === child.properties[index].type) {
              trans.push(['del', 'index:' + model.type + ':' + model.id + ':' + child.type +
                          ':' + index]);
            }
          }
        }
      }
    }

    // belongs_to stuff.
    // Remove from our parent indexes.
    //
    // Remove parent has_one.
    // We just need to take out parent's reference of our id.
    // (Only if it is a has_one relationship)
    // Parent has already gone if we are clearing or assoc.
    if (!is_clear && !is_assoc && model.belongs_to) {
      var parent, key, index;

      for (var i = 0, il = model.belongs_to.length; i < il; i++) {
        key    = model.belongs_to[i];
        parent = Model.model_names[key]

        // Remove our parents reference to our id.
        if (parent.prototype.associations[model.type] === Model.ASSOC_ONE) {
          trans.push(['hdel', key + ':' + model.get(key + '_id'), key + '_id']);
        } else if (Model.ASSOC_MANY_MANY !== model.associations[key]) {
          // has_many or many-many relationship.
          // Remove parent indexes.
          for (var j = 0, jl = num_indexes.length; j < jl; j++) {
            index = num_indexes[j];
            trans.push(['zrem', 'index:' + key + ':' + model.get(key + '_id') + ':' +
                        model.type + ':' + index, model.id]);
          }

          // Remove normal indexes
          for (j = 0, jl = num_indexes.length; j < jl; j++) {
            index = num_indexes[j];
            trans.push(['srem', 'index:' + key + ':' + model.get(key + '_id') + ':' +
                        model.type + ':' + index, model.id]);
          }
        }
      }
    }
  }

  // Remove from model collection unless we are a clear.
  if (!is_clear) {
    trans.push(['srem', 'collection:' + model.type, model.id]);
  }

  // Remove model itself
  if (callback) {
    trans.push(['del', model.type + ':' + model.id, callback]);
  } else {
    trans.push(['del', model.type + ':' + model.id]);
  }

  return trans;
};

// Make a collection to be saved from a model's
// associations. Add to a previous collection if specified.
// This only adds child, which may or may not be new.
var addModelAssociations = function addModelAssociations (model, coll, links) {
  coll || (coll = new Collection());

  var keys = Object.keys(model.diff.associations),
      key,
      assoc,
      child;

  if (0 < keys.length) {
    for (i = 0, il = keys.length; i < il; i++) {
      key   = keys[i];
      assoc = model.diff.associations[key];

      // So, this is how it is:
      //
      // * If has_many, add to the set.
      // * if has_one, add parent to child. Parent gets info on save.
      // * If belongs_to, skip. It is dealt with on save.
      if (model.associations[key] === Model.ASSOC_MANY) {
        // We are dealing with an collection.
        // Set the parent id on all of them.
        // If we find a new + not changed child, discard it (has no data).
        // If we find a new child that is changed, add it to the save collection.
        for (var j = 0, jl = assoc.length; j < jl; j++) {
          child = assoc[j];

          if (child.is_new && !child.changed) continue;

          child.setParent(model);
          coll.push(child);
        }
      } else if (model.associations[key] === Model.ASSOC_MANY_MANY) {
        // We are dealing with an collection.
        // If we find a new + not changed child, discard it (has no data).
        // If we find a new child that is changed, add it to the save collection.
        for (var j = 0, jl = assoc.length; j < jl; j++) {
          child = assoc[j];

          if (child.is_new && !child.changed) continue;

          child.addChild(model);
          coll.push(child);
        }
      } else if (model.associations[key] === Model.ASSOC_ONE) {
        if (assoc.is_new && !assoc.changed) continue;

        assoc.setParent(model);
        coll.push(assoc);
        links.push([model, assoc]);
      }
    }
  }

  return coll;
};

// Add keys to an array to be SUNIONed.
var addAssociationIds = function addAssociationIds (model, union, coll) {
  // Only has_many associations make life difficult.
  if (model.has_many) {
    var key;
    // For each key, push a set key ready for union.
    for (var i = 0, il = model.has_many.length; i < il; i++) {
      key = Model.plurals[model.has_many[i]].type;
      union[key] || (union[key] = []);
      union[key].push('assoc:' + model.type + ':' + model.id + ':' + key);
    }
  }

  // Add has_one to collection without going through database
  if (model.has_one) {
    var key;

    for (var i = 0, il = model.has_one.length; i < il; i++) {
      key = model.has_one[i];
      coll[key] || (coll[key] = []);
      coll[key].push(model.get(key + '_id'));
    }
  }

  return union;
};

// Add a union hash to a transaction.
var removeUnionHash = function removeUnionHash (union, trans, callback) {
  // For each type, union the set keys of each array.
  // We need closure to pass the key.
  Object.keys(union).forEach(function (key) {
    trans.push(['sunion', union[key], function (error, ids) {
      callback(error, key, ids);
    }]);
  });

  return trans;
};

// Add model validations, + links.
var addModelValidations = function addModelValidations (trans, links, model, callback) {
  var props = Object.keys(model.properties),
      prop,
      key,
      value;

  // For each property, add the links + query.
  for (var j = 0, jl = props.length; j < jl; j++) {
    key   = props[j];
    prop  = model.properties[key];
    value = model.get(key);

    if (prop.unique) {
      links.push([key, model]);

      // If number, check with a zrangebyscore.
      // Otherwise check if the key exists
      if ('number' === model.properties[key].type) {
        trans.push(['zrangebyscore', 'index:' + model.type + ':' + key, value, value, callback]);
      } else {
        trans.push(['exists', 'index:' + model.type + ':' + key + ':' + value, callback]);
      }
    }
  }

  return trans;
};

// Remove model :key set indexes - mainly for associations
var addModelRemoveSetIndex = function addModelRemoveSetIndex (trans, model, parent, done, is_assoc) {
  if (model.indexes) {
    var index, key;

    // For each index, check whether it is a normal index or not,
    // then remove it marking that index as done.
    for (var i = 0, il = model.indexes.length; i < il; i++) {
      index = model.indexes[i];
      key   = model.type + ':' + index + ':' + model.previous.attributes[index];

      if (!done[key] && 'number' !== model.properties[index].type) {
        // Remove it.
        trans.push(['del', 'index:' + parent + ':' + model.get(parent + '_id') +
                    ':' + key]);
        done[key] = true;
      }
    }
  }

  return trans;
};

// Remove collections, indexes and views.
//
// * Remove the ids counter
// * Remove the collection
// * Remove views
// * Remove number indexes
var addModelTypeRemove = function addModelTypeRemove (trans, model) {
  var index, view;

  // Remove views.
  if (model.views) {
    var view;

    for (var i = 0, il = model.views.length; i < il; i++) {
      view = model.views[i];
      trans.push(['del', 'view:' + model.type + ':' + view]);
    }
  }

  // Remove normal and count indexes.
  if (model.indexes) {
    var index;

    for (var i = 0, il = model.indexes.length; i < il; i++) {
      index = model.indexes[i];

      if (model.properties[index].type === 'number') {
        trans.push(['del', 'index:' + model.type + ':' + index]);
      }
    }
  }

  trans.push(['del', 'id:' + model.type]);
  trans.push(['del', 'collection:' + model.type]);

  return trans;
};

// Shortcut for making a model hmset query.
var modelToQuery = function modelToQuery (model) {
  // Add the db key first up.
  var keys = model.diff.attributes,
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
