
var io    = require('socket.io'),
    utils = require('./utils'),
    sys   = require('sys');

// The server side for models
var channels = {};

var Orm = function Orm(server, options) {
  process.EventEmitter.call(this);

  this.socket = io.listen(server);
  this.socket.resource = 'biggie-orm';

  this.socket.addListener('clientConnect', function () {
    self.onConnect.apply(self, arguments);
  });

  this.socket.addListener('clientMessage', function () {
    self.onMessage.apply(self, arguments);
  });

  this.socket.addListener('clientDisconnect', function () {
    self.onDisconnect.apply(self, arguments);
  });
};

Orm.prototype = (function () {
  var temp = function () {};
  temp.prototype = process.EventEmitter.prototype;
  return new temp();
})();

Orm.prototype.onConnect = function onConnect(client) {
};

Orm.prototype.onMessage = function onMessage(message, client) {
  try {
    message = JSON.parse(message);
    if (message.type === 'init') {
      if (!message.channel) return;

      client.channel = message.channel;

      if (channels[message.channel]) {
        channels[message.channel].push(client);
      } else {
        channels[message.channel] = [client];
      }
    } else if (message.type && message.channel) {
      this.emit(message.channel, message);
      try {
        var channel = message.channel.split('/'),
            channel_string;

        while (channel.length > 0) {
          channel.pop();
          channel_string = channel.join('/');
          if (channel_string === '') channel_string = '/';
          this.emit(channel_string, message);
        }
      } catch (error) {
        console.log(error.message);
      }
    }
  } catch (error) {}
};

Orm.prototype.broadcastToChannel = function broadcastToChannel(channel, message) {
  if (!channels[channel]) return;

  channel = channels[channel];
  var channel_length = channel.length;

  for (var i = 0; i < channel_length; i++) {
    channel[i].send(message);
  }

  return true;
};

Orm.prototype.onDisconnect = function onDisconnect(client) {
  if (client.channel) {
    this.cleanChannel(client.channel);
  }
};

Orm.prototype.cleanChannel = function cleanChannel(channel) {
  var index;
  while ((index = channels[channel].indexOf(null)) > -1) {
    channels[channel] = utils.remove(channels[channel], index);
  }
  console.log(sys.inspect(channels[channel]));
};

Orm.prototype.registerModel = function registerModel(name) {
  var lower_name = name.toLowerCase(),
      module,
      model,
      temp;

  try {
    module = require(Orm.MODEL_PATH + lower_name);
    model = module[name];
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
    module[name] = temp;
  } catch (error) {};
};

module.exports = {
  Orm: Orm,
  Model: require('./model').Model
};
