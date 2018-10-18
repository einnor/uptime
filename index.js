var http  = require('http');
var url = require('url');

var server = http.createServer(function(req, res) {

	// Get the URL and parse it
	var parsedUrl = url.parse(req.url, true);

	// Get the path
	var path = parsedUrl.pathname;

	// Trim slasshes i.e /foo/bar/ will be /foo/bar
	var trimmedPath = path.replace(/^\/+|\/+$/g, '');

	// Get the HTTP method
	var method = req.method.toLowerCase();

	// Send a response
	res.end('Hey\n');
});

server.listen(4000, function() {
	console.log('The server is listening on port 4000');
});