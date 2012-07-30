var JephDB = require("jephdb"),
	propertiesDefined = false;

exports = function (db) {
	if (!(db instanceof JephDB)) {
		throw new Error("Given argument is not an instance of JephDB");
	}

	//
	// defined properties
	//

	if (!propertiesDefined) {
		propertiesDefined = true;

		db.namespace("jeph", function (db) {
			db.property("type", { type: "string",
				description: "type of an entity",
				longDescription:
					"Its purpose is to be used by other properties transformations. " +
					"It has no meaning to the system." });

			db.property("path", { type: "string",
				description: "absolute path in the application",
				longDescription:
					"Path is what is used when client requests Jeph application. Base path " +
					"is stripped from request path and the rest is tested against database index. " +
					"An entity is then retrieved from database. The entity's jeph/handle property " +
					"is called. Given arguments are request, and response entities." });

			db.namespace("path", function (db) {
				db.property("parent", { type: "id",
					description: "parent of the entity",
					longDescription:
						"Contains ID of the parent entity. If you define jeph/path/relative, " +
						"transformation will make jeph/path for you. It will take parent's jeph/path " +
						"and append the entity's jeph/path/relative to it." });

				db.property("relative", { type: "string",
					description: "relative path in the application",
					longDescription:
						"If you define jeph/path/parent, transformation will make jeph/path " +
						"for you. It will take parent's path and append this path." });

				db.transformation({
					"jeph/path/parent": true,
					"jeph/path/relative": true,
					"jeph/path": function (db) {
						var p = db.get(this.get("jeph/path/parent"));

						if (p.get("jeph/path") === undefined) { return undefined; }

						var parentPath = p.get("jeph/path");

						if (parentPath.charAt(parentPath.length - 1) === "/") {
							return parentPath + this.get("jeph/path/relative");
						} else {
							return parentPath + "/" + this.get("jeph/path/relative");
						}
					}
				});
			});

			db.property("handle", { type: "function",
				description: "request handler",
				longDescription:
					"This function will be called when request is routed to the entity. " +
					"It will be given two arguments: request, and response." });
		});
	}

	//
	// handler
	//

	function JephDBHandler(req, res) {
		var ret = 0, error;

		var path = req.url.substring(req.basePath.length);

		if (path.indexOf("?") !== -1) {
			path = path.substring(0, path.indexOf("?"));
		}

		if (path === "") { path = "/"; }

		db.query({ "jeph/path": path, "jeph/handle": true }).take(1, function (err, result) {
			if (!err && result === undefined) {
				ret = 404;
				error = new Error("There is no document for path " + path);

			} else if (!err) {
				try {
					result.get("jeph/handle").call(result, req, res, db);
				} catch (e) {
					ret = 500;
					error = e;
				}

			} else {
				ret = 500;
				error = err;
			}
		});

		if (ret !== 0) {
			// FIXME: nice responses
			// FIXME: log errors in production, show them in development mode
			var body = { 404: "404 Not Found\n", 500: "500 Internal Server Error" }[ret];

			res.writeHead(ret, { "content-type": "text/plain",
				"content-length": body.length });
			res.end(body);
		}
	};

	//
	// return handler
	//

	return JephDBHandler;
};
