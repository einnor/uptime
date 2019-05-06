// Define the request handlers
var handlers = {};

// Ping handler
handlers.ping = (data, callback) => {
	callback(200, { message: 'It lives!' });
};

// Users handler
handlers.users = (data, callback) => {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback)
  }
	callback(405);
};

// Container for the users sub-methods
handlers._users = {};

// Users - post
handlers._users.post = (data, callback) => {}

// Users - get
handlers._users.get = (data, callback) => {}

// Users - put
handlers._users.put = (data, callback) => {}

// Users - delete
handlers._users.delete = (data, callback) => {}

// Not found handler
handlers.notFound = (data, callback) => {
	callback(404);
};

module.exports = handlers;
