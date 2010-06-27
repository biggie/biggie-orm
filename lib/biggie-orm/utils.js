
var utils = {};

// Array remove
utils.remove = function remove(array, index) {
  if (index <= 0) {
    return array.splice(1);
  }
  var temp = array.slice(0, index);
  array = array.slice(index + 1)
  temp.push.apply(temp, array);
  return temp;
};

// Each
utils.each = function each(array, fn) {
  for (var i = 0, il = array.length; i < il; i++) {
    fn.call(array[i], array[i], i, array);
  }
  return array;
};

// Extend / merge
utils.extend = function extend(target, source) {
  var key;
  for (key in source) {
    target[key] = source[key];
  }
  return target;
};

// Defined?
utils.defined = function defined(val) {
  if (val) return true;
  return false;
};

utils.generateUid = function generateUid() {
  return new Date().getTime() + Math.floor(Math.random() * 1000);
};

// Taken from underscore.js under MIT license. Kudos to
// Jeremy Ashkenas
utils.isEqual = function(a, b) {
  // Check object identity.
  if (a === b) return true;
  // Different types?
  var atype = typeof(a), btype = typeof(b);
  if (atype != btype) return false;
  // Basic equality test (watch out for coercions).
  if (a == b) return true;
  // One is falsy and the other truthy.
  if ((!a && b) || (a && !b)) return false;
  // One of them implements an isEqual()?
  if (a.isEqual) return a.isEqual(b);
  // Check dates' integer values.
  if (_.isDate(a) && _.isDate(b)) return a.getTime() === b.getTime();
  // Both are NaN?
  if (_.isNaN(a) && _.isNaN(b)) return false;
  // Compare regular expressions.
  if (_.isRegExp(a) && _.isRegExp(b))
    return a.source     === b.source &&
           a.global     === b.global &&
           a.ignoreCase === b.ignoreCase &&
           a.multiline  === b.multiline;
  // If a is not an object by this point, we can't handle it.
  if (atype !== 'object') return false;
  // Check for different array lengths before comparing contents.
  if (a.length && (a.length !== b.length)) return false;
  // Nothing else worked, deep compare the contents.
  var aKeys = _.keys(a), bKeys = _.keys(b);
  // Different object sizes?
  if (aKeys.length != bKeys.length) return false;
  // Recursive comparison of contents.
  for (var key in a) if (!(key in b) || !_.isEqual(a[key], b[key])) return false;
  return true;
};

if (module.exports) {
  module.exports = utils;
} else {
  window.utils = utils;
}
