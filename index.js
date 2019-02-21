var http  = require('http');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder

var server = http.createServer(function(req, res) {

	// Get the URL and parse it
	var parsedUrl = url.parse(req.url, true);

	// Get the path
	var path = parsedUrl.pathname;

	// Trim slasshes i.e /foo/bar/ will be /foo/bar
	var trimmedPath = path.replace(/^\/+|\/+$/g, '');

	// Get the query string an an object
	var queryString = parsedUrl.query;

	// Get the HTTP method
	var method = req.method.toLowerCase();

	// Get the headers an an object
	var headers = req.headers;

	// Get the payload, if any
	var decoder = new StringDecoder('utf-8');
	var buffer = '';
	req.on('data', function(data) {
		buffer += decoder.write(data);
	});
	req.on('end', function() {
		buffer += decoder.end();

		// Send a response
		res.end('Hey\n');
	});
});

server.listen(4000, function() {
	console.log('The server is listening on port 4000');
});

// Define a request router
var router = {};