"""Identify dead CSS classes in old block (lines 280-984) of styles.css."""
import re
import os
import subprocess

CSS_PATH = "/opt/data/workspace/DnD/frontend/src/styles.css"
SRC_DIR = "/opt/data/workspace/DnD/frontend/src"

# Read the old block
with open(CSS_PATH) as f:
    lines = f.readlines()

# Extract lines 280-984 (1-indexed → 0-indexed)
old_block = "".join(lines[279:984])

# Find all CSS class selectors
class_pattern = re.findall(r'\.([a-zA-Z_][a-zA-Z0-9_-]*)', old_block)
unique_classes = sorted(set(class_pattern))
print(f"Unique CSS classes in old block (lines 280-984): {len(unique_classes)}")

# Search each class in all TSX files
dead = []
alive = []
for cls in unique_classes:
    # Skip common words that might false-match
    result = subprocess.run(
        ["grep", "-rl", cls, SRC_DIR],
        capture_output=True, text=True
    )
    if result.stdout.strip():
        alive.append(cls)
    else:
        dead.append(cls)

print(f"\nALIVE classes (used in TSX): {len(alive)}")
for c in alive:
    print(f"  .{c}")
print(f"\nDEAD classes (unused): {len(dead)}")
for c in dead:
    print(f"  .{c}")
