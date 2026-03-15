/* ============================================
   Aaron Wiley for Utah House District 21
   Main JavaScript
   ============================================ */

// Scroll reveal animations
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.1 });
reveals.forEach(el => observer.observe(el));

// Mobile nav toggle
function toggleNav() {
  const links = document.querySelector('.nav-links');
  const right = document.querySelector('.nav-right');
  const open = links.style.display === 'flex';
  if (open) {
    links.style.display = 'none';
    right.style.display = 'none';
  } else {
    links.style.cssText = 'display:flex; flex-direction:column; position:absolute; top:68px; left:0; right:0; background:var(--navy); padding:20px 24px; gap:18px; z-index:98;';
    right.style.cssText = 'display:none;';
  }
}

// Form submit with Netlify
function handleSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('signupForm');
  const data = new FormData(form);
  fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(data).toString()
  }).catch(() => {});
  form.style.display = 'none';
  document.getElementById('formSuccess').style.display = 'block';
}
