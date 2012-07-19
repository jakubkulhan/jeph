<?php
require dirname(__FILE__) . '/c/JSParser.php';
require dirname(__FILE__) . '/c/JSCompiler.php';
require dirname(__FILE__) . '/recompile.init.php'; // exports $imageCode, $serialized, and $basePath

// TODO: handling and reporting of errors

$code = "<?php\n" .
	"\$t = microtime(true);\n" .
	"if (filemtime(__FILE__) < filemtime(dirname(__FILE__) . '/jeph/src/main.js')) { " .
		"return require dirname(__FILE__) . '/jeph/recompile.php'; }\n" .
	"if (TRUE) {\n" .
	"function loadFunction(\$fn) { require_once dirname(__FILE__) . " .
	"\"/jeph/f/{\$fn->call}.php\"; \$fn->loaded = TRUE; }\n" .
	"function __autoload(\$c) { require_once dirname(__FILE__) . \"/jeph/c/\$c.php\"; }\n" .
	$imageCode;

if (file_exists(dirname(__FILE__) . '/cache/jeph') &&
	filemtime(dirname(__FILE__) . '/cache/jeph') >= filemtime(dirname(__FILE__) . '/jeph.js'))
{
	$compiled = unserialize(file_get_contents(dirname(__FILE__) . '/cache/jeph'));

} else {
	$parser = new JSParser;
	$compiler = new JSCompiler;

	list($ok, $ast, $error) = $parser->__invoke(
		file_get_contents($f = dirname(__FILE__) . '/jeph.js'),
		array('file' => $f)
	);

	$compiled = $compiler->__invoke($ast, array(
		'force' => TRUE,
		'generate' => 'object',
		'loader' => 'loadFunction'
	));

	file_put_contents(dirname(__FILE__) . '/cache/jeph', serialize($compiled));
}

if (!class_exists('JS')) {
	eval($imageCode);
}

if (!function_exists('loadFunction')) {
	function loadFunction($fn) {
		if (!function_exists($fn->call)) {
			require_once dirname(__FILE__) . "/f/{$fn->call}.php";
		}
	}

	function __autoload($c) {
		require_once dirname(__FILE__) . "/c/$c.php";
	}
}

eval(implode("\n", $compiled->functions));
foreach (unserialize($serialized) as $k => $v) { JS::$$k = $v; }

$c = $compiled->main;
$c(JS::$global);

JS::$global->properties['jeph']->properties['_request']->properties['basePath'] = $basePath;

$fns = JS::$global->properties['jeph']->properties['_functions']->properties;

foreach ($compiled->functions as $fn => $c) {
	if ($fn !== $compiled->main) {
		$fns[$fn] = $c;
	}
}

foreach ($fns as $fn => $c) {
	if ($fn === JS::$global->properties['_main']->call ||
		preg_match('/^function [a-zA-Z0-9_]+\(\$global, *\$scope/', $c))
	{
		$code .= $c . "\n";
	}

	file_put_contents(dirname(__FILE__) . "/f/$fn.php", "<?php\n$c");
}

function unloadify($o) {
	static $traversed = array();

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

unloadify(JS::$global);

unset(JS::$global->properties['jeph']->properties['_functions'],
	JS::$global->properties['jeph']->attributes['_functions'],
	JS::$global->scope, JS::$global->trace);

$r = new ReflectionClass('JS');
$code .= 'foreach (unserialize(' . var_export(serialize($r->getStaticProperties()), TRUE) .
	') as $k => $v) { JS::$$k = $v; }' . "\n";

$code .= 'call_user_func(JS::$global->properties[\'_main\']->call, ' .
	'JS::$global, JS::$global, JS::$global->properties[\'_main\'], array());' . "\n";

$code .= "}\n";

file_put_contents(dirname(__FILE__) . '/../index.php', $code);

if (!isset($doNotRun) || !$doNotRun) {
	call_user_func(
		JS::$global->properties['_main']->call,
		JS::$global, JS::$global, JS::$global->properties['_main'], array()
	);
}
