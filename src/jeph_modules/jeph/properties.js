var db = require("jephdb");

db.namespace("jeph", function (db) {
	db.property("type", "type of an entity", function (p) {
		p.type = "string";

		p.longDescription =
			"Its purpose is to be used by other properties transformations. " +
			"It has no meaning to the system.";
	});

	db.property("path", "absolute path in the application", function (p) {
		p.type = "string";

		p.longDescription =
			"Path is what is used when client requests Jeph application. Base path " +
			"is stripped from request path and the rest is tested against database index. " +
			"An entity is then retrieved from database. The entity's jeph/handle property " +
			"is called. Given arguments are request, and response entities.";
	});

	db.namespace("path", function (db) {
		db.property("parent", "parent of the entity", function (p) {
			p.type = "id";

			p.longDescription =
				"Contains ID of the parent entity. If you define jeph/path/relative, " +
				"transformation will make jeph/path for you. It will take parent's jeph/path " +
				"and append the entity's jeph/path/relative to it.";
		});

		db.property("relative", "relative path in the application", function (p) {
			p.type = "string";

			p.longDescription =
				"If you define jeph/path/parent, transformation will make jeph/path " +
				"for you. It will take parent's path and append this path.";
		});

		db.transformation({
			"jeph/path/parent": true,
			"jeph/path/relative": true,
			"jeph/path": function (db) {
				var p = db.get(this["jeph/path/parent"]);

				if (!p || typeof p["jeph/path"] === "undefined") { return undefined; }

				var parentPath = p["jeph/path"];

				if (parentPath.charAt(parentPath.length - 1) === "/") {
					return parentPath + this["jeph/path/relative"];
				} else {
					return parentPath + "/" + this["jeph/path/relative"];
				}
			}
		});
	});

	db.property("handle", "request handler", function (p) {
		p.type = "function";

		p.longDescription =
			"This function will be called when request is routed to the entity. " +
			"It will be given two arguments: request, and response.";
	});
});
