import json, re
from urllib.request import Request, urlopen
from html import unescape

TAG_URL = "https://www.epicentrochile.com/tag/olmue2026/"
OUT_FILE = "assets/data/noticias.json"
LIMIT = 10

def fetch(url: str) -> str:
  req = Request(url, headers={"User-Agent": "Mozilla/5.0 (GitHub Actions)"})
  with urlopen(req, timeout=30) as r:
    return r.read().decode("utf-8", errors="ignore")

def clean_text(s: str) -> str:
  s = unescape(s or "")
  s = re.sub(r"<[^>]+>", " ", s)
  s = re.sub(r"\s+", " ", s).strip()
  return s

# Ej: "lunes 22 diciembre de 2025"
DATE_RE = re.compile(
  r"^(lunes|martes|miércoles|jueves|viernes|sábado|domingo)\s+\d{1,2}\s+\w+\s+de\s+\d{4}",
  re.IGNORECASE
)

def main():
  html = fetch(TAG_URL)

  # Captura cada <li> del listado: <li><a href="...">TITULO</a> FECHA BAJADA </li>
  li_re = re.compile(
    r"<li[^>]*>\s*<a[^>]*href=\"(https://www\.epicentrochile\.com/[^\"]+)\"[^>]*>(.*?)</a>\s*(.*?)\s*</li>",
    re.IGNORECASE | re.DOTALL
  )

  items = []
  seen = set()

  for url, title_html, tail_html in li_re.findall(html):
    if url in seen:
      continue
    seen.add(url)

    title = clean_text(title_html)
    tail = clean_text(tail_html)

    date = ""
    excerpt = ""
    m = DATE_RE.match(tail)
    if m:
      date = m.group(0)
      excerpt = tail[len(date):].strip()
    else:
      excerpt = tail

    if title:
      items.append({
        "title": title,
        "url": url,
        "date": date,
        "excerpt": excerpt
      })

    if len(items) >= LIMIT:
      break

  payload = {"source": TAG_URL, "items": items}

  with open(OUT_FILE, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
  main()
