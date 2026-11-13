<?php
/**
 * TaskFlow Hostinger Mailer Configuration
 * Uses PHP native mail() function - No third-party SMTP or Composer dependencies required!
 * 
 * Deployment:
 * Upload this directory to your Hostinger web hosting public_html (e.g. public_html/taskflow/api/)
 * Live Endpoint: https://app.drunall.com/taskflow/api/
 */

// Production Live URL and Domain
define('APP_NAME', 'TaskFlow');
define('APP_LIVE_URL', 'https://app.drunall.com/taskflow'); // Production Live URL
define('MAIL_FROM_ADDRESS', 'noreply@drunall.com');
define('MAIL_FROM_NAME', 'TaskFlow Support');

// Allowed Origins for CORS (Allows both local electron/vite dev and production live URL)
$allowed_origins = [
    'https://app.drunall.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($origin, $allowed_origins) || empty($origin)) {
    header("Access-Control-Allow-Origin: " . ($origin ? $origin : '*'));
} else {
    header("Access-Control-Allow-Origin: https://app.drunall.com");
}

header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

