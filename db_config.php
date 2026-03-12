<?php
/**
 * DATABASE CONFIGURATION
 * This file contains the settings to connect our website to the MySQL Database.
 */

$host = 'localhost';
$db   = 'book_catalog';
$user = 'root';
$pass = '';

// Prevent mysqli from throwing warnings that break JSON
mysqli_report(MYSQLI_REPORT_OFF);

try {
    // Create connection
    $conn = new mysqli($host, $user, $pass, $db);

    // Check connection
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
} catch (Exception $e) {
    // If connection fails, return a JSON error so the frontend knows what happened
    header('Content-Type: application/json');
    echo json_encode([
        "success" => false, 
        "error" => "Database connection failed. Please ensure XAMPP MySQL is running.",
        "debug" => $e->getMessage()
    ]);
    exit;
}
