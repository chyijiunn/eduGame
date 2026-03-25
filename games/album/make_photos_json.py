#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import argparse
from pathlib import Path


def natural_sort_key(path: Path):
    """讓檔名排序更直觀，例如 2 在 10 前面。"""
    import re
    parts = re.split(r'(\d+)', path.name.lower())
    return [int(p) if p.isdigit() else p for p in parts]


def main():
    parser = argparse.ArgumentParser(
        description="讀取資料夾中的檔案名稱，輸出成相簿網頁可用的 photos.json"
    )
    parser.add_argument(
        "folder",
        nargs="?",
        default="pics",
        help="要掃描的資料夾，預設為 pics"
    )
    parser.add_argument(
        "-o", "--output",
        default="photos.json",
        help="輸出的 JSON 檔名，預設為 photos.json"
    )
    parser.add_argument(
        "--ext",
        nargs="*",
        default=[".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"],
        help="要納入的副檔名，例如：--ext .jpg .png .webp"
    )

    args = parser.parse_args()

    folder = Path(args.folder)
    output = Path(args.output)
    allowed_ext = {ext.lower() if ext.startswith('.') else f'.{ext.lower()}' for ext in args.ext}

    if not folder.exists():
        raise SystemExit(f"找不到資料夾：{folder}")
    if not folder.is_dir():
        raise SystemExit(f"不是資料夾：{folder}")

    files = [
        p.name
        for p in sorted(folder.iterdir(), key=natural_sort_key)
        if p.is_file()
        and not p.name.startswith('.')
        and p.suffix.lower() in allowed_ext
    ]

    data = {"files": files}

    with output.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"已輸出：{output}")
    print(f"共 {len(files)} 個檔案")


if __name__ == "__main__":
    main()
