var config     = require('./config'),
    utils      = require('./utils'),
    Collection = require('./collection'),
    validator  = require('./validations').validateModel,
    Task       = require('parallel').Task,
    noop       = utils.noop;

var Model = module.exports = function Model (attributes) {
  // Setup instance variables
  this.properties   || (this.properties = {});
  this.attributes   =  {};
  this.diff         =  {
    attributes:   [],
    associations: {}
  };
  this.errors       =  {};
  this.previous     =  {
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
    this.set(keys[i], attributes[key]);
  }

  // Make sure we return ourself
  return this;
};

// These get set by orm.js
Model.db          = null;
Model.orm         = null;
Model.plurals     = null;
Model.model_names = null;
Model.models      = null;

// Association type flags
var i = 0;
Model.ASSOC_MANY   = i++;
Model.ASSOC_ONE    = i++;
Model.ASSOC_BELONG = i++;
i = undefined;

Model.addProperties = function addProperties (model, props) {
  var keys  = Object.keys(props),
      proto = model.prototype,
      key;

  if (typeof proto.properties !== 'object') {
    proto.properties = {};
  }

  for (var i = 0, il = keys.length; i < il; i++) {
    key = keys[i]

    // Is is a definition, or custom property?
    // TODO: Use validateProperty from validations
    if (isProperty(props[key])) {
      addModelProperty(model, key, props[key]);
    } else {
      if ('indexes' === key && proto.indexes) {
        proto.indexes.push.apply(proto.indexes, props[key]);
      } else {
        // Custom property. Make it happen.
        proto[key] = props[key];
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

      // Camels!
      camel = utils.camelCase(assoc, true);

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
      // Also add a explicit one, so we don't have to
      // do camel conversions all the time.
      proto.setParent = setModelChildParent;

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
  // .find() for indexed properties.
  // .sync() for reseting indexes, views and associations.

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

  // For 'old' view: getOld etc.
  if (proto.views) {
    proto.views.forEach(function (view) {
      var camel = utils.camelCase(view, true);

      model['get' + camel] = function (callback) {
        return Model.db.getCollection(
            'view:' + this.type + ':' + view,
            this.type, callback);
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

  // Set our parent id
  this.set(model.type + '_id', model.id);

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
        'assoc:' + this.type + ':' + this.id + ':' + assoc, assoc, callback);
  };

  // Method for adding children.
  proto['add' + camel] = function (coll) {
    return addModelChildren(this, assoc, coll);
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
            assoc, callback);
      };
    });
  }

  // TODO
  // Find children from indexes.
  // E.g. findComments
};

var setHasOneMethods = function setHasOneMethods (proto, assoc, camel) {
  // Method for setting the child.
  proto['set' + camel] = setModelChildParent;
};

(function () {
  // Standard properties
  this.is_new     = true;
  this.removed    = false;
  this.has_errors = false;
  this.changed    = false;

  // Set a attribute
  this.set = function set (name, value, silent) {
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
      }
    }

    return this;
  };

  // Get a attribute/property
  this.get = function get (name, def) {
    return this.properties[name] ?
                this.attributes[name] !== undefined ? this.attributes[name] : def :
                def;
  };

  // Validate the properties.
  this.validate = function validate (callback) {
    var self = this;

    if (callback) {
      return validator(this, function (errors) {
        callback(self.has_errors);
      });
    }

    return validator(this);
  };

  // Save a model
  this.save = function save (callback) {
    callback || (callback = noop);
    var self = this;

    // If we have errors, then bail
    if (this.has_errors) {
      return callback(Object.keys(this.errors));
    }

    // Validate.
    this.validate(function () {
      if (self.has_errors) {
        return callback(Object.keys(self.errors));
      }

      // Save.
      Model.db.saveModel(self, callback);
    });
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
