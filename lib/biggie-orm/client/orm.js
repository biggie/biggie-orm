
var orm = new EventEmitter();

utils.extend(orm, {
  socket: (function () {
    var hostname = location.hostname || null,
        port     = location.port     || 80;
    return new io.socket(hostname, { rememberTransport: false, port: port });
  })(),
  init: function init(options) {
    var self = this;
    this.socket.addEvent('message', function (string) {
      try {
        self.onMessage(JSON.parse(string));
      } catch (error) {};
    });
  },
  queue: {},
  counter: 0,
  client_id: utils.generateUid(),
  send: function send(data) {
    try {
      this.socket.send(JSON.stringify(data));
    } catch (err) {
      if (data.type && data.type === 'new') {
        var item = this.queue[data.queue];
        item.callback.call(item.model, data);
      }
    }
  }
  save: function (model, callback) {
    if (model.isNew()) {
      this.queue[this.counter] = {
        model: model,
        callback: callback
      };
      this.send({
        type: 'new',
        data: model.data,
        client: this.client_id,
        channel: model.channel,
        queue: this.counter
      });
      this.counter++;
    } else {
      this.send({
        type: 'change',
        data: model.changedAttributes(),
        channel: model.channel + '/' + model.id
        client: this.client_id
      });
    }
  },
  onMessage: function onMessage(data) {
    if (data.type && data.type === 'new') {
      if (data.client === this.client &&
          data.queue &&
          this.queue[data.queue]) {
        var item = this.queue[data.queue];
        item.callback.call(item.model, data.data);
        delete this.queue[data.queue];
      } else if (data.type && data.data && data.channel) {
        this.emit(data.channel, data);
      }
    }
  },
  registerModel: function registerModel(name) {
    var lower_name = name.toLowerCase(),
        model      = window[name],
        temp;

    if (model) {
      temp = function () {
        orm.Model.apply(this, arguments);
        model.apply(this, arguments);
      };
      temp.prototype = (function () {
        var temp = function () {};
        temp.prototype = orm.Model.prototype;
        return new temp();
      })();
      temp.prototype.constructor = temp;
      utils.extend(temp.prototype, model.prototype);
      temp.prototype.channel = lower_name;
      window[name] = temp;
    }
  }
});
