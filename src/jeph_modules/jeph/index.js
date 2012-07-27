require.saveCompiled = true;
require.compiled = {};
require.compiledCache = __dirname + "/../cache";
require.loader = "loadFunction";
require.modules.jeph = { exports: jeph };

function jeph(handler) {
	if (typeof jeph._handler === "function") {
		var previousHandler = jeph._handler;

		jeph._handler = function chainHandler(req, res) {
			previousHandler(req, res);

			if (!res.sent) { handler(req, res); }
		};

	} else {
		jeph._handler = handler;
	}
}

global._request = require("./request");
global._response = require("./response");

global._main = function main() {
	var req = global._request, res = global._response, headers = {};

	@@ `req->properties['method'] = $_SERVER['REQUEST_METHOD']; @@
	@@ `req->properties['url'] = $_SERVER['REQUEST_URI']; @@

	@@
		foreach ($_SERVER as $k => $v) {
			if (strncmp($k, 'HTTP_', 5) !== 0) { continue; }
			$k = str_replace('_', '-', strtolower(substr($k, 5)));
			`headers->properties[$k] = $v;
			`headers->attributes[$k] = JS::ENUMERABLE;
		}

		`req->properties['headers'] = `headers;
	@@

	@@ `req->properties['httpVersion'] = substr($_SERVER['SERVER_PROTOCOL'], 5); @@ // remove "HTTP/"

	return jeph._handler.call(global, req, res);
};

require("../../src/main.js");
