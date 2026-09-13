#!/usr/bin/env python3
"""Regenerate public/sketchbook-zoom.mp4 — perspective dolly from book box → desk.

Book box is the red annotation on assets/desk-book-bbox.jpg
(normalized LTRB ≈ 0.1684, 0.8376, 0.3890, 0.9398 on desk-final.jpg).
Clip timeline is zoom-OUT (book → desk); the app plays it reverse on enter.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DESK = ROOT / "public" / "desk-final.jpg"
OUT = ROOT / "public" / "sketchbook-zoom.mp4"

# Red book box (image-normalized)
L, T, R, B = 0.1684, 0.8376, 0.3890, 0.9398
W, H, FPS, N = 1280, 720, 24, 96


def ease(t: float) -> float:
    t = float(np.clip(t, 0, 1))
    return t * t * (3 - 2 * t)


def apply_H(H: np.ndarray, pts: np.ndarray) -> np.ndarray:
    ph = cv2.convertPointsToHomogeneous(pts).reshape(-1, 3).T
    out = H @ ph
    out = out[:2] / out[2]
    return out.T.astype(np.float32)


def main() -> None:
    desk = cv2.imread(str(DESK))
    if desk is None:
        raise SystemExit(f"missing {DESK}")
    dh, dw = desk.shape[:2]

    bl, bt, br, bb = L * dw, T * dh, R * dw, B * dh
    px, py = (br - bl) * 0.05, (bb - bt) * 0.12
    bl -= px
    br += px
    bt -= py
    bb += py
    cx = (bl + br) / 2
    far = (br - bl) * 0.92
    near = (br - bl) * 1.08
    book = np.array(
        [
            [cx - far / 2, bt],
            [cx + far / 2, bt],
            [cx + near / 2, bb],
            [cx - near / 2, bb],
        ],
        np.float32,
    )

    m = 0.03
    dst = np.array(
        [[W * m, H * m], [W * (1 - m), H * m], [W * (1 - m), H * (1 - m)], [W * m, H * (1 - m)]],
        np.float32,
    )

    s = max(W / dw, H / dh)
    cw, ch = W / s, H / s
    x0, y0 = (dw - cw) / 2, (dh - ch) / 2
    full_src = np.array(
        [[x0, y0], [x0 + cw, y0], [x0 + cw, y0 + ch], [x0, y0 + ch]], np.float32
    )
    full_dst = np.array([[0, 0], [W, 0], [W, H], [0, H]], np.float32)

    H_close = cv2.getPerspectiveTransform(book, dst)
    close_frustum = apply_H(np.linalg.inv(H_close), full_dst)

    tmp = Path("/tmp/sketchbook-zoom-build.mp4")
    wr = cv2.VideoWriter(str(tmp), cv2.VideoWriter_fourcc(*"mp4v"), FPS, (W, H))
    for i in range(N):
        t = i / (N - 1)
        u = ease(np.clip((t - 0.02) / 0.98, 0, 1))
        fr = close_frustum * (1 - u) + full_src * u
        Hm = cv2.getPerspectiveTransform(fr.astype(np.float32), full_dst)
        frame = cv2.warpPerspective(
            desk,
            Hm,
            (W, H),
            flags=cv2.INTER_LANCZOS4,
            borderMode=cv2.BORDER_REPLICATE,
        )
        wr.write(frame)
    wr.release()

    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(tmp),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-crf",
            "16",
            "-preset",
            "medium",
            "-movflags",
            "+faststart",
            "-r",
            str(FPS),
            str(OUT),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
