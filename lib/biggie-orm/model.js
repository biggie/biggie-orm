if (module.exports) {
  var utils = require('./utils');
}

var Model = function Model(orm, data) {
  this.orm = orm;
  this.data = {};
  this.previousData = {};
  this.changed = false;
  this.uid = utils.generateUid();
  if (data) {
    data.id = data.id || null;
    this.set(data, true);
    this.previousData = this.attributes();
  }
  Model.EventEmitter.call(this);
  if (this.id) {
    this.init();
  }
};

Model.prototype = (function () {
  var fn = function () {};
  if (process && process.EventEmitter) {
    fn.prototype = process.EventEmitter.prototype;
    Model.EventEmitter = process.EventEmitter;
  } else {
    fn.prototype = orm.EventEmitter.prototype;
    Model.EventEmitter = orm.EventEmitter;
  }
  return new fn();
})();

Model.prototype.init = function init() {
  var self = this;
  this.addListener(this.channel + '/' + this.id, function (message) {
    switch (message.type) {
      case 'change':
        var changed = self.changedAttributes();
        self.set(message.data, true);
        self.set(changed, true);
        break;
    }
    self.emit(message.type, message.data);
  });
};

Model.prototype.clone = function clone() {
  return new Model(this.data());
};

Model.prototype.isNew = function isNew() {
  return this.id === null;
};

Model.prototype.attributes = function attributes() {
  return utils.extend({}, this.data);
};

Model.prototype.hasChanged = function hasChanged(attr) {
  if (attr) return this.previousData[attr] != this.previousData[attr];
  return this.changed;
};

Model.prototype.previousValue = function previousValue(attr) {
  if (this.previousData && this.previousData[attr]) {
    return this.previousData[attr];
  }
  return null;
};

Model.prototype.previousAttributes = function previousAttributes() {
  return this.previousData;
};

Model.prototype.changedAttributes = function changedAttributes(now) {
  var old     = this.previousAttributes(),
      now     = now || this.attributes(),
      changed = false,
      attr;
  for (attr in now) {
    if (!utils.isEqual(old[attr], now[attr])) {
      changed = changed || {};
      changed[attr] = now[attr];
    }
  }
  return changed;
};

Model.prototype.set = function set(next, silent) {
  if (!next) return this;
  next = next.data || next;
  var data    = this.data,
      attr,
      changed = false;
  for (attr in next) {
    if (!utils.isEqual(data[attr], next[data])) {
      changed = true;
      data[attr] = next[attr];
    }
  }
  if (next.id) this.id = next.id;
  if (!silent && changed) this.changed = true;
  return this;
};

Model.prototype.get = function get(key) {
  return this.data[key];
};

Model.prototype.unset = function unset(key, silent) {
  var ret = this.data[key];
  delete this.data[key];
  if (!silent) this.changed = true;
  return ret;
};

Model.prototype.save = function save(callback) {
  var self = this;
  this.orm.save(this, function (data) {
    self.id = self.data.id = data.id;
    self.init();
    callback.call(self, data);
  });
  return this;
};

if (module.exports) {
  var orm = module.exports;
}
orm.Model = Model;
