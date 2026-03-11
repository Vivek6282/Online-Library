// This script handles all the "Brain" work for the library page.
// It loads books from the server, filters them, and handles reservations.

// These are keys we use to save small bits of data (like your reservations) in your browser.
const STORAGE_KEY = 'library_books_v1';
const RESERVED_KEY = 'library_reserved_v1';
const RESERVATIONS_KEY = 'library_reservations_v1';

/**
 * Function: loadFromStorage
 * Purpose: When you open the page, this looks for any saved reservations in your browser.
 */
function loadFromStorage() {
    try {
        const rawRes = localStorage.getItem(RESERVATIONS_KEY);
        reservations = rawRes ? JSON.parse(rawRes) : [];
        
        const rawCount = localStorage.getItem(RESERVED_KEY);
        reservedCount = rawCount ? Number(rawCount) : 0;

        // MIGRATION: If you had books saved in an old version, this sends them to the server.
        const localBooks = localStorage.getItem(STORAGE_KEY);
        if (localBooks) {
            const parsed = JSON.parse(localBooks);
            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                const xhr = new XMLHttpRequest();
                xhr.open("POST", "api.php?action=save", false); 
                xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                xhr.send(JSON.stringify({
                    books: parsed,
                    reservations: reservations,
                    reservedCount: reservedCount
                }));
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    } catch (e) {
        console.warn("Could not load saved data", e);
        reservations = [];
        reservedCount = 0;
    }

    // After checking local data, we go get the latest books from the server
    fetchLibraryData();
}

/**
 * Function: fetchLibraryData
 * Purpose: Asks the server (api.php) for the list of books based on your search or filters.
 */
function fetchLibraryData() {
    const searchInput = document.getElementById('searchInput');
    const genreSelect = document.getElementById('genreSelect');
    const keyword = searchInput ? searchInput.value.trim() : '';
    const selectedGenre = genreSelect ? genreSelect.value : 'All';

    // We build a list of instructions for the server (What page? What genre? What keyword?)
    const params = new URLSearchParams({
        action: 'load',
        page: currentPage,
        limit: booksPerPage,
        q: keyword,
        genre: selectedGenre
    });

    // We use AJAX (XMLHttpRequest) to talk to the server without refreshing the page.
    const xhr = new XMLHttpRequest();
    xhr.open("GET", `api.php?${params.toString()}`, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const serverData = JSON.parse(xhr.responseText);
                    if (serverData.books && Array.isArray(serverData.books)) {
                        // We update our local list of books with what the server sent back
                        filteredBooks = serverData.books;
                        totalBooks = serverData.totalBooks || 0;
                        reservations = serverData.reservations || [];
                        reservedCount = serverData.reservedCount || 0;

                        // Now we redraw the page with the new info
                        displayBooks();
                        updateStats();
                        renderReservations();
                        renderCartPanel();
                    }
                } catch (error) {
                    console.warn("Error reading server data", error);
                }
            }
        }
    };
    xhr.send();
}

/**
 * Function: saveToStorage
 * Purpose: Saves your current reservations to your browser's memory.
 */
function saveToStorage() {
    try {
        localStorage.setItem(RESERVED_KEY, String(reservedCount));
        localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(reservations));
    } catch (e) {
        console.warn('Could not save to browser memory', e);
    }

    // We also tell the server about your changes
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "api.php?action=save", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify({
        books: filteredBooks,
        reservations: reservations,
        reservedCount: reservedCount
    }));
}

// These are the genres available in our archive
const genres = [
    "Biography", "Fantasy", "Geography", "History", 
    "Language", "Music", "Non-fiction", "Survival fiction"
];

// Global variables to keep track of the current state
let filteredBooks = [];
let totalBooks = 0;
let currentPage = 1;
let booksPerPage = 6;
let reservedCount = 0;
let reservations = []; 
let pendingReserveId = null;

/**
 * Function: populateGenreSelect
 * Purpose: Puts the list of genres into the dropdown menu so you can pick one.
 */
function populateGenreSelect() {
    const select = document.getElementById('genreSelect');
    if (!select) return;

    select.innerHTML = '<option value="All">All Genres</option>' +
        genres.map(g => `<option value="${g}">${g}</option>`).join('');

    // When you change the genre, the list of books updates automatically
    select.addEventListener('change', applyFilters);
}

// Initialize the page (load all data and setup the dropdown)
loadFromStorage();
populateGenreSelect();
updateStats();
applyFilters();
renderReservations();
renderCartPanel();

// --- THE ENTRANCE REVEAL ---
/**
 * Function: triggerEntranceMotion
 * Purpose: Makes the library page appear smoothly when you first open it.
 */
function triggerEntranceMotion() {
    const body = document.querySelector('.library-body');
    const reveals = document.querySelectorAll('.reveal-item');

    if (body) {
        // We tell the browser to slide the dark shutter up
        void body.offsetWidth; 
        body.classList.add('is-ready'); 
    }

    // We make each part of the page (search bar, header, books) fade in one by one
    reveals.forEach((el, index) => {
        setTimeout(() => {
            el.classList.add('is-visible'); 
        }, 300 + (index * 80)); 
    });
}

// When the page finishes loading, we start the animations and check if you are logged in
document.addEventListener('DOMContentLoaded', () => {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            triggerEntranceMotion();
            updateAuthUI();
        });
    });
});

/**
 * Function: updateAuthUI
 * Purpose: Looks at your login status and adds buttons like "Admin Dashboard" if you are an admin.
 */
function updateAuthUI() {
    const authBtn = document.getElementById('authBtn');
    if (!authBtn) return;

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName') || 'Member';

    if (isLoggedIn) {
        // If logged in, show "Logout"
        authBtn.innerText = 'Logout';
        authBtn.onclick = logout;

        // If you are an admin, we add a special "Admin Dashboard" button
        if (userRole === 'admin') {
            let adminBtn = document.getElementById('adminDashBtn');
            if (!adminBtn) {
                adminBtn = document.createElement('button');
                adminBtn.id = 'adminDashBtn';
                adminBtn.className = 'btn btn-archival-logout me-2';
                adminBtn.style.borderColor = '#c5a059';
                adminBtn.style.color = '#c5a059';
                adminBtn.innerText = 'Admin Dashboard';
                adminBtn.onclick = () => window.location.href = 'admin.html';
                authBtn.parentNode.insertBefore(adminBtn, authBtn);
            }
        }
        
        // Show a "Welcome" message with your name
        const totalBooksSpan = document.getElementById('totalBooks');
        if (totalBooksSpan && !totalBooksSpan.dataset.greetingSet) {
            const greeting = document.createElement('span');
            greeting.style.color = '#c5a059';
            greeting.style.marginRight = '15px';
            greeting.style.fontFamily = "'Cinzel', serif";
            greeting.innerText = `Welcome, ${userName}`;
            totalBooksSpan.parentNode.insertBefore(greeting, totalBooksSpan);
            totalBooksSpan.dataset.greetingSet = "true";
        }
    } else {
        // If not logged in, show "Login"
        authBtn.innerText = 'Login';
        authBtn.onclick = () => window.location.href = 'login.html';
    }
}

/**
 * Function: logout
 * Purpose: Clears all your saved browser data and takes you to the login page.
 */
function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// These blocks connect the "Pop-up" boxes in the HTML to the JavaScript logic
const reserveModalEl = document.getElementById('reserveModal');
const confirmModalEl = document.getElementById('confirmModal');
const cartPanelEl = document.getElementById('cartPanel');
let bootstrapReserveModal = null;
let bootstrapConfirmModal = null;
let bootstrapCartOffcanvas = null;

if (window.bootstrap) {
    try {
        if (reserveModalEl) bootstrapReserveModal = new bootstrap.Modal(reserveModalEl);
        if (confirmModalEl) bootstrapConfirmModal = new bootstrap.Modal(confirmModalEl);
        if (cartPanelEl) bootstrapCartOffcanvas = new bootstrap.Offcanvas(cartPanelEl);
    } catch (e) { /* ignore */ }
}

// Searches for books as you type in the search bar
document.addEventListener("keyup", function (e) {
    if (e.target.id === "searchInput") {
        applyFilters();
    }
});

// --- SEARCH SUGGESTIONS (Autocomplete) ---
let suggestionIndex = -1;
const MAX_SUGGESTIONS = 8;

/**
 * Function: getSuggestions
 * Purpose: Asks the server for book names that match what you are typing.
 */
function getSuggestions(keyword) {
    if (!keyword) return [];
    const kw = keyword.toLowerCase();
    const xhr = new XMLHttpRequest();
    xhr.open("GET", `api.php?action=load&q=${encodeURIComponent(kw)}&limit=${MAX_SUGGESTIONS}`, false); 
    xhr.send();
    if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        return data.books || [];
    }
    return [];
}

/**
 * Function: updateSuggestions
 * Purpose: Shows a list of book names under the search bar as you type.
 */
function updateSuggestions() {
    const input = document.getElementById('searchInput');
    const list = document.getElementById('suggestions');
    if (!input || !list) return;

    const keyword = input.value.trim();
    const matches = getSuggestions(keyword);

    list.innerHTML = '';
    suggestionIndex = -1;

    if (!keyword) {
        list.hidden = true;
        return;
    }

    if (matches.length === 0) {
        const li = document.createElement('li');
        li.className = 'no-result';
        li.innerText = 'No records found';
        list.appendChild(li);
        list.hidden = false;
        return;
    }

    // Add each matching book to the suggestion list
    matches.forEach((b, idx) => {
        const li = document.createElement('li');
        li.innerText = `${b.title} — ${b.author}`;
        li.addEventListener('mousedown', (ev) => {
            ev.preventDefault();
            selectSuggestion(idx);
        });
        list.appendChild(li);
    });

    list.hidden = false;
}

/**
 * Function: selectSuggestion
 * Purpose: When you click a suggestion, it fills the search bar for you.
 */
function selectSuggestion(idx) {
    const list = document.getElementById('suggestions');
    if (!list) return;
    const item = list.children[idx];
    if (!item) return;

    const input = document.getElementById('searchInput');
    input.value = item.innerText.split(' — ')[0];
    applyFilters();
    list.hidden = true;
}

// Handles pressing Enter or Up/Down arrows in the search suggestions
document.addEventListener('keydown', (e) => {
    const input = document.getElementById('searchInput');
    const list = document.getElementById('suggestions');
    if (!input || !list || list.hidden) return;

    const items = Array.from(list.querySelectorAll('li'));
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        suggestionIndex = Math.min(suggestionIndex + 1, items.length - 1);
        items.forEach((it, i) => it.setAttribute('aria-selected', i === suggestionIndex ? 'true' : 'false'));
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        suggestionIndex = Math.max(suggestionIndex - 1, 0);
        items.forEach((it, i) => it.setAttribute('aria-selected', i === suggestionIndex ? 'true' : 'false'));
    } else if (e.key === 'Enter') {
        if (suggestionIndex >= 0) {
            e.preventDefault();
            selectSuggestion(suggestionIndex);
        }
    } else if (e.key === 'Escape') {
        list.hidden = true;
    }
});

// Connect the search bar events to our functions
const searchInputEl = document.getElementById('searchInput');
if (searchInputEl) {
    searchInputEl.addEventListener('input', () => {
        updateSuggestions();
        applyFilters();
    });
    searchInputEl.addEventListener('blur', () => {
        setTimeout(() => { if (document.getElementById('suggestions')) document.getElementById('suggestions').hidden = true; }, 150);
    });
    searchInputEl.addEventListener('focus', updateSuggestions);
}

// Connect most of the buttons to their actions
const confirmBtn = document.getElementById('confirmReserve');
if (confirmBtn) confirmBtn.addEventListener('click', confirmReserveHandler);

const cancelReserveBtn = document.getElementById('cancelReserve');
if (cancelReserveBtn) cancelReserveBtn.addEventListener('click', cancelReserveHandler);

const cartBtn = document.getElementById('cartBtn');
if (cartBtn) {
    cartBtn.addEventListener('click', () => {
        if (bootstrapCartOffcanvas) bootstrapCartOffcanvas.show();
        renderCartPanel();
    });
}

const closeCart = document.getElementById('closeCart');
if (closeCart) {
    closeCart.addEventListener('click', () => {
        if (bootstrapCartOffcanvas) bootstrapCartOffcanvas.hide();
    });
}

/**
 * Function: showConfirm
 * Purpose: Shows a "Are you sure?" message before doing something important.
 */
function showConfirm(message, onYes, onNo) {
    const msg = document.getElementById('confirmMessage');
    const yes = document.getElementById('confirmYes');
    const no = document.getElementById('confirmNo');

    if (!msg || !yes || !no) {
        if (window.confirm(message)) onYes();
        else if (onNo) onNo();
        return;
    }

    msg.innerText = message;
    const newYes = yes.cloneNode(true);
    const newNo = no.cloneNode(true);
    yes.parentNode.replaceChild(newYes, yes);
    no.parentNode.replaceChild(newNo, no);

    newYes.addEventListener('click', () => {
        if (bootstrapConfirmModal) bootstrapConfirmModal.hide();
        if (onYes) onYes();
    });

    newNo.addEventListener('click', () => {
        if (bootstrapConfirmModal) bootstrapConfirmModal.hide();
        if (onNo) onNo();
    });

    if (bootstrapConfirmModal) bootstrapConfirmModal.show();
}
/**
 * Function: displayBooks
 * Purpose: Takes the list of books from the server and creates the HTML code to show them on the screen.
 */
function displayBooks() {
    const container = document.getElementById("bookContainer");
    if (!container) return;

    container.innerHTML = ""; // Clear the grid before adding new books

    // If no books match your search, show a message
    if (!filteredBooks || filteredBooks.length === 0) {
        container.innerHTML = '<div class="col-12 text-center my-5 reveal-item is-visible"><h3 style="color: #c5a059;">No result found.</h3></div>';
        createPagination();
        return;
    }

    // Loop through each book and create a "Card" (image + title + button)
    filteredBooks.forEach(book => {
        const col = document.createElement('div');
        col.className = 'col reveal-item';

        const card = document.createElement('div');
        card.className = 'card h-100';

        // Set up the book image container
        const imgContainer = document.createElement('div');
        imgContainer.style.cssText = 'height: 240px; background: #12100e; overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: pointer;';

        const img = document.createElement('img');
        img.className = 'card-img-top w-100 h-100';
        img.style.objectFit = 'contain';
        img.style.padding = '10px';
        img.src = book.image || 'img/placeholder.jpg';
        // When you click the image, it shows the summary popup
        img.addEventListener('click', () => showBookInfo(book));

        imgContainer.appendChild(img);

        const body = document.createElement('div');
        body.className = 'card-body d-flex flex-column';

        const title = document.createElement('h5');
        title.className = 'card-title';
        title.innerText = book.title;

        const author = document.createElement('p');
        author.className = 'card-text text-muted mb-2';
        author.innerText = book.author;

        // Stock levels: Green for available, Yellow for low, Red for none
        const stock = document.createElement('p');
        stock.className = 'mb-3';
        if (book.stock === 0) {
            stock.innerHTML = '<span class="badge bg-secondary">Unavailable</span>';
        } else if (book.stock <= 2) {
            stock.innerHTML = `<span class="badge bg-warning text-dark">Low Stock: ${book.stock}</span>`;
        } else {
            stock.innerHTML = `<span class="badge bg-success">Available: ${book.stock}</span>`;
        }

        const footer = document.createElement('div');
        footer.className = 'mt-auto';

        const btn = document.createElement('button');
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

        // Only logged-in members can see the "Acquire Tome" button
        if (isLoggedIn) {
            btn.className = 'btn btn-primary w-100';
            btn.innerText = 'Acquire Tome';
            if (book.stock === 0) btn.disabled = true;
            btn.addEventListener('click', () => reserveBook(book.id));
        } else {
            btn.className = 'btn btn-outline-secondary w-100';
            btn.innerText = 'Member Benefit';
            btn.addEventListener('click', () => {
                showToast('Please login to reserve books.', 'info');
                setTimeout(() => window.location.href = 'login.html', 1200);
            });
        }

        body.appendChild(title);
        body.appendChild(author);
        body.appendChild(stock);
        footer.appendChild(btn);
        body.appendChild(footer);
        card.appendChild(imgContainer);
        card.appendChild(body);
        col.appendChild(card);
        container.appendChild(col);

        // Make the book appear slowly for a nice effect
        setTimeout(() => col.classList.add('is-visible'), 50);
    });

    createPagination();
}

/**
 * Function: showBookInfo
 * Purpose: Opens the summary popup when you click a book's cover.
 */
function showBookInfo(book) {
    const modal = document.getElementById('bookInfoModal');
    if (!modal) return;

    document.getElementById('infoBookImg').src = book.image || '';
    document.getElementById('infoBookTitle').innerText = book.title;
    document.getElementById('infoBookAuthor').innerText = book.author;
    document.getElementById('infoBookGenre').innerText = book.genre || '';
    document.getElementById('infoBookSummary').innerText = book.summary || 'No summary available.';

    if (window.bootstrap) {
        bootstrap.Modal.getOrCreateInstance(modal).show();
    }
}

/**
 * Function: reserveBook
 * Purpose: Handles the process of borrowing a book for a few days.
 */
function reserveBook(id) {
    const book = filteredBooks.find(b => b.id === id);
    if (!book || book.stock <= 0) return;

    pendingReserveId = id;
    const modal = document.getElementById('reserveModal');
    const daysSel = document.getElementById('reserveDays');

    document.getElementById('reserveBookName').innerText = `Reserve "${book.title}" (Max 15 days):`;

    // We let you pick between 1 and 15 days
    daysSel.innerHTML = Array.from({ length: 15 }, (_, i) => `<option value="${i + 1}">${i + 1} day${i + 1 > 1 ? 's' : ''}</option>`).join('');
    daysSel.value = '7';

    if (bootstrapReserveModal) bootstrapReserveModal.show();
}

function hideReserveModal() {
    const modal = document.getElementById('reserveModal');
    if (bootstrapReserveModal) {
        try { bootstrapReserveModal.hide(); } catch (e) { /* ignore */ }
    } else if (modal) {
        modal.classList.remove('open');
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
    }
    pendingReserveId = null;
}

/**
 * Function: doConfirmReserve
 * Purpose: Saves your reservation after you pick the number of days.
 */
function doConfirmReserve(days) {
    const book = filteredBooks.find(b => b.id === pendingReserveId);
    if (!book) return;

    // Check if you already have this book reserved
    if (reservations.find(r => r.id === book.id)) {
        showToast('You already have this book reserved.', 'info');
        if (bootstrapReserveModal) bootstrapReserveModal.hide();
        return;
    }

    // Save the reservation with the date you need to return it
    const due = new Date();
    due.setDate(due.getDate() + parseInt(days));
    reservations.push({ id: book.id, title: book.title, days: days, dueDate: due.toISOString().split('T')[0], qty: 1 });

    // Decrease the stock count and save to browser memory
    if (book.stock > 0) book.stock--;
    reservedCount++;

    saveToStorage();
    displayBooks(); // Refresh the list
    updateStats();
    renderCartPanel();
    if (bootstrapReserveModal) bootstrapReserveModal.hide();
}

function confirmReserveHandler() {
    const days = document.getElementById('reserveDays').value;
    doConfirmReserve(days);
}

function cancelReserveHandler() {
    if (bootstrapReserveModal) bootstrapReserveModal.hide();
}

// Render current reservations list
function renderReservations() {
    // This part is handled by the Cart Panel (Offcanvas)
}

/**
 * Function: renderCartPanel
 * Purpose: Shows all the books you have in your cart.
 */
function renderCartPanel() {
    const listEl = document.getElementById('cartList');
    const countEl = document.getElementById('cartCount');

    if (countEl) countEl.innerText = String(reservedCount);
    if (!listEl) return;

    listEl.innerHTML = '';
    if (reservations.length === 0) {
        listEl.innerText = 'Your cart is empty.';
        return;
    }

    // List each book in your cart with its return date
    reservations.forEach(r => {
        const item = document.createElement('div');
        item.className = 'cart-item mb-3 p-2 border-bottom';
        item.style.color = '#f5e6d3';
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${r.title}</strong><br>
                    <small>Returns on: ${r.dueDate}</small>
                </div>
                <button class="btn btn-sm btn-outline-danger" onclick="cancelReservation(${r.id})">Remove</button>
            </div>
        `;
        listEl.appendChild(item);
    });
}

// Increase or decrease reservation quantity
function changeReservationQty(bookId, delta) {
    const idx = reservations.findIndex(r => r.id === bookId);
    if (idx === -1) return;
    const res = reservations[idx];
    const bookIndex = filteredBooks.findIndex(b => b.id === bookId);
    if (delta > 0) {
        // increase: ensure stock available
        if (bookIndex === -1 || filteredBooks[bookIndex].stock <= 0) {
            showToast('No more copies available to reserve.', 'error');
            return;
        }
        res.qty = (res.qty || 1) + 1;
        filteredBooks[bookIndex].stock--;
        reservedCount++;
    } else {
        // decrease
        res.qty = (res.qty || 1) - 1;
        // restore stock
        if (bookIndex !== -1) filteredBooks[bookIndex].stock = (filteredBooks[bookIndex].stock || 0) + 1;
        reservedCount = Math.max(0, reservedCount - 1);
        if (res.qty <= 0) {
            // remove reservation
            reservations.splice(idx, 1);
        }
    }

    saveToStorage();
    applyFilters();
    updateStats();
    renderReservations();
    renderCartPanel();
}

// Toast helper
function showToast(message, type = 'info', timeout = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerText = message;
    container.appendChild(el);
    // force reflow then show
    void el.offsetHeight;
    el.classList.add('show');
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => container.removeChild(el), 300);
    }, timeout);
}

// Cancel a reservation by book id: remove reservation and restore stock & counters
function cancelReservation(bookId) {
    const idx = reservations.findIndex(r => r.id === bookId);
    if (idx === -1) return;
    const res = reservations[idx];
    // ask for confirmation before cancelling (use in-page modal)
    showConfirm(`Cancel reservation for "${res.title}" due ${res.dueDate}?`, function () {
        // yes: restore stock for the book (restore qty)
        const bookIndex = filteredBooks.findIndex(b => b.id === res.id);
        if (bookIndex !== -1) {
            filteredBooks[bookIndex].stock = (filteredBooks[bookIndex].stock || 0) + (res.qty || 1);
        }

        // remove reservation
        reservations.splice(idx, 1);
        reservedCount = Math.max(0, reservedCount - (res.qty || 1));

        saveToStorage();
        applyFilters();
        updateStats();
        renderReservations();
        renderCartPanel();
    }, function () {
        // no: do nothing
    });
}

function createPagination() {
    const pagination = document.getElementById("pagination");
    if (!pagination) return;

    pagination.innerHTML = "";
    const totalPages = Math.ceil(totalBooks / booksPerPage);
    if (totalPages <= 1) return;

    const ul = document.createElement('ul');
    ul.className = 'pagination justify-content-center';

    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = 'page-item' + (i === currentPage ? ' active' : '');
        const a = document.createElement('button');
        a.className = 'page-link';
        a.type = 'button';
        a.innerText = i;
        a.addEventListener('click', () => {
            if (currentPage === i) return;

            const container = document.getElementById("bookContainer");
            if (container) {
                // Trigger the Rolling Pillar animation
                container.classList.remove('rolling-pillar');
                void container.offsetWidth; // Trigger reflow
                container.classList.add('rolling-pillar');

                // Update content at the "mid-point" of the roll (approx 400ms)
                setTimeout(() => {
                    currentPage = i;
                    fetchLibraryData();
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                }, 400);

                // Clean up class after animation
                setTimeout(() => {
                    container.classList.remove('rolling-pillar');
                }, 800);
            } else {
                currentPage = i;
                fetchLibraryData();
                window.scrollTo({ top: 300, behavior: 'smooth' });
            }
        });
        li.appendChild(a);
        ul.appendChild(li);
    }

    pagination.appendChild(ul);
}

function updateStats() {
    const total = document.getElementById("totalBooks");
    const reserved = document.getElementById("reservedCount");

    if (total) total.innerText = `Total Books: ${totalBooks}`;
    if (reserved) reserved.innerText = `Reserved: ${reservedCount}`;
}

// Apply both search keyword and genre filters
function applyFilters() {
    currentPage = 1; // reset paging
    fetchLibraryData();
}
// --- AUTHENTICATION INTEGRATION ---

function checkAuthStatus() {
    const authBtn = document.getElementById('authBtn');
    const cartBtn = document.getElementById('cartBtn');
    const reservedStat = document.getElementById('reservedCount');
    if (!authBtn) return;

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    // Remove all previous custom classes so we don't stack them
    authBtn.classList.remove('btn-logout', 'btn-outline-primary', 'btn-outline-danger');

    if (isLoggedIn) {
        authBtn.innerText = 'Logout';
        authBtn.classList.add('btn-logout');
        if (cartBtn) cartBtn.style.display = 'flex';
        if (reservedStat) reservedStat.style.display = 'inline-block';
    } else {
        authBtn.innerText = 'Login';
        if (cartBtn) cartBtn.style.display = 'none';
        if (reservedStat) reservedStat.style.display = 'none';
        // Keeps the default gold look from #authBtn style
    }
}

function handleAuthAction() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    if (isLoggedIn) {
        // AJAX CONVERSION: Notify the backend server to securely invalidate the user's session
        const xhr = new XMLHttpRequest();
        // FIX: Point to the centralized PHP backend
        xhr.open("POST", "api.php?action=logout", true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        // FIX: Handle response
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status !== 200) {
                console.warn("AJAX Logout Notification Failed: Status " + xhr.status);
            }
        };
        // A minimal payload tracking who logged out could go here
        xhr.send(JSON.stringify({ action: 'logout' }));

        // Logout Process
        localStorage.removeItem('isLoggedIn');

        // --- VISUAL MOTION: LOGOUT NOTIFICATION ---
        const card = document.createElement('div');
        card.className = 'logout-notification-card';
        card.innerHTML = `
            <div class="logout-notification-header">
                <span class="icon">📜</span>
                <h4>Session Terminated</h4>
            </div>
            <div class="logout-notification-body">
                You have been successfully logged out of The Grand Archive. Your artifacts and tattered scrolls are now secure.
            </div>
            <div class="logout-notification-footer">
                Click to dismiss
            </div>
        `;
        document.body.appendChild(card);

        // Trigger animation
        setTimeout(() => card.classList.add('show'), 50);

        const dismiss = () => {
            card.classList.add('fade-out');
            setTimeout(() => {
                if (card.parentNode) card.parentNode.removeChild(card);
            }, 500);
        };

        // Interaction: Click to dismiss
        card.addEventListener('click', dismiss);

        // Auto-dismiss after 6 seconds
        setTimeout(dismiss, 6000);

        // Update UI state without hard reload for smoother feel
        checkAuthStatus();
        updateStats();
        applyFilters();
    } else {
        window.location.href = 'login.html';
    }
}

/**
 * --- VISUAL MOTION: SCROLL REVEAL ---
 * Uses IntersectionObserver to trigger 'visible' class on elements
 * tagged with 'reveal'. 
 */
function initScrollReveal() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Initial tagging: We'll tag book cards as they are rendered in displayBooks()
}

// Modify displayBooks to include reveal classes
const originalDisplayBooks = displayBooks;
displayBooks = function () {
    originalDisplayBooks();

    // Tag all newly created col elements for reveal
    const cards = document.querySelectorAll('#bookContainer .col');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    cards.forEach(card => {
        card.classList.add('reveal');
        observer.observe(card);
    });
};

// Initialize Auth and Motion
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    const authBtn = document.getElementById('authBtn');
    if (authBtn) {
        authBtn.addEventListener('click', handleAuthAction);
    }

    // Smooth scroll for anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            // Hide suggestions list when an anchor is clicked
            const suggestionsList = document.querySelector('.suggestions-list-archival');
            if (suggestionsList) {
                suggestionsList.hidden = true;
            }
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // --- INTERACTIVE BACKGROUND MOTION ---
    const collage = document.getElementById('interactiveCollage');
    if (collage) {
        document.addEventListener('mousemove', (e) => {
            const x = (window.innerWidth / 2 - e.pageX) / 45;
            const y = (window.innerHeight / 2 - e.pageY) / 45;

            // Move opposite to mouse for depth effect
            collage.style.transform = `translateX(${x}px) translateY(${y}px) scale(1.05)`;
        });
    }

    createDustMotes();
});


// --- ATMOSPHERE: DUST MOTES ---
function createDustMotes() {
    const container = document.getElementById('dustMotes');
    if (!container) return;

    for (let i = 0; i < 40; i++) {
        const mote = document.createElement('div');
        mote.className = 'mote';
        const size = Math.random() * 3 + 1;
        mote.style.width = size + 'px';
        mote.style.height = size + 'px';
        mote.style.left = (Math.random() * 100) + '%';
        mote.style.top = (Math.random() * 100) + '%';
        mote.style.animationDelay = (Math.random() * 10) + 's';
        mote.style.opacity = (Math.random() * 0.2 + 0.05);
        container.appendChild(mote);
    }
}
