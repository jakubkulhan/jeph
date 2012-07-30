var Property = require("../Property");

test("Property()", function () {
	var p = new Property("a", { b: "c", d: "e", name: "f" });
	assertEqual(p.name, "a");
	assertEqual(p.b, "c");
	assertEqual(p.d, "e");

	assertEqual((new Property("a")).name, "a");
});
