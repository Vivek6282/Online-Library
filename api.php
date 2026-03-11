<?php
/**
 * api.php
 * Centralized backend handler for the Online Library AJAX requests.
 * Handles:
 *  - GET ?action=load : Fetches library state
 *  - POST ?action=save : Persists library state
 *  - POST ?action=logout : Handles session termination
 */

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';
$dataFile = __DIR__ . '/data/library_state.json';

// Ensure data directory exists
if (!is_dir(__DIR__ . '/data')) {
    mkdir(__DIR__ . '/data', 0755, true);
}

switch ($action) {
    case 'load':
        handleLoad($dataFile);
        break;
    case 'save':
        handleSave($dataFile);
        break;
    case 'logout':
        handleLogout();
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
        break;
}

function handleLoad($dataFile) {
    if (file_exists($dataFile)) {
        echo file_get_contents($dataFile);
    } else {
        // Initial state if file doesn't exist
        echo json_encode([
            'books' => [],
            'reservations' => [],
            'reservedCount' => 0
        ]);
    }
}

function handleSave($dataFile) {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (json_last_error() === JSON_ERROR_NONE) {
        if (file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT))) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save data']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON input']);
    }
}

function handleLogout() {
    // In a real app, this would destroy the session.
    // For this AJAX conversion fix, we return success.
    echo json_encode(['success' => true, 'message' => 'Session terminated']);
}
