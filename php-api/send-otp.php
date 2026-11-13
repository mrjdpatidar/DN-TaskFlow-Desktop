<?php
/**
 * TaskFlow Hostinger Native PHP Mailer - OTP Verification
 * Endpoint: POST /api/send-otp.php
 * Payload JSON: { "email": "user@example.com", "otp": "492810", "name": "Sarah", "action": "registration" }
 */

require_once __DIR__ . '/config.php';

// Accept JSON body
$raw_input = file_get_contents('php://input');
$data = json_decode($raw_input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON payload received.']);
    exit();
}

$email = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL);
$otp = trim($data['otp'] ?? '');
$name = trim($data['name'] ?? 'TaskFlow User');
$action = trim($data['action'] ?? 'registration');

if (!$email) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Valid email address is required.']);
    exit();
}

if (empty($otp)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'OTP code is required.']);
    exit();
}

// Action descriptions
$action_desc = 'complete your TaskFlow registration';
if ($action === 'forgot_password' || $action === 'recovery') {
    $action_desc = 'reset your TaskFlow account password';
} elseif ($action === 'login') {
    $action_desc = 'authenticate your TaskFlow login';
}

// Read HTML template
$template_path = __DIR__ . '/templates/otp-template.html';
if (file_exists($template_path)) {
    $html_body = file_get_contents($template_path);
    $html_body = str_replace(
        ['{{USER_NAME}}', '{{OTP_CODE}}', '{{ACTION_DESCRIPTION}}', '{{APP_URL}}'],
        [htmlspecialchars($name), htmlspecialchars($otp), htmlspecialchars($action_desc), APP_LIVE_URL],
        $html_body
    );
} else {
    // Fallback minimal HTML
    $html_body = "<h2>TaskFlow Security Code</h2><p>Your verification code is: <strong>" . htmlspecialchars($otp) . "</strong> (Valid for 10 minutes).</p>";
}

// Prepare mail headers for native PHP mail() on Hostinger
$subject = "Your TaskFlow Verification Code: {$otp}";
$from_email = MAIL_FROM_ADDRESS;
$from_name = MAIL_FROM_NAME;

$headers = [];
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-type: text/html; charset=UTF-8';
$headers[] = "From: {$from_name} <{$from_email}>";
$headers[] = "Reply-To: {$from_name} <{$from_email}>";
$headers[] = "X-Mailer: PHP/" . phpversion();

// Send via PHP native mail()
$mail_sent = @mail($email, $subject, $html_body, implode("\r\n", $headers));

if ($mail_sent) {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Verification code sent to ' . $email,
        'timestamp' => date('c'),
    ]);
} else {
    // Return informative response
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Hostinger mail() server could not dispatch email. Please check server sendmail/postfix configuration.',
    ]);
}

