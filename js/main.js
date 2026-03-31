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
function closeNav() {
  document.querySelector('.nav-links').classList.remove('mobile-open');
  const btn = document.querySelector('.hamburger');
  btn.classList.remove('is-open');
  btn.setAttribute('aria-label', 'Open navigation menu');
}

function toggleNav() {
  const links = document.querySelector('.nav-links');
  const btn = document.querySelector('.hamburger');
  const isOpen = links.classList.contains('mobile-open');
  if (isOpen) {
    closeNav();
  } else {
    links.classList.add('mobile-open');
    btn.classList.add('is-open');
    btn.setAttribute('aria-label', 'Close navigation menu');
  }
}

// Close menu when a nav link is clicked
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', closeNav);
});

// Close menu when clicking outside the nav
document.addEventListener('click', (e) => {
  if (!e.target.closest('nav')) closeNav();
});

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
