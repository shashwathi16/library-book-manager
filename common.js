/* Shared code for Home, Shelves, Add Books and Issued pages (same localStorage data as the Catalogue page) */
const KEY="library_books_v2",LOG="library_log_v2",CATS=["Programming","Web Development","Computer Science","Database","Fiction","Science","Other"];
const COL={"Programming":"#2F6FDB","Web Development":"#E0701B","Computer Science":"#7A4FD6","Database":"#0F9D8A","Fiction":"#D6477A","Science":"#3B9B3B","Other":"#7C8A96"};
const $=id=>document.getElementById(id);
const esc=t=>String(t).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const today=()=>iso(new Date());
const plus=(s,n)=>{const d=new Date(s+"T00:00:00");d.setDate(d.getDate()+n);return iso(d)};
const rd=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
const wr=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const mk=(id,title,author,category,borrower="",issuedOn="",dueOn="")=>({id,title,author,category,issued:!!borrower,borrower,issuedOn,dueOn});
const norm=b=>({id:String(b.id||""),title:String(b.title||""),author:String(b.author||""),category:CATS.includes(b.category)?b.category:"Other",issued:!!b.issued,borrower:b.issued?String(b.borrower||""):"",issuedOn:b.issuedOn||"",dueOn:b.dueOn||""});
function seed(){const t=today();return[mk("B101","Clean Code","Robert C. Martin","Programming"),mk("B102","Eloquent JavaScript","Marijn Haverbeke","Web Development"),mk("B103","You Don't Know JS","Kyle Simpson","Web Development","Asha Rao",plus(t,-12),plus(t,-2)),mk("B104","Introduction to Algorithms","Thomas H. Cormen","Computer Science"),mk("B105","The Pragmatic Programmer","Andrew Hunt","Programming"),mk("B106","Database System Concepts","Abraham Silberschatz","Database","Kiran Shetty",plus(t,-3),plus(t,11)),mk("B107","Operating System Concepts","Abraham Silberschatz","Computer Science"),mk("B108","Learning SQL","Alan Beaulieu","Database"),mk("B109","The Alchemist","Paulo Coelho","Fiction"),mk("B110","A Brief History of Time","Stephen Hawking","Science")]}
let books=(()=>{const s=rd(KEY)||rd("library_books_v1");return Array.isArray(s)?s.map(norm):seed()})();
const save=()=>wr(KEY,books);
const overdue=b=>b.issued&&b.dueOn&&b.dueOn<today();
function logA(type,text){const a=rd(LOG)||[];a.unshift({type,text,time:new Date().toISOString()});wr(LOG,a.slice(0,15))}
const badge=b=>!b.issued?'<span class="status-badge status-available">Available</span>':overdue(b)?'<span class="status-badge status-overdue">Overdue</span>':'<span class="status-badge status-issued">Issued</span>';

/* Book spines and wooden shelves */
function spine(b){const w=30+(b.title.length*3)%26,h=120+(b.title.charCodeAt(0)*7)%50;
  return `<button class="spine${b.issued?" out":""}" data-id="${esc(b.id)}" style="--c:${COL[b.category]||COL.Other};width:${w}px;height:${h}px" title="${esc(b.title)} by ${esc(b.author)} (${b.issued?"Issued":"Available"})"><span>${esc(b.title)}</span></button>`}
function caseHTML(name,list){let rows="";
  if(!list.length)rows='<div class="row-books"><em class="text-white-50 small">Empty shelf</em></div><div class="plank"></div>';
  for(let i=0;i<list.length;i+=14)rows+=`<div class="row-books">${list.slice(i,i+14).map(spine).join("")}</div><div class="plank"></div>`;
  return `<section class="case"><h2>${esc(name)} <small>(${list.length})</small></h2>${rows}</section>`}
document.addEventListener("click",e=>{const s=e.target.closest(".spine");if(s)openBook(s.dataset.id)});

/* Header, navigation, theme and the book details pop-up */
function boot(active){
  const links=[["home","index.html","Home"],["shelves","shelves.html","Shelves"],["cat","catalogue.html","Catalogue"],["add","add.html","Add Books"],["out","issued.html","Issued &amp; Returns"]];
  $("hdr").outerHTML=`<header class="hero"><div class="container hero-inner"><div class="brand"><span class="brand-icon"><i class="bi bi-book-half"></i></span><div><h1 class="site-title">Front Desk Library</h1><p class="site-sub mb-0">Add books, find them, and track who has them.</p></div></div><div class="hero-actions"><button class="btn btn-outline-light btn-sm" id="themeBtn" aria-label="Switch light or dark mode"></button></div></div><div class="container"><nav class="topnav">${links.map(l=>`<a href="${l[1]}"${l[0]===active?' class="active"':""}>${l[2]}</a>`).join("")}</nav></div></header>`;
  document.body.insertAdjacentHTML("beforeend",'<div class="modal fade" id="bm" tabindex="-1" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><h2 class="modal-title fs-5" id="bmT"></h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body" id="bmB"></div></div></div></div>');
  const th=t=>{document.documentElement.setAttribute("data-bs-theme",t);$("themeBtn").innerHTML=t==="dark"?'<i class="bi bi-sun"></i>':'<i class="bi bi-moon-stars"></i>'};
  th(rd("library_theme")||"light");
  $("themeBtn").onclick=()=>{const n=document.documentElement.getAttribute("data-bs-theme")==="dark"?"light":"dark";th(n);wr("library_theme",n)};
}
function openBook(id){const b=books.find(x=>x.id===id);if(!b)return;
  $("bmT").textContent=b.title;
  $("bmB").innerHTML=`<p class="mb-1"><b>${esc(b.author)}</b></p><p class="text-muted small">ID ${esc(b.id)} · ${esc(b.category)}</p>`+(b.issued
    ?`<p>${badge(b)} to ${esc(b.borrower)}, due ${esc(b.dueOn)}</p><button class="btn btn-outline-secondary" id="bmAct">Return book</button>`
    :`${badge(b)}<div class="mt-3"><input class="form-control mb-2" id="bmName" placeholder="Borrower name" maxlength="60"><input type="date" class="form-control mb-2" id="bmDue" min="${today()}" value="${plus(today(),14)}"><button class="btn btn-brand" id="bmAct">Issue book</button></div>`)+'<div class="text-danger small mt-2" id="bmErr"></div>';
  $("bmAct").onclick=()=>{
    if(b.issued){logA("return",`"${b.title}" returned by ${b.borrower}`);b.issued=false;b.borrower=b.issuedOn=b.dueOn=""}
    else{const n=$("bmName").value.trim(),d=$("bmDue").value;if(!n||!d||d<today()){$("bmErr").textContent="Enter the borrower name and a due date of today or later.";return}
      b.issued=true;b.borrower=n;b.issuedOn=today();b.dueOn=d;logA("issue",`"${b.title}" issued to ${n}, due ${d}`)}
    save();bootstrap.Modal.getInstance($("bm")).hide();if(window.onChange)onChange()};
  bootstrap.Modal.getOrCreateInstance($("bm")).show()}
