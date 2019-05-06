var http  = require('http');
var https  = require('https');
var url = require('url');
var fs = require('fs');
var StringDecoder = require('string_decoder').StringDecoder
var config = require('./config');
var handlers = require('./lib/handlers');

// Instantiate the http server
var httpServer = http.createServer((req, res) => {
	unifiedServer(req, res);
});

// Start the http server
httpServer.listen(config.httpPort, () => {
	console.log(`The server is listening on port ${config.httpPort} on ${config.envName} mode`);
});

// Instantiate the https server
var httpsServerOptions = {
	key: fs.readFileSync('./https/key.pem'),
	cert: fs.readFileSync('./https/cert.pem'),
};
var httpsServer = https.createServer(httpsServerOptions, (req, res) => {
	unifiedServer(req, res);
});

// Start the https server
httpsServer.listen(config.httpsPort, () => {
	console.log(`The server is listening on port ${config.httpsPort} on ${config.envName} mode`);
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

// Define a request router
var router = {
	'ping': handlers.ping,
};
