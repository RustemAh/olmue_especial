import json
import re
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

SITE = "https://www.epicentrochile.com"
TAG_SLUG = "olmue2026"
OUT_FILE = "assets/data/noticias.json"
LIMIT = 10

def http_get_json(url: str):
  req = Request(
    url,
    headers={
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept": "application/json,text/plain,*/*",
      "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
      "Connection": "close",
    }
  )
  with urlopen(req, timeout=40) as r:
    data = r.read().decode("utf-8", errors="ignore")
  return json.loads(data)

def strip_html(s: str) -> str:
  s = s or ""
  s = re.sub(r"<[^>]+>", " ", s)
  s = s.replace("&nbsp;", " ").replace("&amp;", "&").replace("&quot;", "\"").replace("&#039;", "'")
  s = re.sub(r"\s+", " ", s).strip()
  return s

def main():
  # 1) Buscar el tag por slug/nombre
  tags_url = f"{SITE}/wp-json/wp/v2/tags?search={TAG_SLUG}&per_page=50"
  tags = http_get_json(tags_url)

  tag_id = None
  for t in tags:
    # preferimos match exacto por slug
    if str(t.get("slug", "")).lower() == TAG_SLUG.lower():
      tag_id = t.get("id")
      break
  if tag_id is None and tags:
    tag_id = tags[0].get("id")

  if not tag_id:
    raise RuntimeError(f"No se encontró el tag '{TAG_SLUG}' en la API.")

  # 2) Traer posts del tag
  posts_url = (
    f"{SITE}/wp-json/wp/v2/posts"
    f"?tags={tag_id}&per_page={LIMIT}"
    f"&_fields=link,date,title,excerpt"
  )
  posts = http_get_json(posts_url)

  items = []
  for p in posts:
    title = strip_html((p.get("title") or {}).get("rendered", ""))
    excerpt = strip_html((p.get("excerpt") or {}).get("rendered", ""))
    url = p.get("link", "")
    date = p.get("date", "")  # ISO

    if title and url:
      items.append({
        "title": title,
        "url": url,
        "date": date,
        "excerpt": excerpt
      })

  payload = {"source": f"{SITE}/tag/{TAG_SLUG}/", "items": items}

  # asegurar carpeta destino existe (por si corres local)
  import os
  os.makedirs("assets/data", exist_ok=True)

  with open(OUT_FILE, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
  try:
    main()
  except (HTTPError, URLError) as e:
    # Si el sitio bloquea, dejamos JSON vacío pero el workflow NO revienta.
    import os
    os.makedirs("assets/data", exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
      json.dump({"source": f"{SITE}/tag/{TAG_SLUG}/", "items": [], "error": str(e)}, f, ensure_ascii=False, indent=2)
