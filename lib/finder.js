var Collection = require('./collection');

// For making find queries. Take that Apple!
// First use indexes, then fall back on getting all then filtering.
var Finder = function Finder (query, collection, model_type, prefix) {
  this.model    = Finder.model_names[model_type];
  this.proto    = this.model.prototype;
  this.key      = collection;
  this.indexes  = false;
  this.prefix   = prefix || '';

  // Filters, if needed, are applied after the db query.
  this.filters  = null;
  this.fn_query = false;

  // Parse it.
  this.query = parseQuery(query, this);

  return this;
};

module.exports = Finder;

// Set by the orm.
Finder.db          = null;
Finder.model_names = null;

(function () {
  // For no limits! :o
  this.all = function all (callback) {
    var self = this;
    var fn = function (error, result) {
      handleResult(error, result, self, callback);
    };

    // If we are doing all our mapping to a function,
    // then we can get all the collection results.
    if (this.fn_query) {
      Finder.db.getCollection(this.key, this.model.type, fn);
    } else if (this.query.length > 0) {
      Finder.db.getCollectionFromQuery(this.query,
          'index:' + this.prefix + this.model.type, this.model.type, null, null, fn);
    } else {
      callback(null, new Collection());
    }

    return this;
  };

  // For limits
  this.some = function some (start, end, callback) {
    var self = this;
    var fn = function (error, result) {
      handleResult(error, result, self, callback);
    };

    // If we are doing all our mapping to a function,
    // then we can get all the collection results.
    if (this.fn_query) {
      Finder.db.getCollectionRange(this.key, this.model.type, start, end, fn);
    } else if (this.query.length > 0) {
      Finder.db.getCollectionFromQuery(this.query,
          'index:' + this.prefix + this.model.type, this.model.type, start, end, fn);
    } else {
      callback(null, new Collection());
    }

    return this;
  };

  // Last one
  this.last = function last (callback) {
    return this.some(-1, undefined, callback);
  };

  // To return the first few.
  this.limit = function limit (count, callback) {
    return this.some(0, count, callback)
  };

  // First one.
  this.first = function first (callback) {
    return this.some(0, 1, function (error, coll) {
      if (error) return callback(error);
      callback(null, coll.length > 0 ? coll[0] : null);
    });
  };
}).call(Finder.prototype);

// Handle the database result.
// All user level filtering is done here.
var handleResult = function handleResult (error, collection, instance, callback) {
  if (error) return callback(error);

  // Assume we have some sort of valid query.
  // We can just put the function into the normal .filter method
  // if it was a function query.
  if (instance.fn_query) {
    collection = collection.filter(instance.filters);
    // Collection is now an array, so we make a new collection.
    callback(null, new Collection(collection));
  } else if (instance.filters) {
    // TODO
    // Mega-filter awesome-ness?
  }

  callback(null, collection);
};

// Parse a query object.
var parseQuery = function parseQuery (query, instance) {
  // No conditions, justs some ecma-level filtering to do.
  if (typeof query === 'function') {
    instance.filters  = query;
    instance.fn_query = true;
    return null;
  }

  // Assume query is an object.
  var keys = Object.keys(query),
      key,
      ret  = [],
      type,
      value,
      range_keys,
      range,
      max,
      min;

  // For each key (attribute), push to a return array.
  // Query types are:
  //
  // * range: For sorted sets, looking for a range of scores.
  // * setmatch: A direct key match in a sorted set.
  // * match: The usual hash match.
  //
  // If it doesn't have an index, add it to the filter set.
  for (var i = 0, il = keys.length; i < il; i++) {
    key  = keys[i];
    type = instance.proto.properties[key].type;

    // Has an index?
    if (-1 === instance.proto.indexes.indexOf(key)) {
      // Add it to the filters. Can't query this stuff.
      instance.filters || (instance.filters = {});
      instance.filters[key] = query[key];
      continue;
    }

    // Has to match multiple values of the key.
    if (Array.isArray(query[key])) {
      for (var j = 0, jl = query[key].length; j < jl; j++) {
        value = query[key][j];
        ret.push(['match', key, value]);
      }
    } else if ('object' === typeof query[key] && type === 'number') {
      // We have a range query.
      range      = query[key];
      range_keys = Object.keys(range);

      // We support:
      //
      // * lt = less than
      // * lte = less than or equal to
      // * gt = greater than
      // * gte = greater than or equal to
      //
      // We only support one less than op, and one
      // greater than op.
      for (var j = 0, jl = range_keys.length; j < jl; j++) {
        value = range_keys[j];

        switch (value) {
        case 'lt':
          max = range.lt - 1;
          break;
        case 'lte':
          max = range.lte;
          break;
        case 'gt':
          min = range.gt + 1;
          break;
        case 'gte':
          min = range.gte;
          break;
        }
      }

      // Add the range
      ret.push(['range', key, min, max]);
    } else if ('number' === typeof query[key]) {
      // Looking for a match in a sorted set.
      ret.push(['setmatch', key, query[key]]);
    } else if ('string' === typeof query[key]) {
      // Looking for a simple key value in a hash or sorted set.
      ret.push(['match', key, query[key]]);
    } else {
      // Bad query.
      throw new TypeError('Query contains an invalid selector');
    }
  }

  return ret;
};
