biggie-orm
----------

An Object-Relational-Mapper originally designed for the Biggie web framework.

The data-persistence systems it currently will support are:

* Couch DB
* Mongo DB
* Riak

To use, pass in a object / prototype you would like biggie-orm to enhance with its methods. For example:

    var bigORM = require('./lib/biggie-orm');

    var Model = function () {};
    Model.prototype.method = function() { /* Do stuff */ }
    
    bigORM.bind(Model.prototype);