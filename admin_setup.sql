-- RUN THIS IN PHPMYADMIN (SQL Tab)
-- This adds the 'role' column to your users table

USE book_catalog;

ALTER TABLE users 
ADD COLUMN role VARCHAR(20) DEFAULT 'user' AFTER password;

-- To make yourself an admin, run this replacing 'YOUR_ID' with your ID no
-- UPDATE users SET role = 'admin' WHERE id_no = 'YOUR_ID';
