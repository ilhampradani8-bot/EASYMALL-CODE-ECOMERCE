<?php
function adminer_object() {
    class AdminerCustom extends Adminer {
        function name() {
            return 'EasyMall Database Manager (SQLite)';
        }
        function login($login, $password) {
            return true;
        }
        function database() {
            return '/root/ecomerce/frontend/local_easymall.db';
        }
    }
    return new AdminerCustom();
}

if (!isset($_GET['sqlite']) && !isset($_GET['username']) && !isset($_GET['db']) && empty($_POST)) {
    $_GET['sqlite'] = '';
    $_GET['username'] = '';
    $_GET['db'] = '/root/ecomerce/frontend/local_easymall.db';
}

require __DIR__ . '/adminer.php';
