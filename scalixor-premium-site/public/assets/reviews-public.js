(() => {
  const list = document.querySelector('#publicReviews');
  const homeList = document.querySelector('#homepageReviews');
  const form = document.querySelector('#reviewForm');
  const message = document.querySelector('#reviewMessage');
  if (!list && !homeList && !form) return;
  const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const stars = rating => '★'.repeat(Number(rating) || 0) + '☆'.repeat(5 - (Number(rating) || 0));
  const setMessage = (text, error=false) => { if (!message) return; message.hidden=!text; message.textContent=text; message.classList.toggle('review-error',error); };

  async function loadReviews(){
    if(!list) return;
    try{
      const res=await fetch('/api/reviews',{cache:'no-store'}); const data=await res.json();
      if(!res.ok) throw new Error(data.error||'Unable to load reviews.');
      const reviews=(data.reviews||[]).filter(r=>r.status==='published');
      if(list){
        if(!reviews.length){list.innerHTML='<div class="review-empty">No approved reviews have been published yet. Be the first to share your experience.</div>';}
        else list.innerHTML=reviews.map(r=>`<article class="public-review"><div class="review-head"><div><div class="name">${escapeHTML(r.name)}</div>${r.company?`<div class="company">${escapeHTML(r.company)}</div>`:''}</div><div class="date">${new Date(r.createdAt).toLocaleDateString()}</div></div><div class="stars" aria-label="${r.rating} out of 5 stars">${stars(r.rating)}</div><div class="copy">${escapeHTML(r.review)}</div></article>`).join('');
      }
      if(homeList){
        if(!reviews.length) return;
        homeList.innerHTML=reviews.slice(0,3).map(r=>`<div class="testimonial reveal show"><div class="quote">“${escapeHTML(r.review)}”</div><div class="person"><div class="avatar">${escapeHTML((r.name||'S').charAt(0).toUpperCase())}</div><div><strong>${escapeHTML(r.name)}</strong><div style="color:var(--muted);font-size:12px">${escapeHTML(r.company||'Verified review')}</div></div></div></div>`).join('');
      }
    }catch(e){ if(list) list.innerHTML='<div class="review-empty">Approved reviews will appear here once the review service is connected on Netlify.</div>'; }
  }

  if(form){
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const button=form.querySelector('button[type="submit"]'); button.disabled=true; button.textContent='Sending…'; setMessage('');
      const body={name:form.name.value,email:form.email.value,company:form.company.value,rating:Number(form.rating.value),review:form.review.value,website:form.website.value};
      try{
        const res=await fetch('/api/reviews',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}); const data=await res.json();
        if(!res.ok) throw new Error(data.error||'Unable to submit your review.');
        form.reset(); setMessage(data.message||'Thank you. Your review has been received and is awaiting approval.');
      }catch(err){setMessage(err.message,true);}finally{button.disabled=false;button.textContent='Submit for approval →';}
    });
  }
  loadReviews();
})();
