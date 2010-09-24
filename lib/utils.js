var noop = exports.noop = function () {};

// Set a model as saved.
exports.markModelAsSaved = function markModelAsSaved (model) {
  // Update previous attributes.
  var keys = model.changed_attributes,
      key;

  for (var i = 0, il = keys.length; i < il; i++) {
    key = keys[i];
    model.previous.attributes[key] = model.attributes[key];
  }

  // We are no longer changed.
  model.changed                   = false;
  model.changed_attributes.length = 0;

  // Bring the previous views up-to-date
  model.previous.views = model.last.views;

  // We are no longer new, or removed.
  model.isNew = model.removed = false;

  return model;
};

// Pfft, horses?! Camels <3
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
