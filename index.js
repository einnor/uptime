var http  = require('http');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder
var config = require('./config');

var server = http.createServer((req, res) => {
	unifiedServer(req, res);
});

server.listen(config.port, () => {
	console.log(`The server is listening on port ${config.port} on ${config.envName} mode`);
});

//All ther server logic for both https and https server
var unifiedServer = (req, res) => {
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
		var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

		// Construct the data object to send to the handler
		var data = {
			trimmedPath,
			queryStringObject,
			method,
			headers,
			payload: buffer,
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

// Define the handlers
var handlers = {};

// Sample handler
handlers.sample = (data, callback) => {
	// Callback a http status code and a payload object
	callback(406, { name: 'sample handler' });
};

// Not found handler
handlers.notFound = (data, callback) => {
	callback(404);
};

// Define a request router
var router = {
	'sample': handlers.sample,
};
