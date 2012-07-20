function require(path) {
	// standard library
	if (path.charAt(0) !== "." && path.charAt(0) !== "/") {
		path = __dirname + "/" + path;

	// from current/parent directory
	} else if (path.substring(0, 2) === "./" || path.substring(0, 3) === "../") {
		path = require["."] + "/" + path;
	}

	if (!PHP.fn("file_exists")(path)) {
		if (PHP.fn("file_exists")(path + ".js")) {
			path += ".js";

		} else if (PHP.fn("file_exists")(path + ".json")) {
			path += ".json";

		} else {
			throw new Error("file " + path + "(|.js|.json) does not exist");
		}
	}

	if (!PHP.fn("is_file")(path)) {
		// load package
		if (PHP.fn("file_exists")(path + "/package.json")) {
			var pkg = JSON.parse(PHP.fn("file_get_contents")(path + "/package.json"));

			if (typeof pkg.main === "undefined") {
				throw new Error("package " + path +
					"/package.json does not exports entry point (key main)");
			}

			if (pkg.main.indexOf("../") !== -1 || pkg.main.indexOf("/..") !== -1) {
				throw new Error("package " + path +
					"/package.json's main tries to go out of package directory");
			}

			path = path + "/" + pkg.main;

		// load index.js
		} else if (PHP.fn("file_exists")(path + "/index.js")) {
			path += "/index.js";

		// load index.json
		} else if (PHP.fn("file_exists")(path + "/index.json")) {
			path += "/index.json";

		} else {
			throw new Error(path +
				" is not file, or package, or directory with index.(js|json), it cannot be loaded");
		}
	}

	path = PHP.fn("realpath")(path);

	if (typeof require._required[path] !== "undefined") {
		return require._exports[path];
	}

	require._required[path] = true;
	return require._exports[path] =
		require._extensions[path.substring(path.lastIndexOf("."))](path);
}

global.require = require;

require._functions = {};
require._required = {};
require._exports = {};
require["."] = __dirname;

require._extensions = {
	".js": function (path) {
		var compiled, cacheFile = __dirname + "/cache/" + PHP.fn("md5")(path);

		if (PHP.fn("file_exists")(cacheFile) &&
			PHP.fn("filemtime")(cacheFile) >= PHP.fn("filemtime")(path))
		{
			compiled = PHP.fn("unserialize")(PHP.fn("file_get_contents")(cacheFile));

		} else {
			var parse = PHP.cls("JSParser")(), compile = PHP.cls("JSCompiler")(), ast;

			ast = parse(PHP.fn("file_get_contents")(path), { file: path });

			if (!ast[0]) {
				throw new SyntaxError("syntax error in " + path + "@" + ast[2].line + ":" +
					ast[2].column + "; expected " + ast[2].expected.join(", "));
			}

			compiled = compile(ast[1], { force: true, generate: "object", loader: "loadFunction" });

			PHP.fn("file_put_contents")(cacheFile, PHP.fn("serialize")(compiled));
		}

		var code = "", main = compiled.main, savedCurrentDirectory, savedExports, exports = {};

		for (var k in compiled.functions) {
			if (k !== compiled.main) {
				require._functions[k] = compiled.functions[k];
			}

			code += compiled.functions[k];
		}

		try {
			savedCurrentDirectory = require["."];
			savedExports = global.exports;

			require["."] = PHP.fn("dirname")(path);
			global.exports = "a";

			@@ eval(`code); `main(`global); @@

			exports = global.exports;

		} finally {
			require["."] = savedCurrentDirectory;
			global.exports = savedExports;
		}

		return exports;
	},

	".json": function (path) {
		return JSON.parse(PHP.fn("file_get_contents")(path));
	}
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

jeph._request = require("jeph/request");
jeph._response = require("jeph/response");

require("./src/main.js");
