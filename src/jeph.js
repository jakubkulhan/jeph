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

global.jeph = jeph;

jeph._functions = {};
jeph._required = {};
jeph._exports = {};

global.require = jeph.require = function require(path) {
	if (typeof jeph._required[path] !== "undefined") {
		return jeph._exports[path];
	}

	var parse = PHP.cls("JSParser")(), compile = PHP.cls("JSCompiler")(), ast;

	ast = parse(PHP.fn("file_get_contents")(path), { file: path });

	if (!ast[0]) {
		throw new SyntaxError("syntax error in " + path + "@" + ast[2].line + ":" +
			ast[2].column + "; expected " + ast[2].expected.join(", "));
	}

	jeph._required[path] = true;

	var compiled = compile(ast[1], { force: true, generate: "object", loader: "loadFunction" }),
		code = "", main = compiled.main;

	for (var k in compiled.functions) {
		if (k !== main) {
			jeph._functions[k] = compiled.functions[k];
		}

		code += compiled.functions[k];
	}

	@@ eval(`code); $r = `main(`global); @@
	jeph._exports[path] = @@ $r @@;

	return jeph._exports[path];
};

global._main = function main() {
	var req = jeph._request, res = jeph._response, headers = {};

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

jeph._request = {};

Object.defineProperties(jeph._request, {
	method: { value: "", enumerable: true },
	url: { value: "", enumerable: true },
	basePath: { value: "", enumerable: true },
	headers: { value: {}, enumerable: true },
	httpVersion: { value: "", enumerable: true }
});

jeph._response = {};

var statusCodes = {
	100: "Continue",
	101: "Switching Protocols",
	102: "Processing",
	200: "OK",
	201: "Created",
	202: "Accepted",
	203: "Non-Authoritative Information",
	204: "No Content",
	205: "Reset Content",
	206: "Partial Content",
	207: "Multi-Status",
	300: "Multiple Choices",
	301: "Moved Permanently",
	302: "Found",
	303: "See Other",
	304: "Not Modified",
	305: "Use Proxy",
	307: "Temporary Redirect",
	400: "Bad Request",
	401: "Unauthorized",
	402: "Payment Required",
	403: "Forbidden",
	404: "Not Found",
	405: "Method Not Allowed",
	406: "Not Acceptable",
	407: "Proxy Authentication Required",
	408: "Request Timeout",
	409: "Conflict",
	410: "Gone",
	411: "Length Required",
	412: "Precondition Failed",
	413: "Request Entity Too Large",
	414: "Request-URI Too Long",
	415: "Unsupported Media Type",
	416: "Requested Range Not Satisfiable",
	417: "Expectation Failed",
	422: "Unprocessable Entity",
	423: "Locked",
	424: "Failed Dependency",
	426: "Upgrade Required",
	500: "Internal Server Error",
	501: "Not Implemented",
	502: "Bad Gateway",
	503: "Service Unavailable",
	504: "Gateway Timeout",
	505: "HTTP Version Not Supported",
	506: "Variant Also Negotiates",
	507: "Insufficient Storage",
	509: "Bandwidth Limit Exceeded",
	510: "Not Extended"
};

var defaultHeaders = {
	"content-type": "text/plain; charset=UTF-8"
};


Object.defineProperties(jeph._response, {
	getHeader: {
		value: function getHeader(name) {
			return (this.headers || defaultHeaders)[String(name)];
		}
	},

	setHeader: {
		value: function setHeader(name, value) {
			if (typeof this.headers !== "undefined") {
				throw new Error("headers already sent, cannot set implicit header");
			}

			defaultHeaders[String(name).toLowerCase()] = value;

			return this;
		}
	},

	removeHeader: {
		value: function removeHeader(name) {
			if (typeof this.headers !== "undefined") {
				throw new Error("headers already sent, cannot remove implicit header");
			}

			delete defaultHeaders[String(name).toLowerCase()];
			return this;
		}
	},

	writeHead: {
		value: function writeHead(statusCode, reasonPhrase, headers) {
			statusCode = String(statusCode);

			if (typeof reasonPhrase !== "string") {
				headers = reasonPhrase;
				reasonPhrase = statusCodes[statusCode] || "Reason";
			}

			@@ header_remove(); @@
			@@ header('HTTP/1.1 ' . `statusCode . ' ' . `reasonPhrase); @@

			Object.defineProperty(this, "statusCode",
				{ value: Number(statusCode), enumerable: true });

			var actualHeaders = {};

			for (var k in defaultHeaders) {
				actualHeaders[k] = defaultHeaders[k];
			}

			for (var k in headers) {
				actualHeaders[k.toLowerCase()] = headers[k];
			}

			if (typeof actualHeaders["content-length"] === "undefined") {
				actualHeaders["transfer-encoding"] = "chunked";
			}

			for (var k in actualHeaders) {
				if (Array.isArray(actualHeaders[k])) {
					for (var i = 0, l = actualHeaders[k].length; i < l; ++i) {
						var v = String(actualHeaders[k][i]);
						@@ header(`k . ': ' . `v, FALSE); @@
					}

				} else {
					var v = actualHeaders[k];
					@@ header(`k . ': ' . `v); @@
				}
			}

			Object.defineProperty(this, "headers", { value: actualHeaders, enumerable: true });
		}
	},

	addTrailers: {
		value: function addTrailers(headers) {
			throw new NotImplementedError("addTrailers() not implemented");
		}
	},
	
	write: {
		value: function write(data) {
			if (this.sent) {
				throw new Error("response has been already completed");
			}

			data = String(data);

			if (typeof this.headers === "undefined") {
				this.writeHead(200);
			}

			// FIXME: transfer-encoding: chunked
			@@ echo `data; flush(); @@
		}
	},

	end: {
		value: function end(data) {
			this.write(data);
			Object.defineProperty(this, "sent", { value: true, enumerable: true });
		}
	}
});

require(__dirname + "/src/main.js");

delete jeph._required;
delete jeph._exports;
