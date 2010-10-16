var utils       = require('./util'),
    Collection  = require('./collection'),
    validations = require('./validations'),
    validator   = validations.validateModel,
    Task        = require('../deps/parallel').Task,
    Finder      = require('./finder'),
    noop        = utils.noop;

var Model = module.exports = function Model (attributes) {
  // Setup instance variables
  this.attributes = {};
  this.diff       = {
    attributes:   [],
    associations: {}
  };
  this.errors     =  {};
  this.previous   =  {
    attributes: {},
  };

  // Valid argument?
  attributes || (attributes = {});

  // Get the keys
  var keys = Object.keys(attributes),
      key,
      result;

  // Set the attributes.
  for (var i = 0, il = keys.length; i < il; i++) {
    key = keys[i];

    this.set(key, attributes[key]);
  }

  // Make sure we return ourself
  return this;
};

// Model inherits from EventEmitter
Model.prototype = Object.create(process.EventEmitter.prototype);

// These get set by orm.js
Model.db          = null;
Model.plurals     = null;
Model.model_names = null;
Model.models      = null;

// Association type flags
var i = 1;
Model.ASSOC_MANY      = i++;
Model.ASSOC_ONE       = i++;
Model.ASSOC_BELONG    = i++;
Model.ASSOC_MANY_MANY = i++;
i = undefined;

Model.addProperties = function addProperties (model, props, definition) {
  var keys  = Object.keys(props),
      proto = model.prototype,
      key;

  if (typeof proto.properties !== 'object') {
    proto.properties = {};
  }

  for (var i = 0, il = keys.length; i < il; i++) {
    key = keys[i]

    // Is is a definition, or custom property?
    if (validations.validateProperty(props[key])) {
      addModelProperty(model, key, props[key]);
    } else {
      if ('indexes' === key && proto.indexes) {
        proto.indexes.push.apply(proto.indexes, props[key]);
      } else {
        // Custom property. Make it happen.
        definition[key] = proto[key] = props[key];
      }
    }
  }

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

      proto.addChild = addModelChild;

      // Child defined?
      if (Model.plurals[assoc]) {
        // Camels!
        camel = utils.camelCase(assoc, true);

        // Register the association. We only both the plural
        // label, and single label, for the method names.
        // Plurals are problematic :/
        assoc                     = Model.plurals[assoc].type;
        proto.associations[assoc] = Model.ASSOC_MANY;

        // Many to many relationship?
        if (~proto.belongs_to.indexOf(assoc)) {
          proto.associations[assoc]                                   = Model.ASSOC_MANY_MANY;
          Model.model_names[assoc].prototype.associations[proto.type] = Model.ASSOC_MANY_MANY;

          setHasManyMethods(Model.model_names[assoc].prototype, proto.type,
                            utils.camelCase(proto.plural, true));
        }

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
        setBelongsToMethods(Model.model_names[assoc].prototype,
                            proto.type, utils.camelCase(proto.type, true));
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

      // Register the shizzle. We could be ASSOC_MANY_MANY,
      // so we check if we have been set yet...
      if (!proto.associations[assoc]) {
        proto.associations[assoc] = Model.ASSOC_BELONG;
      }

      // Parent defined yet?
      if (Model.model_names[assoc]) {
        // Camels <3 Snakes get my love too... But not in that way <.<
        camel = utils.camelCase(assoc, true);

        var parent_proto = Model.model_names[assoc].prototype;

        // Assume the developer isn't stupid, and actually set associations
        // up correctly. Otherwise we would end up with missing mappings etc.

        // Do we need camels, or just one camel?
        if (parent_proto.associations[proto.type] === Model.ASSOC_ONE) {
          setBelongsToMethods(proto, assoc, camel);
          camel = utils.camelCase(proto.type, true);
          setHasOneMethods(parent_proto, proto.type, camel);
        } else if (Model.ASSOC_MANY_MANY !== proto.associations[assoc]) {
          // Parent was declared with plurals. Annoying but meh.
          // Set the parent association type.
          // Many to many realationships have already been formed by this stage,
          // so we ignore them.
          setBelongsToMethods(proto, assoc, camel);
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
  // .sync() for reseting indexes, views and associations.

  // Database
  model.db  = Model.db;
  model.orm = Model.orm;

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
  // find()
  model.find = findModels;

  // For 'old' view: getOld etc.
  if (proto.views) {
    proto.views.forEach(function (view) {
      var camel = utils.camelCase(view, true);

      model['get' + camel] = function (callback) {
        return Model.db.getCollection(
          'view:' + this.type + ':' + view,
          this.type, false, callback);
      };
    });
  }
};

// Add a model property + getter + setter
var addModelProperty = function addModelProperty (model, key, prop) {
  model.prototype.properties[key] = prop;

  // If unique, make sure we have a index for the key.
  if (prop.unique) {
    model.prototype.indexes || (model.prototype.indexes = []);
    if (-1 === model.prototype.indexes.indexOf(key)) {
      model.prototype.indexes.push(key);
    }
  }

  // Add a get/set for convenience, if we are allowed.
  if (model.prototype[key] !== undefined) return;

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
  return Model.db.getCollection('collection:' + this.type, this.type, false, callback);
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

// Find models using the finder.
var findModels = function findModels (query) {
  return new Finder(query, 'collection:' + this.type, this.type);
};

// Find model associations using the trusty Finder.
var findAssociations = function findAssociations (assoc, model, query) {
  return new Finder(query, 'assoc:' + model.type + ':' + model.id +
      ':' + assoc, assoc, model.type + ':' + model.id + ':');
};

// For setting a single model association.
// We will make the assumption the developer knows what he is doing,
// and just use the model.type.
var setModelChildParent = function setModelChildParent (model) {
  // Add to the diff
  this.changed = true;
  this.diff.associations[model.type] = model;

  // Set our parent id
  this.set(model.type + '_id', model.id);

  return this;
};

// For adding some children
var addModelChildren = function addModelChildren (self, type, collection) {
  self.changed = true;

  // Return fast if there is nothing there yet.
  if (!self.diff.associations[type]) {
    self.diff.associations[type] = collection;
    return self;
  }

  // We won't bother checking if it is already added.
  // Assume the developer isn't that stupid.
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

  // Method for getting the children
  proto['get' + camel] = function (callback) {
    return Model.db.getCollection(
        'assoc:' + this.type + ':' + this.id + ':' + assoc, assoc, false, callback);
  };

  // Method for adding children.
  proto['add' + camel] = function (coll) {
    return addModelChildren(this, assoc, coll);
  };

  // Method for finding children.
  proto['find' + camel] = function (query) {
    return findAssociations(assoc, this, query);
  };

  // Method for adding a child.
  proto['add' + single_camel] = addModelChild;

  // Get chilren from view.
  // 'old' view for 'comments': getOldComments
  var views = Model.model_names[assoc].prototype.views;
  if (views) {
    views.forEach(function (view) {
      var view_camel = utils.camelCase(view, true);

      proto['get' + view_camel + camel] = function (callback) {
        return Model.db.getCollection(
            'view:' + this.type + ':' + this.id + ':' + assoc + ':' + view,
            assoc, false, callback);
      };
    });
  }
};

var setHasOneMethods = function setHasOneMethods (proto, assoc, camel) {
  // Method for setting the child.
  proto['set' + camel] = setModelChildParent;
};

var setBelongsToMethods = function setBelongsToMethods (proto, assoc, camel) {
  // Method for getting the parent.
  proto['get' + camel] = function (callback) {
    return Model.db.getModel(assoc, this.get(assoc + '_id'), callback);
  };

  // Method for setting the parent.
  proto['set' + camel] = setModelChildParent;

  // Also add a explicit one, so we don't have to
  // do camel conversions all the time.
  proto.setParent = setModelChildParent;

  // Add property.
  addModelProperty(proto.constructor, assoc + '_id', {
    type: 'number'
  });
};

// Standard properties
Model.prototype.is_new     = true;
Model.prototype.removed    = false;
Model.prototype.has_errors = false;
Model.prototype.changed    = false;

// Set a attribute
Model.prototype.set = function set (name, value, silent) {
  // Return early if there was no change.
  if (this[name] === value) return this;

  // Are we a valid attribute?
  if (this.properties[name]) {
    this.attributes[name] = value;

    // Silent and deadly huh? Stealthy...
    if (silent) {
      this.previous.attributes[name] = value;
    } else {
      this.changed = true;
      this.diff.attributes.push(name);
      Model.orm.emit('changed', this);
      this.emit('changed', this);
    }
  }

  return this;
};

// Get a attribute/property
Model.prototype.get = function get (name, def) {
  return this.properties[name] ?
              this.attributes[name] !== undefined ? this.attributes[name] : def :
              def;
};

// Update serveral properties at once.
Model.prototype.update = function (attributes) {
  var key,
      keys = Object.keys(attributes);

  // For each attribute key, call set()
  for (var i = 0, il = keys.length; i < il; i++) {
    key = keys[i];

    this.set(key, attributes[key]);
  }

  // Return `this` so we can chain.
  return this;
};

// Return a valid object respresentation of the class - ready for
// serialization etc.
Model.prototype.toObject = function () {
  var key,
      ret = {},
      // Use previous, saved attributes.
      keys = Object.keys(this.previous.attributes);

  ret.type       = this.type;
  ret.plural     = this.plural;
  ret.attributes = {};

  for (var i = 0, il = keys.length; i < il; i++) {
    key                 = keys[i];
    ret.attributes[key] = this.previous.attributes[key];
  }

  return ret;
};

// toJson() is just a simple JSON.stringify call around toObject()
Model.prototype.toJson = function () {
  return JSON.stringify(this.toObject());
};

// Validate the properties.
Model.prototype.validate = function validate (callback) {
  var self = this;

  if (callback) {
    return validator(this, function (errors) {
      Model.orm.emit('validate', self);
      self.emit('validate', self);
      callback(self.has_errors);
    });
  }

  return validator(this);
};

// Save a model
Model.prototype.save = function save (callback) {
  callback || (callback = noop);
  var self = this;

  // Validate.
  this.validate(function () {
    if (self.has_errors) {
      return callback(Object.keys(self.errors));
    }

    Model.orm.emit('beforesave', self);
    self.emit('beforesave', self);

    // Save.
    Model.db.saveModel(self, callback);
  });
};

// Remove a model
Model.prototype.remove = function remove (callback) {
  callback || (callback = noop);
  // Don't remove if we are new
  if (this.is_new || !this.id) return callback(null, this);

  // Obliterate the model!
  return Model.db.removeModel(this, callback);
};
