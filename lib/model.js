var config     = require('./config'),
    utils      = require('./utils'),
    Collection = require('./collection'),
    noop       = utils.noop;

var Model = module.exports = function Model (attributes) {
  // Setup instance variables
  this.properties         || (this.properties = {});
  this.attributes         =  {};
  this.diff               =  {
    attributes:   [],
    associations: {}
  };
  this.errors             =  {};
  this.previous           =  {
    attributes: {},
    // A reference to view state.
    views:      []
  };
  // For caching previous values.
  this.last               = {
    views: []
  };
  // Contains pending associations. Gets cleared on every save.
  // This ensures queries are as light as possible.

  // Valid argument?
  attributes || (attributes = {});

  // Get the keys
  var keys = Object.keys(attributes),
      key,
      result;

  // Validate the attributes. Add errors to this.errors
  for (var i = 0, il = keys.length; i < il; i++) {
    key = keys[i];
    if (this.properties[key]) {
      this.attributes[key] = attributes[key];
      this.diff.attributes.push(key);
      result = validate(this.properties[key], attributes[key]);
      if (result !== true) {
        this.has_errors = true;
        this.errors[key] = result;
      }
    }
  }

  // Did we change anything?
  if (0 >= this.diff.attributes.length) this.changed = false;

  // Make sure we return ourself
  return this;
};

// These get set by orm.js
var db = Model.db = null;
Model.plurals     = {};
Model.model_names = {};
Model.models      = {};

// Association type flags
var i = 0;
Model.ASSOC_MANY   = i++;
Model.ASSOC_ONE    = i++;
Model.ASSOC_BELONG = i++;

Model.addProperties = function addProperties (model, props) {
  var keys  = Object.keys(props),
      proto = model.prototype;

  if (typeof proto.properties !== 'object') {
    proto.properties = {};
  }

  keys.forEach(function (key) {
    // Is is a definition, or custom property?
    if (isProperty(props[key])) {
      addModelProperty(model, key, props[key]);
    } else {
      // Custom property. Make it happen.
      proto[key] = props[key];
    }
  });

  // Associations <3
  proto.associations = {};
  var camel, assoc, valid, single_camel,
      has_associations = false;

  // has_many
  // We need to map to the plurals
  if (proto.has_many) {
    valid = [];
    proto.has_many.forEach(function (assoc) {
      has_associations = true;

      // Camels!
      camel = utils.camelCase(assoc, true);

      // Method for getting the children
      proto['get' + camel] = function (callback) {
        var key = Model.plurals[assoc].type;
        return Model.db.getCollection(
            'assoc:' + this.type + ':' + this.id + ':' + key, key, callback);
      };

      // Child defined?
      if (Model.plurals[assoc]) {
        // Register the association. We only want the plural
        // label for the method names.
        // Plurals are problematic :/
        assoc = Model.plurals[assoc].type;
        proto.associations[assoc] = Model.ASSOC_MANY;

        setHasManyMethods(proto, assoc, camel);
      }
    });
  }

  // has_one
  // We need to map to the plurals.
  // Add a convenience property for `assocname_id`
  if (proto.has_one) {
    valid = [];
    proto.has_one.forEach(function (assoc) {
      has_associations = true;

      // Register the association.
      proto.associations[assoc] = Model.ASSOC_ONE;

      // Camels <3. Snakes get my love too... But not in that way <.<
      camel = utils.camelCase(assoc, true);

      // Method for getting the associated model.
      proto['get' + camel] = function (callback) {
        return Model.db.getModel(assoc, this.get(assoc + '_id'), callback);
      };

      // Add the property.
      addModelProperty(model, assoc + '_id', {
        type: 'number'
      });

      // Child defined yet?
      if (Model.model_names[assoc]) {
        setHasOneMethods(proto, assoc, camel);
      }
    });
  }

  // belongs_to
  // So we can set the associations, and remove has_many and has_one
  // links.
  // It will also add a `assocname_id` field for convenience.
  if (proto.belongs_to) {
    valid = [];
    proto.belongs_to.forEach(function (assoc) {
      has_associations = true;

      // Register the shizzle.
      proto.associations[assoc] = Model.ASSOC_BELONG;

      // Camels <3 Snakes get my love too... But not in that way <.<
      camel = utils.camelCase(assoc, true);

      // Method for getting the parent.
      proto['get' + camel] = function (callback) {
        return Model.db.getModel(assoc, this.get(assoc + '_id'), callback);
      };

      // Method for setting the parent.
      proto['set' + camel] = setModelChildParent;

      // Add property.
      addModelProperty(model, assoc + '_id', {
        type: 'number'
      });

      // Parent defined yet?
      if (Model.model_names[assoc]) {
        var parent_proto = Model.model_names[assoc].prototype,
            type;

        // Assume the developer isn't stupid, and actually set associations
        // up correctly. Otherwise we would end up with missing mappings etc.

        // Do we need camels, or just one camel?
        if (parent_proto.associations[proto.type] === Model.ASSOC_ONE) {
          camel = utils.camelCase(proto.type, true);
          setHasOneMethods(parent_proto, proto.type, camel);
        } else {
          // Parent was declared with plurals. Annoying but meh.
          // Set the parent association type.
          parent_proto.associations[proto.type] = Model.ASSOC_MANY;
          camel = utils.camelCase(proto.plural, true);
          setHasManyMethods(parent_proto, proto.type, camel);
        }
      }
    });
  }

  // Your acusations about me have association are false!
  if (!has_associations) {
    proto.associations = false;
  }

  // TODO: Add constructor methods:
  // .find()
  // .sync()

  // new()
  model.new = newModel;
  // clear()
  model.clear = clearModel;
  // get()
  model.get = getModel;
  // all()
  model.all = getAllModels;
  // count()
  model.count = countModels;

  // TODO: Add view methods.
};

// Add a model property + getter + setter
var addModelProperty = function addModelProperty (model, key, prop) {
  model.prototype.properties[key] = prop;
  // Add a get/set for convenience
  Object.defineProperty(model.prototype, key, {
    get: function () {
      return this.get(key);
    },
    set: function (value) {
      this.set(key, value);
    },
    enumerable: true
  });
};

// Shortcut for `new Model`
var newModel = function newModel (attrs) {
  return new this(attrs);
};

// Get a model by id. Simple.
var getModel = function getModel (id, callback) {
  return Model.db.getModel(this.type, id, callback);
};

// Get all models
var getAllModels = function getAllModels (callback) {
  return Model.db.getCollection('collection:' + this.type, this.type, callback);
};

// Get the number of models of a certain type.
var countModels = function countModels (callback) {
  return Model.db.countCollection(this.type, callback);
};

// For racist people, that want to be rid of all entries of a
// certain type. Yes, the tests are racist.
var clearModel = function clearModel (callback) {
  return Model.db.clearModelType(this.type, callback);
};

// For setting a single model association.
// We will make the assumption the developer knows what he is doing,
// and just use the model.type.
var setModelChildParent = function setModelChildParent (model) {
  // Any change?
  if (model.id && this.get(model.type + '_id') === model.id) return this;

  // Add to the diff
  this.changed = true;
  this.diff.associations[model.type] = model;

  return this;
};

// For adding some children
var addModelChildren = function addModelChildren (self, type, collection) {
  this.changed = true;

  // Return fast if there is nothing there yet.
  if (!self.diff.associations[type]) {
    self.diff.associations[type] = collection;
    return self;
  }

  // We won't bother checking if it is already added.
  // Meh. Redis is probably faster than ecma loops anyway.
  var assoc = self.diff.associations[type];
  assoc.push.apply(assoc, collection.slice());

  return self;
};

// For adding a child
var addModelChild = function addModelChild (child) {
  this.changed = true;

  // If something is yet to be added, make a new collection.
  if (!this.diff.associations[child.type]) {
    this.diff.associations[child.type] = new Collection([child]);
    return this;
  }

  // We won't bother checking if it is already added.
  this.diff.associations[child.type].push(child);

  return this;
};

// Declaration order sucks.
// So we made these methods! Holy Batman!
var setHasManyMethods = function setHasManyMethods (proto, assoc, camel) {
  var single_camel = utils.camelCase(assoc, true);

  // Method for adding children.
  proto['add' + camel] = function (coll) {
    return addModelChildren(this, Model.model_names[assoc].type, coll);
  };

  // Method for adding a child.
  proto['add' + single_camel] = addModelChild;
};

var setHasOneMethods = function setHasOneMethods (proto, assoc, camel) {
  // Method for setting the child.
  proto['set' + camel] = setModelChildParent;
};

(function () {
  // Standard properties
  this.is_new    = true;
  this.removed   = false;
  this.has_errors = false;
  this.changed   = true;

  // Set a attribute
  this.set = function set (name, value, silent) {
    // Return early if there was no change.
    if (this[name] === value) return this;

    // Are we a attribute, or a property?
    if (this.properties[name]) {
      this.attributes[name] = value;

      // Silent and deadly huh? Stealthy...
      if (silent) {
        this.previous.attributes[name] = value;
      } else {
        this.changed = true;
        this.diff.attributes.push(name);
      }

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
          this.has_errors = false;
        }
      } else {
        this.has_errors    = true;
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
    callback || (callback = noop);
    // If we have errors, then bail
    if (this.has_errors) {
      return callback(new Error('Has errors'));
    }

    return Model.db.saveModel(this, callback);
  };

  // Remove a model
  this.remove = function remove (callback) {
    callback || (callback = noop);
    // Don't remove if we are new
    if (this.is_new || !this.id) return callback(null, this);

    // Obliterate the model!
    return Model.db.removeModel(this, callback);
  };

  // Has children?
  this.hasChildren = function hasChildren () {
    if ((this.has_many && this.has_many.length > 0) || this.has_one) {
      return true;
    }

    return false;
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
