USE book_catalog;

CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_no VARCHAR(50) NOT NULL,
    book_id INT NOT NULL,
    reserve_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATE NOT NULL,
    quantity INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active',
    FOREIGN KEY (id_no) REFERENCES users(id_no) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
