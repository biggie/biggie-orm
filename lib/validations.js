var Task  = require('parallel').Task,
    utils = require('./utils');

// Async types.
var async_types = ['unique'];

// The basic property types. Can be added to by the user.
exports.property_types = {
  'number': function (input) {
    input = +input;

    if (input) {
      return input;
    }

    return null;
  },
  'string': function (input) {
    if (typeof input === 'string') {
      return input;
    }

    try {
      return JSON.stringify(input);
    } catch (err) {}

    return null;
  },
  'binary': function (buffer) {
    if (Buffer.isBuffer(buffer)) {
      return buffer;
    }

    if (buffer = exports.property_types.string(buffer)) {
      return new Buffer(buffer);
    }

    return null;
  }
};

// This object is exposed to the user also.
// Allows for validating things like email etc.

// Functions should only return booleans.

// If two arguments are specified (function.length === 3),
// then it is an async op. (value, model, callback)
var email_re = new RegExp('\\b[A-z0-9._%+-]+@[A-z0-9.-]+\\.[A-z]{2,4}\\b', 'g');
exports.validation_types = {
  'email': function (input) {
    return email_re.test(input);
  }
};

// Validate a model. Sync validations include:
//
// * Property types.
// * Validation types (email etc)
//
// Async include:
// 
// * Unique validation.
//
// `async` argument is an array/collection passed from validateCollection,
// popluated with models that need async ops done.
// `task` is a instance of `parallel.Task` in case we have other async
// validations.
exports.validateModel = function validateModel (model, callback, async, coll_task, coll_i) {
  var found    = false,
      errors   = {},
      is_async = false,
      keys     = Object.keys(model.properties),
      task,
      task_id,
      types,
      type,
      type_value,
      prop,
      value,
      tmp_value;

  // Go through each property, assuming the property is valid,
  // and validate it. If an async opertation is found, either push
  // to the async array, or validate the module individually.
  for (var i = 0, il = keys.length; i < il; i++) {
    prop  = keys[i];
    value = model.attributes[prop];

    // Go through types.
    types = Object.keys(model.properties[prop]);
    for (var j = 0, jl = types.length; j < jl; j++) {
      type       = types[j];
      type_value = model.properties[prop][type];

      // `type` key?
      if ('type' === type) {
        tmp_value = exports.property_types[type_value](value);
        if (value === null) {
          found        = true;
          errors[prop] = new ValidationError(exports.EPROP, type_value);
          break;
        }
        // Otherwise overwrite the attribute value if different.
        if (value !== tmp_value) {
          model.set(prop, tmp_value);
          value = tmp_value;
        }
      } else if (-1 !== async_types.indexOf(type)) {
        // We need to go to the db for a few things.
        if (type_value === true) {
          is_async = true;
        }
      } else if (tmp_value = exports.validation_types[type]) {
        // Async validations have two arguments.
        if (tmp_value.length === 3) {
          // Declare it lazy as we might not have needed it.
          task || (task = new Task);
          task.add(prop, [tmp_value, value, model]);
        } else {
          // Validate simple function.
          tmp_value = tmp_value(value);
          if (tmp_value === false) {
            found = true;
            errors[prop] = new ValidationError(exports.EVALID, type);
          }
        }
      }
      // Otherwise ignore the property type key.
    }
  }

  // If we have found a sync error, then don't bother
  // doing the async ones just yet.
  if (found) {
    if (callback) callback(errors);
    return errors;
  } else if (task) {
    // Add to collection, or execute.
    if (async) {
      // Add our task to the collection tasks.
      coll_task.add(coll_i, [function (fn) {
        var found  = false,
            errors = {};
        task.run(function (prop, error) {
          if (prop === null) {
            return fn(found ? errors : null);
          } else if (error) {
            found = true;
            errors[prop] = error;
          }
        });
      }]);
      // Add for db call if needed.
      if (is_async) async.push(model);
    } else if (callback) {
      // If we weren't called by a collection validation,
      // then we will add the model validation to the task.
      if (is_async || !async) {
        // We need a name that won't be taken by a attribute.
        // Will this do? I think so, as it is reserved anyway.
        task.add('belongs_to', [model.constructor.db.validateModel, model]);
      }

      // Run the task
      task.run(function (prop, error) {
        if (prop === null) {
          return callback(found ? errors : null);
        } else if ('belongs_to' === prop) {
          if (error) {
            found = true;
            utils.extend(errors, error);
          }
        } else if (error) {
          found = true;
          errors[prop] = error;
        }
      });
    }
  } else if (callback && is_async) {
    // Just a plain ol' db async call.
    if (async) async.push(model);
    else {
      model.constructor.db.validateModel(model, callback);
    }
  }

  // No errors. Call the callback is no async stuff is
  // being done.
  if (!is_async && !task && callback) {
    callback(null);
  }
  return false;
};

// Optimise for this specific use case. We could validate models one-by-one, but it
// is faster to do it (especially if there are db calls to be made) as one unit.
exports.validateCollection = function validateCollection (collection, callback) {
  var task         = new Task,
      async_models = [],
      found        = false,
      models       = [],
      model,
      errors;

  // Loop through the collection, validating each with validateModel
  for (var i = 0, il = collection.length; i < il; i++) {
    model  = collection[i];
    errors = exports.validateModel(model, null, async_models, task, i);

    if (errors) {
      found            = true;
      model.has_errors = true;
      model.errors     = errors;
      models.push(model);
    } else {
      model.has_errors = false;
      model.errors     = {};
    }
  }

  // If the task has been added to at all, and we have async models,
  // then add the db to the task.
  // If the task is empty, then disregard the task and run the call immediately.
  // Otherwise just return now.
  if (found) {
    // Sync only errors. Return fast and early.
    if (callback) callback(true, models);
    return models;
  } else if (callback) {
    if (0 < task.length) {
      if (0 < async_models.length) {
        task.add('collection', [collection.constructor.db.validateCollection, async_models]);
      }

      // Run the task. index is the collection index of the model.
      // If it is a return from the validateCollection db call,
      // then errors will either be `null` or an array of bad models.
      // Otherwise errors is null or an object of model errors.
      task.run(function (index, errors) {
        if (null === index) {
          callback(found ? models : null);
        } else if ('collection' === index) {
          if (errors) {
            found = true;
            utils.arrayExtend(models, errors);
          }
        } else if (errors) {
          found = true;
          var model = collection[+index];
          model.has_errors = true;
          utils.extend(model.errors, errors);
          if (-1 === models.indexOf(model)) {
            models.push(model);
          }
        }
      });

      // No sync errors
      return false;
    } else if (0 < async_models.length) {
      // Just the db call.
      collection.constructor.db.validateCollection(async_models, callback);

      // No sync errors.
      return false;
    }
  }

  if (callback) return callback(null);
  return false;
};

// Is the property a valid type?
exports.validateProperty = function (prop) {
  if (exports.property_types[prop.type]) {
    return true;
  }

  return false;
};

// Error types
var i = 0;
// Failed validation test. E.g. not a valid email etc.
exports.EVALID  = i++;
// Failed property validation. E.g. not a valid string etc.
// Or could not cast to the specified type.
exports.EPROP   = i++;
// Not unique
exports.EUNIQUE = i++;
i = undefined;

// Validation error.
var ValidationError = function ValidationError (errno, type) {
  this.errno = errno;
  this.type  = type;

  switch (errno) {
  case exports.EVALID:
    this.message = 'Please specify a valid ' + type + '.';
    break;
  case exports.EPROP:
    this.message = 'Was not a valid ' + type + '.';
    break;
  case exports.EUNIQUE:
    this.message = 'This ' + type + ' has already been taken';
  }
};

exports.ValidationError = ValidationError;

ValidationError.prototype = Object.create(Error.prototype);
