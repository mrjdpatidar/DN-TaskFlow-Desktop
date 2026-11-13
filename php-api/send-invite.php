<?php
/**
 * TaskFlow Hostinger Native PHP Mailer - Workspace Invitation
 * Endpoint: POST /api/send-invite.php
 * Payload JSON: { "email": "collaborator@example.com", "orgName": "Acme Tech", "inviterName": "Sarah", "inviteCode": "TF-ACM892", "role": "member" }
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
$org_name = trim($data['orgName'] ?? 'TaskFlow Workspace');
$inviter_name = trim($data['inviterName'] ?? 'A team member');
$invite_code = trim($data['inviteCode'] ?? 'TF-INVITE');
$role = trim($data['role'] ?? 'member');

if (!$email) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Valid recipient email address is required.']);
    exit();
}

// Construct direct workspace join link with Org Key, Org Name & Email
$invite_url = APP_LIVE_URL . '#join=' . urlencode($invite_code) . '&org=' . urlencode($org_name) . '&email=' . urlencode($email);

// Read HTML template
$template_path = __DIR__ . '/templates/invite-template.html';
if (file_exists($template_path)) {
    $html_body = file_get_contents($template_path);
    $html_body = str_replace(
        ['{{ORG_NAME}}', '{{INVITER_NAME}}', '{{INVITE_CODE}}', '{{ROLE}}', '{{APP_URL}}', '{{INVITE_URL}}'],
        [htmlspecialchars($org_name), htmlspecialchars($inviter_name), htmlspecialchars($invite_code), htmlspecialchars($role), APP_LIVE_URL, $invite_url],
        $html_body
    );
} else {
    // Fallback minimal HTML
    $html_body = "<h2>You are invited to join {$org_name} on TaskFlow</h2><p>Invite Code: <strong>{$invite_code}</strong></p><p><a href='{$invite_url}'>Click here to accept and join workspace</a></p>";
}

// Prepare mail headers for native PHP mail() on Hostinger
$subject = "Invitation to collaborate in {$org_name} on TaskFlow";
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
        'message' => "Invitation dispatched to {$email} for workspace {$org_name}",
        'timestamp' => date('c'),
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Hostinger mail() server could not dispatch invitation email.',
    ]);
}

