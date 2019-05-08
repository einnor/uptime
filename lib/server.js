/**
 * Server-related tasks
 */

var http  = require('http');
var https  = require('https');
var url = require('url');
var fs = require('fs');
var path = require('path');
var StringDecoder = require('string_decoder').StringDecoder
var config = require('./config');
var handlers = require('./handlers');
var helpers = require('./helpers');

// Instantiate the server module object
var server = {};

// Instantiate the http server
server.httpServer = http.createServer((req, res) => {
	unifiedServer(req, res);
});

// Instantiate the https server
server.httpsServerOptions = {
	key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
	cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem')),
};

server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
	server.unifiedServer(req, res);
});

//All ther server logic for both https and https server
server.unifiedServer = (req, res) => {
	// Get the URL and parse it
	var parsedUrl = url.parse(req.url, true);

	// Get the path
	var path = parsedUrl.pathname;

	// Trim slasshes i.e /foo/bar/ will be /foo/bar
	var trimmedPath = path.replace(/^\/+|\/+$/g, '');

	// Get the query string an an object
	var queryStringObject = parsedUrl.query;

	// Get the HTTP method
	var method = req.method.toLowerCase();

	// Get the headers an an object
	var headers = req.headers;

	// Get the payload, if any
	var decoder = new StringDecoder('utf-8');
	var buffer = '';
	req.on('data', (data) => {
		buffer += decoder.write(data);
	});
	req.on('end', () => {
		buffer += decoder.end();

		// Choose the handler this request should go to. If one is not found, use the notFound handler
		var chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

		// Construct the data object to send to the handler
		var data = {
			trimmedPath,
			queryStringObject,
			method,
			headers,
			payload: helpers.parseJsonToObject(buffer),
		};

		// Route the request to the handler specified in the router
		chosenHandler(data, (statusCode, payload) => {
			// Use the status code called back by the handler, or default to 200
			// Use the payload called back by the handler, or default to an empty object
			statusCode = typeof(statusCode) === 'number' ? statusCode : 200;
			payload = typeof(payload) === 'object' ? payload : {};

			// Convert the payload to a string
			var payloadString = JSON.stringify(payload);

			// Return the response
			res.setHeader('Content-Type', 'application/json');
			res.writeHead(statusCode);
			res.end(payloadString);
			console.log(statusCode, payloadString);
		});		
	});
};

// Define a request router
server.router = {
	ping: handlers.ping,
	users: handlers.users,
	tokens: handlers.tokens,
	checks: handlers.checks,
};

// Init script
server.init = () => {
  // Start the http server
  server.httpServer.listen(config.httpPort, () => {
    console.log(`The server is listening on port ${config.httpPort} on ${config.envName} mode`);
  });

  // Start the https server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log(`The server is listening on port ${config.httpsPort} on ${config.envName} mode`);
  });
};

// Export the module
module.exports = server;
