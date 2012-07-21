var jeph = require("jeph"),
	jephdb = require("jephdb"),
	MemoryStore = require("jephdb/stores/MemoryStore"),
	sha1 = PHP.fn("sha1"),
	db = new jephdb(new MemoryStore);

require("jeph/properties");

jephdb.namespace("app", function (db) {
	db.property("content", function (p) { p.type = "string"; });

	jephdb.transformation({
		"jeph/type": "app/page",
		"app/content": true,
		"jeph/handle": function () {
			return function (req, res) {
				res.writeHead(200, { "content-type": "text/html",
					"content-length": this["app/content"].length });

				res.end(this["app/content"]);
			};
		}
	});
});

db.create(sha1("index"), {
	"jeph/type": "app/page",
	"jeph/path": "/",
	"app/content": "<!doctype html><html>" +
		"<head><title>Hi! This is Jeph.</title></head><body>" +
		"<h1>Hi! This is Jeph.</h1>" +
		"<p>Jeph is an application framework that runs Javascript on top of PHP engine.</p>" +
		"<p>Also, <a href=\"another-page\">try this link</a></p>" +
		"</body></html>"
}).save();

db.create(sha1("another-page"), {
	"jeph/type": "app/page",
	"jeph/path/parent": sha1("index"),
	"jeph/path/relative": "another-page",
	"app/content": "<!doctype html><html>" +
		"<head><title>Another page</title></head><body>" +
		"<h1>Another page</h1>" +
		"<p>Another page served by Jeph.</p>" +
		"</body></html>"
}).save();

jeph(function (req, res) {
	req.db = res.db = db;

	var path = req.url.substring(req.basePath.length);

	if (path.indexOf("?") !== -1) {
		path = path.substring(0, path.indexOf("?"));
	}

	if (path === "") { path = "/"; }

	var results = db.query({ "jeph/path": path, "jeph/handle": true }).take(1).fetch(), body;

	if (results.length < 1) {
		body = "404 Not Found\n";

	} else {
		var entity = results[0];

		if (typeof entity["jeph/handle"] !== "undefined") {
			return entity["jeph/handle"](req, res);
		}
	}

	if (typeof body === "undefined") {
		body = "500 Internal Server Error\n";
	}

	res.writeHead(Number(body.substring(0, 4)), { "content-type": "text/plain",
		"content-length": body.length });

	res.end(body);
});
