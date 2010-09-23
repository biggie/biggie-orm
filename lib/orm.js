var config = require('./config'),
    utils  = require('./utils');

// Model prototype
var Model = exports.Model = require('./model');

// Collection prototype
var Collection = exports.Collection = require('./collection');

// Redis <3
exports.db = require('./db');

// Model hash
var models = exports.models = {};

// Model names hash
var model_names = exports.model_names = {};

// Plural mappings
var plurals = exports.plurals = {};

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
  Ctor.type = Ctor.prototype.type = model_name;

  // Add the properties to the constructor as well
  // as the prototype.
  Model.addProperties(Ctor, props);

  // Add mappings
  if (props.plural) {
    plurals[props.plural] = Ctor;
  } else {
    plurals[model_name] = Ctor;
  }
  models[name] = Ctor;
  model_names[model_name] = Ctor;

  return Ctor;
};

// Create that damn server
exports.createServer = function createServer (options) {
};
