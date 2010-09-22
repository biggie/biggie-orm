var noop = exports.noop = function () {};

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
