#!/usr/bin/env python3
"""將 pics/ 內所有圖片建立成縮圖，輸出到 thumbnail/。

需求：
    pip install pillow

預設：
- 會保留原始檔名
- 最長邊縮到 400px
- 依原圖比例縮放，不裁切
- 會自動修正 EXIF 方向
"""

from __future__ import annotations

from pathlib import Path
from typing import Iterable

try:
    from PIL import Image, ImageOps
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "找不到 Pillow。請先執行：pip install pillow"
    ) from exc

ROOT = Path(__file__).resolve().parent
PICS_DIR = ROOT / "pics"
THUMB_DIR = ROOT / "thumbnail"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tif", ".tiff"}
MAX_SIZE = (400, 400)
JPEG_QUALITY = 90
PNG_COMPRESS_LEVEL = 6


def iter_images(folder: Path) -> Iterable[Path]:
    for path in sorted(folder.iterdir(), key=lambda p: p.name.lower()):
        if path.is_file() and path.suffix.lower() in IMAGE_EXTS:
            yield path


def build_thumbnail(src: Path, dst: Path) -> None:
    with Image.open(src) as img:
        img = ImageOps.exif_transpose(img)

        # GIF 取第一幀，避免動畫 GIF 存檔錯誤
        if getattr(img, "is_animated", False):
            img.seek(0)

        # 部分模式不能直接輸出 JPEG / PNG
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA" if src.suffix.lower() in {".png", ".webp"} else "RGB")

        thumb = img.copy()
        thumb.thumbnail(MAX_SIZE)

        dst.parent.mkdir(parents=True, exist_ok=True)

        ext = dst.suffix.lower()
        save_kwargs = {}
        if ext in {".jpg", ".jpeg"}:
            if thumb.mode == "RGBA":
                bg = Image.new("RGB", thumb.size, (255, 255, 255))
                bg.paste(thumb, mask=thumb.getchannel("A"))
                thumb = bg
            else:
                thumb = thumb.convert("RGB")
            save_kwargs = {"quality": JPEG_QUALITY, "optimize": True}
        elif ext == ".png":
            save_kwargs = {"compress_level": PNG_COMPRESS_LEVEL, "optimize": True}
        elif ext == ".webp":
            save_kwargs = {"quality": JPEG_QUALITY, "method": 6}

        thumb.save(dst, **save_kwargs)


def main() -> None:
    PICS_DIR.mkdir(exist_ok=True)
    THUMB_DIR.mkdir(exist_ok=True)

    images = list(iter_images(PICS_DIR))
    if not images:
        print("pics/ 內沒有找到可處理的圖片。")
        return

    success = 0
    failed = 0

    for src in images:
        dst = THUMB_DIR / src.name
        try:
            build_thumbnail(src, dst)
            success += 1
            print(f"完成：{src.name} -> thumbnail/{src.name}")
        except Exception as err:
            failed += 1
            print(f"失敗：{src.name} ({err})")

    print("\n處理完成")
    print(f"成功：{success}")
    print(f"失敗：{failed}")
    print("接著可再執行 build_gallery.py 更新 gallery.json")


if __name__ == "__main__":
    main()
