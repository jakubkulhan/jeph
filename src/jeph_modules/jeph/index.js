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

jeph.JephDBHandler = require("./JephDBHandler");

global._request = require("./request");
global._response = require("./response");

global._main = function main() {
	var req = global._request, res = global._response, headers = {};

	@@ `req->properties['method'] = $_SERVER['REQUEST_METHOD']; @@
	@@ `req->properties['url'] = $_SERVER['REQUEST_URI']; @@

	@@
		foreach ($_GET as $k => $v) {
			`req->properties['query']->properties[$k] = JS::fromNative($v);
			`req->properties['query']->attributes[$k] = JS::ENUMERABLE;
		}

		foreach ($_POST as $k => $v) {
			`req->properties['body']->properties[$k] = JS::fromNative($v);
			`req->properties['body']->attributes[$k] = JS::ENUMERABLE;
		}

		if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'HEAD' &&
			isset($_SERVER['HTTP_CONTENT_TYPE']))
		{
			list($ct) = explode(';', $_SERVER['HTTP_CONTENT_TYPE']);
			if ($ct === 'application/json') {
				$data = @json_decode(file_get_contents('php://input'));

				if ($data === NULL && json_last_error() !== JSON_ERROR_NONE) { @@
					throw new Error("Malformed JSON request");
				@@ }

				`req->properties['body'] = JS::fromNative($data);
			}
		}

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
