var http  = require('http');

var server = http.createServer(function(req, res) {
	res.end('Hey\n');
});

server.listen(4000, function() {
	console.log('The server is listening on port 4000');
});