var config = require('./config');

module.exports = require('./adapter/' + config.adapter);
