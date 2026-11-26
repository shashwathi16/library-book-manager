/* Library Book Manager
   Each book: { id, title, author, category, issued, borrower, issuedOn, dueOn }
   Books, activity log, theme and view are saved in localStorage. */

const KEY = "library_books_v2";
const OLD_KEY = "library_books_v1";      // data from the first version is migrated
const LOG_KEY = "library_log_v2";
const THEME_KEY = "library_theme";
const VIEW_KEY = "library_view";

const CATEGORIES = ["Programming", "Web Development", "Computer Science", "Database", "Fiction", "Science", "Other"];
const CAT_CLASS = {
  "Programming": "c-prog", "Web Development": "c-web", "Computer Science": "c-cs",
  "Database": "c-db", "Fiction": "c-fic", "Science": "c-sci", "Other": "c-oth"
};
const LOAN_DAYS = 14;

let books = [];
let activity = [];
let view = "table";
let issuingId = null;
let editingId = null;
let confirmAction = null;

const $ = id => document.getElementById(id);

/* ---------- Small helpers ---------- */
function esc(text) {
  return String(text).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
const pad = n => String(n).padStart(2, "0");
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => toISO(new Date());
function addDays(iso, n) { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return toISO(d); }
function fmtDate(iso) { return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
function daysBetween(a, b) { return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000); }
function isOverdue(b) { return b.issued && b.dueOn && b.dueOn < todayISO(); }
function findBook(id) { return books.find(b => b.id.toLowerCase() === String(id).toLowerCase()); }
function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} day(s) ago`;
}

/* ---------- Storage ---------- */
function read(key) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn("Could not save", key, e); } }
const saveBooks = () => write(KEY, books);
const saveLog = () => write(LOG_KEY, activity);

function makeBook(id, title, author, category, borrower = "", issuedOn = "", dueOn = "") {
  return { id, title, author, category, issued: !!borrower, borrower, issuedOn, dueOn };
}
function sampleBooks() {
  const t = todayISO();
  return [
    makeBook("B101", "Clean Code", "Robert C. Martin", "Programming"),
    makeBook("B102", "Eloquent JavaScript", "Marijn Haverbeke", "Web Development"),
    makeBook("B103", "You Don't Know JS", "Kyle Simpson", "Web Development", "Asha Rao", addDays(t, -12), addDays(t, -2)),
    makeBook("B104", "Introduction to Algorithms", "Thomas H. Cormen", "Computer Science"),
    makeBook("B105", "The Pragmatic Programmer", "Andrew Hunt", "Programming"),
    makeBook("B106", "Database System Concepts", "Abraham Silberschatz", "Database", "Kiran Shetty", addDays(t, -3), addDays(t, 11)),
    makeBook("B107", "Operating System Concepts", "Abraham Silberschatz", "Computer Science"),
    makeBook("B108", "Learning SQL", "Alan Beaulieu", "Database"),
    makeBook("B109", "The Alchemist", "Paulo Coelho", "Fiction"),
    makeBook("B110", "A Brief History of Time", "Stephen Hawking", "Science")
  ];
}
function normalise(b) {
  return {
    id: String(b.id || ""), title: String(b.title || ""), author: String(b.author || ""),
    category: CATEGORIES.includes(b.category) ? b.category : "Other",
    issued: !!b.issued, borrower: b.issued ? String(b.borrower || "") : "",
    issuedOn: b.issuedOn || "", dueOn: b.dueOn || ""
  };
}
function loadBooks() {
  const saved = read(KEY) || read(OLD_KEY);
  if (Array.isArray(saved)) return saved.map(normalise);
  return sampleBooks();
}

/* ---------- Activity log ---------- */
const LOG_ICONS = { add: "bi-plus-circle", issue: "bi-box-arrow-right", return: "bi-box-arrow-in-left", edit: "bi-pencil", remove: "bi-trash", reset: "bi-arrow-counterclockwise" };
function logActivity(type, text) {
  activity.unshift({ type, text, time: new Date().toISOString() });
  activity = activity.slice(0, 15);
  saveLog();
  renderActivity();
}
function renderActivity() {
  const list = $("activityList");
  if (activity.length === 0) {
    list.innerHTML = `<li class="text-muted">No activity yet. Add or issue a book to see it here.</li>`;
    return;
  }
  list.innerHTML = activity.map(a =>
    `<li><span class="dot"><i class="bi ${LOG_ICONS[a.type] || "bi-dot"}"></i></span>
       <div>${esc(a.text)}<time datetime="${esc(a.time)}">${timeAgo(a.time)}</time></div></li>`).join("");
}

/* ---------- Toasts and confirm ---------- */
function toast(text, type = "success") {
  const el = document.createElement("div");
  el.className = `toast t-${type}`;
  el.setAttribute("role", "status");
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${esc(text)}</div>
    <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
  $("toastArea").appendChild(el);
  const t = bootstrap.Toast.getOrCreateInstance(el, { delay: 3500 });
  el.addEventListener("hidden.bs.toast", () => el.remove());
  t.show();
}
function askConfirm(title, message, okText, action) {
  $("confirmTitle").textContent = title;
  $("confirmMsg").textContent = message;
  $("confirmOk").textContent = okText;
  confirmAction = action;
  bootstrap.Modal.getOrCreateInstance($("confirmModal")).show();
}
$("confirmOk").addEventListener("click", () => {
  bootstrap.Modal.getOrCreateInstance($("confirmModal")).hide();
  if (confirmAction) confirmAction();
  confirmAction = null;
});

/* ---------- Filtering and sorting ---------- */
function visibleBooks() {
  const term = $("search").value.trim().toLowerCase();
  const cat = $("catFilter").value;
  const status = $("statusFilter").value;
  const sort = $("sortBy").value;

  const list = books.filter(b => {
    const matchesText = !term || [b.title, b.author, b.id, b.category].some(v => v.toLowerCase().includes(term));
    const matchesCat = cat === "all" || b.category === cat;
    const matchesStatus = status === "all" ||
      (status === "available" && !b.issued) ||
      (status === "issued" && b.issued) ||
      (status === "overdue" && isOverdue(b));
    return matchesText && matchesCat && matchesStatus;
  });

  const by = {
    title: (a, b) => a.title.localeCompare(b.title),
    author: (a, b) => a.author.localeCompare(b.author),
    id: (a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }),
    status: (a, b) => (a.issued - b.issued) || a.title.localeCompare(b.title)
  };
  if (by[sort]) list.sort(by[sort]);
  return list;
}

/* ---------- Rendering ---------- */
function statusHTML(b) {
  if (!b.issued) return `<span class="status-badge status-available"><i class="bi bi-check-circle"></i>Available</span>`;
  const meta = `<span class="meta">to ${esc(b.borrower)}${b.dueOn ? ` · due ${fmtDate(b.dueOn)}` : ""}</span>`;
  if (isOverdue(b)) {
    const days = daysBetween(b.dueOn, todayISO());
    return `<span class="status-badge status-overdue"><i class="bi bi-exclamation-circle"></i>Overdue ${days}d</span>${meta}`;
  }
  return `<span class="status-badge status-issued"><i class="bi bi-person"></i>Issued</span>${meta}`;
}
const chipHTML = b => `<span class="cat-chip ${CAT_CLASS[b.category] || "c-oth"}">${esc(b.category)}</span>`;
function mainBtn(b) {
  return b.issued
    ? `<button class="btn btn-sm btn-outline-secondary" data-action="return" data-id="${esc(b.id)}">Return</button>`
    : `<button class="btn btn-sm btn-brand" data-action="issue" data-id="${esc(b.id)}">Issue</button>`;
}
function iconBtns(b) {
  return `<button class="icon-btn" data-action="edit" data-id="${esc(b.id)}" aria-label="Edit ${esc(b.title)}" title="Edit"><i class="bi bi-pencil-square"></i></button>
          <button class="icon-btn danger" data-action="delete" data-id="${esc(b.id)}" aria-label="Remove ${esc(b.title)}" title="Remove"><i class="bi bi-trash"></i></button>`;
}

function renderStats() {
  const issued = books.filter(b => b.issued).length;
  const overdue = books.filter(isOverdue).length;
  const pct = books.length ? Math.round((books.length - issued) / books.length * 100) : 0;
  $("statTotal").textContent = books.length;
  $("statIssued").textContent = issued;
  $("statAvailable").textContent = books.length - issued;
  $("statOverdue").textContent = overdue;
  $("availText").textContent = `${pct}% available`;
  $("availFill").style.width = pct + "%";
  $("availBar").setAttribute("aria-valuenow", pct);
}

function render() {
  renderStats();
  const list = visibleBooks();
  $("resultCount").textContent = `Showing ${list.length} of ${books.length} book${books.length === 1 ? "" : "s"}`;

  $("bookList").innerHTML = list.map(b => `<tr>
      <td class="book-id">${esc(b.id)}</td>
      <td>${esc(b.title)}</td>
      <td>${esc(b.author)}</td>
      <td>${chipHTML(b)}</td>
      <td>${statusHTML(b)}</td>
      <td class="text-end text-nowrap">${mainBtn(b)} ${iconBtns(b)}</td>
    </tr>`).join("");

  $("cardWrap").innerHTML = list.map(b => `<div class="col-12 col-md-6">
      <article class="book-card ${CAT_CLASS[b.category] || "c-oth"}">
        <div class="book-spine"></div>
        <div class="body">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <span class="book-id small">${esc(b.id)}</span>${chipHTML(b)}
          </div>
          <h3>${esc(b.title)}</h3>
          <span class="author">${esc(b.author)}</span>
          <div class="mt-1">${statusHTML(b)}</div>
        </div>
        <div class="foot">${mainBtn(b)}<span>${iconBtns(b)}</span></div>
      </article></div>`).join("");

  const showEmpty = list.length === 0;
  $("emptyState").classList.toggle("d-none", !showEmpty);
  $("tableWrap").classList.toggle("d-none", showEmpty || view !== "table");
  $("cardWrap").classList.toggle("d-none", showEmpty || view !== "cards");
  if (showEmpty) {
    $("emptyState").innerHTML = books.length === 0
      ? `<i class="bi bi-journal-plus"></i>No books yet. Add your first book using the form.`
      : `<i class="bi bi-search"></i>No books match your search or filters.<br>
         <button class="btn btn-sm btn-outline-secondary mt-2" id="clearFilters">Clear filters</button>`;
  }
}

function setView(v) {
  view = v;
  write(VIEW_KEY, v);
  $("viewTable").classList.toggle("active", v === "table");
  $("viewCards").classList.toggle("active", v === "cards");
  $("viewTable").setAttribute("aria-pressed", v === "table");
  $("viewCards").setAttribute("aria-pressed", v === "cards");
  render();
}
$("viewTable").addEventListener("click", () => setView("table"));
$("viewCards").addEventListener("click", () => setView("cards"));

/* ---------- Add book ---------- */
const form = $("bookForm");
form.addEventListener("submit", e => {
  e.preventDefault();
  const idEl = $("bookId"), titleEl = $("title"), authorEl = $("author");
  [idEl, titleEl, authorEl].forEach(i => i.classList.remove("is-invalid"));
  const id = idEl.value.trim(), title = titleEl.value.trim(), author = authorEl.value.trim();
  let ok = true;

  if (!id) { $("bookIdError").textContent = "Enter a book ID."; idEl.classList.add("is-invalid"); ok = false; }
  else if (findBook(id)) { $("bookIdError").textContent = `ID "${id}" is already used. Choose a different ID.`; idEl.classList.add("is-invalid"); ok = false; }
  if (!title) { titleEl.classList.add("is-invalid"); ok = false; }
  if (!author) { authorEl.classList.add("is-invalid"); ok = false; }
  if (!ok) return;

  books.unshift(makeBook(id, title, author, $("category").value));
  saveBooks();
  logActivity("add", `Added "${title}" (${id})`);
  render();
  form.reset();
  idEl.focus();
  toast(`Added "${title}" (${id}).`);
});

/* ---------- Table and card actions ---------- */
function handleAction(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const book = findBook(btn.dataset.id);
  if (!book) return;

  if (btn.dataset.action === "issue") {
    if (book.issued) { toast(`"${book.title}" is already issued to ${book.borrower}.`, "warning"); return; }
    issuingId = book.id;
    $("issueBookInfo").textContent = `${book.title} by ${book.author} (${book.id})`;
    $("borrower").value = "";
    $("dueDate").value = addDays(todayISO(), LOAN_DAYS);
    $("dueDate").min = todayISO();
    $("borrower").classList.remove("is-invalid");
    $("dueDate").classList.remove("is-invalid");
    bootstrap.Modal.getOrCreateInstance($("issueModal")).show();
  }

  if (btn.dataset.action === "return") {
    if (!book.issued) { toast(`"${book.title}" is not issued, so it can't be returned.`, "warning"); return; }
    const late = isOverdue(book) ? daysBetween(book.dueOn, todayISO()) : 0;
    const who = book.borrower;
    book.issued = false; book.borrower = ""; book.issuedOn = ""; book.dueOn = "";
    saveBooks();
    logActivity("return", `"${book.title}" returned by ${who}${late ? ` (${late} day(s) late)` : ""}`);
    render();
    toast(`"${book.title}" returned by ${who}.` + (late ? ` It was ${late} day(s) late.` : ""), late ? "warning" : "success");
  }

  if (btn.dataset.action === "edit") {
    editingId = book.id;
    $("editId").value = book.id;
    $("editTitle").value = book.title;
    $("editAuthor").value = book.author;
    $("editCategory").value = book.category;
    $("editTitle").classList.remove("is-invalid");
    $("editAuthor").classList.remove("is-invalid");
    bootstrap.Modal.getOrCreateInstance($("editModal")).show();
  }

  if (btn.dataset.action === "delete") {
    if (book.issued) { toast(`"${book.title}" is issued to ${book.borrower}. Return it before removing.`, "warning"); return; }
    askConfirm("Remove book", `Remove "${book.title}" from the catalogue?`, "Remove", () => {
      books = books.filter(b => b !== book);
      saveBooks();
      logActivity("remove", `Removed "${book.title}" (${book.id})`);
      render();
      toast(`Removed "${book.title}".`);
    });
  }
}
$("bookList").addEventListener("click", handleAction);
$("cardWrap").addEventListener("click", handleAction);
$("emptyState").addEventListener("click", e => { if (e.target.id === "clearFilters") clearFilters(); });

/* ---------- Issue modal ---------- */
$("issueModal").addEventListener("shown.bs.modal", () => $("borrower").focus());
$("issueForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("borrower").value.trim();
  const due = $("dueDate").value;
  $("borrower").classList.toggle("is-invalid", !name);
  const dueBad = !due || due < todayISO();
  $("dueDate").classList.toggle("is-invalid", dueBad);
  if (!name || dueBad) return;

  const book = findBook(issuingId);
  bootstrap.Modal.getOrCreateInstance($("issueModal")).hide();
  if (!book || book.issued) { toast("That book is no longer available to issue.", "warning"); render(); return; }
  book.issued = true; book.borrower = name; book.issuedOn = todayISO(); book.dueOn = due;
  saveBooks();
  logActivity("issue", `"${book.title}" issued to ${name}, due ${fmtDate(due)}`);
  render();
  toast(`"${book.title}" issued to ${name}. Due ${fmtDate(due)}.`);
});

/* ---------- Edit modal ---------- */
$("editForm").addEventListener("submit", e => {
  e.preventDefault();
  const title = $("editTitle").value.trim(), author = $("editAuthor").value.trim();
  $("editTitle").classList.toggle("is-invalid", !title);
  $("editAuthor").classList.toggle("is-invalid", !author);
  if (!title || !author) return;
  const book = findBook(editingId);
  if (!book) return;
  book.title = title; book.author = author; book.category = $("editCategory").value;
  saveBooks();
  bootstrap.Modal.getOrCreateInstance($("editModal")).hide();
  logActivity("edit", `Edited "${title}" (${book.id})`);
  render();
  toast("Book details updated.");
});

/* ---------- Filters ---------- */
function clearFilters() {
  $("search").value = ""; $("catFilter").value = "all"; $("statusFilter").value = "all"; $("sortBy").value = "added";
  render();
}
$("search").addEventListener("input", render);
["catFilter", "statusFilter", "sortBy"].forEach(id => $(id).addEventListener("change", render));
document.addEventListener("keydown", e => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  if (e.key === "/" && !typing) { e.preventDefault(); $("search").focus(); }
});

/* ---------- Export CSV ---------- */
$("exportBtn").addEventListener("click", () => {
  const cell = v => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [["Book ID", "Title", "Author", "Category", "Status", "Borrower", "Issued on", "Due on"]];
  books.forEach(b => rows.push([b.id, b.title, b.author, b.category, b.issued ? (isOverdue(b) ? "Overdue" : "Issued") : "Available", b.borrower, b.issuedOn, b.dueOn]));
  const csv = rows.map(r => r.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `library-books-${todayISO()}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Catalogue exported as CSV.");
});

/* ---------- Reset, clear log ---------- */
$("resetBtn").addEventListener("click", () => {
  askConfirm("Reset books", "Replace all books with the sample set? Your changes will be lost.", "Reset", () => {
    books = sampleBooks();
    saveBooks();
    clearFilters();
    logActivity("reset", "Sample books restored");
    toast("Sample books restored.");
  });
});
$("clearLogBtn").addEventListener("click", () => { activity = []; saveLog(); renderActivity(); });

/* ---------- Theme ---------- */
function applyTheme(t) {
  document.documentElement.setAttribute("data-bs-theme", t);
  $("themeBtn").innerHTML = t === "dark" ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon-stars"></i>';
}
$("themeBtn").addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
  write(THEME_KEY, next);
});

/* ---------- Start ---------- */
function fillSelects() {
  const opts = CATEGORIES.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  $("category").innerHTML = opts;
  $("editCategory").innerHTML = opts;
  $("catFilter").innerHTML = `<option value="all">All categories</option>` + opts;
}
fillSelects();
applyTheme(read(THEME_KEY) || (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
books = loadBooks();
activity = Array.isArray(read(LOG_KEY)) ? read(LOG_KEY) : [];
renderActivity();
setView(read(VIEW_KEY) === "cards" ? "cards" : "table");
