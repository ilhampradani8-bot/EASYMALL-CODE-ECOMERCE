<?php
// router.php for PHP built-in web server
$file = __DIR__ . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (is_file($file)) {
    return false;
}
require_once __DIR__ . '/index.php';
