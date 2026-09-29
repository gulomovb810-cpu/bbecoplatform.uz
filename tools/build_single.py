#!/usr/bin/env python3
"""Mobil ilova va admin panelni bittadan mustaqil HTML faylga yig'adi (dist/).

Mahalliy <script src="..."> va <link rel="stylesheet" href="..."> fayllari HTML ichiga
joylashtiriladi; CDN kutubxonalari (Supabase, Leaflet, Chart.js, shriftlar) havola bo'lib qoladi.
Ishga tushirish:  python3 tools/build_single.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
TARGETS = [("index.html", "eco-report.html"), ("admin/index.html", "eco-admin.html")]


def is_local(url: str) -> bool:
    return not re.match(r"^(https?:)?//", url)


def inline(html_path: Path) -> str:
    base = html_path.parent
    html = html_path.read_text(encoding="utf-8")

    def script(m):
        src = m.group(1)
        if not is_local(src):
            return m.group(0)
        code = (base / src).read_text(encoding="utf-8").replace("</script", "<\\/script")
        return f"<script>/* {src} */\n{code}\n</script>"

    def style(m):
        href = m.group(1)
        if not is_local(href):
            return m.group(0)
        css = (base / href).read_text(encoding="utf-8")
        return f"<style>/* {href} */\n{css}\n</style>"

    html = re.sub(r'<script src="([^"]+)"></script>', script, html)
    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', style, html)
    left = [u for u in re.findall(r'(?:src|href)="([^"]+\.(?:js|css))"', html) if is_local(u)]
    if left:
        sys.exit(f"{html_path}: joylashtirilmagan mahalliy fayllar qoldi: {left}")
    return html


def main():
    DIST.mkdir(exist_ok=True)
    for src, out in TARGETS:
        html = inline(ROOT / src)
        (DIST / out).write_text(html, encoding="utf-8")
        print(f"dist/{out}: {len(html.encode('utf-8')) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
