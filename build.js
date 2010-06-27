var Package = require('node-asset').Package,
    exec    = require('child_process').exec;

new Package('client/biggie-orm.js', [
  'lib/biggie-orm/utils.js',
  'lib/biggie-orm/client/socket.io/socket.io.js',
  'lib/biggie-orm/client/eventemitter.js',
  'lib/biggie-orm/client/orm.js',
  'lib/biggie-orm/model.js'
], {
  wrap: true,
  watch: false,
  compile: false,
  type: 'js'
}).serve();

exec('mkdir -p client/socket.io && cp -R lib/biggie-orm/client/socket.io/lib/* client/socket.io');
