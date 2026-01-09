import json, re
from urllib.request import Request, urlopen

TAG_URL = "https://www.epicentrochile.com/tag/olmue2026/"
OUT_FILE = "assets/data/noticias.json"

LIMIT = 12          # cuántas noticias quieres mostrar
MAX_PAGES = 5       # por si el tag crece y tiene /page/2/, /page/3/...

RE_POST_URL = re.compile(r'https://www\.epicentrochile\.com/\d{4}/\d{2}/\d{2}/[^"\s<>]+/?')
RE_OG_TITLE = re.compile(r'<meta\s+property="og:title"\s+content="([^"]+)"', re.IGNORECASE)
RE_PUB_TIME = re.compile(r'<meta\s+property="article:published_time"\s+content="([^"]+)"', re.IGNORECASE)
RE_H1 = re.compile(r'<h1[^>]*>(.*?)</h1>', re.IGNORECASE | re.DOTALL)

def fetch(url: str) -> str:
  req = Request(url, headers={"User-Agent": "Mozilla/5.0 (GitHub Actions)"})
  with urlopen(req, timeout=30) as r:
    return r.read().decode("utf-8", errors="ignore")

def clean_html(s: str) -> str:
  # Limpieza mínima (sin dependencias externas)
  s = re.sub(r"<[^>]+>", " ", s or "")
  s = s.replace("&nbsp;", " ").replace("&amp;", "&").replace("&quot;", "\"").replace("&#039;", "'")
  s = re.sub(r"\s+", " ", s).strip()
  return s

def get_post_meta(post_url: str) -> dict:
  html = fetch(post_url)

  title = ""
  m = RE_OG_TITLE.search(html)
  if m:
    title = clean_html(m.group(1))
  else:
    m = RE_H1.search(html)
    if m:
      title = clean_html(m.group(1))

  published = ""
  m = RE_PUB_TIME.search(html)
  if m:
    published = m.group(1).strip()  # suele venir ISO: 2025-12-22T13:25:00-03:00

  # fallback: fecha desde la URL (YYYY/MM/DD)
  if not published:
    mm = re.search(r"/(\d{4})/(\d{2})/(\d{2})/", post_url)
    if mm:
      published = f"{mm.group(1)}-{mm.group(2)}-{mm.group(3)}"

  return {"title": title or post_url, "date": published}

def main():
  urls_in_order = []
  seen = set()

  for page in range(1, MAX_PAGES + 1):
    page_url = TAG_URL if page == 1 else f"{TAG_URL}page/{page}/"
    html = fetch(page_url)

    found = RE_POST_URL.findall(html)
    if not found:
      break

    added_this_page = 0
    for u in found:
      # normaliza (sin fragmentos raros)
      u = u.split("#")[0]
      if u not in seen:
        seen.add(u)
        urls_in_order.append(u)
        added_this_page += 1
      if len(urls_in_order) >= LIMIT:
        break

    if len(urls_in_order) >= LIMIT:
      break
    if added_this_page == 0:
      break

  items = []
  for u in urls_in_order[:LIMIT]:
    meta = get_post_meta(u)
    items.append({
      "title": meta["title"],
      "url": u,
      "date": meta["date"]
    })

  payload = {"source": TAG_URL, "items": items}

  with open(OUT_FILE, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
  main()
