<?php
/**
 * db_config.php
 * Handles the database connection for the Online Library.
 */

$servername = "localhost";
$username = "root";
$password = ""; 
$dbname = "book_catalog";

// Prevent mysqli from throwing warnings/notices that break JSON
error_reporting(0);
ini_set('display_errors', 0);

try {
    // The @ operator suppresses the warning that breaks JSON parsing
    $conn = @new mysqli($servername, $username, $password, $dbname);
    
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
} catch (Exception $e) {
    // Ensure all errors are returned as JSON
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "error" => "Database connection failed. Please ensure XAMPP MySQL is running and the 'book_catalog' database exists.",
        "debug" => $e->getMessage()
    ]);
    exit;
}
?>
