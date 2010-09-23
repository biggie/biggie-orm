var config = require('./config'),
    utils  = require('./utils'),
    db     = require('./db');

var Model = module.exports = function Model (attributes) {
  // Setup instance variables
  this.properties || (this.properties = {});
  this.attributes =  {};
  this.errors     =  {};

  // Valid argument?
  attributes || (attributes = {});

  // Get the keys
  var props = Object.keys(this.properties),
      key,
      result;

  // Validate the attributes. Add errors to this.errors
  for (var i = 0, il = props.length; i < il; i++) {
    key = props[i];
    this.attributes[key] = attributes[key];
    result = validate(this.properties[key], attributes[key]);
    if (result !== true) {
      this.hasErrors = true;
      this.errors[key] = result;
    }
  }

  // Make sure we return ourself
  return this;
};

Model.addProperties = function addProperties (model, props) {
  var keys  = Object.keys(props),
      proto = model.prototype;

  if (typeof proto.properties !== 'object') {
    proto.properties = {};
  }

  keys.forEach(function (key) {
    // Is is a definition, or custom property?
    if (isProperty(props[key])) {
      proto.properties[key] = props[key];
      // Add a get/set for convenience
      Object.defineProperty(proto, key, {
        get: function () {
          return this.get(key);
        },
        set: function (value) {
          this.set(key, value);
        },
        enumerable: true
      });
    } else {
      // Custom property. Make it happen.
      proto[key] = props[key];
    }
  });

  // TODO: Add constructor methods:
  // .find()
  // .getView()
  // .all()

  // new()
  model.new = newModel;
  // clear()
  // Removed all traces of a model type
  model.clear = clearModel;
  // get()
  model.get   = getModel;

  // TODO: Add association methods etc.
};

// Shortcut for `new Model`
var newModel = function newModel (attrs) {
  return new this(attrs);
};

// Get a model by id. Simple.
var getModel = function getModel (id, callback) {
  return db.getModel(this, id, callback);
};

// For racist people, that want to be rid of all entries of a
// certain type.
var clearModel = function clearModel (callback) {
  return db.clearModelType(this.type, callback);
};

(function () {
  // Standard properties
  this.isNew     = true;
  this.isRemoved = false;
  this.hasErrors = false;

  // Set a attribute
  this.set = function set (name, value) {
    // Are we a attribute, or a property?
    if (this.properties[name]) {
      this.attributes[name] = value;

      // Check whether the value is bad or not
      var result = validate(this.properties[name], value);
      if (result === true) {
        // Clear errors
        if (this.errors[name]) {
          delete this.errors[name];
        }
        if (0 >= Object.keys(this.errors).length) {
          // Deleting keys can lead to bad object performance.
          // So we reset the errors object.
          this.errors    = {};
          this.hasErrors = false;
        }
      } else {
        this.hasErrors    = true;
        this.errors[name] = result;
      }
    } else {
      this[name] = value;
    }

    return this;
  };

  // Get a attribute/property
  this.get = function get (name, def) {
    return this.properties[name] ? this.attributes[name] :
                typeof this[name] !== 'undefined' ? this[name] : def;
  };

  // Save a model
  this.save = function save (callback) {
    // If we have errors, then bail
    if (this.hasErrors) {
      return callback(new Error('Has errors'));
    }

    return db.saveModel(this, function (error, model) {
      if (error) return callback(error);
      model.isNew     = false;
      model.isRemoved = false;
      callback(null, model);
    });
  };

  // Remove a model
  this.remove = function remove (callback) {
    // Don't remove if we are new
    if (this.isNew || !this.id) return callback(null, this);

    // Obliterate the model!
    return db.removeModel(this, function (error, model) {
      if (error) return callback(error);
      model.isRemoved = true;
      model.isNew     = true;
      model.id        = null;
      callback(null, model);
    });
  };
}).call(Model.prototype);

var isProperty = function isProperty (prop) {
  if (prop && prop.type) return true;
  return false;
};

// Validate the attribute with the given definition.
// Return true if it is valid, otherwise return an Error
// object.
var validate = function validate (definition, attr) {
  if (!isProperty(definition)) return true;

  // TODO: Validation logic
  return true;
};
