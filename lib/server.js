/**
 * Server-related tasks
 */

var http  = require('http');
var https  = require('https');
var url = require('url');
var fs = require('fs');
var path = require('path');
var util = require('util');
var StringDecoder = require('string_decoder').StringDecoder
var config = require('./config');
var handlers = require('./handlers');
var helpers = require('./helpers');

var debug = util.debuglog('server');

// Instantiate the server module object
var server = {};

// Instantiate the http server
server.httpServer = http.createServer((req, res) => {
	server.unifiedServer(req, res);
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
		chosenHandler(data, (statusCode, payload, contentType) => {
			// Determine the type of response, fLLBck to json
			contentType = typeof(contentType) === 'string' ? contentType : 'json';

			// Use the status code called back by the handler, or default to 200
			// Use the payload called back by the handler, or default to an empty object
			statusCode = typeof(statusCode) === 'number' ? statusCode : 200;

			// Return the response parts that are content-specific
			var payloadString = '';
			if (contentType === 'json') {
				// Convert the payload to a string
				res.setHeader('Content-Type', 'application/json');
				payload = typeof(payload) === 'object' ? payload : {};
				payloadString = JSON.stringify(payload);
			} else if (contentType === 'html') {
				res.setHeader('Content-Type', 'text/html');
				payloadString = typeof(payload) === 'string' ? payload : '';
			}

			// Return the response-pRTS THAT ARE COMMON TO ll content-types
			res.writeHead(statusCode);
			res.end(payloadString);

			// If the response is 200, print green, otherwise print red
			if (statusCode === 200) {
				debug('\x1b[32m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode + ' ' + payloadString);
			} else {
				debug('\x1b[31m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode + ' ' + payloadString);
			}
		});		
	});
};

// Define a request router
server.router = {
	'': handlers.index,
	'account/create': handlers.accountCreate,
	'account/edit': handlers.accountEdit,
	'account/deleted': handlers.accountDeleted,
	'session/create': handlers.sessionCreate,
	'session/delete': handlers.sessionDeleted,
	'checks/all': handlers.checkList,
	'checks/create': handlers.checkCreate,
	'checks/edit': handlers.checkEdit,
	ping: handlers.ping,
	'api/users': handlers.users,
	'api/tokens': handlers.tokens,
	'api/checks': handlers.checks,
};

// Init script
server.init = () => {
  // Start the http server
  server.httpServer.listen(config.httpPort, () => {
		console.log('\x1b[36m%s\x1b[0m', `The server is listening on port ${config.httpPort} on ${config.envName} mode`);
  });

  // Start the https server
  server.httpsServer.listen(config.httpsPort, () => {
		console.log('\x1b[35m%s\x1b[0m', `The server is listening on port ${config.httpsPort} on ${config.envName} mode`);
  });
};

// Export the module
module.exports = server;
