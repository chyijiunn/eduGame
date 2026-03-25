#!/usr/bin/env python3
"""掃描 pics/ 與 thumbnail/，建立 gallery.json。"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PICS_DIR = ROOT / "pics"
THUMB_DIR = ROOT / "thumbnail"
OUTPUT = ROOT / "gallery.json"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}


def is_image(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in IMAGE_EXTS


def main() -> None:
    PICS_DIR.mkdir(exist_ok=True)
    THUMB_DIR.mkdir(exist_ok=True)

    photo_map = {p.name: p for p in PICS_DIR.iterdir() if is_image(p)}
    thumb_map = {p.name: p for p in THUMB_DIR.iterdir() if is_image(p)}

    shared_names = sorted(set(photo_map) & set(thumb_map), key=str.lower)

    gallery = [
        {
            "name": name,
            "thumbnail": f"thumbnail/{name}",
            "full": f"pics/{name}",
        }
        for name in shared_names
    ]

    OUTPUT.write_text(json.dumps(gallery, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"已建立 {OUTPUT.name}")
    print(f"共 {len(gallery)} 筆")
    missing_thumbs = sorted(set(photo_map) - set(thumb_map), key=str.lower)
    if missing_thumbs:
        print("以下原圖尚未有對應縮圖：")
        for name in missing_thumbs:
            print(f"  - {name}")


if __name__ == "__main__":
    main()
