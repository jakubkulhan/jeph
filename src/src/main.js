var jeph = require("jeph"),
	JephDB = require("jephdb"),
	MemoryStore = JephDB.MemoryStore,
	store = new MemoryStore,
	db = new JephDB(store),
	jaml = require("jaml"),
	tpl = jaml.compile(
			"!!! 5\n" +
			"html\n" +
			"  head\n" +
			"    title= title\n" +
			"  body\n" +
			"    h1= title\n" +
			"    != content\n");

jeph(jeph.JephDBHandler(new JephDB(store)));

db.namespace("app", function (db) {
	db.property("content", function (p) { p.type = "string"; });

	db.transformation({
		"jeph/type": "app/page",
		"app/content": true,
		"jeph/handle": function () {
			return function (req, res) {
				res.writeHead(200, { "content-type": "text/html",
					"content-length": this.get("app/content").length });

				res.end(this.get("app/content"));
			};
		}
	});
});

var index = db.create({
	"jeph/type": "app/page",
	"jeph/path": "/",
	"app/content": tpl({
		title: "Hi! This is Jeph.",
		content: jaml.compile(
			'p Jeph is an application framework that runs Javascript on top of PHP engine.\n' +
			'p Also,\n' +
			'  a(href="another-page") try this link!')()
	})
}).save();

db.create({
	"jeph/type": "app/page",
	"jeph/path/parent": index.id,
	"jeph/path/relative": "another-page",
	"app/content": tpl({
		title: "Another page",
		content: jaml.compile(
			'p Another page served by Jeph.')()
	})
}).save();

delete db;
delete index;
