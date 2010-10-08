var utils  = require('./util');

// We are a event emitter.
exports = module.exports = new process.EventEmitter();

// Model prototype
var Model = exports.Model = require('./model');

// Collection prototype
var Collection = exports.Collection = require('./collection');

// Finder prototype.
var Finder = exports.Finder = require('./finder');

Model.orm = Collection.orm = module.exports;

// Redis <3
exports.db    = require('./db');
Model.db      = exports.db;
Collection.db = exports.db;
Finder.db     = exports.db;

exports.connect = function connect (port, host) {
  return exports.db.connect(port, host);
};

// Model hash
var models = Model.models = exports.models = {};

// Definitions hash, for biggie-sync.
var definitions = exports.definitions = {};

// Model names hash
var model_names = exports.model_names = {};
Finder.model_names = Model.model_names = exports.model_names;

// Plural mappings
var plurals = Model.plurals = exports.plurals = {};

// Validation hashes
var validations          = require('./validations');
exports.property_types   = validations.property_types;
exports.validation_types = validations.validation_types;

// Model creation
exports.model = function model (name, props) {
  // Return the model if only one arguments.
  if (!props) {
    return models[name];
  }

  definitions[name] = props;

  var model_name = props.type || name.toLowerCase();

  // Create the constructor.
  // All models inherit from Model
  var Ctor = function (attrs) {
    Model.call(this, attrs);
  };
  Ctor.prototype = Object.create(Model.prototype);
  Ctor.prototype.constructor = Ctor;

  // Default plural just has a 's' slammed on the end.
  Ctor.type   = Ctor.prototype.type   = model_name;
  Ctor.plural = Ctor.prototype.plural = props.plural || model_name + 's';
  // Update definitions.
  definitions[name].type   = Ctor.type;
  definitions[name].plural = Ctor.plural;

  // Add mappings
  plurals[Ctor.plural]    = Ctor;
  models[name]            = Ctor;
  model_names[model_name] = Ctor;

  // Add the properties to the constructor as well
  // as the prototype.
  Model.addProperties(Ctor, props);

  return Ctor;
};
