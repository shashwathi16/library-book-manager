Problem 09: Library Book Manager
Team: Team01_LibraryManager

How to run: open index.html in a modern browser (internet needed once for Bootstrap, icons and fonts from CDN).

Pages
- index.html: Home (welcome, counts, featured shelf, links)
- shelves.html: wooden bookshelves per category; click a book spine to open, issue or return it
- catalogue.html: full catalogue (search, filter, sort, edit, remove, table/card view, CSV export)
- add.html: add one book or many books at once
- issued.html: who has which book, overdue list, return
All pages share the same saved data (localStorage).

Features
- Add a book: unique ID (case-insensitive), title, author, category, with validation
- Search by title, author, ID or category (press "/" to jump to the search box)
- Filter by category and by status (Available / Issued / Overdue); sort by title, author, ID, status or recently added
- Issue a book: borrower name + due date (default 14 days); Return a book
- Overdue detection with "Overdue Nd" badge and a late-return message
- Edit book details; Remove with confirmation (issued books cannot be removed)
- Table view and Card view
- Live counts: total, available, issued, overdue, plus a shelf-availability bar
- Recent activity log
- Export catalogue as CSV
- Light / Dark mode
- Data saved in localStorage; "Reset to sample books" restores the fictional demo data

Challenge: Build a small front-desk tool to manage a collection of books.
Requirements
- Add a book with title, author and unique book ID.
- Search books by title or author.
- Provide Issue and Return actions and show availability.
- Prevent issuing an already-issued book; persist the collection locally.

Acceptance checks (how to verify)
- New books appear and can be searched: add a book, then type part of its title/author in the search box.
- Issue/Return changes availability correctly: click Issue (name + due date), see "Issued"; click Return, see "Available"; counts update.
- Duplicate IDs and invalid issue actions are handled: re-use an ID (error shown); an issued book has no Issue button and cannot be removed.

Minimum demo: book entry form, searchable catalogue and availability status (all on the home screen).

Files: index.html, shelves.html, catalogue.html, add.html, issued.html, style.css, common.js, script.js
