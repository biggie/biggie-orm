var Collection = require('./collection');

// For making find queries. Take that Apple!
// First use indexes, then fall back on getting all then filtering.
var Finder = function Finder (query, collection, model_type, prefix) {
  this.model   = Finder.model_names[model_type];
  this.proto   = this.model.prototype;
  this.key     = collection;
  this.indexes = false;
  this.prefix  = prefix || '';

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
    return this.some(0, -1, callback);
  };

  // For limits
  this.some = function some (start, length, callback, asc) {
    var self = this;

    start  || (start  = 0);  // From the start
    length || (length = -1); // To the end

    if (this.query || this.filters) {
      var fn = function (error, result) {
        handleResult(error, result, self, callback);
      };
    } else {
      var fn = callback;
    }

    // If we are doing all our mapping to a function,
    // then we can get all the collection results.
    if (this.query && this.query.length > 0) {
      Finder.db.getCollectionFromQuery(this.query,
          'index:' + this.prefix + this.model.type, this.model.type, start, length, fn, asc);
    } else {
      if (this.filters) {
        start  = 0;
        length = -1;
      }

      Finder.db.getCollectionRange(this.key, this.model.type, start, length, fn, true);
    }

    return this;
  };

  // Last one
  this.last = function last (callback) {
    return this.some(0, 1, function (error, coll) {
      if (error) return callback(error);
      callback(null, coll.length > 0 ? coll[0] : null);
    }, true);
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
    return callback(null, new Collection(collection));
  } else if (instance.filters) {
    // Mega-filter awesome-ness?
    var model, filter, count, value, less_than, greater_than,
        length = instance.filters.length,
        ret    = new Collection();

    // Reduce each model in the collection against each rule.
    for (var i = 0, il = collection.length; i < il; i++) {
      model = collection[i];
      count = 0;

      // If the model matches all the filters, then it is a match.
      for (var j = 0, jl = length; j < jl; j++) {
        filter = instance.filters[j];

        switch (filter[0]) {
        case 'range':
          value = model.attributes[filter[1]];

          // Inclusive?
          if (!filter[2][0] || '(' !== filter[2][0]) {
            greater_than = filter[2] <= value;
          } else {
            greater_than = (+filter[2].slice(1)) < value;
          }
          if (!filter[3][0] || '(' !== filter[3][0]) {
            less_than = filter[3] >= value;
          } else {
            less_than = (+filter[3].slice(1)) > value;
          }

          if (('-inf' === filter[2] || less_than) &&
              ('+inf' === filter[3] || greater_than)) {
            count++;
          }
          break
        case 'setmatch':
        case 'match':
          if (filter[2] === model.attributes[filter[1]]) {
            count++;
          }
          break;
        }
      }

      // They all matched? Then push it.
      if (length === count) ret.push(model);
    }

    return callback(null, ret);
  }

  callback(null, collection);
};

// Parse a query object.
var parseQuery = function parseQuery (query, instance) {
  // No query. We are just operating on an entire collection.
  if (!query) {
    return null;
  }

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
      min,
      curr;

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
      instance.filters || (instance.filters = []);
      curr = instance.filters;
    } else {
      curr = ret;
    }

    // Has to match multiple values of the key.
    if (Array.isArray(query[key])) {
      for (var j = 0, jl = query[key].length; j < jl; j++) {
        value = query[key][j];
        curr.push(['match', key, value]);
      }
    } else if ('object' === typeof query[key] && type === 'number') {
      // We have a range query.
      range      = query[key];
      range_keys = Object.keys(range);
      min        = '-inf';
      max        = '+inf';

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
          max = '(' + range.lt;
          break;
        case 'lte':
          max = range.lte;
          break;
        case 'gt':
          min = '(' + range.gt;
          break;
        case 'gte':
          min = range.gte;
          break;
        }
      }

      // Add the range
      curr.push(['range', key, min, max]);
    } else if ('number' === typeof query[key]) {
      // Looking for a match in a sorted set.
      curr.push(['setmatch', key, query[key]]);
    } else if ('string' === typeof query[key]) {
      // Looking for a simple key value in a hash or sorted set.
      curr.push(['match', key, query[key]]);
    } else {
      // Bad query.
      throw new TypeError('Query contains an invalid selector');
    }
  }

  return ret;
};
