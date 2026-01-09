const $ = (sel) => document.querySelector(sel);

const gridJurado = $("#grid");
const gridComp = $("#compGrid");
const newsList = $("#newsList");

const modal = $("#modal");
const modalImg = $("#modalImg");
const modalTitle = $("#modalTitle");
const modalRole = $("#modalRole");
const modalBio = $("#modalBio");
const modalLinks = $("#modalLinks");

let jurado = [];
let competencia = [];

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[m]));
}

/* ===== Modal Jurado ===== */
function openModal(person) {
  if (!modal || !person) return;

  modalImg.src = person.photo || "";
  modalImg.alt = person.name ? `Foto de ${person.name}` : "Foto";

  modalTitle.textContent = person.name || "";
  modalRole.textContent = person.role || "";
  modalBio.textContent = person.bio || "";

  if (Array.isArray(person.links) && person.links.length) {
    modalLinks.innerHTML = person.links
      .map(l => `<a href="${l.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)}</a>`)
      .join(" · ");
  } else {
    modalLinks.innerHTML = "";
  }

  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = "";
}

/* ===== Render Jurado ===== */
function renderJurado(list) {
  if (!gridJurado) return;

  if (!list.length) {
    gridJurado.innerHTML = `<p class="note">No hay jurado para mostrar.</p>`;
    return;
  }

  gridJurado.innerHTML = list.map((p, idx) => `
    <article class="card" role="button" tabindex="0"
      aria-label="Ver ${escapeHtml(p.name || "integrante")}"
      data-jurado-idx="${idx}">
      <div class="card__media">
        <img src="${p.photo || ""}" alt="Foto de ${escapeHtml(p.name || "")}" loading="lazy" />
      </div>
      <div class="card__body">
        <h3 class="card__name">${escapeHtml(p.name || "")}</h3>
        <p class="card__role">${escapeHtml(p.role || "")}</p>
        ${p.tag ? `<span class="badge">● ${escapeHtml(p.tag)}</span>` : ""}
      </div>
    </article>
  `).join("");
}

/* ===== Render Competencia ===== */
function renderCompetencia(list) {
  if (!gridComp) return;

  if (!list.length) {
    gridComp.innerHTML = `<p class="note">No hay competencia para mostrar.</p>`;
    return;
  }

  gridComp.innerHTML = list.map((c, idx) => `
    <article class="card card--comp" aria-label="Competencia ${idx + 1}">
      <div class="card__body">
        <span class="badge">#${idx + 1}</span>
        <h3 class="card__name">${escapeHtml(c.song || "")}</h3>
        <p class="card__role"><strong>Intérprete:</strong> ${escapeHtml(c.performer || "")}</p>
        <p class="card__role"><strong>Representado por:</strong> ${escapeHtml(c.represented_by || "")}</p>
      </div>
    </article>
  `).join("");
}

/* ===== Noticias (SIN FECHAS, solo títulos) ===== */
function renderNews(items) {
  if (!newsList) return;

  if (!items || !items.length) {
    newsList.innerHTML = `
      <li class="newsitem">
        <span class="newsitem__title">No hay noticias disponibles por ahora.</span>
      </li>`;
    return;
  }

  newsList.innerHTML = items.map(n => `
    <li class="newsitem">
      <a class="newsitem__title" href="${n.url}" target="_blank" rel="noopener noreferrer">
        ${escapeHtml(n.title || "")}
      </a>
    </li>
  `).join("");
}

async function loadNews() {
  if (!newsList) return;
  try {
    const r = await fetch("assets/data/noticias.json", { cache: "no-store" });
    const data = await r.json();
    renderNews(data.items || []);
  } catch (e) {
    renderNews([]);
  }
}

/* ===== Eventos UI ===== */
function wireEvents() {
  if (gridJurado) {
    gridJurado.addEventListener("click", (e) => {
      const card = e.target.closest("[data-jurado-idx]");
      if (!card) return;
      const idx = Number(card.dataset.juradoIdx);
      openModal(jurado[idx]);
    });

    gridJurado.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest("[data-jurado-idx]");
      if (!card) return;
      e.preventDefault();
      const idx = Number(card.dataset.juradoIdx);
      openModal(jurado[idx]);
    });
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target.matches("[data-close]")) closeModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.hidden) closeModal();
  });
}

/* ===== Init ===== */
async function init() {
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  wireEvents();

  // Jurado
  if (gridJurado) {
    try {
      const r = await fetch("assets/data/jurado.json", { cache: "no-store" });
      jurado = await r.json();
      renderJurado(jurado);
    } catch (e) {
      gridJurado.innerHTML = `<p class="note">No se pudo cargar el jurado.</p>`;
    }
  }

  // Competencia
  if (gridComp) {
    try {
      const r = await fetch("assets/data/competencia.json", { cache: "no-store" });
      competencia = await r.json();
      renderCompetencia(competencia);
    } catch (e) {
      gridComp.innerHTML = `<p class="note">No se pudo cargar la competencia.</p>`;
    }
  }

  // Noticias
  await loadNews();
}

init().catch(console.error);

