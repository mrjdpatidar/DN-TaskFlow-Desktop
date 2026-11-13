<?php
/**
 * TaskFlow Central Server JSON Storage Engine
 * Endpoint: /api/storage.php
 * 
 * Manages multi-tenant JSON database storage on the Hostinger server under:
 *   data/{company}/tasks.json
 *   data/{company}/projects.json
 *   data/{company}/users.json
 *   data/{company}/comments.json
 *   data/{company}/activities.json
 *   data/{company}/organization.json
 *   data/{company}/notifications.json
 *   data/{company}/taskflow_data.json (full snapshot)
 * 
 * Provides atomic file writes, directory traversal prevention, and global cross-device synchronization.
 */

require_once __DIR__ . '/config.php';

// Base storage directory
$DATA_BASE_DIR = __DIR__ . '/data';
if (!is_dir($DATA_BASE_DIR)) {
    @mkdir($DATA_BASE_DIR, 0755, true);
}

// Global Index of Organizations
$INDEX_FILE = $DATA_BASE_DIR . '/organizations_index.json';
if (!file_exists($INDEX_FILE)) {
    @file_put_contents($INDEX_FILE, json_encode([], JSON_PRETTY_PRINT));
}

// Read JSON Input Body
$raw_input = file_get_contents('php://input');
$input = json_decode($raw_input, true) ?: [];

// Action: GET parameter or JSON property
$action = $_GET['action'] ?? $input['action'] ?? 'read';
$raw_company = $_GET['company'] ?? $input['company'] ?? '';

/**
 * Sanitizes company folder name to strictly alphanumeric, dashes, and underscores
 * Prevents directory traversal attacks (no .. or / allowed)
 */
function sanitize_company_slug($name) {
    $clean = trim($name);
    // If empty, return default
    if (empty($clean)) return 'default';
    $slug = strtolower($clean);
    $slug = preg_replace('/[^a-z0-9_\-]/', '_', $slug);
    $slug = trim($slug, '_');
    return substr($slug, 0, 64) ?: 'default';
}

/**
 * Atomic write helper to prevent file corruption during concurrent operations
 */
function atomic_json_write($filepath, $data) {
    $dir = dirname($filepath);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    $temp = $filepath . '.tmp.' . uniqid() . '.' . mt_rand(1000, 9999);
    $content = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    
    if (file_put_contents($temp, $content, LOCK_EX) !== false) {
        if (@rename($temp, $filepath)) {
            return true;
        }
        @unlink($temp);
    }
    return false;
}

/**
 * Read index of all organizations
 */
function get_organizations_index($index_file) {
    if (!file_exists($index_file)) return [];
    $raw = @file_get_contents($index_file);
    return json_decode($raw, true) ?: [];
}

/**
 * Save index of all organizations
 */
function save_organizations_index($index_file, $index_data) {
    return atomic_json_write($index_file, $index_data);
}

// ------------------------------------------------------------------------
// ROUTE HANDLERS
// ------------------------------------------------------------------------

switch ($action) {
    /**
     * 1. LIST ORGANIZATIONS / COMPANIES
     */
    case 'list_organizations':
    case 'get_companies':
        $index = get_organizations_index($INDEX_FILE);
        echo json_encode([
            'success' => true,
            'organizations' => $index,
            'count' => count($index),
        ]);
        break;

    /**
     * 2. LOOKUP ORGANIZATION BY NAME OR INVITE CODE
     */
    case 'lookup_org':
        $query = trim($_GET['query'] ?? $input['query'] ?? '');
        if (empty($query)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Search query is required']);
            exit();
        }

        $index = get_organizations_index($INDEX_FILE);
        $clean_query = strtolower($query);
        $matched = null;

        foreach ($index as $org) {
            if (
                strtolower($org['inviteCode'] ?? '') === $clean_query ||
                strtolower($org['name'] ?? '') === $clean_query ||
                strtolower($org['slug'] ?? '') === $clean_query ||
                strtolower($org['id'] ?? '') === $clean_query
            ) {
                $matched = $org;
                break;
            }
        }

        if ($matched) {
            echo json_encode(['success' => true, 'organization' => $matched]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Workspace not found on server']);
        }
        break;

    /**
     * 3. READ COMPANY DATABASE (All JSON Files in data/{company}/)
     */
    case 'read':
    case 'read_company':
        $slug = sanitize_company_slug($raw_company);
        $company_dir = $DATA_BASE_DIR . '/' . $slug;

        // If company folder doesn't exist yet, check index or return pristine empty schema
        if (!is_dir($company_dir)) {
            // Check if we can find by inviteCode or name from index
            $index = get_organizations_index($INDEX_FILE);
            $found_slug = null;
            foreach ($index as $org) {
                if (
                    strtolower($org['slug'] ?? '') === $slug ||
                    strtolower($org['inviteCode'] ?? '') === strtolower($raw_company) ||
                    strtolower($org['name'] ?? '') === strtolower($raw_company)
                ) {
                    $found_slug = $org['slug'];
                    break;
                }
            }
            if ($found_slug && is_dir($DATA_BASE_DIR . '/' . $found_slug)) {
                $company_dir = $DATA_BASE_DIR . '/' . $found_slug;
                $slug = $found_slug;
            } else {
                echo json_encode([
                    'success' => true,
                    'isNew' => true,
                    'company' => $slug,
                    'data' => [
                        'users' => [],
                        'organizations' => [],
                        'projects' => [],
                        'tasks' => [],
                        'comments' => [],
                        'activities' => [],
                        'notifications' => [],
                        'preferences' => [
                            'theme' => 'dark',
                            'accentColor' => '#5b8def',
                            'hourlyRemindersEnabled' => true,
                            'reminderIntervalMinutes' => 60,
                            'soundEnabled' => true,
                        ],
                    ],
                ]);
                exit();
            }
        }

        // Read individual table files:
        // data/{company}/tasks.json, projects.json, users.json, etc.
        $tables = ['users', 'organizations', 'projects', 'tasks', 'comments', 'activities', 'notifications', 'preferences'];
        $result_data = [];

        foreach ($tables as $tbl) {
            $table_file = $company_dir . '/' . $tbl . '.json';
            if (file_exists($table_file)) {
                $raw = @file_get_contents($table_file);
                $result_data[$tbl] = json_decode($raw, true) ?: [];
            } else {
                // If single consolidated file exists as fallback
                $consolidated_file = $company_dir . '/taskflow_data.json';
                if (file_exists($consolidated_file)) {
                    $c_raw = @file_get_contents($consolidated_file);
                    $c_data = json_decode($c_raw, true) ?: [];
                    $result_data[$tbl] = $c_data[$tbl] ?? [];
                } else {
                    $result_data[$tbl] = ($tbl === 'preferences' ? [
                        'theme' => 'dark',
                        'accentColor' => '#5b8def',
                        'hourlyRemindersEnabled' => true,
                    ] : []);
                }
            }
        }

        echo json_encode([
            'success' => true,
            'company' => $slug,
            'data' => $result_data,
            'timestamp' => date('c'),
        ]);
        break;

    /**
     * 4. WRITE COMPANY DATABASE (Save to data/{company}/xxx.json)
     */
    case 'write':
    case 'write_company':
    case 'sync':
        $payload = $input['data'] ?? $input;
        $company_identifier = $input['company'] ?? $raw_company;
        $slug = sanitize_company_slug($company_identifier);

        // Extract organization info to sync with global index
        $orgs = $payload['organizations'] ?? [];
        $current_org = !empty($orgs) ? $orgs[0] : null;

        if ($current_org && !empty($current_org['name'])) {
            $slug = sanitize_company_slug($current_org['name']);
        }

        $company_dir = $DATA_BASE_DIR . '/' . $slug;
        if (!is_dir($company_dir)) {
            @mkdir($company_dir, 0755, true);
        }

        // Write each structured table into data/{company}/{table}.json
        $tables = [
            'users' => $payload['users'] ?? [],
            'organizations' => $payload['organizations'] ?? [],
            'projects' => $payload['projects'] ?? [],
            'tasks' => $payload['tasks'] ?? [],
            'comments' => $payload['comments'] ?? [],
            'activities' => $payload['activities'] ?? [],
            'notifications' => $payload['notifications'] ?? [],
            'preferences' => $payload['preferences'] ?? [],
        ];

        $all_success = true;
        foreach ($tables as $tbl => $records) {
            $table_file = $company_dir . '/' . $tbl . '.json';
            $saved = atomic_json_write($table_file, $records);
            if (!$saved) $all_success = false;
        }

        // Also write consolidated taskflow_data.json inside data/{company}/
        atomic_json_write($company_dir . '/taskflow_data.json', $payload);

        // Update Global Organizations Index
        if ($current_org) {
            $index = get_organizations_index($INDEX_FILE);
            $org_id = $current_org['id'] ?? ('org_' . $slug);
            $invite_code = $current_org['inviteCode'] ?? ('TF-' . strtoupper(substr($slug, 0, 4)) . '1000');
            
            $existing_idx = -1;
            foreach ($index as $i => $item) {
                if (($item['id'] ?? '') === $org_id || ($item['slug'] ?? '') === $slug) {
                    $existing_idx = $i;
                    break;
                }
            }

            $entry = [
                'id' => $org_id,
                'slug' => $slug,
                'name' => $current_org['name'] ?? ucfirst($slug),
                'logo' => $current_org['logo'] ?? '🏢',
                'description' => $current_org['description'] ?? '',
                'inviteCode' => $invite_code,
                'status' => $current_org['status'] ?? 'active',
                'memberCount' => count($tables['users']),
                'taskCount' => count($tables['tasks']),
                'updatedAt' => date('c'),
            ];

            if ($existing_idx >= 0) {
                $index[$existing_idx] = array_merge($index[$existing_idx], $entry);
            } else {
                $entry['createdAt'] = $current_org['createdAt'] ?? date('c');
                $index[] = $entry;
            }

            save_organizations_index($INDEX_FILE, $index);
        }

        echo json_encode([
            'success' => $all_success,
            'company' => $slug,
            'message' => "Data successfully saved on server in data/{$slug}/",
            'timestamp' => date('c'),
        ]);
        break;

    default:
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => "Unknown storage action '{$action}'. Supported: read, write, lookup_org, list_organizations",
        ]);
        break;
}

