#!/usr/bin/env python3
"""Detect monitor screen rect in desk-final.jpg and compose browser idle screenshot."""
from __future__ import annotations

import os
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
import numpy as np

ROOT = Path("/workspace")
ASSETS = ROOT / "assets"
PUBLIC = ROOT / "public"

DESK = ASSETS / "desk-final.jpg"
ROOTED = ASSETS / "rooted-nyc-screenshot.png"
SCREEN_CROP = ASSETS / "screen-crop-detect.jpg"
BROWSER_IDLE = PUBLIC / "browser-idle-screenshot.jpg"


def copy_assets() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    shutil.copy2(DESK, PUBLIC / "desk-final.jpg")
    shutil.copy2(ROOTED, PUBLIC / "rooted-nyc-screenshot.png")
    print(f"copied {PUBLIC / 'desk-final.jpg'}")
    print(f"copied {PUBLIC / 'rooted-nyc-screenshot.png'}")


def detect_screen(img: Image.Image) -> tuple[int, int, int, int]:
    """Return left, top, width, height in pixels for warm-gray screen content."""
    arr = np.array(img.convert("RGB"))
    h, w = arr.shape[:2]
    # Screen is warm light gray ~220 RGB, low chroma — not pure white.
    r, g, b = arr[:, :, 0].astype(np.int16), arr[:, :, 1].astype(np.int16), arr[:, :, 2].astype(np.int16)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    mean = (r + g + b) / 3.0
    chroma = mx - mn
    # Tuned for ~220 gray: allow 205-235, chroma < 12
    mask = (mean >= 205) & (mean <= 235) & (chroma <= 12)

    # Restrict search to center of image (monitor)
    y0, y1 = int(h * 0.18), int(h * 0.72)
    x0, x1 = int(w * 0.22), int(w * 0.78)
    roi = mask[y0:y1, x0:x1]

    # Row/col projections — avoid pixel BFS
    row_counts = roi.sum(axis=1)
    col_counts = roi.sum(axis=0)
    # Require a solid band of gray rows/cols
    row_thresh = max(20, int(0.15 * (x1 - x0)))
    col_thresh = max(20, int(0.15 * (y1 - y0)))
    rows = np.where(row_counts >= row_thresh)[0]
    cols = np.where(col_counts >= col_thresh)[0]
    if len(rows) == 0 or len(cols) == 0:
        raise RuntimeError("screen not found via projection")

    # Take largest contiguous run of rows and cols
    def largest_run(idxs: np.ndarray) -> tuple[int, int]:
        best_s, best_e, s = idxs[0], idxs[0], idxs[0]
        prev = idxs[0]
        for v in idxs[1:]:
            if v == prev + 1:
                prev = v
            else:
                if prev - s > best_e - best_s:
                    best_s, best_e = s, prev
                s = prev = v
        if prev - s > best_e - best_s:
            best_s, best_e = s, prev
        return int(best_s), int(best_e)

    rs, re = largest_run(rows)
    cs, ce = largest_run(cols)
    left = x0 + cs
    top = y0 + rs
    right = x0 + ce + 1
    bottom = y0 + re + 1
    # Tighten using actual mask inside box
    sub = mask[top:bottom, left:right]
    ys, xs = np.where(sub)
    if len(xs) == 0:
        raise RuntimeError("empty screen mask after projection")
    left = left + int(xs.min())
    right = left + int(xs.max()) + 1 - int(xs.min()) + (left - (left + int(xs.min())))
    # recompute cleanly
    left = (x0 + cs) + int(xs.min())
    top = (y0 + rs) + int(ys.min())
    right = (x0 + cs) + int(xs.max()) + 1
    bottom = (y0 + rs) + int(ys.max()) + 1
    pad = 3
    left, top, right, bottom = left + pad, top + pad, right - pad, bottom - pad
    return left, top, right - left, bottom - top


def compose_browser_idle(
    out_path: Path,
    content_path: Path,
    screen_w: int = 839,
    screen_h: int = 474,
) -> None:
    """Cover-fit the provided screenshot into the monitor rect — no gray frame, no extra chrome."""
    content = Image.open(content_path).convert("RGB")
    cw, ch = content.size
    scale = max(screen_w / cw, screen_h / ch)
    nw, nh = int(cw * scale + 0.5), int(ch * scale + 0.5)
    resized = content.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - screen_w) // 2
    # Prefer keeping the top (browser tabs); crop bottom if needed.
    top = 0
    if top + screen_h > nh:
        top = nh - screen_h
    out = resized.crop((left, top, left + screen_w, top + screen_h))
    out.save(out_path, quality=94, optimize=True)
    print(f"wrote {out_path} size={out.size}")


def main() -> None:
    copy_assets()

    desk = Image.open(DESK)
    print("desk size", desk.size, "mode", desk.mode)
    left, top, width, height = detect_screen(desk)
    w, h = desk.size
    lf, tf, wf, hf = left / w, top / h, width / w, height / h
    print("PIXELS left,top,width,height", left, top, width, height)
    print("FRACTIONS left,top,width,height", lf, tf, wf, hf)
    print(
        "PERCENTAGES left,top,width,height",
        f"{lf*100:.4f}%",
        f"{tf*100:.4f}%",
        f"{wf*100:.4f}%",
        f"{hf*100:.4f}%",
    )
    crop = desk.crop((left, top, left + width, top + height))
    crop.save(SCREEN_CROP, quality=95)
    print(f"wrote {SCREEN_CROP}")

    compose_browser_idle(BROWSER_IDLE, ROOTED, screen_w=width, screen_h=height)

    for p in [
        PUBLIC / "desk-final.jpg",
        PUBLIC / "rooted-nyc-screenshot.png",
        SCREEN_CROP,
        BROWSER_IDLE,
        ROOT / "package.json",
        ROOT / "src" / "main.tsx",
    ]:
        print(("OK" if p.exists() else "MISSING"), p, p.stat().st_size if p.exists() else 0)


if __name__ == "__main__":
    main()
