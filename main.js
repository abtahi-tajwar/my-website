import { $setState } from "./vendor/vanjejs.module.js";

// main.js
async function loadData() {
  const res = await fetch("./data.json");
  if (!res.ok) throw new Error(`Failed to fetch data.json: ${res.status}`);
  return res.json();
}

function setHref(id, href) {
  const el = document.getElementById(id);
  if (el && href) el.setAttribute("href", href);
}

function normalizeMailto(email) {
  return email ? `mailto:${email}` : "#";
}

function normalizeTel(phone) {
  // Strip non-digits except leading + for tel: link
  if (!phone) return "#";
  const cleaned = phone.trim().replace(/(?!^\+)[^\d]/g, "");
  return `tel:${cleaned}`;
}

function updateProjectLinks () {
  document.querySelectorAll('.project-link').forEach(el => {
    const prid = el.getAttribute('data-prid');
    if (prid) {
      el.setAttribute('href', `/project/?id=${prid}`);
    }
  });
}

function initSourceAndDemoLinks() {
  document.querySelectorAll('.source-link').forEach(el => {
    const url = el.getAttribute('data-url');
    if (url) {
      el.setAttribute('href', url);
    } else {
      el.setAttribute('href', '#');
      el.classList.add('display-none');
    }
  });
}

async function init() {
  try {
    const data = await loadData();

    // Put the entire JSON under state key "data" for VaneJS
    $setState("data", data); // reactive text bindings update automatically. :contentReference[oaicite:2]{index=2}

    // const featuredProjects = data.projects.filter(p => p.featured);
    // console.log("Featured Projects:", featuredProjects, data.projects);
    // $setState('featuredProjects', featuredProjects);
    // const otherProjects = data.projects.filter(p => !p.featured);
    // $setState('otherProjects', otherProjects);

    $setState("projects", {
      featured: data.projects.filter((p) => p.featured),
      other: data.projects.filter((p) => !p.featured),
    });
    // Social links

    // Page title
    if (data?.profile?.name) {
      document.title = `${data.profile.name.firstname} ${data.profile.name.lastname} - Portfolio`;
    }

    updateProjectLinks();
    initSourceAndDemoLinks();
  } catch (err) {
    console.error(err);
  }

  // existing site JS (scroll progress, menu, etc.) can stay below...
}

window.onload = init;
