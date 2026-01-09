import json, re
from urllib.request import Request, urlopen
from html import unescape

TAG_URL = "https://www.epicentrochile.com/tag/olmue2026/"
OUT_FILE = "assets/data/noticias.json"
LIMIT = 6

def fetch(url: str) -> str:
  req = Request(url, headers={"User-Agent": "Mozilla/5.0 (GitHub Actions)"})
  with urlopen(req, timeout=30) as r:
    return r.read().decode("utf-8", errors="ignore")

def clean_text(s: str) -> str:
  s = unescape(s or "")
  s = re.sub(r"<[^>]+>", " ", s)
  s = re.sub(r"\s+", " ", s).strip()
  return s

def main():
  html = fetch(TAG_URL)

  # Links típicos de posts WP: https://www.epicentrochile.com/YYYY/MM/DD/slug/
  link_re = re.compile(
    r'href="(https://www\.epicentrochile\.com/\d{4}/\d{2}/\d{2}/[^"]+/)"[^>]*>([^<]+)</a>'
  )

  items = []
  seen = set()

  for url, title in link_re.findall(html):
    title = clean_text(title)
    if not title or url in seen:
      continue
    seen.add(url)

    items.append({
      "title": title,
      "url": url,
      "excerpt": ""
    })

    if len(items) >= LIMIT:
      break

  payload = {"source": TAG_URL, "items": items}

  with open(OUT_FILE, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
  main()
