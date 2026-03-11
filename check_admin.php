<?php
require_once 'db_config.php';

echo "<h2>System Diagnostic</h2>";

$id_to_check = '911';
$stmt = $conn->prepare("SELECT id_no, full_name, role FROM users WHERE id_no = ?");
$stmt->bind_param("s", $id_to_check);
$stmt->execute();
$result = $stmt->get_result();

if ($user = $result->fetch_assoc()) {
    echo "<p style='color:green'>✅ User '911' FOUND in database.</p>";
    echo "<ul>";
    echo "<li><b>Name:</b> " . $user['full_name'] . "</li>";
    echo "<li><b>Role:</b> '" . $user['role'] . "'</li>";
    echo "</ul>";
    
    if (trim(strtolower($user['role'])) === 'admin') {
        echo "<p style='color:blue'>🌟 SUCCESS: Role is correctly set to 'admin'. Login should work with NO password.</p>";
    } else {
        echo "<p style='color:red'>⚠️ PROBLEM: Role is still '" . $user['role'] . "'. You MUST run the UPDATE command in phpMyAdmin.</p>";
    }
} else {
    echo "<p style='color:red'>❌ ERROR: User '911' NOT FOUND in database.</p>";
    echo "<p>Please <b>Sign Up</b> on the login page first with ID no: 911.</p>";
}

echo "<h3>Books Table Check</h3>";
$table_check = $conn->query("SHOW TABLES LIKE 'books'");
if ($table_check && $table_check->num_rows > 0) {
    echo "<p style='color:green'>✅ Table 'books' EXISTS.</p>";
    $count = $conn->query("SELECT COUNT(*) FROM books")->fetch_row()[0];
    echo "<p>Total books in database: <b>$count</b></p>";
} else {
    echo "<p style='color:red'>❌ ERROR: Table 'books' DOES NOT EXIST.</p>";
    echo "<p>You need to run the SQL from <b>admin_books.sql</b> in phpMyAdmin.</p>";
}
?>
