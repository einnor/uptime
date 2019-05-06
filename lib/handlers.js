// Define the request handlers
var handlers = {};

// Ping handler
handlers.ping = (data, callback) => {
	callback(200, { message: 'It lives!' });
};

// Not found handler
handlers.notFound = (data, callback) => {
	callback(404);
};

module.exports = handlers;
