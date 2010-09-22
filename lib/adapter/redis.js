var redis  = require('redis'),
    utils  = require('../utils'),
    config = require('../config'),
    noop   = utils.noop;

var client = exports.client = redis.createClient(config.db_port, config.db_host);

exports.end = function end () {
  client.quit();
};
