// Redundant hardcoded data removed. Library state is now managed by api.php.
const STORAGE_KEY = 'library_books_v1';
const RESERVED_KEY = 'library_reserved_v1';
const RESERVATIONS_KEY = 'library_reservations_v1';

function loadFromStorage() {
    try {
        const rawRes = localStorage.getItem(RESERVATIONS_KEY);
        reservations = rawRes ? JSON.parse(rawRes) : [];
        const rawCount = localStorage.getItem(RESERVED_KEY);
        reservedCount = rawCount ? Number(rawCount) : 0;

        // MIGRATION: Check if there are local books to sync to the server (from previous client-side only version)
        const localBooks = localStorage.getItem(STORAGE_KEY);
        if (localBooks) {
            const parsed = JSON.parse(localBooks);
            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                // Send them to server once to ensure no data loss during transition
                const xhr = new XMLHttpRequest();
                xhr.open("POST", "api.php?action=save", false); // Synchronous migration to ensure data is safe before fetching
                xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                xhr.send(JSON.stringify({
                    books: parsed,
                    reservations: reservations,
                    reservedCount: reservedCount
                }));
                // Clear local books after successful migration
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    } catch (e) {
        console.warn("Migration or load failed", e);
        reservations = [];
        reservedCount = 0;
    }

    // Initial fetch from server
    fetchLibraryData();
}

/**
 * AJAX CONVERSION: Centralized function to fetch paginated and filtered data from the backend.
 */
function fetchLibraryData() {
    const searchInput = document.getElementById('searchInput');
    const genreSelect = document.getElementById('genreSelect');
    const keyword = searchInput ? searchInput.value.trim() : '';
    const selectedGenre = genreSelect ? genreSelect.value : 'All';

    const params = new URLSearchParams({
        action: 'load',
        page: currentPage,
        limit: booksPerPage,
        q: keyword,
        genre: selectedGenre
    });

    const xhr = new XMLHttpRequest();
    xhr.open("GET", `api.php?${params.toString()}`, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const serverData = JSON.parse(xhr.responseText);
                    if (serverData.books && Array.isArray(serverData.books)) {
                        // Update global state with server response
                        filteredBooks = serverData.books;
                        totalBooks = serverData.totalBooks || 0;
                        reservations = serverData.reservations || [];
                        reservedCount = serverData.reservedCount || 0;

                        // Re-render UI
                        displayBooks();
                        updateStats();
                        renderReservations();
                        renderCartPanel();
                    }
                } catch (error) {
                    console.warn("Error parsing AJAX server data", error);
                }
            } else {
                console.error("Failed to load library data from server. Status:", xhr.status);
            }
        }
    };
    xhr.send();
}


function saveToStorage() {
    try {
        localStorage.setItem(RESERVED_KEY, String(reservedCount));
        localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(reservations));
    } catch (e) {
        console.warn('Could not save to localStorage', e);
    }

    // AJAX CONVERSION: Send data to a backend server to persist library state
    const xhr = new XMLHttpRequest();
    // FIX: Point to the centralized PHP backend
    xhr.open("POST", "api.php?action=save", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    // FIX: Handle response to verify persistence
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status !== 200) {
            console.error("AJAX Save Failed: Server returned status " + xhr.status);
        }
    };
    xhr.send(JSON.stringify({
        books: filteredBooks, // Note: server should handle merging or direct save
        reservations: reservations,
        reservedCount: reservedCount
    }));
}


const genres = [
    "Biography",
    "Fantasy",
    "Geography",
    "History",
    "Language",
    "Music",
    "Non-fiction",
    "Survival fiction"
];

let filteredBooks = [];
let totalBooks = 0;
let currentPage = 1;
let booksPerPage = 6;
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
updateStats();
applyFilters();
renderReservations();
renderCartPanel();

// --- HIGH-PERFORMANCE ENTRANCE MOTION ---
// This function triggers the fancy 'reveal' animations when you enter the library.
function triggerEntranceMotion() {
    const body = document.querySelector('.library-body');
    const reveals = document.querySelectorAll('.reveal-item');

    if (body) {
        void body.offsetWidth; // This forces the browser to refresh its layout
        body.classList.add('is-ready'); // This slides up the dark 'shutter'
    }

    // This part makes each item (header, books, search) appear one by one
    reveals.forEach((el, index) => {
        setTimeout(() => {
            el.classList.add('is-visible'); // Makes the item fade in and slide up
        }, 300 + (index * 80)); // The delay increases for each item to create a sequence
    });
}

document.addEventListener('DOMContentLoaded', () => {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            triggerEntranceMotion();
            updateAuthUI();
        });
    });
});

/**
 * ADAPTATION: Updates the UI based on authentication status and user role.
 * Adds 'Admin Dashboard' and 'Logout' buttons if applicable.
 */
function updateAuthUI() {
    const authBtn = document.getElementById('authBtn');
    if (!authBtn) return;

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName') || 'Member';

    if (isLoggedIn) {
        authBtn.innerText = 'Logout';
        authBtn.onclick = logout;

        // If admin, add a Dashboard button next to Logout
        if (userRole === 'admin') {
            let adminBtn = document.getElementById('adminDashBtn');
            if (!adminBtn) {
                adminBtn = document.createElement('button');
                adminBtn.id = 'adminDashBtn';
                adminBtn.className = 'btn btn-archival-logout me-2'; // Reuse the archival style
                adminBtn.style.borderColor = '#c5a059';
                adminBtn.style.color = '#c5a059';
                adminBtn.innerText = 'Admin Dashboard';
                adminBtn.onclick = () => window.location.href = 'admin.html';
                authBtn.parentNode.insertBefore(adminBtn, authBtn);
            }
        }
        
        // Update totalBooks or stats with a welcome message
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
        authBtn.innerText = 'Login';
        authBtn.onclick = () => window.location.href = 'login.html';
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// Initialize Bootstrap components (if available)
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
    } catch (e) {
        // ignore bootstrap initialization errors
    }
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
    const kw = keyword.toLowerCase();
    const xhr = new XMLHttpRequest();
    // For suggestions, we could use a separate action or just search with a limit
    xhr.open("GET", `api.php?action=load&q=${encodeURIComponent(kw)}&limit=${MAX_SUGGESTIONS}`, false); // Synchronous for simplicity in current flow
    xhr.send();
    if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        return data.books || [];
    }
    return [];
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
        list.setAttribute('aria-hidden', 'true');
        return;
    }

    if (matches.length === 0) {
        const li = document.createElement('li');
        li.className = 'no-result';
        li.innerText = 'No records found in the Archive';
        li.setAttribute('aria-selected', 'false');
        list.appendChild(li);
        list.hidden = false;
        list.setAttribute('aria-hidden', 'false');
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
    list.setAttribute('aria-hidden', 'false');
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
// Cart button wiring (use Bootstrap Offcanvas when available)
const cartBtn = document.getElementById('cartBtn');
if (cartBtn && bootstrapCartOffcanvas) {
    cartBtn.addEventListener('click', () => {
        bootstrapCartOffcanvas.show();
        renderCartPanel();
    });
} else if (cartBtn) {
    // fallback to previous behavior
    const cartPanel = document.getElementById('cartPanel');
    cartBtn.addEventListener('click', () => {
        const open = cartPanel.classList.toggle('open');
        cartPanel.setAttribute('aria-hidden', String(!open));
        if (open) renderCartPanel();
    });
}
const closeCart = document.getElementById('closeCart');
if (closeCart && bootstrapCartOffcanvas) {
    closeCart.addEventListener('click', () => bootstrapCartOffcanvas.hide());
} else if (closeCart) {
    closeCart.addEventListener('click', () => { const cartPanel = document.getElementById('cartPanel'); cartPanel.classList.remove('open'); cartPanel.setAttribute('aria-hidden', 'true'); });
}

// In-page confirmation modal helper
function showConfirm(message, onYes, onNo) {
    const msg = document.getElementById('confirmMessage');
    const yes = document.getElementById('confirmYes');
    const no = document.getElementById('confirmNo');

    if (!msg || !yes || !no) {
        const ok = window.confirm(message);
        if (ok && typeof onYes === 'function') onYes();
        else if (!ok && typeof onNo === 'function') onNo();
        return;
    }

    msg.innerText = message;

    // remove previous listeners to avoid duplicates
    const newYes = yes.cloneNode(true);
    const newNo = no.cloneNode(true);
    yes.parentNode.replaceChild(newYes, yes);
    no.parentNode.replaceChild(newNo, no);

    newYes.addEventListener('click', function () {
        if (bootstrapConfirmModal) bootstrapConfirmModal.hide();
        if (typeof onYes === 'function') onYes();
    });

    newNo.addEventListener('click', function () {
        if (bootstrapConfirmModal) bootstrapConfirmModal.hide();
        if (typeof onNo === 'function') onNo();
    });

    if (bootstrapConfirmModal) bootstrapConfirmModal.show();
}

function displayBooks() {
    const container = document.getElementById("bookContainer");
    if (!container) return;

    container.innerHTML = ""; // Clear current view

    // If no books match the current filters, show "No result found."
    if (!filteredBooks || filteredBooks.length === 0) {
        container.innerHTML = '<div class="col-12 text-center my-5 reveal-item is-visible"><h3 style="color: #c5a059;">No result found.</h3></div>';
        createPagination();
        return;
    }

    // Books are now pre-paginated from server
    const paginated = filteredBooks;

    // Loop through filtered/paginated books and create Bootstrap card HTML
    paginated.forEach(book => {
        const col = document.createElement('div');
        col.className = 'col reveal-item'; // Add reveal class for entry motion

        const card = document.createElement('div');
        card.className = 'card h-100';

        // Use a medium, proportional size so book covers remain fully visible
        const imgContainer = document.createElement('div');
        imgContainer.style.height = '240px';
        imgContainer.style.backgroundColor = '#12100e'; // Dark background in case image doesn't perfectly fit
        imgContainer.style.overflow = 'hidden';
        imgContainer.style.display = 'flex';
        imgContainer.style.alignItems = 'center';
        imgContainer.style.justifyContent = 'center';

        const img = document.createElement('img');
        img.className = 'card-img-top w-100 h-100';
        img.style.objectFit = 'contain'; // Changed to 'contain' so nothing is cropped out
        img.style.padding = '10px'; // Adds a bit of breathing room around the book cover
        img.src = book.image || 'img/placeholder.jpg';
        img.alt = book.title;

        // Group the image inside the restricted container
        imgContainer.appendChild(img);

        const body = document.createElement('div');
        body.className = 'card-body d-flex flex-column';

        const title = document.createElement('h5');
        title.className = 'card-title';
        title.innerText = book.title;

        const author = document.createElement('p');
        author.className = 'card-text text-muted mb-2';
        author.innerText = book.author;

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

        if (isLoggedIn) {
            btn.className = 'btn btn-primary w-100';
            btn.innerText = 'Acquire Tome';
            if (book.stock === 0) btn.disabled = true;
            btn.addEventListener('click', () => reserveBook(book.id));
        } else {
            btn.className = 'btn btn-outline-secondary w-100';
            btn.innerText = 'Member Benefit';
            btn.title = 'Login to Acquire this Tome';
            btn.addEventListener('click', () => {
                showToast('Please login to reserve records.', 'info');
                setTimeout(() => window.location.href = 'login.html', 1200);
            });
        }

        body.appendChild(title);
        body.appendChild(author);
        body.appendChild(stock);
        footer.appendChild(btn);
        body.appendChild(footer);

        // Assemble with the restricted-height image container
        card.appendChild(imgContainer);
        card.appendChild(body);

        // Add horizontal padding directly to the card to make it smaller inside the grid column
        card.style.margin = '0 auto';
        card.style.maxWidth = '85%';

        col.appendChild(card);
        container.appendChild(col);

        // Make the cover image open the summary modal on click
        imgContainer.style.cursor = 'pointer';
        img.title = 'Click to learn about this tome';
        img.addEventListener('click', () => showBookInfo(book));

        // If page is already ready, show book immediately
        // This is used for pagination—when you switch pages, books don't need a slow entrance
        if (document.body.classList.contains('is-ready')) {
            setTimeout(() => col.classList.add('is-visible'), 50);
        }
    });

    createPagination();
}

// Show book info/summary modal
function showBookInfo(book) {
    const modal = document.getElementById('bookInfoModal');
    if (!modal) return;

    // Populate modal fields
    const infoImg = document.getElementById('infoBookImg');
    const infoTitle = document.getElementById('infoBookTitle');
    const infoAuthor = document.getElementById('infoBookAuthor');
    const infoGenre = document.getElementById('infoBookGenre');
    const infoSummary = document.getElementById('infoBookSummary');

    if (infoImg) { infoImg.src = book.image || ''; infoImg.alt = book.title; }
    if (infoTitle) infoTitle.innerText = book.title;
    if (infoAuthor) infoAuthor.innerText = book.author;
    if (infoGenre) infoGenre.innerText = book.genre || '';
    if (infoSummary) infoSummary.innerText = book.summary || 'No summary available.';

    // Open via Bootstrap if available
    if (window.bootstrap) {
        try {
            const bsModal = bootstrap.Modal.getOrCreateInstance(modal);
            bsModal.show();
        } catch (e) {
            modal.classList.add('show');
            modal.style.display = 'block';
        }
    } else {
        modal.classList.add('show');
        modal.style.display = 'block';
    }
}

// Logic to handle reserving a book
function reserveBook(id) {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        showToast('Please login to reserve this tome from the Archive.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }

    const book = filteredBooks.find(b => b.id === id);
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
    daysSel.innerHTML = Array.from({ length: 15 }, (_, i) => `<option value="${i + 1}">${i + 1} day${i + 1 > 1 ? 's' : ''}</option>`).join('');
    daysSel.value = '7';

    // show modal using Bootstrap modal if available, otherwise fallback
    if (bootstrapReserveModal) {
        bootstrapReserveModal.show();
        setTimeout(() => daysSel.focus(), 200);
    } else {
        modal.classList.add('open');
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        // small timeout to ensure browser renders options before focus
        setTimeout(() => daysSel.focus(), 10);
    }
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

function doConfirmReserve(days) {
    // Front-end only: create a UI reservation, persist it, and close the modal.
    const id = pendingReserveId;
    const bookIndex = filteredBooks.findIndex(b => b.id === id);
    if (bookIndex === -1) {
        hideReserveModal();
        return;
    }
    const book = filteredBooks[bookIndex];

    const d = parseInt(days, 10) || 1;
    const daysClamped = Math.max(1, Math.min(15, d));

    // compute due date (YYYY-MM-DD)
    const due = new Date();
    due.setDate(due.getDate() + daysClamped);
    const dueISO = due.toISOString().split('T')[0];

    // aggregate reservations by book id (front-end only)
    const existing = reservations.find(r => r.id === book.id);
    if (existing) {
        showToast('You have already reserved this tome.', 'info');
        hideReserveModal();
        return;
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
        due.innerText = `Due: ${r.dueDate} (${r.days} day${r.days > 1 ? 's' : ''})`;
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
