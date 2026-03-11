-- TOTAL FIX FOR BOOKS TABLE
-- Run this in phpMyAdmin SQL tab

USE book_catalog;

-- 1. Remove the broken version
DROP TABLE IF EXISTS books;

-- 2. Create the correct version
CREATE TABLE books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(100) NOT NULL,
    genre VARCHAR(100),
    stock INT DEFAULT 0,
    image VARCHAR(255),
    summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Insert the starting books
INSERT INTO books (id, title, author, genre, stock, image, summary) VALUES
(1, 'Harry Potter and the Philosopher\'s Stone', 'J.K. Rowling', 'Fantasy', 3, 'img/harrypotter.jpg', 'On his eleventh birthday, orphan Harry Potter discovers he is a wizard.'),
(2, 'MEIN KAMPF', 'Adolf Hitler', 'Biography, History', 0, 'img/adolfhitler.jpg', 'Written during Hitler\'s imprisonment in 1924, this autobiographical manifesto outlines his political ideology.'),
(3, 'The Lord Of The Rings', 'J.R.R. Tolkien', 'Fantasy', 1, 'img/LOTR.jpg', 'In the ancient land of Middle-earth, a modest hobbit named Frodo Baggins inherits the One Ring.'),
(4, 'Babylon', 'Paul Kriwaczek', 'History', 5, 'img/babylon.jpg', 'Long before Rome or Athens, Babylon rose as humanity\'s first great metropolis.'),
(5, 'The Tesla Coil', 'Nikola Tesla', 'Non-fiction', 5, 'img/Tesla.png', 'Tesla illuminates the principles of resonant transformer circuits.');
