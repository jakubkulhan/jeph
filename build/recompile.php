<?php
require dirname(__FILE__) . '/recompile.init.php'; // exports $imageCode, $serialized, and $basePath

function unloadify($o, $t = NULL) {
	static $traversed = array();

	if ($t !== NULL) { $traversed = $t; }

	if (is_object($o) && $o instanceof JSUndefined) { return; }
	if (is_object($o) && isset($traversed[spl_object_hash($o)])) { return; }
	if (!is_object($o) && !is_array($o)) { return; }

	if (is_object($o)) {
		$traversed[spl_object_hash($o)] = TRUE;
	}

	if (isset($o->call)) {
		$o->loaded = FALSE;
	}

	foreach ($o as $v) {
		unloadify($v);
	}
}

eval($imageCode);

function loadFunction($fn) {
	if (!function_exists($fn->call)) {
		require_once dirname(__FILE__) . "/f/{$fn->call}.php";
	}
}

function __autoload($c) {
	require_once dirname(__FILE__) . "/c/$c.php";
}

// TODO: handling and reporting of errors

$code = "<?php\n" .
	"\$t = microtime(true);\n" .
	"if (filemtime(__FILE__) < filemtime(dirname(__FILE__) . '/jeph/src/main.js')) { " .
		"return require dirname(__FILE__) . '/jeph/recompile.php'; }\n" .
	"if (TRUE) {\n" .
	"function loadFunction(\$fn) { if (!function_exists(\$fn->call)) { " .
		"require_once dirname(__FILE__) . \"/jeph/f/{\$fn->call}.php\"; } \$fn->loaded = TRUE; }\n" .
	"function __autoload(\$c) { require_once dirname(__FILE__) . \"/jeph/c/\$c.php\"; }\n" .
	$imageCode;
$f = dirname(__FILE__) . '/jeph_modules/jeph/index.js';

if (file_exists(dirname(__FILE__) . '/cache/jeph') &&
	filemtime(dirname(__FILE__) . '/cache/jeph') >= filemtime($f))
{
	$compiled = unserialize(file_get_contents(dirname(__FILE__) . '/cache/jeph'));

} else {
	$parser = new JSParser;
	$compiler = new JSCompiler;

	list($ok, $ast, $error) = $parser->__invoke(
		file_get_contents($f),
		array('file' => $f)
	);

	$compiled = $compiler->__invoke($ast, array(
		'force' => TRUE,
		'generate' => 'object',
		'loader' => 'loadFunction'
	));

	file_put_contents(dirname(__FILE__) . '/cache/jeph', serialize($compiled));
}

eval(implode("\n", $compiled->functions));
foreach (unserialize($serialized) as $k => $v) { JS::$$k = $v; }
unloadify(JS::$global, array());

$c = $compiled->main;
$c(JS::$global);

JS::$global->properties['_request']->properties['basePath'] = $basePath;

$fns = array();

foreach ($compiled->functions as $fn => $c) {
	if ($fn !== $compiled->main) {
		$fns[$fn] = $c;
	}
}

foreach (JS::$global->properties['require']->properties['compiled']->properties as $file => $compiledObject) {
	$fns = array_merge($fns, $compiledObject->properties['functions']->properties);
}

foreach ($fns as $fn => $c) {
	if ($fn === JS::$global->properties['_main']->call ||
		preg_match('/^function [a-zA-Z0-9_]+\(\$global, *\$scope/', $c))
	{
		$code .= $c . "\n";
	}

	file_put_contents(dirname(__FILE__) . "/f/$fn.php", "<?php\n$c");
}

unloadify(JS::$global, array());

JS::$global->properties['require']->properties['compiled'] = clone JS::$objectTemplate;
JS::$global->properties['require']->properties['saveCompiled'] = false;
JS::$wrappedObjectTemplates = JS::$wrappedObjects = array();
unset(JS::$global->scope, JS::$global->scope_sp, JS::$global->trace, JS::$global->trace_sp);

$r = new ReflectionClass('JS');
$code .= 'foreach (unserialize(' . var_export(serialize($r->getStaticProperties()), TRUE) .
	') as $k => $v) { JS::$$k = $v; }' . "\n";

$code .= "try {\n";
$code .= 'call_user_func(JS::$global->properties[\'_main\']->call, ' .
	'JS::$global, JS::$global, JS::$global->properties[\'_main\'], array());' . "\n";
$code .= "} catch (JSException \$e) {\n" .
	"echo JS::toString(\$e, JS::\$global);" .
	"if (isset(\$e->value->class) && \$e->value->class === 'Error') {\n" .
		"echo ' in ', \$e->value->properties['file'], '@', " .
			"\$e->value->properties['line'], ':', \$e->value->properties['column'];" .
	"}\n" .
	"echo \"\\n\";" .
	"foreach (array_reverse(JS::\$global->trace) as \$t) {\n" .
		"echo '  ', \$t[0], '@', \$t[1], ':', \$t[2], \"\\n\";" .
	"}\n" .
"}\n";

$code .= "}\n";

file_put_contents(dirname(__FILE__) . '/../index.php', $code);

if (!isset($doNotRun) || !$doNotRun) {
	call_user_func(
		JS::$global->properties['_main']->call,
		JS::$global, JS::$global, JS::$global->properties['_main'], array()
	);
}
