var server = require('./lib/server');
var workers = require('./lib/workers');

// Declare the app
var app = {};

// Init function
app.init = () => {
	// Start the server
	server.init();

	// Start the workers
	workers.init();
};

// Execute
if (require.main === module) app.init();

// Export the app
module.exports = app;