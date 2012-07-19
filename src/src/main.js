jeph(function (req, res) {
	var body = "Hello, world!\n";

	res.writeHead(200, {
		"Content-Type": "text/plain; charset=UTF-8",
		"Content-Length": body.length });

	res.end(body);
});
