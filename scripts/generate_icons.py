"""Generate D&D VTT PWA icons — D20 themed."""
from PIL import Image, ImageDraw
import math
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "frontend", "public")
OUT = os.path.abspath(OUT)

# Theme
BG = (13, 17, 23)
ACCENT = (31, 95, 67)
GOLD = (212, 175, 55)
WHITE = (240, 240, 240)
DRAGON_RED = (180, 50, 50)


def draw_d20(size, name):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = size / 2, size / 2

    # Rounded background
    m = size * 0.06
    d.rounded_rectangle(
        [m, m, size - m, size - m],
        radius=size * 0.18, fill=BG,
    )

    # Outer ring
    rm = size * 0.10
    d.rounded_rectangle(
        [rm, rm, size - rm, size - rm],
        radius=size * 0.15,
        outline=ACCENT,
        width=max(2, int(size * 0.03)),
    )

    # D20 center circle
    inner_r = size * 0.30
    d.ellipse(
        [cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r],
        fill=ACCENT, outline=GOLD,
        width=max(2, int(size * 0.02)),
    )

    # "20" inside
    if size >= 96:
        lw = max(2, int(size * 0.045))
        ts = size * 0.22
        x0 = cx - ts * 0.48
        y0 = cy - ts * 0.50
        w2 = ts * 0.46
        h2 = ts * 0.90

        # 2
        pts2 = [
            (x0, y0),
            (x0 + w2, y0),
            (x0 + w2, y0 + h2 * 0.42),
            (x0, y0 + h2 * 0.42),
            (x0, y0 + h2 * 0.95),
            (x0 + w2, y0 + h2 * 0.95),
        ]
        d.line(pts2, fill=WHITE, width=lw, joint="curve")

        # 0
        r0 = ts * 0.26
        x0b = cx + ts * 0.06
        d.ellipse(
            [x0b, y0 + ts * 0.05, x0b + r0 * 2, y0 + ts * 0.05 + r0 * 2],
            outline=WHITE, width=lw,
        )

    # Corner triangles (d20 faces)
    for ang in [30, 150, 210, 330]:
        rad = math.radians(ang)
        tx = cx + math.cos(rad) * size * 0.36
        ty = cy + math.sin(rad) * size * 0.36
        tri = size * 0.055
        d.polygon(
            [(tx, ty - tri),
             (tx - tri * 0.87, ty + tri * 0.5),
             (tx + tri * 0.87, ty + tri * 0.5)],
            fill=GOLD,
        )

    path = os.path.join(OUT, name)
    img.save(path, "PNG")
    print(f"  ✓ {name}  ({size}×{size})")
    return path


def draw_favicon(size, name):
    """Simplified icon for favicon (small sizes)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = size / 2, size / 2

    # Solid rounded square
    d.rounded_rectangle(
        [1, 1, size - 1, size - 1],
        radius=size * 0.22, fill=BG,
    )
    d.rounded_rectangle(
        [1, 1, size - 1, size - 1],
        radius=size * 0.22,
        outline=ACCENT, width=max(2, size // 16),
    )

    # Simple D20
    r = size * 0.28
    d.ellipse(
        [cx - r, cy - r, cx + r, cy + r],
        fill=ACCENT, outline=GOLD,
        width=max(1, size // 20),
    )

    # Corner dots
    for ang in [30, 150, 210, 330]:
        rad = math.radians(ang)
        tx = cx + math.cos(rad) * size * 0.34
        ty = cy + math.sin(rad) * size * 0.34
        dot_r = max(1, size // 18)
        d.ellipse(
            [tx - dot_r, ty - dot_r, tx + dot_r, ty + dot_r],
            fill=GOLD,
        )

    path = os.path.join(OUT, name)
    img.save(path, "PNG")
    print(f"  ✓ {name}  ({size}×{size})")
    return path


if __name__ == "__main__":
    print("Generating D&D VTT icons...\n")
    os.makedirs(OUT, exist_ok=True)

    draw_d20(512, "icon-512.png")
    draw_d20(192, "icon-192.png")
    draw_d20(180, "icon-180.png")      # apple-touch-icon
    draw_favicon(32, "favicon-32.png")
    draw_favicon(16, "favicon-16.png")

    # Also generate apple-touch-icon alias
    import shutil
    shutil.copy(os.path.join(OUT, "icon-180.png"), os.path.join(OUT, "apple-touch-icon.png"))
    print("  ✓ apple-touch-icon.png  (alias → icon-180.png)")

    print(f"\nAll icons saved to {OUT}/")
