import { $setState } from './vendor/vanjejs.module.js'

// main.js
async function loadData() {
  const res = await fetch('./data.json');
  if (!res.ok) throw new Error(`Failed to fetch data.json: ${res.status}`);
  return res.json();
}

function setHref(id, href) {
  const el = document.getElementById(id);
  if (el && href) el.setAttribute('href', href);
}

function normalizeMailto(email) {
  return email ? `mailto:${email}` : '#';
}

function normalizeTel(phone) {
  // Strip non-digits except leading + for tel: link
  if (!phone) return '#';
  const cleaned = phone.trim().replace(/(?!^\+)[^\d]/g, '');
  return `tel:${cleaned}`;
}

async function init() {
  try {
    const data = await loadData();

    // Put the entire JSON under state key "data" for VaneJS
    $setState('data', data); // reactive text bindings update automatically. :contentReference[oaicite:2]{index=2}

    // Dynamic attributes (href, title) — set once on load
    setHref('githubLink', data.profile.github);
    setHref('linkedinLink', data.profile.linkedin);
    setHref('emailLinkHero', normalizeMailto(data.profile.email));
    setHref('emailLinkContact', normalizeMailto(data.profile.email));
    setHref('phoneLink', normalizeTel(data.profile.phone));

    // Page title
    if (data?.profile?.name) {
      document.title = `${data.profile.name.firstname} ${data.profile.name.lastname} - Portfolio`;
    }
  } catch (err) {
    console.error(err);
  }

  // existing site JS (scroll progress, menu, etc.) can stay below...
}

window.onload = init;
