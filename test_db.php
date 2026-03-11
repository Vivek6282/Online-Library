<?php
header('Content-Type: application/json');
require_once 'db_config.php';

$res = [
    "connection" => "OK",
    "database" => $dbname,
    "user" => $username,
    "tables" => []
];

$result = $conn->query("SHOW TABLES");
if ($result) {
    while ($row = $result->fetch_array()) {
        $res["tables"][] = $row[0];
    }
} else {
    $res["connection"] = "Error: " . $conn->error;
}

echo json_encode($res);
?>
