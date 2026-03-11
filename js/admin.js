/**
 * admin.js
 * Handles Admin Dashboard logic
 */

document.addEventListener("DOMContentLoaded", () => {
    loadUsers();
    loadBooks();
});

function showTab(tabId) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

async function loadUsers() {
    try {
        const response = await fetch('api.php?action=get_users');
        const rawText = await response.text();
        let result;
        try {
            result = JSON.parse(rawText);
        } catch (e) {
            console.error("Server error raw:", rawText);
            alert("Database Error! Did you add the 'role' column? See console.");
            return;
        }

        if (result.success) {
            const tbody = document.querySelector('#users-table tbody');
            tbody.innerHTML = '';
            result.users.forEach(u => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${u.id_no}</td>
                    <td>${u.full_name}</td>
                    <td>${u.email}</td>
                    <td>${u.role}</td>
                <td class="text-center"><button class="btn-premium-action btn-delete" onclick="deleteUser(${u.id})">Remove</button></td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            alert("Error: " + result.error);
        }
    } catch (err) {
        alert("Connection failed: " + err.message);
    }
}

/**
 * Function: deleteUser
 * Purpose: Tells the server to remove a user from the database.
 */
async function deleteUser(id) {
    if (!confirm('Are you sure you want to remove this user?')) return;
    try {
        const response = await fetch('api.php?action=delete_user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `id=${id}`
        });
        const result = await response.json();
        if (result.success) {
            loadUsers(); // Refresh the list after deleting
        }
    } catch (err) {
        console.error("Delete failed:", err);
    }
}

/**
 * Function: loadBooks
 * Purpose: Gets the list of all books from the server and shows them in the table.
 */
async function loadBooks() {
    try {
        const response = await fetch('api.php?action=load');
        const rawText = await response.text();
        let result;
        try {
            result = JSON.parse(rawText);
        } catch (e) {
            console.error("Server error raw (loadBooks):", rawText);
            document.querySelector('#books-table tbody').innerHTML = '<tr><td colspan="5">Error loading books. Check console.</td></tr>';
            return;
        }

        if (result.success) {
            const tbody = document.querySelector('#books-table tbody');
            tbody.innerHTML = ''; // Clear table
            
            if (result.books && result.books.length > 0) {
                // Add each book as a row in the table
                result.books.forEach(b => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${b.id}</td>
                        <td>${b.title}</td>
                        <td>${b.author}</td>
                        <td>${b.stock}</td>
                        <td class="text-center">
                            <button class="btn-premium-action btn-delete" onclick="deleteBook(${b.id})">Delete</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="5">No books found in database.</td></tr>';
            }
        }
    } catch (err) {
        console.error("Connection failed:", err);
    }
}

function toggleBookForm() {
    const form = document.getElementById('add-book-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function addBook() {
    const book = {
        title: document.getElementById('book-title').value,
        author: document.getElementById('book-author').value,
        genre: document.getElementById('book-genre').value,
        stock: parseInt(document.getElementById('book-stock').value),
        image: document.getElementById('book-image').value || 'img/default.jpg',
        summary: document.getElementById('book-summary').value
    };

    try {
        const response = await fetch('api.php?action=add_book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(book)
        });

        const rawText = await response.text();
        let result;
        try {
            result = JSON.parse(rawText);
        } catch (e) {
            console.error("Server error raw:", rawText);
            alert("Database Error! Have you run setup_books.sql in phpMyAdmin?");
            return;
        }

        if (result.success) {
            alert("Book added successfully!");
            toggleBookForm();
            loadBooks();
        } else {
            alert("Error: " + result.error);
        }
    } catch (err) {
        alert("Connection failed: " + err.message);
    }
}

async function deleteBook(id) {
    if (!confirm('Delete this book?')) return;
    try {
        const response = await fetch(`api.php?action=delete_book&id=${id}`);
        const rawText = await response.text();
        let result;
        try {
            result = JSON.parse(rawText);
        } catch (e) {
            console.error("Server error raw (deleteBook):", rawText);
            alert("Delete failed! Server returned an invalid response.");
            return;
        }

        if (result.success) {
            loadBooks();
        } else {
            alert("Error: " + result.error);
        }
    } catch (err) {
        alert("Connection failed: " + err.message);
    }
}
