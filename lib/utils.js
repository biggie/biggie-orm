var noop = exports.noop = function () {};

// Set a model as saved.
exports.markModelAsSaved = function markModelAsSaved (model) {
  // Update previous attributes.
  var keys = model.diff.attributes,
      key;

  for (var i = 0, il = keys.length; i < il; i++) {
    key = keys[i];
    model.previous.attributes[key] = model.attributes[key];
  }

  // We are no longer changed.
  model.changed                = false;
  model.diff.attributes.length = 0;

  // Reset associations.
  model.diff.associations = {};

  // Sneaky hack, but meh. TODO maybe?
  if (model.is_new) {
    model.constructor.orm.emit('new', model);
  } else {
    model.constructor.orm.emit('save', model);
  }

  // We are no longer new, or removed.
  model.is_new = model.removed = false;

  return model;
};

// Set a model as saved.
exports.markModelAsRemoved = function markModelAsRemoved (model) {
  // We are new and removed.
  model.is_new = model.removed = true;

  // Model lost id. Lost, confused about life. Needs salvation.
  model.id = null;

  // We have just lost all associations.
  model.diff.associations = {};

  // Sneaky hack, but meh. TODO maybe?
  model.constructor.orm.emit('remove', model);

  return model;
};

// Set ids etc.
exports.setHasOneLinks = function setHasOneLinks (links) {
  var parent, child;
  for (var i = 0, il = links.length; i < il; i++) {
    parent = links[i][0];
    child  = links[i][1];

    // Do it silent.
    parent.set(child.type + '_id', child.id, true);
  }
};

// Pfft, horses?! Camels <3
// DRY? Never heard of it!
exports.camelCase = function camelCase (string, first) {
  if (first) string = string[0].toUpperCase() + string.slice(1);

  var index,
      last;

  // Remove ` `
  while (-1 !== (index = string.indexOf(' '))) {
    first = string.slice(0, index);
    last  = string.slice(index + 2);
    last[0] = last[0].toUpperCase();
    string = first + string[index + 1].toUpperCase() + last;
  }

  // Remove `_`
  while (-1 !== (index = string.indexOf('_'))) {
    first = string.slice(0, index);
    last  = string.slice(index + 2);
    last[0] = last[0].toUpperCase();
    string = first + string[index + 1].toUpperCase() + last;
  }

  // Remove `-`
  while (-1 !== (index = string.indexOf('-'))) {
    first = string.slice(0, index);
    last  = string.slice(index + 2);
    last[0] = last[0].toUpperCase();
    string = first + string[index + 1].toUpperCase() + last;
  }

  return string;
};

exports.bufferToString = function bufferToString (buffer) {
  var ret = '', i = 0, end = buffer.length;

  while (i < end) {
    ret += String.fromCharCode(buffer[i]);
    i++;
  }

  return ret;
};

var Pool = function Pool (size, fn) {
  this.clients  = [];
  this.size     = size;
  this._pointer = 0;
  for (var i = 0; i < size; i++) {
    this.clients.push(fn(i));
  }
  return this;
};

exports.Pool = Pool;

Pool.prototype.get = function get () {
  return this.clients[this.pointer];
};

Object.defineProperty(Pool.prototype, 'pointer', {
  get: function () {
    if (this._pointer >= this.size) this._pointer = 0;
    return this._pointer++;
  }
});

exports.extend = function extend (target, source) {
  var keys = Object.keys(source),
      key;
  for (var i = 0, length = keys.length; i < length; i++) {
    key = keys[i];
    target[key] = source[key];
  }
  return target;
};

exports.arrayExtend = function arrayExtend (array, source) {
  var element;

  for (var i = 0, il = source.length; i < il; i++) {
    element = source[i];
    if (-1 !== array.indexOf(element)) {
      array.push(element);
    }
  }

  return array;
};
