const $ = (sel) => document.querySelector(sel);

const gridJurado = $("#grid");
const qJurado = $("#q");

const gridComp = $("#compGrid");
const qComp = $("#qc");

const modal = $("#modal");
const modalImg = $("#modalImg");
const modalTitle = $("#modalTitle");
const modalRole = $("#modalRole");
const modalBio = $("#modalBio");
const modalLinks = $("#modalLinks");

let jurado = [];
let juradoView = [];      // lo que está renderizado (para modal con filtros)
let competencia = [];
let competenciaView = []; // lo que está renderizado

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[m]));
}

/* =========================
   Modal Jurado
========================= */
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

/* =========================
   Render Jurado
========================= */
function renderJurado(list) {
  if (!gridJurado) return;

  juradoView = Array.isArray(list) ? list : [];

  if (!juradoView.length) {
    gridJurado.innerHTML = `<p class="note">No hay resultados.</p>`;
    return;
  }

  gridJurado.innerHTML = juradoView.map((p, idx) => `
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

function filterJurado() {
  if (!qJurado) return renderJurado(jurado);

  const term = (qJurado.value || "").trim().toLowerCase();
  if (!term) return renderJurado(jurado);

  const filtered = jurado.filter(p =>
    (p.name || "").toLowerCase().includes(term) ||
    (p.role || "").toLowerCase().includes(term) ||
    (p.tag || "").toLowerCase().includes(term)
  );

  renderJurado(filtered);
}

/* =========================
   Render Competencia
========================= */
function renderCompetencia(list) {
  if (!gridComp) return;

  competenciaView = Array.isArray(list) ? list : [];

  if (!competenciaView.length) {
    gridComp.innerHTML = `<p class="note">No hay resultados.</p>`;
    return;
  }

  gridComp.innerHTML = competenciaView.map((c, idx) => `
    <article class="card" aria-label="Competencia ${idx + 1}">
      <div class="card__body">
        <span class="badge">#${idx + 1}</span>
        <h3 class="card__name">${escapeHtml(c.song || "")}</h3>
        <p class="card__role"><strong>Intérprete:</strong> ${escapeHtml(c.performer || "")}</p>
        <p class="card__role"><strong>Representado por:</strong> ${escapeHtml(c.represented_by || "")}</p>
      </div>
    </article>
  `).join("");
}

function filterCompetencia() {
  if (!qComp) return renderCompetencia(competencia);

  const term = (qComp.value || "").trim().toLowerCase();
  if (!term) return renderCompetencia(competencia);

  const filtered = competencia.filter(c =>
    (c.song || "").toLowerCase().includes(term) ||
    (c.performer || "").toLowerCase().includes(term) ||
    (c.represented_by || "").toLowerCase().includes(term)
  );

  renderCompetencia(filtered);
}

/* =========================
   Eventos UI
========================= */
function wireEvents() {
  // Jurado: click / teclado abre modal
  if (gridJurado) {
    gridJurado.addEventListener("click", (e) => {
      const card = e.target.closest("[data-jurado-idx]");
      if (!card) return;
      const idx = Number(card.dataset.juradoIdx);
      openModal(juradoView[idx]);
    });

    gridJurado.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest("[data-jurado-idx]");
      if (!card) return;
      e.preventDefault();
      const idx = Number(card.dataset.juradoIdx);
      openModal(juradoView[idx]);
    });
  }

  // Buscadores
  if (qJurado) qJurado.addEventListener("input", filterJurado);
  if (qComp) qComp.addEventListener("input", filterCompetencia);

  // Modal cerrar
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target.matches("[data-close]")) closeModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.hidden) closeModal();
  });
}

/* =========================
   Init
========================= */
async function init() {
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  wireEvents();

  // Jurado (opcional)
  if (gridJurado) {
    try {
      const r = await fetch("assets/data/jurado.json", { cache: "no-store" });
      jurado = await r.json();
      renderJurado(jurado);
    } catch (err) {
      // Si no existe jurado.json, dejamos un mensaje (o puedes ocultar sección)
      gridJurado.innerHTML = `<p class="note">No se pudo cargar el jurado (falta <code>assets/data/jurado.json</code>).</p>`;
    }
  }

  // Competencia (recomendado que exista)
  if (gridComp) {
    try {
      const r = await fetch("assets/data/competencia.json", { cache: "no-store" });
      competencia = await r.json();
      renderCompetencia(competencia);
    } catch (err) {
      gridComp.innerHTML = `<p class="note">Error cargando competencia. Revisa <code>assets/data/competencia.json</code>.</p>`;
    }
  }
}

init().catch((err) => {
  console.error(err);
});

