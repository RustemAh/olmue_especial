const $ = (sel) => document.querySelector(sel);

const grid = $("#grid");
const q = $("#q");
const modal = $("#modal");

const modalImg = $("#modalImg");
const modalTitle = $("#modalTitle");
const modalRole = $("#modalRole");
const modalBio = $("#modalBio");
const modalLinks = $("#modalLinks");

let data = [];

function escapeHtml(str = "") {
  return str.replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[m]));
}

function render(list) {
  if (!list.length) {
    grid.innerHTML = `<p class="note">No hay resultados.</p>`;
    return;
  }

  grid.innerHTML = list.map((p, idx) => `
    <article class="card" role="button" tabindex="0" aria-label="Ver ${escapeHtml(p.name)}" data-idx="${idx}">
      <div class="card__media">
        <img src="${p.photo}" alt="Foto de ${escapeHtml(p.name)}" loading="lazy" />
      </div>
      <div class="card__body">
        <h3 class="card__name">${escapeHtml(p.name)}</h3>
        <p class="card__role">${escapeHtml(p.role || "")}</p>
        ${p.tag ? `<span class="badge">● ${escapeHtml(p.tag)}</span>` : ""}
      </div>
    </article>
  `).join("");
}

function openModal(person) {
  modalImg.src = person.photo;
  modalImg.alt = `Foto de ${person.name}`;
  modalTitle.textContent = person.name;
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
  modal.hidden = true;
  document.body.style.overflow = "";
}

function applyFilter() {
  const term = (q.value || "").trim().toLowerCase();
  if (!term) return render(data);

  const filtered = data.filter(p =>
    (p.name || "").toLowerCase().includes(term) ||
    (p.role || "").toLowerCase().includes(term) ||
    (p.tag || "").toLowerCase().includes(term)
  );
  render(filtered);
}

async function init() {
  $("#year").textContent = String(new Date().getFullYear());

  // Nota: si abres el HTML con doble click (file://) el fetch puede fallar.
  // En GitHub Pages funciona perfecto.
  const res = await fetch("assets/data/jurado.json", { cache: "no-store" });
  data = await res.json();

  render(data);

  q.addEventListener("input", applyFilter);

  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    const idx = Number(card.dataset.idx);
    openModal(data[idx]);
  });

  grid.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".card");
    if (!card) return;
    e.preventDefault();
    const idx = Number(card.dataset.idx);
    openModal(data[idx]);
  });

  modal.addEventListener("click", (e) => {
    if (e.target.matches("[data-close]")) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });
}

init().catch(err => {
  console.error(err);
  grid.innerHTML = `<p class="note">Error cargando datos. Revisa la consola.</p>`;
});
