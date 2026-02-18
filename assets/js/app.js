/**
 * Especial Viña 2026 - El Epicentro
 * Lógica central para carga de datos dinámicos
 */

const $ = (sel) => document.querySelector(sel);

// CONFIGURACIÓN DE RUTAS Y DATOS
const SHEET_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQK-V9ZNN6S14OYLQGFQJ_si0sR7r1kSFmJCgrBC1k6MtCoJuk8ObmJTwiCAeBTbUirne-R-G8d9mqx/pub?gid=0&single=true&output=csv';
const NEWS_DATA = 'assets/data/noticias.json';
const JURADO_DATA = 'assets/data/jurado.json';
const COMP_DATA = 'assets/data/competencia.json';

/* --- 1. CARGAR PROGRAMACIÓN (GOOGLE SHEETS) --- 
   Agrupa artistas por día en columnas verticales
-------------------------------------------------- */
async function loadParrilla() {
    const cont = $("#parrillaContainer");
    if (!cont) return;

    try {
        const r = await fetch(`${SHEET_CSV}&t=${new Date().getTime()}`);
        const text = await r.text();
        const filas = text.split(/\r?\n/).slice(1);
        
        const programacion = {};

        filas.forEach(f => {
            const cols = f.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (cols.length >= 2) {
                const dia = cols[0].replace(/"/g, "").trim();
                const artista = cols[1].replace(/"/g, "").trim();
                const img = cols[2] ? cols[2].replace(/"/g, "").trim() : "";

                if (!programacion[dia]) programacion[dia] = [];
                programacion[dia].push({ nombre: artista, foto: img });
            }
        });

        cont.innerHTML = '';

        for (const dia in programacion) {
            const artistasHTML = programacion[dia].map(art => `
                <div class="artista-mini">
                    <img src="${art.foto || 'https://via.placeholder.com/50'}" alt="${art.nombre}" loading="lazy">
                    <span>${art.nombre}</span>
                </div>
            `).join('');

            cont.innerHTML += `
                <article class="dia-columna">
                    <div class="dia-header">${dia}</div>
                    <div class="dia-artistas">
                        ${artistasHTML}
                    </div>
                </article>
            `;
        }
    } catch (e) {
        console.error("Error Sheets:", e);
        cont.innerHTML = "<p class='note'>Actualizando programación...</p>";
    }
}

/* --- 2. CARGAR NOTICIAS (JSON WP) --- 
--------------------------------------- */
async function loadNews() {
    const list = $("#newsList");
    if (!list) return;

    try {
        const r = await fetch(`${NEWS_DATA}?t=${Date.now()}`);
        const data = await r.json();
        
        if (data.items && data.items.length > 0) {
            list.innerHTML = data.items.map(n => `
                <li class="newsitem">
                    <a href="${n.url}" target="_blank" rel="noopener noreferrer">${n.title}</a>
                </li>
            `).join('');
        } else {
            list.innerHTML = "<li class='newsitem'>No hay noticias disponibles en este momento.</li>";
        }
    } catch (e) {
        list.innerHTML = "<li class='newsitem'>Sincronizando con El Epicentro...</li>";
    }
}

/* --- 3. CARGAR JURADO --- 
--------------------------- */
async function loadJurado() {
    const grid = $("#grid");
    if (!grid) return;

    try {
        const r = await fetch(JURADO_DATA);
        const data = await r.json();
        window.juradoData = data;
        
        grid.innerHTML = data.map((p, i) => `
            <div class="card" onclick="showJurado(${i})" role="button" tabindex="0">
                <img src="${p.photo}" alt="${p.name}" loading="lazy">
                <div class="card__body">
                    <h4 style="margin:0; font-size:15px;">${p.name}</h4>
                    <small style="color:var(--muted)">${p.role}</small>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error("Error Jurado:", e); }
}

/* --- 4. CARGAR COMPETENCIA (INTERNACIONAL Y FOLCLÓRICA) --- 
------------------------------------------------------------ */
async function loadCompetencia() {
    const grid = $("#compGrid");
    if (!grid) return;

    try {
        const r = await fetch(COMP_DATA);
        const data = await r.json();
        
        grid.innerHTML = data.map((c) => `
            <article class="card" style="background: #0b2a5b; border-left: 5px solid ${c.category === 'Folclórica' ? 'var(--naranja)' : 'var(--magenta)'}; color: white;">
                <div class="card__body">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span class="badge" style="background: rgba(255,255,255,0.1); border:none; color:white; font-size:10px; padding: 2px 6px; border-radius:4px;">${c.category}</span>
                        <span style="font-size:12px; font-weight:800; color:var(--naranja)">${c.country}</span>
                    </div>
                    <h3 style="margin:0; font-size:15px; color:#fff;">${c.song}</h3>
                    <p style="margin:5px 0 0; font-size:13px; opacity:0.8;">${c.performer}</p>
                </div>
            </article>
        `).join("");
    } catch (e) { console.error("Error Competencia:", e); }
}

/* --- CONTROL DEL MODAL --- 
---------------------------- */
window.showJurado = (i) => {
    const p = window.juradoData[i];
    if(!p) return;

    $("#modalImg").src = p.photo;
    $("#modalTitle").textContent = p.name;
    $("#modalBio").textContent = p.bio;
    
    const modal = $("#modal");
    modal.classList.add('is-active');
    document.body.style.overflow = "hidden";
}

const closeModal = () => {
    $("#modal").classList.remove('is-active');
    document.body.style.overflow = "auto";
};

// Asignación de eventos de cierre
if($("#closeModal")) $("#closeModal").onclick = closeModal;
if($("#btnCerrarModal")) $("#btnCerrarModal").onclick = closeModal;

// Cierre con tecla Escape
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
});

/* --- INICIALIZACIÓN --- 
------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    // Actualizar año en footer
    const yearSpan = $("#year");
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    
    // Ejecutar todas las cargas
    loadParrilla();
    loadNews();
    loadJurado();
    loadCompetencia();
});
