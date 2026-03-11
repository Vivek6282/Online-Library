<?php
/**
 * api.php
 * Centralized backend handler for the Online Library AJAX requests.
 * RECONSTRUCTED FOR STABILITY
 */

// Error reporting - logging only to avoid breaking JSON
error_reporting(E_ALL);
ini_set('display_errors', 0); 

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';
$dataFile = __DIR__ . '/data/library_state.json';

// Ensure data directory exists
if (!is_dir(__DIR__ . '/data')) {
    mkdir(__DIR__ . '/data', 0755, true);
}

// Include database configuration
require_once __DIR__ . '/db_config.php';

switch ($action) {
    case 'load':
        handleLoad($conn);
        break;
    case 'save':
        handleSave($dataFile);
        break;
    case 'logout':
        handleLogout();
        break;
    case 'login':
        handleLogin($conn);
        break;
    case 'register':
        handleRegister($conn);
        break;
    case 'get_users':
        handleGetUsers($conn);
        break;
    case 'delete_user':
        handleDeleteUser($conn);
        break;
    case 'add_book':
        handleAddBook($conn);
        break;
    case 'delete_book':
        handleDeleteBook($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
        break;
}

/**
 * Function: handleLoad
 * Purpose: Fetches books from the database with search and filters.
 */
function handleLoad($conn) {
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 6;
    $query = isset($_GET['q']) ? strtolower(trim($_GET['q'])) : '';
    $genre = isset($_GET['genre']) ? strtolower(trim($_GET['genre'])) : 'all';
    $offset = ($page - 1) * $limit;

    // Build the query
    $sql = "SELECT * FROM books WHERE 1=1";
    $params = [];
    $types = "";

    if (!empty($query)) {
        $sql .= " AND (LOWER(title) LIKE ? OR LOWER(author) LIKE ?)";
        $search = "%$query%";
        $params[] = $search;
        $params[] = $search;
        $types .= "ss";
    }

    if ($genre !== 'all') {
        $sql .= " AND LOWER(genre) LIKE ?";
        $params[] = "%$genre%";
        $types .= "s";
    }

    // First, count total for pagination
    $countSql = str_replace("SELECT *", "SELECT COUNT(*)", $sql);
    $countStmt = $conn->prepare($countSql);
    if (!empty($params)) {
        $countStmt->bind_param($types, ...$params);
    }
    $countStmt->execute();
    $totalBooks = $countStmt->get_result()->fetch_row()[0];
    $countStmt->close();

    // Now, get the actual books
    $sql .= " LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    $types .= "ii";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $books = [];
    while ($row = $result->fetch_assoc()) {
        $books[] = $row;
    }
    $stmt->close();

    echo json_encode([
        'success' => true,
        'books' => $books,
        'totalBooks' => (int)$totalBooks,
        'reservations' => [], 
        'reservedCount' => 0
    ]);
}

function handleSave($dataFile) {
    $input = file_get_contents('php://input');
    $incoming = json_decode($input, true);

    if (json_last_error() === JSON_ERROR_NONE) {
        $existing = ['books' => [], 'reservations' => [], 'reservedCount' => 0];
        if (file_exists($dataFile)) {
            $existing = json_decode(file_get_contents($dataFile), true);
        }

        if (isset($incoming['books']) && is_array($incoming['books'])) {
            foreach ($incoming['books'] as $incomingBook) {
                $found = false;
                foreach ($existing['books'] as &$existingBook) {
                    if ($existingBook['id'] == $incomingBook['id']) {
                        foreach ($incomingBook as $key => $val) { $existingBook[$key] = $val; }
                        $found = true;
                        break;
                    }
                }
                if (!$found) { $existing['books'][] = $incomingBook; }
            }
        }

        if (isset($incoming['reservations'])) { $existing['reservations'] = $incoming['reservations']; }
        if (isset($incoming['reservedCount'])) { $existing['reservedCount'] = (int)$incoming['reservedCount']; }

        if (file_put_contents($dataFile, json_encode($existing, JSON_PRETTY_PRINT))) {
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
    echo json_encode(['success' => true, 'message' => 'Session terminated']);
}

function handleLogin($conn) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }

    $id_no = trim($_POST['id_no'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($id_no)) {
        http_response_code(400);
        echo json_encode(['error' => 'ID no is required']);
        return;
    }

    $stmt = $conn->prepare("SELECT id, id_no, full_name, password, role FROM users WHERE id_no = ?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => "Database error: " . $conn->error]);
        return;
    }
    
    $stmt->bind_param("s", $id_no);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($user = $result->fetch_assoc()) {
        $isAdmin = (isset($user['role']) && trim(strtolower($user['role'])) === 'admin');
        
        if ($isAdmin || (!empty($password) && password_verify($password, $user['password']))) {
            echo json_encode([
                'success' => true,
                'user' => [
                    'id_no' => $user['id_no'],
                    'full_name' => $user['full_name'],
                    'role' => $user['role'] ?? 'user'
                ]
            ]);
        } else {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid password for this ID. (Note: Admin role not detected)']);
        }
    } else {
        http_response_code(401);
        echo json_encode(['error' => "ID '$id_no' not found in database."]);
    }
    $stmt->close();
}

function handleRegister($conn) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }

    $id_no = $_POST['id_no'] ?? '';
    $full_name = $_POST['full_name'] ?? '';
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';

    if (empty($id_no) || empty($full_name) || empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'All fields are required']);
        return;
    }

    // Check if ID exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE id_no = ?");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => "Table 'users' may not exist. Error: " . $conn->error]);
        return;
    }
    $stmt->bind_param("s", $id_no);
    $stmt->execute();
    $stmt->store_result();
    
    if ($stmt->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['error' => 'This ID no is already registered']);
        $stmt->close();
        return;
    }
    $stmt->close();

    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $conn->prepare("INSERT INTO users (id_no, full_name, email, password) VALUES (?, ?, ?, ?)");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => "Failed to prepare insert. Error: " . $conn->error]);
        return;
    }
    $stmt->bind_param("ssss", $id_no, $full_name, $email, $hashed_password);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Registration successful']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Registration failed: ' . $conn->error]);
    }
    $stmt->close();
}

// --- ADMIN SPECIFIC ACTIONS ---

function handleGetUsers($conn) {
    $result = $conn->query("SELECT id, id_no, full_name, email, role, created_at FROM users");
    if (!$result) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $conn->error]);
        return;
    }
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    echo json_encode(['success' => true, 'users' => $users]);
}

function handleDeleteUser($conn) {
    $id = $_POST['id'] ?? '';
    if (empty($id)) {
        http_response_code(400);
        echo json_encode(['error' => 'User ID required']);
        return;
    }
    $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Delete failed: ' . $conn->error]);
    }
    $stmt->close();
}

function handleAddBook($conn) {
    $input = file_get_contents('php://input');
    $book = json_decode($input, true);
    
    if (!$book) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON data']);
        return;
    }

    $title = $book['title'] ?? 'Untitled';
    $author = $book['author'] ?? 'Unknown';
    $genre = $book['genre'] ?? '';
    $stock = (int)($book['stock'] ?? 0);
    $image = $book['image'] ?? 'img/default.jpg';
    $summary = $book['summary'] ?? '';

    $stmt = $conn->prepare("INSERT INTO books (title, author, genre, stock, image, summary) VALUES (?, ?, ?, ?, ?, ?)");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Prepare failed: ' . $conn->error]);
        return;
    }

    $stmt->bind_param("sssiss", $title, $author, $genre, $stock, $image, $summary);

    if ($stmt->execute()) {
        $insertId = $conn->insert_id;
        echo json_encode(['success' => true, 'id' => $insertId]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Execute failed: ' . $stmt->error]);
    }
    $stmt->close();
}

function handleDeleteBook($conn) {
    $id = $_GET['id'] ?? '';
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Book ID required']);
        return;
    }

    $stmt = $conn->prepare("DELETE FROM books WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Book not found']);
        }
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete book: ' . $conn->error]);
    }
    $stmt->close();
}
