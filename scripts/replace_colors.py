"""Replace hardcoded colors with CSS variables in the GM/player shell sections."""
import re
import sys

CSS_PATH = sys.argv[1] if len(sys.argv) > 1 else "/opt/data/workspace/DnD/frontend/src/styles.css"

with open(CSS_PATH) as f:
    content = f.read()

# Map: hardcoded → CSS variable (ordered by specificity, most specific first)
REPLACEMENTS = [
    # Backgrounds
    ("background: #0f1923;", "background: var(--bg-primary);"),
    ("background: #0f1923", "background: var(--bg-primary)"),
    ("background: rgba(15, 25, 20, 0.95);", "background: var(--bg-secondary);"),
    ("background: rgba(15, 25, 20, 0.95)", "background: var(--bg-secondary)"),
    ("background: rgba(15, 25, 20, 0.92);", "background: rgba(15, 25, 35, 0.92);"),
    ("background: #1a2a24;", "background: var(--bg-surface);"),
    ("background: #1a2a24", "background: var(--bg-surface)"),
    ("background: rgba(26, 42, 36,", "background: rgba(var(--bg-surface-rgb, 26, 42, 36),"),
    ("background: var(--bg-card, #1a1a1a);", "background: var(--bg-card);"),
    # Borders
    ("border: 1px solid #2a3a2e;", "border: 1px solid var(--border-color);"),
    ("border: 1px solid #2a3a2e", "border: 1px solid var(--border-color)"),
    ("border-right: 1px solid #2a3a2e;", "border-right: 1px solid var(--border-color);"),
    ("border-bottom: 1px solid #2a3a2e;", "border-bottom: 1px solid var(--border-color);"),
    ("border-top: 1px solid #2a3a2e;", "border-top: 1px solid var(--border-color);"),
    ("border-left: 1px solid #2a3a2e;", "border-left: 1px solid var(--border-color);"),
    ("border-color: #2a3a2e;", "border-color: var(--border-color);"),
    ("border-color: #2a3a2e", "border-color: var(--border-color)"),
    ("1px solid #2a3a2e", "1px solid var(--border-color)"),
    # Text
    ("color: #e0dcc8;", "color: var(--text-primary);"),
    ("color: #e0dcc8", "color: var(--text-primary)"),
    ("color: #c0c0a0;", "color: var(--text-secondary);"),
    ("color: #c0c0a0", "color: var(--text-secondary)"),
    ("color: #a0a890;", "color: var(--text-tertiary);"),
    ("color: #a0a890", "color: var(--text-tertiary)"),
    ("color: #6a7a6e;", "color: var(--text-muted);"),
    ("color: #6a7a6e", "color: var(--text-muted)"),
    ("color: #f0ede0;", "color: var(--text-brand);"),
    ("color: #f0ede0", "color: var(--text-brand)"),
    # Accent
    ("color: #c5b358;", "color: var(--accent);"),
    ("color: #c5b358", "color: var(--accent)"),
    ("background: #c5b358;", "background: var(--accent);"),
    ("border-color: #c5b358;", "border-color: var(--accent);"),
    ("border: 1px solid #c5b358", "border: 1px solid var(--accent)"),
    ("rgba(197, 179, 88, 0.1)", "var(--accent-dim)"),
    ("rgba(197, 179, 88, 0.15)", "var(--accent-dim)"),
    ("rgba(197, 179, 88, 0.2)", "var(--accent-glow)"),
    ("rgba(197, 179, 88, 0.3)", "var(--accent-glow)"),
    # Brand green
    ("background: #1f5f43;", "background: var(--brand-green);"),
    ("background: #1f5f43", "background: var(--brand-green)"),
    ("color: #1f5f43;", "color: var(--brand-green);"),
    ("border-color: #1f5f43;", "border-color: var(--brand-green);"),
    ("rgba(31, 95, 67, 0.15)", "var(--brand-green-dim)"),
    ("rgba(31, 95, 67, 0.1)", "var(--brand-green-dim)"),
    ("rgba(31, 95, 67, 0.2)", "var(--brand-green-dim)"),
    # Danger
    ("color: #e06060;", "color: var(--danger);"),
    ("color: #e06060", "color: var(--danger)"),
    # Scrollbar
    ("background: #3a4a3e;", "background: var(--scrollbar-thumb);"),
    # Hover bg
    ("background: rgba(255, 255, 255, 0.04);", "background: var(--bg-hover);"),
    ("background: rgba(255, 255, 255, 0.05);", "background: var(--bg-hover);"),
    ("rgba(255, 255, 255, 0.04)", "var(--bg-hover)"),
    ("rgba(255, 255, 255, 0.05)", "var(--bg-hover)"),
    # Success
    ("color: #22c55e;", "color: var(--success);"),
    ("background: #22c55e;", "background: var(--success);"),
    # Token colors (keep hardcoded — they're dynamic user-set colors)
]

count = 0
for old, new in REPLACEMENTS:
    if old in content:
        content = content.replace(old, new)
        count += 1

with open(CSS_PATH, "w") as f:
    f.write(content)

# Count remaining hardcoded colors for report
remaining = len(re.findall(r'#[0-9a-fA-F]{6}', content))
print(f"Replacements applied: {count}")
print(f"Remaining hex colors: {remaining}")
print("Done.")
