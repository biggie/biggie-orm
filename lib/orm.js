var config = require('./config'),
    utils  = require('./utils');

// Model prototype
var Model = exports.Model = require('./model');

// Collection prototype
var Collection = exports.Collection = require('./collection');

// Redis <3
exports.db    = require('./db');
Model.db      = exports.db;
Collection.db = exports.db;

// Model hash
var models = Model.models = exports.models = {};

// Model names hash
var model_names = Model.model_names = exports.model_names = {};

// Plural mappings
var plurals = Model.plurals = exports.plurals = {};

// Model creation
exports.model = function model (name, props) {
  if (!props) return models[name];

  var model_name = props.type || name.toLowerCase();

  // Create the constructor.
  // All models inherit from Model
  var Ctor = function (attrs) {
    Model.call(this, attrs);
  };
  Ctor.prototype = Object.create(Model.prototype);
  Ctor.type      = Ctor.prototype.type   = model_name;
  Ctor.plural    = Ctor.prototype.plural = props.plural || model_name;

  // Add the properties to the constructor as well
  // as the prototype.
  Model.addProperties(Ctor, props);

  // Add mappings
  plurals[Ctor.plural] = Ctor;
  models[name] = Ctor;
  model_names[model_name] = Ctor;

  return Ctor;
};

// Create that damn server
exports.createServer = function createServer (options) {
};
