let books = [
    {
        "id": 1,
        "title": "Harry Potter and the Philosopher's Stone",
        "author": "J.K. Rowling",
        "stock": 3,
        "image": "img/harrypotter.jpg",
        "genre": "Fantasy"
    },
    {
        "id": 2,
        "title": "MEIN KAMPF",
        "author": "Adolf Hitler",
        "stock": 1,
        "image": "img/adolfhitler.jpg",
        "genre": "History"
    },
    {
        "id": 3,
        "title": "The Lord Of The Rings",
        "author": " J.R.R. Tolkien",
        "stock":1,
        "image": "img/LOTR.jpg",
        "genre": "Fantasy"
    },
    {
        "id": 4,
        "title": "Babylon",
        "author": "Paul Kriwaczek",
        "stock": 5,
        "image": "img/babylon.jpg",
        "genre": "History"
    },

    {
        "id": 5,
        "title": "The Tesla Coil",
        "author": "Nikola Tesla",
        "stock": 5,
        "image": "img/Tesla.png",
        "genre": "Non-fiction" 
    }
];

// Supported genres (will populate the dropdown)
const defaultBooks = [...books]; // Store default books for fallback
const STORAGE_KEY = 'library_books_v1';
const RESERVED_KEY = 'library_reserved_v1';
const RESERVATIONS_KEY = 'library_reservations_v1';

function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            books = JSON.parse(raw);
        } else {
            books = defaultBooks.slice();
        }
    } catch (e) {
        books = defaultBooks.slice();
    }

    // Normalize numeric stock values coming from storage
    try {
        books.forEach(b => { b.stock = Number(b.stock) || 0; });
    } catch (e) {
        // if something odd happened, ensure we at least have the defaults
        books = defaultBooks.slice();
        books.forEach(b => { b.stock = Number(b.stock) || 0; });
    }

    // Load reservations so we can safely reconcile stored book stock with defaults
    try {
        const rawRes = localStorage.getItem(RESERVATIONS_KEY);
        reservations = rawRes ? JSON.parse(rawRes) : [];
    } catch (e) {
        reservations = [];
    }

    // Reconcile stored books against `defaultBooks` to recover from stale
    // localStorage values. If a default has more stock than the stored value
    // and there are no reservations for that book, restore the default stock.
    try {
        defaultBooks.forEach(def => {
            const stored = books.find(b => b.id === def.id);
            const hasReservation = reservations.some(r => r.id === def.id);
            if (stored && !hasReservation && (Number(stored.stock) < Number(def.stock))) {
                stored.stock = Number(def.stock) || 0;
            }
        });
    } catch (e) {
        // ignore reconciliation errors; we don't want to block page load
    }

    // Derive reservedCount strictly from the reservations array (sum of qty).
    reservedCount = Array.isArray(reservations) && reservations.length > 0
        ? reservations.reduce((sum, r) => sum + (r.qty || 1), 0)
        : 0;
}

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
        localStorage.setItem(RESERVED_KEY, String(reservedCount));
        localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(reservations));
    } catch (e) {
        console.warn('Could not save to localStorage', e);
    }
}

const genres = [
    "Fantasy",
    "Non-fiction",
    "History",
    "Biography",
    "Geography",
    "Music",
    "Language",
    "Survival fiction"
];

let filteredBooks = books;
let currentPage = 1;
let booksPerPage = 4;
let reservedCount = 0;
let reservations = []; // {id, title, days, dueDate}
let pendingReserveId = null;

// Populate the genre dropdown and initialize the page
function populateGenreSelect() {
    const select = document.getElementById('genreSelect');
    if (!select) return;

    // Start with All option
    select.innerHTML = '<option value="All">All Genres</option>' +
        genres.map(g => `<option value="${g}">${g}</option>`).join('');

    // When genre changes, re-apply filters
    select.addEventListener('change', applyFilters);
}

// Initialize the page (load persisted data first)
loadFromStorage();
populateGenreSelect();
populateAddFormGenres();
updateStats();
applyFilters();
renderReservations();
renderCartPanel();

// Populate genre options for the add-book form
function populateAddFormGenres() {
    const sel = document.getElementById('newGenre');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select genre</option>' +
        genres.map(g => `<option value="${g}">${g}</option>`).join('');
}

populateAddFormGenres();

// Handle add-book form submission
const addForm = document.getElementById('addBookForm');
if (addForm) {
    addForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        const title = document.getElementById('newTitle').value.trim();
        const author = document.getElementById('newAuthor').value.trim();
        const genre = document.getElementById('newGenre').value;
        const stockVal = document.getElementById('newStock').value;
        const image = document.getElementById('newImage').value.trim() || 'img/placeholder.jpg';

        if (!title || !author || !genre) {
            showToast('Please provide Title, Author and Genre.', 'error');
            return;
        }

        const stock = parseInt(stockVal, 10) || 0;
        const nextId = books.reduce((m, b) => Math.max(m, b.id), 0) + 1;

        const newBook = { id: nextId, title, author, stock, image, genre };
        books.push(newBook);
        saveToStorage();

        // reset form
        addForm.reset();

        updateStats();
        applyFilters();
        populateGenreSelect();
        populateAddFormGenres();
        showToast('Book added.', 'success');
    });
}

// Image preview for the new-image field
const newImageInput = document.getElementById('newImage');
const newImagePreview = document.getElementById('newImagePreview');
if (newImageInput && newImagePreview) {
    newImageInput.addEventListener('input', function () {
        const url = newImageInput.value.trim();
        if (!url) {
            newImagePreview.src = 'img/placeholder.jpg';
            return;
        }
        newImagePreview.src = url;
    });

    // fallback to placeholder on error
    newImagePreview.addEventListener('error', function () {
        newImagePreview.src = 'img/placeholder.jpg';
    });
}

// Cancel button: reset form and close details
const cancelBtn = document.getElementById('cancelAdd');
if (cancelBtn) {
    cancelBtn.addEventListener('click', function () {
        if (addForm) addForm.reset();
        if (newImagePreview) newImagePreview.src = 'img/placeholder.jpg';
        // close the details element if open
        const details = document.querySelector('.add-details');
        if (details && details.open) details.open = false;
    });
}

// Live search as the user types
document.addEventListener("keyup", function (e) {
    if (e.target.id === "searchInput") {
        applyFilters();
    }
});

// Autocomplete / suggestions
let suggestionIndex = -1;
const MAX_SUGGESTIONS = 8;

function getSuggestions(keyword) {
    if (!keyword) return [];
    const genreSelect = document.getElementById('genreSelect');
    const selectedGenre = genreSelect ? genreSelect.value : 'All';

    const pool = books.filter(b => selectedGenre === 'All' || (b.genre || '').toLowerCase() === selectedGenre.toLowerCase());

    const kw = keyword.toLowerCase();
    const matches = pool.filter(b => (b.title || '').toLowerCase().includes(kw) || (b.author || '').toLowerCase().includes(kw));
    return matches.slice(0, MAX_SUGGESTIONS);
}

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
        li.innerText = 'No results';
        li.setAttribute('aria-selected', 'false');
        list.appendChild(li);
        list.hidden = false;
        return;
    }

    matches.forEach((b, idx) => {
        const li = document.createElement('li');
        li.innerText = `${b.title} — ${b.author}`;
        li.setAttribute('role', 'option');
        li.setAttribute('data-id', String(b.id));
        li.setAttribute('aria-selected', 'false');
        li.addEventListener('mousedown', function (ev) {
            ev.preventDefault();
            selectSuggestion(idx);
        });
        list.appendChild(li);
    });

    list.hidden = false;
}

function hideSuggestionsSoon() {
    setTimeout(() => {
        const list = document.getElementById('suggestions');
        if (list) list.hidden = true;
    }, 150);
}

function selectSuggestion(idx) {
    const list = document.getElementById('suggestions');
    if (!list) return;
    const item = list.children[idx];
    if (!item) return;

    const text = item.innerText || '';
    const input = document.getElementById('searchInput');
    input.value = text.split(' — ')[0] || text;
    applyFilters();
    list.hidden = true;
}

// keyboard navigation
document.addEventListener('keydown', function (e) {
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
        if (suggestionIndex >= 0 && suggestionIndex < items.length) {
            e.preventDefault();
            selectSuggestion(suggestionIndex);
        }
    } else if (e.key === 'Escape') {
        list.hidden = true;
    }
});

// wire input events
const searchInputEl = document.getElementById('searchInput');
if (searchInputEl) {
    searchInputEl.addEventListener('input', function () {
        updateSuggestions();
        applyFilters();
    });
    searchInputEl.addEventListener('blur', hideSuggestionsSoon);
    searchInputEl.addEventListener('focus', updateSuggestions);
}

// Reservation modal buttons wiring
const confirmBtn = document.getElementById('confirmReserve');
if (confirmBtn) confirmBtn.addEventListener('click', confirmReserveHandler);
const cancelReserveBtn = document.getElementById('cancelReserve');
if (cancelReserveBtn) cancelReserveBtn.addEventListener('click', cancelReserveHandler);
// Cart button wiring
const cartBtn = document.getElementById('cartBtn');
const cartPanel = document.getElementById('cartPanel');
if (cartBtn && cartPanel) {
    cartBtn.addEventListener('click', () => {
        const open = cartPanel.classList.toggle('open');
        cartPanel.setAttribute('aria-hidden', String(!open));
        if (open) renderCartPanel();
    });
}
const closeCart = document.getElementById('closeCart');
if (closeCart) closeCart.addEventListener('click', () => { cartPanel.classList.remove('open'); cartPanel.setAttribute('aria-hidden','true'); });

// In-page confirmation modal helper
function showConfirm(message, onYes, onNo) {
    const modal = document.getElementById('confirmModal');
    const msg = document.getElementById('confirmMessage');
    const yes = document.getElementById('confirmYes');
    const no = document.getElementById('confirmNo');
    if (!modal || !msg || !yes || !no) {
        // fallback to browser confirm
        const ok = window.confirm(message);
        if (ok && typeof onYes === 'function') onYes();
        else if (!ok && typeof onNo === 'function') onNo();
        return;
    }

    // set message and show with animation
    msg.innerText = message;
    modal.classList.add('open');
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');

    // ensure CSS transition runs
    const panel = modal.querySelector('.modal-panel');
    if (panel) panel.offsetHeight; // force reflow

    function cleanup() {
        // start hide animation by removing 'open' (backdrop/panel styles use .open)
        modal.classList.remove('open');
        // wait for animation to finish before hiding
        setTimeout(() => {
            modal.hidden = true;
            modal.setAttribute('aria-hidden', 'true');
        }, 220);

        yes.removeEventListener('click', onYesClick);
        no.removeEventListener('click', onNoClick);
    }

    function onYesClick() { cleanup(); if (typeof onYes === 'function') onYes(); }
    function onNoClick() { cleanup(); if (typeof onNo === 'function') onNo(); }

    yes.addEventListener('click', onYesClick);
    no.addEventListener('click', onNoClick);
}

function displayBooks() {
    const container = document.getElementById("bookContainer");
    if (!container) return;

    container.innerHTML = ""; // Clear current view

    // If no books match the current filters, show a friendly message
    if (!filteredBooks || filteredBooks.length === 0) {
        const empty = document.createElement('div');
        empty.style.padding = '40px 20px';
        empty.style.textAlign = 'center';
        empty.style.color = 'var(--text-secondary)';
        empty.style.fontSize = '1.1rem';
        empty.innerText = 'No results found.';
        container.appendChild(empty);
        // still update pagination (will hide when 0 pages)
        createPagination();
        return;
    }

    const start = (currentPage - 1) * booksPerPage;
    const paginated = filteredBooks.slice(start, start + booksPerPage);

    // Loop through filtered/paginated books and create HTML
    paginated.forEach(book => {
        const card = document.createElement("div");
        card.className = "book-card";

        let stockText = "";
        let stockClass = "";

        // Check availability status to apply your CSS classes
        if (book.stock === 0) {
            stockText = "Unavailable";
            stockClass = "stock-unavailable";
        } else if (book.stock <= 2) {
            stockText = `Low Stock: ${book.stock}`;
            stockClass = "stock-low";
        } else {
            stockText = `Available: ${book.stock}`;
            stockClass = "stock-available";
        }

        card.innerHTML = `
            <img src="${book.image}" alt="Book Cover">
            <div class="book-content">
                <h3>${book.title}</h3>
                <p>${book.author}</p>
                <p class="stock-status ${stockClass}">${stockText}</p>
                
                <button class="reserve-btn" ${book.stock === 0 ? "disabled" : ""} 
                    onclick="reserveBook(${book.id})">
                    Acquire Tome
                </button>
            </div>
        `;

        container.appendChild(card);
    });

    createPagination();
}

// Logic to handle reserving a book
function reserveBook(id) {
    const book = books.find(b => b.id === id);
    if (!book) return;
    if (book.stock <= 0) {
        showToast('This book is currently unavailable.', 'error');
        return;
    }

    // open modal to choose days (1-15)
    pendingReserveId = id;
    const modal = document.getElementById('reserveModal');
    const nameEl = document.getElementById('reserveBookName');
    const daysSel = document.getElementById('reserveDays');
    if (!modal || !nameEl || !daysSel) {
        // fallback: immediate reserve for 15 days
        doConfirmReserve(15);
        return;
    }

    nameEl.innerText = `Reserve "${book.title}" — select how many days (max 15):`;

    // populate days 1..15
    daysSel.innerHTML = Array.from({ length: 15 }, (_, i) => `<option value="${i+1}">${i+1} day${i+1>1?'s':''}</option>`).join('');
    daysSel.value = '7';

    // show modal using class so CSS doesn't override hidden
    modal.classList.add('open');
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    // small timeout to ensure browser renders options before focus
    setTimeout(() => daysSel.focus(), 10);
}

function hideReserveModal() {
    const modal = document.getElementById('reserveModal');
    if (modal) {
        modal.classList.remove('open');
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
    }
    pendingReserveId = null;
}

function doConfirmReserve(days) {
    // Front-end only: create a UI reservation, persist it, and close the modal.
    const id = pendingReserveId;
    const bookIndex = books.findIndex(b => b.id === id);
    if (bookIndex === -1) {
        hideReserveModal();
        return;
    }
    const book = books[bookIndex];

    const d = parseInt(days, 10) || 1;
    const daysClamped = Math.max(1, Math.min(15, d));

    // compute due date (YYYY-MM-DD)
    const due = new Date();
    due.setDate(due.getDate() + daysClamped);
    const dueISO = due.toISOString().split('T')[0];

    // aggregate reservations by book id (front-end only)
    const existing = reservations.find(r => r.id === book.id);
    if (existing) {
        // only allow additional reservation if stock available
        if (book.stock <= 0) {
            showToast('No more copies available to reserve.', 'error');
            hideReserveModal();
            return;
        }
        existing.qty = (existing.qty || 1) + 1;
        // keep the original days/dueDate for the reservation
    } else {
        const reservation = { id: book.id, title: book.title, days: daysClamped, dueDate: dueISO, qty: 1 };
        reservations.push(reservation);
    }

    // reflect reserved state in UI by decrementing stock and increasing counter
    if (book.stock > 0) book.stock--;
    reservedCount++;

    saveToStorage();
    applyFilters();
    updateStats();
    renderReservations();
    renderCartPanel();
    hideReserveModal();
}

function confirmReserveHandler() {
    const daysSel = document.getElementById('reserveDays');
    if (!daysSel) return;
    doConfirmReserve(daysSel.value);
}

function cancelReserveHandler() {
    hideReserveModal();
}

// Render current reservations list
function renderReservations() {
    const container = document.getElementById('reservationsList');
    if (!container) return;

    if (!reservations || reservations.length === 0) {
        container.innerText = 'No reservations yet.';
        return;
    }

    container.innerHTML = '';
    const list = document.createElement('div');
    list.className = 'reservations-list';

    reservations.forEach(r => {
        const item = document.createElement('div');
        item.className = 'reservation-item';

        const meta = document.createElement('div');
        meta.className = 'meta';
        const title = document.createElement('div');
        title.className = 'title';
        title.innerText = r.title;
        const due = document.createElement('div');
        due.className = 'due';
        due.innerText = `Due: ${r.dueDate} (${r.days} day${r.days>1?'s':''})`;
        meta.appendChild(title);
        meta.appendChild(due);

        const actions = document.createElement('div');
        const btn = document.createElement('button');
        btn.className = 'btn-cancel-res';
        btn.innerText = 'Cancel Reservation';
        btn.addEventListener('click', () => cancelReservation(r.id));
        actions.appendChild(btn);

        item.appendChild(meta);
        item.appendChild(actions);

        list.appendChild(item);
    });

    container.appendChild(list);
}

// Render compact cart panel next to header cart button
function renderCartPanel() {
    const panel = document.getElementById('cartPanel');
    const listEl = document.getElementById('cartList');
    const countEl = document.getElementById('cartCount');

    // update badge even if panel is not present/open
    const totalQty = reservations.reduce((s, r) => s + (r.qty || 1), 0);
    if (countEl) countEl.innerText = String(totalQty);

    // populate panel only if elements exist
    if (!panel || !listEl) return;

    listEl.innerHTML = '';
    if (!reservations || reservations.length === 0) {
        listEl.innerText = 'No reservations.';
        return;
    }

    reservations.forEach(r => {
        const item = document.createElement('div');
        item.className = 'cart-item';

        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.innerHTML = `<div class="title">${r.title}</div><div class="due">Due: ${r.dueDate}</div>`;

        const controls = document.createElement('div');
        controls.className = 'controls';

        const minus = document.createElement('button');
        minus.innerText = '-';
        minus.title = 'Decrease quantity';
        minus.addEventListener('click', () => changeReservationQty(r.id, -1));

        const qty = document.createElement('div');
        qty.innerText = String(r.qty || 1);

        const plus = document.createElement('button');
        plus.innerText = '+';
        plus.title = 'Increase quantity';
        plus.addEventListener('click', () => changeReservationQty(r.id, +1));

        controls.appendChild(minus);
        controls.appendChild(qty);
        controls.appendChild(plus);

        item.appendChild(meta);
        item.appendChild(controls);
        listEl.appendChild(item);
    });
}

// Increase or decrease reservation quantity
function changeReservationQty(bookId, delta) {
    const idx = reservations.findIndex(r => r.id === bookId);
    if (idx === -1) return;
    const res = reservations[idx];
    const bookIndex = books.findIndex(b => b.id === bookId);
    if (delta > 0) {
        // increase: ensure stock available
        if (bookIndex === -1 || books[bookIndex].stock <= 0) {
            showToast('No more copies available to reserve.', 'error');
            return;
        }
        res.qty = (res.qty || 1) + 1;
        books[bookIndex].stock--;
        reservedCount++;
    } else {
        // decrease
        res.qty = (res.qty || 1) - 1;
        // restore stock
        if (bookIndex !== -1) books[bookIndex].stock = (books[bookIndex].stock || 0) + 1;
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
        const bookIndex = books.findIndex(b => b.id === res.id);
        if (bookIndex !== -1) {
            books[bookIndex].stock = (books[bookIndex].stock || 0) + (res.qty || 1);
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
    const totalPages = Math.ceil(filteredBooks.length / booksPerPage);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.innerText = i;
        btn.onclick = () => {
            currentPage = i;
            displayBooks();
            window.scrollTo({ top: 300, behavior: 'smooth' });
        };
        pagination.appendChild(btn);
    }
}

function updateStats() {
    const total = document.getElementById("totalBooks");
    const reserved = document.getElementById("reservedCount");

    if (total) total.innerText = `Total Books: ${books.length}`;
    if (reserved) reserved.innerText = `Reserved: ${reservedCount}`;
}

// Apply both search keyword and genre filters
function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const genreSelect = document.getElementById('genreSelect');
    const keyword = searchInput ? searchInput.value.toLowerCase() : '';
    const selectedGenre = genreSelect ? genreSelect.value : 'All';

    filteredBooks = books.filter(book => {
        const title = (book.title || '').toLowerCase();
        const author = (book.author || '').toLowerCase();
        const bookGenre = (book.genre || '').toLowerCase();

        const matchesKeyword = title.includes(keyword) || author.includes(keyword);
        const matchesGenre = selectedGenre === 'All' || bookGenre === selectedGenre.toLowerCase();

        return matchesKeyword && matchesGenre;
    });

    currentPage = 1; // reset paging
    displayBooks();
}