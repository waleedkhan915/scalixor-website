(() => {
  const loginView = document.querySelector('#loginView');
  const adminView = document.querySelector('#adminView');
  const loginForm = document.querySelector('#loginForm');
  const loginMessage = document.querySelector('#loginMessage');
  const adminMessage = document.querySelector('#adminMessage');
  const reviewList = document.querySelector('#reviewList');
  const editModal = document.querySelector('#editModal');
  const editForm = document.querySelector('#editForm');
  const editMessage = document.querySelector('#editMessage');
  const filters = [...document.querySelectorAll('.filter-btn')];
  let reviews = [];
  let activeFilter = 'all';
  let password = sessionStorage.getItem('scalixor-admin-password') || '';

  const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const stars = rating => '★'.repeat(Number(rating) || 0) + '☆'.repeat(5 - (Number(rating) || 0));
  const notice = (el, text, error = false) => { el.textContent = text; el.hidden = !text; el.classList.toggle('admin-error', error); };

  function render() {
    const pending = reviews.filter(r => r.status === 'pending').length;
    const published = reviews.filter(r => r.status === 'published').length;
    const rejected = reviews.filter(r => r.status === 'rejected').length;
    document.querySelector('#pendingCount').textContent = pending;
    document.querySelector('#publishedCount').textContent = published;
    document.querySelector('#rejectedCount').textContent = rejected;
    const shown = activeFilter === 'all' ? reviews : reviews.filter(r => r.status === activeFilter);
    if (!shown.length) { reviewList.innerHTML = '<div class="empty">No reviews in this view yet.</div>'; return; }
    reviewList.innerHTML = shown.map(r => `
      <article class="review-row">
        <div>
          <div class="review-meta"><span class="review-name">${escapeHTML(r.name)}</span><span class="badge ${escapeHTML(r.status)}">${escapeHTML(r.status)}</span>${r.featured ? '<span class="badge">Featured</span>' : ''}<span class="review-date">${new Date(r.createdAt).toLocaleString()}</span></div>
          <div class="review-stars" aria-label="${r.rating} out of 5 stars">${stars(r.rating)}</div>
          <div class="review-copy">${escapeHTML(r.review)}</div>
          ${r.company ? `<div class="review-company">${escapeHTML(r.company)}</div>` : ''}
          <div class="review-email">${escapeHTML(r.email)}</div>
        </div>
        <div class="review-actions">
          ${r.status !== 'published' ? `<button class="admin-btn primary" data-action="publish" data-id="${r.id}">Approve</button>` : `<button class="admin-btn" data-action="unpublish" data-id="${r.id}">Move to pending</button>`}
          ${r.status !== 'rejected' ? `<button class="admin-btn" data-action="reject" data-id="${r.id}">Reject</button>` : `<button class="admin-btn" data-action="restore" data-id="${r.id}">Restore</button>`}
          <button class="admin-btn" data-action="edit" data-id="${r.id}">Edit</button>
          <button class="admin-btn danger" data-action="delete" data-id="${r.id}">Delete</button>
        </div>
      </article>`).join('');
  }

  async function api(url = '/api/reviews', options = {}) {
    const headers = { ...(options.headers || {}) };
    if (password) headers['x-scalixor-admin-password'] = password;
    if (options.body && !headers['content-type']) headers['content-type'] = 'application/json';
    const res = await fetch(url, { ...options, headers, cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }

  async function load() {
    notice(adminMessage, 'Loading…');
    try { const data = await api('/api/reviews?admin=1'); reviews = data.reviews || []; notice(adminMessage, ''); render(); }
    catch (e) { if (/Unauthorized/i.test(e.message)) { sessionStorage.removeItem('scalixor-admin-password'); password=''; showLogin(); notice(loginMessage, 'That password was not accepted.', true); } else notice(adminMessage, e.message, true); }
  }

  function showLogin() { loginView.hidden = false; adminView.hidden = true; }
  function showAdmin() { loginView.hidden = true; adminView.hidden = false; load(); }

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    password = document.querySelector('#adminPassword').value;
    notice(loginMessage, 'Checking…');
    try { const data = await api('/api/reviews?admin=1'); sessionStorage.setItem('scalixor-admin-password', password); reviews = data.reviews || []; notice(loginMessage, ''); showAdmin(); }
    catch (err) { password=''; notice(loginMessage, err.message || 'Login failed.', true); }
  });

  document.querySelector('#logoutBtn').addEventListener('click', () => { sessionStorage.removeItem('scalixor-admin-password'); password=''; showLogin(); });
  document.querySelector('#refreshBtn').addEventListener('click', load);
  filters.forEach(btn => btn.addEventListener('click', () => { filters.forEach(x => x.classList.remove('active')); btn.classList.add('active'); activeFilter=btn.dataset.filter; render(); }));

  reviewList.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]'); if (!btn) return;
    const id = btn.dataset.id; const review = reviews.find(r => r.id === id); if (!review) return;
    const action = btn.dataset.action;
    if (action === 'edit') return openEdit(review);
    if (action === 'delete') { if (!confirm(`Delete the review from ${review.name}? This cannot be undone.`)) return; try { await api(`/api/reviews?id=${encodeURIComponent(id)}`, { method:'DELETE' }); await load(); } catch (err) { notice(adminMessage, err.message, true); } return; }
    const status = action === 'publish' ? 'published' : action === 'reject' ? 'rejected' : action === 'restore' || action === 'unpublish' ? 'pending' : review.status;
    try { await api(`/api/reviews?id=${encodeURIComponent(id)}`, { method:'PUT', body:JSON.stringify({ ...review, status }) }); await load(); }
    catch (err) { notice(adminMessage, err.message, true); }
  });

  function openEdit(r) {
    document.querySelector('#editId').value=r.id; document.querySelector('#editName').value=r.name||''; document.querySelector('#editEmail').value=r.email||''; document.querySelector('#editCompany').value=r.company||''; document.querySelector('#editRating').value=String(r.rating||5); document.querySelector('#editStatus').value=r.status||'pending'; document.querySelector('#editFeatured').value=String(Boolean(r.featured)); document.querySelector('#editReview').value=r.review||''; notice(editMessage,''); editModal.classList.add('open'); editModal.setAttribute('aria-hidden','false');
  }
  function closeEdit(){editModal.classList.remove('open');editModal.setAttribute('aria-hidden','true');}
  document.querySelector('#closeModal').addEventListener('click',closeEdit); document.querySelector('#cancelEdit').addEventListener('click',closeEdit); editModal.addEventListener('click',e=>{if(e.target===editModal)closeEdit();});
  editForm.addEventListener('submit', async e => { e.preventDefault(); const id=document.querySelector('#editId').value; const payload={name:document.querySelector('#editName').value,email:document.querySelector('#editEmail').value,company:document.querySelector('#editCompany').value,rating:Number(document.querySelector('#editRating').value),status:document.querySelector('#editStatus').value,featured:document.querySelector('#editFeatured').value==='true',review:document.querySelector('#editReview').value}; notice(editMessage,'Saving…'); try{await api(`/api/reviews?id=${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify(payload)});closeEdit();await load();}catch(err){notice(editMessage,err.message,true);} });

  if (password) showAdmin(); else showLogin();
})();
