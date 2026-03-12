<?php
// --- MySQL Database Configuration ---

// Grabs the database server address (like a Railway internal URL) from the secure environment variables and assigns it to $mysql_host.
$mysql_host = getenv('MYSQL_HOST');

// Retrieves the database username from the environment variables so it isn't publicly exposed in the code.
$mysql_user = getenv('MYSQL_USER');

// Securely fetches the database password from the environment variables and stores it in $mysql_password.
$mysql_password = getenv('MYSQL_PASSWORD');

// Gets the specific name of the database you want to connect to from the environment variables.
$mysql_database = getenv('MYSQL_DATABASE');


// --- PostgreSQL Database Configuration ---
// (The logic here is exactly the same as above, just for a PostgreSQL database instead of MySQL)

// Grabs the PostgreSQL server address (hostname) from the environment variables.
$postgres_host = getenv('POSTGRES_HOST');

// Retrieves the PostgreSQL username from the environment variables.
$postgres_user = getenv('POSTGRES_USER');

// Securely fetches the PostgreSQL database password from the environment variables.
$postgres_password = getenv('POSTGRES_PASSWORD');

// Gets the specific name of the PostgreSQL database to connect to.
$postgres_database = getenv('POSTGRES_DATABASE');
?>
