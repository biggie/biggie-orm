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
      input = JSON.stringify(input);
      if (undefined !== input) return input;
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

// If two or more arguments are specified (function.length !== 1),
// then it is an async op. (value, wanted, model, callback)
// `wanted` is `true` when we want to have it match the type,
// `false` when we want it to not match the type.
var email_re = new RegExp('\\b[A-z0-9._%+-]+@[A-z0-9.-]+\\.[A-z]{2,4}\\b');
exports.validation_types = {
  'email': function (input) {
    email_re.lastIndex = 0;
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
exports.validateModel = function validateModel (model, callback, async, coll_task, coll_i, unique) {
  // Already saved and not changed? No need to re-validate.
  if (!model.is_new && !model.changed) {
    if (callback) callback(null);
    return false;
  }

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

    // Required?
    if (value === null || value === undefined) {
      if (true === model.properties[prop].required) {
        // We are required, and we aren't there, so quit early.
        found = true;
        errors[prop] = new ValidationError(exports.EREQUIRED, prop);
      }

      // Finish early.
      continue;
    }

    // Hasn't changed? Don't check it.
    // TODO: Maybe remove this -- in case validations change
    // and the value never updates.
    if (-1 === model.diff.attributes.indexOf(prop)) continue;

    // Unique hash present? Check against it.
    if (unique) {
      if (model.properties[prop].unique && unique[prop] && unique[prop][value]) {
        // Unique error within collection.
        found = true;
        errors[prop] = new ValidationError(exports.EUNIQUE, prop);
        continue;
      }

      // Add key to unique.
      unique[prop] || (unique[prop] = {});
      unique[prop][value] = true;
    }

    // Go through types.
    types = Object.keys(model.properties[prop]);
    for (var j = 0, jl = types.length; j < jl; j++) {
      type       = types[j];
      type_value = model.properties[prop][type];

      // Already done required check.
      if ('required' === type) continue;
      // `type` key?
      else if ('type' === type) {
        // We allow null values.
        if (null === value) continue;

        // Check property.
        tmp_value = exports.property_types[type_value](value);
        if (tmp_value === null) {
          found        = true;
          errors[prop] = new ValidationError(exports.ETYPE, type_value);
          continue;
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
        if (tmp_value.length !== 1) {
          // Declare it lazy as we might not have needed it.
          task || (task = new Task);
          task.add(prop, [tmp_value, value, type_value, model]);
        } else {
          // Validate simple function.
          tmp_value = tmp_value(value);
          if (tmp_value === !type_value) {
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
    model.has_errors = true;
    model.errors     = errors;
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
            if (found) {
              model.has_errors = true;
              return fn(errors);
            }
            return fn(false);
          } else if (error) {
            found              = true;
            errors[prop]       = error;
            model.errors[prop] = error;
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
          if (found) {
            model.has_errors = true;
            return callback(model.errors);
          }
          callback(false);
        } else if ('belongs_to' === prop) {
          if (error) found = true;
        } else if (error) {
          found              = true;
          model.errors[prop] = error;
        }
      });
    }
  } else if (is_async) {
    // Just a plain ol' db async call.
    if (async) async.push(model);
    else if (callback) {
      model.constructor.db.validateModel(model, callback);
    }
  }

  // No errors. Call the callback is no async stuff is
  // being done.
  model.has_errors = false;
  model.errors     = {};
  if (!is_async && !task && callback) {
    callback(false);
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
      unique       = {},
      model,
      errors;

  // Loop through the collection, validating each with validateModel
  for (var i = 0, il = collection.length; i < il; i++) {
    model  = collection[i];
    errors = exports.validateModel(model, null, async_models, task, i, unique);

    if (errors) {
      found = true;
      models.push(model);
    }
  }

  // If the task has been added to at all, and we have async models,
  // then add the db to the task.
  // If the task is empty, then disregard the task and run the call immediately.
  // Otherwise just return now.
  if (found) {
    // Sync only errors. Return fast and early.
    collection.has_errors = true;
    collection.errors     = models;
    if (callback) callback(models);
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
          if (found) {
            collection.has_errors = true;
            collection.errors     = models;
            return callback(models);
          }

          callback(false);
        } else if ('collection' === index) {
          if (errors) {
            found = true;
            utils.arrayExtend(models, errors);
          }
        } else if (errors) {
          found = true;
          var model = collection[+index];
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
      collection.constructor.db.validateCollection(async_models, callback, collection);

      // No sync errors.
      return false;
    }
  }

  if (callback) return callback(false);
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
exports.EVALID    = i++;
// Failed property validation. E.g. not a valid string etc.
// Or could not cast to the specified type.
exports.ETYPE     = i++;
// Not unique
exports.EUNIQUE   = i++;
// Required.
exports.EREQUIRED = i++;
i = undefined;

// Validation error.
var ValidationError = function ValidationError (errno, type) {
  this.errno = errno;
  this.type  = type;

  switch (errno) {
  case exports.EVALID:
    this.message = 'Please specify a valid ' + type + '.';
    break;
  case exports.ETYPE:
    this.message = 'Not a valid ' + type + '.';
    break;
  case exports.EUNIQUE:
    this.message = 'This ' + type + ' has already been taken';
    break;
  case exports.EREQUIRED:
    this.message = 'A ' + type + ' is required.';
    break;
  }
};

exports.ValidationError = ValidationError;

ValidationError.prototype = Object.create(Error.prototype);
