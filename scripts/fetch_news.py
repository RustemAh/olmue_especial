#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Genera assets/data/noticias.json para el minisite (GitHub Pages).

Estrategia:
1) Intentar WordPress REST API (wp-json) -> obtiene título, link, fecha, extracto.
2) Si falla (bloqueo, HTML en vez de JSON, rate limit, etc.), hacer fallback a HTML
   de la página del tag y extraer títulos + links.
3) Pase lo que pase, SIEMPRE escribe un JSON válido (nunca vacío).
"""

import json
import os
import re
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


# ---- Config ----
SITE = "https://www.epicentrochile.com"
TAG_SLUG = "olmue2026"
OUT_FILE = "assets/data/noticias.json"
LIMIT = 10
TIMEOUT = 40


# ---- Helpers ----
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def ensure_out_dir():
    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)

def write_payload(payload: dict):
    ensure_out_dir()
    payload.setdefault("generated_at", now_iso())
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

def strip_html(text: str) -> str:
    if not text:
        return ""
    # quita tags simples
    text = re.sub(r"<[^>]+>", " ", text)
    # decodificaciones mínimas
    text = (
        text.replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replace("&quot;", '"')
            .replace("&#039;", "'")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
    )
    text = re.sub(r"\s+", " ", text).strip()
    return text

def http_get_text(url: str, accept: str) -> str:
    req = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept": accept,
            "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
            "Connection": "close",
        },
    )
    with urlopen(req, timeout=TIMEOUT) as r:
        return r.read().decode("utf-8", errors="ignore")

def http_get_json(url: str):
    raw = http_get_text(url, accept="application/json,text/plain,*/*")
    # Si por bloqueo devuelve HTML, esto revienta: lo capturamos arriba.
    return json.loads(raw)


# ---- WP API (primario) ----
def fetch_from_wp_api():
    # 1) buscar tag_id por slug
    tags_url = f"{SITE}/wp-json/wp/v2/tags?slug={TAG_SLUG}&per_page=50"
    tags = http_get_json(tags_url)

    tag_id = None
    if isinstance(tags, list) and tags:
        tag_id = tags[0].get("id")

    # 2) fallback: search
    if not tag_id:
        tags_url = f"{SITE}/wp-json/wp/v2/tags?search={TAG_SLUG}&per_page=50"
        tags = http_get_json(tags_url)
        if isinstance(tags, list):
            for t in tags:
                if str(t.get("slug", "")).lower() == TAG_SLUG.lower():
                    tag_id = t.get("id")
                    break
            if not tag_id and tags:
                tag_id = tags[0].get("id")

    if not tag_id:
        raise RuntimeError(f"No se encontró el tag '{TAG_SLUG}' en wp-json.")

    # 3) traer posts
    posts_url = (
        f"{SITE}/wp-json/wp/v2/posts"
        f"?tags={tag_id}&per_page={LIMIT}"
        f"&_fields=link,date,title,excerpt"
    )
    posts = http_get_json(posts_url)
    if not isinstance(posts, list):
        raise RuntimeError("Respuesta inesperada de wp-json (no es lista).")

    items = []
    for p in posts:
        title = strip_html((p.get("title") or {}).get("rendered", ""))
        excerpt = strip_html((p.get("excerpt") or {}).get("rendered", ""))
        url = (p.get("link") or "").strip()
        date = (p.get("date") or "").strip()

        if title and url:
            items.append({"title": title, "url": url, "date": date, "excerpt": excerpt})

    return {
        "source": f"{SITE}/tag/{TAG_SLUG}/",
        "mode": "wp-json",
        "items": items,
    }


# ---- HTML fallback (secundario, sin dependencias) ----
class _TagHTMLParser(HTMLParser):
    """
    Intenta capturar links de posts del listado del tag.
    Nos enfocamos en anchors dentro de h2/h3 (títulos típicos).
    """
    def __init__(self):
        super().__init__()
        self.in_h = False          # dentro de h2/h3
        self.capture_a = False     # dentro de <a> que nos interesa
        self.current_href = ""
        self.current_text = []
        self.found = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs or [])
        if tag in ("h2", "h3"):
            self.in_h = True
        if tag == "a" and self.in_h:
            href = (attrs.get("href") or "").strip()
            if href:
                self.capture_a = True
                self.current_href = href
                self.current_text = []

    def handle_endtag(self, tag):
        if tag in ("h2", "h3"):
            self.in_h = False
        if tag == "a" and self.capture_a:
            title = strip_html("".join(self.current_text))
            href = self.current_href.strip()
            if title and href:
                self.found.append((title, href))
            self.capture_a = False
            self.current_href = ""
            self.current_text = []

    def handle_data(self, data):
        if self.capture_a and data:
            self.current_text.append(data)

def _normalize_link(href: str) -> str:
    href = href.strip()
    if href.startswith("//"):
        href = "https:" + href
    if href.startswith("/"):
        href = SITE.rstrip("/") + href
    return href

def fetch_from_html():
    url = f"{SITE}/tag/{TAG_SLUG}/"
    html = http_get_text(url, accept="text/html,application/xhtml+xml,*/*")

    parser = _TagHTMLParser()
    parser.feed(html)

    # Filtrar links razonables (evitar menú/footer)
    seen = set()
    items = []
    for title, href in parser.found:
        link = _normalize_link(href)

        # Heurística: mantener links del dominio y que parezcan posts
        if "epicentrochile.com" not in link:
            continue
        if f"/tag/{TAG_SLUG}/" in link:
            continue
        if link in seen:
            continue

        seen.add(link)
        items.append({"title": title, "url": link, "date": "", "excerpt": ""})
        if len(items) >= LIMIT:
            break

    if not items:
        # fallback ultra simple: regex para anchors (por si el HTML cambia)
        for m in re.finditer(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', html, re.I | re.S):
            link = _normalize_link(m.group(1))
            text = strip_html(m.group(2))
            if not text or "epicentrochile.com" not in link:
                continue
            if f"/tag/{TAG_SLUG}/" in link:
                continue
            if link in seen:
                continue
            seen.add(link)
            items.append({"title": text, "url": link, "date": "", "excerpt": ""})
            if len(items) >= LIMIT:
                break

    return {
        "source": url,
        "mode": "html-fallback",
        "items": items,
    }


def main():
    # 1) WP API primero
    try:
        payload = fetch_from_wp_api()
        # si wp-json respondió pero vino vacío, igual probamos HTML
        if payload.get("items"):
            write_payload(payload)
            return
        wp_note = "wp-json devolvió 0 items"
    except Exception as e:
        wp_note = f"wp-json falló: {repr(e)}"
        payload = None

    # 2) HTML fallback
    try:
        payload2 = fetch_from_html()
        payload2["note"] = wp_note
        write_payload(payload2)
        return
    except Exception as e:
        # 3) Nunca dejar vacío: escribir error diagnosticable
        write_payload({
            "source": f"{SITE}/tag/{TAG_SLUG}/",
            "mode": "error",
            "items": [],
            "error": repr(e),
            "note": wp_note
        })


if __name__ == "__main__":
    # Pase lo que pase, garantiza JSON válido (por si un bug inesperado escapa)
    try:
        main()
    except Exception as e:
        write_payload({
            "source": f"{SITE}/tag/{TAG_SLUG}/",
            "mode": "fatal-error",
            "items": [],
            "error": repr(e),
        })

