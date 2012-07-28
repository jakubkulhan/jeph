var jaml = require("../compiler"),
	render = function (s, locals) {
		return jaml.compile(s)(locals);
	};

test("doctype", function () {
	assertEqual(render('!!! 5'), '<!DOCTYPE html>');
	assertEqual(render('!!! xml'), '<?xml version="1.0" encoding="utf-8" ?>');
	assertEqual(render('!!! transitional'), '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">');
	assertEqual(render('!!! strict'), '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">');
	assertEqual(render('!!! frameset'), '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Frameset//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-frameset.dtd">');
	assertEqual(render('!!! 1.1'), '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">');
	assertEqual(render('!!! basic'), '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML Basic 1.1//EN" "http://www.w3.org/TR/xhtml-basic/xhtml-basic11.dtd">');
	assertEqual(render('!!! mobile'), '<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.2//EN" "http://www.openmobilealliance.org/tech/DTD/xhtml-mobile12.dtd">');
});

test("text", function () {
	assertEqual(render('| Hello,\n| world!'), 'Hello, world!');
	assertEqual(render('p\n| Hello, \n|world!'), '<p></p> Hello, world!');
	assertEqual(render('| <>&"'), '&lt;&gt;&amp;&quot;');
	assertEqual(render('= x\n| b\n|   c', { x: "a"}), 'a b c');
	assertEqual(render('!= x\n| b\n|   c', { x: "a"}), 'a b c');
});

test("code", function () {
	assertEqual(render('- if (true)\n  = x', { x: "a" }), 'a');
	assertEqual(render('- if (false)\n  = x', { x: "a" }), '');
	assertEqual(render('- var x = "a";\n- if (true)\n  = x'), 'a');
	assertEqual(render('- for (var k in o)\n  =k', { o: { foo: "foo", bar: "bar"} }), 'foobar');
});

test("echo, not escaped echo", function () {
	assertEqual(render('= x', { x: 'a' }), 'a');
	assertEqual(render('= x', { x: '<>&"' }), '&lt;&gt;&amp;&quot;');
	assertEqual(render('!= x', { x: '<>&"' }), '<>&"');
});

test("comments", function () {
	assertEqual(render('// hello, world!'), '');
	assertEqual(render('// this is block comment\n  p\n  p\n  p'), '');
});

test("tags", function () {
	assertEqual(render('p'), '<p></p>');
	assertEqual(render('br'), '<br>');
	assertEqual(render('p.class'), '<p class="class"></p>');
	assertEqual(render('p#id'), '<p id="id"></p>');
	assertEqual(render('p#id.class'), '<p id="id" class="class"></p>');
	assertEqual(render('p.a.b.c'), '<p class="a b c"></p>');
	assertEqual(render('p#a#b#c'), '<p id="c"></p>');
	assertEqual(render('#id'), '<div id="id"></div>');
	assertEqual(render('.class'), '<div class="class"></div>');
	assertEqual(render('a(href="#")'), '<a href="#"></a>');
	assertEqual(render('a(href="#" title="hello")'), '<a href="#" title="hello"></a>');
	assertEqual(render('a(title="hello" href="#")'), '<a href="#" title="hello"></a>');
	assertEqual(render('p.a(class="b")'), '<p class="a b"></p>');
	assertEqual(render('p#a(id="b")'), '<p id="b"></p>');
	assertEqual(render('p= x', { x: 'a' }), '<p>a</p>');
	assertEqual(render('p= x', { x: '<>&"' }), '<p>&lt;&gt;&amp;&quot;</p>');
	assertEqual(render('p!= x', { x: '<>&"' }), '<p><>&"</p>');
	assertEqual(render('p: a(href="#")'), '<p><a href="#"></a></p>');
	assertEqual(render('p Hello, world!'), '<p>Hello, world!</p>');
});

test("nesting", function () {
	assertEqual(render('ul\n  li a\n  li b\n  li c'), '<ul><li>a</li><li>b</li><li>c</li></ul>');
	assertEqual(render('ul\n  li\n    a\n  li b'), '<ul><li><a></a></li><li>b</li></ul>');
	try { render('br\n  a(href="#")'); assert(false, "did not throw"); } catch (e) {}
	assertEqual(render('script\n  | var a;'), '<script>var a;</script>');
	try { render('script\n  a(href="#")'); assert(false, "did not throw"); } catch (e) {}
	try { render('ul\n  li\n li'); assert(false, "did not throw"); } catch (e) {}
	try { render(' ul\n  li\nul'); assert(false, "did not throw"); } catch (e) {}
});

test("blank lines", function () {
	assertEqual(render('p\n\n\n  a(href="#")\n\np'), '<p><a href="#"></a></p><p></p>');
});
