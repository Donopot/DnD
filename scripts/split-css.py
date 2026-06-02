#!/usr/bin/env python3
"""Split styles.css into 12 modular CSS files under styles/

Preserves cascade order by writing each module in the order
its sections appear in the original file.
"""

import re
from pathlib import Path
from collections import defaultdict

ROOT = Path("/opt/data/workspace/DnD/frontend/src")
CSS_FILE = ROOT / "styles.css"
STYLES_DIR = ROOT / "styles"

# ── 1. Module definitions ─────────────────────────────────────────
MODULES = {
    "tokens.css":     ["Palette", "Alias", "Espacements", "Arrondis", "Ombres", "Scrollbar", "Global defaults", "Re-cascade aliases", "Design System"],
    "reset.css":      ["Reset", "normalize"],
    "typography.css": ["Typographie", "fonts", "polices"],
    "components.css": ["Visibility controls", "GmCharacterInspector modal", "Dice Roller", "Session Stats", "Lazy loading", "Bestiary", "Dungeon Generator", "Character Wizard", "Homebrew Panel", "Edit Character Sheet", "Journal Enhancement", "Personal Characters Section"],
    "shell-gm.css":   ["GM Campaign Shell", "GM Lobby", "Campaign View Tabs", "Campaign overview", "Floating Panels", "Handouts", "Communication MJ", "MapTools", "Character row", "Rules Reference", "Token upgrades", "Combat Tracker", "Encounter Builder", "Quick Actions Bar", "Phase 10-3H", "Phase 10-3G", "Phase 10-2B", "Phase 10-3C",
                       "GM-2D-CSS", "GM-2C", "GM-2D", "GM-2E", "GM-2F", "GM-2G", "GM panel", "GM global", "GM roadmap", "GM workspace", "Sprint 1", "Sprint GM-2A", "Sprint GM-2C", "Sprint GM-2D", "Sprint GM-2E", "Sprint GM-2F", "Sprint GM-2G",
                       "Stabilisation", "Standardized panel", "Standardized GM",
                       "R4-6 global workspace", "R4-7 session quick",
                       "Token detail standard", "Party summary", "Initiative", "Visibility inspector",
                       "Quick Actions compact", "Session Live modes", "GM main interface tabs", "GM workspace target"],
    "map.css":        ["Phase 9", "CampaignMap", "Fog of War", "AoE shape", "AoE labels", "Token condition", "Minimap", "Scene transition", "Snap highlight", "Token snap", "Token state", "Player: Map tab"],
    "widgets.css":    ["Phase 10-1", "Phase 10-2A", "Phase 10-2C", "Phase 10-2D", "Phase 10-2E", "Phase 10-3B", "Phase 10-3E", "floating widget"],
    "player.css":     ["Player View", "Player:", "Player Campaign", "Player Lobby", "Player tab", "Quick d20", "Compact player"],
    "lobby-auth.css": ["AuthPage", "AuthView", "Invite", "Landing", "Lobby:", "GM Lobby"],
    "responsive.css": ["Responsive", "scroll horizontally", "collapses to top bar", "narrow screens", "stack vertically", "panels go below"],
    "themes.css":     ["focus", "reduced-motion", "light theme", "accessibility"],
}

def match_section(name, keywords):
    """Check if section name matches any keyword."""
    name_lower = name.lower()
    for kw in keywords:
        if kw.lower() in name_lower:
            return True
    return False

# ── 2. Parse sections from styles.css ─────────────────────────────
print("📖 Parsing sections...")
text = CSS_FILE.read_text()
lines = text.split("\n")

# Find all section boundaries
section_markers = []  # [(line_num, is_start, section_name)]

for i, line in enumerate(lines):
    stripped = line.strip()
    
    # ── Style markers
    m = re.match(r'/\*\s*(?:─+|={3,})\s*(.+?)\s*(?:─+|={3,})\s*\*/', stripped)
    if m:
        section_markers.append((i, "start", m.group(1).strip()))
        continue
    
    # Phase markers
    m2 = re.match(r'/\*\s*(Phase \d+.*?)\s*\*/', stripped)
    if m2:
        section_markers.append((i, "start", m2.group(1).strip()))
        continue
    
    # R4 markers
    m3 = re.match(r'/\*\s*(R\d+-\d+.*?)\s*\*/', stripped)
    if m3:
        section_markers.append((i, "start", m3.group(1).strip()))
        continue
    
    # Sprint markers
    m4 = re.match(r'/\*\s*(Sprint .*?)\s*\*/', stripped)
    if m4:
        section_markers.append((i, "start", m4.group(1).strip()))
        continue
    
    # GM roadmap markers
    m5 = re.match(r'/\*\s*(GM.*?)\s*\*/', stripped)
    if m5:
        section_markers.append((i, "start", m5.group(1).strip()))
        continue
    
    # Stabilisation markers
    m6 = re.match(r'/\*\s*(Stabilisation.*?)\s*\*/', stripped)
    if m6:
        section_markers.append((i, "start", m6.group(1).strip()))
        continue

# Add pseudo-section for the :root block at the very start
# Lines 1-1658 were mostly tokens/globals

# Group: sections are from one marker to the next
sections = []
for idx in range(len(section_markers)):
    start_line = section_markers[idx][0]
    name = section_markers[idx][2]
    
    if idx + 1 < len(section_markers):
        end_line = section_markers[idx + 1][0]
    else:
        end_line = len(lines)
    
    sections.append((name, start_line, end_line))

# ── 3. Include the pre-section content (lines 1 to first marker) ──
first_marker = section_markers[0][0] if section_markers else 0
if first_marker > 0:
    sections.insert(0, ("Design System (tokens/globals)", 0, first_marker))

# ── 4. Assign sections to modules ─────────────────────────────────
print("🔀 Assigning sections to modules...")
module_contents = defaultdict(list)  # module_name -> [(section_name, lines)]

unassigned = []
for name, start, end in sections:
    section_lines = lines[start:end]
    # Skip empty sections
    content = "\n".join(section_lines).strip()
    if not content:
        continue
    
    assigned = None
    for mod, keywords in MODULES.items():
        if match_section(name, keywords):
            assigned = mod
            break
    
    if assigned:
        module_contents[assigned].append((name, section_lines))
    else:
        unassigned.append((name, len(section_lines)))

# ── 5. Stats ──────────────────────────────────────────────────────
total_assigned = sum(
    sum(len(lines) for _, lines in sections)
    for sections in module_contents.values()
)
total_unassigned = sum(size for _, size in unassigned)
total_lines = sum(end - start for _, start, end in sections)

print(f"\n📊 Répartition:")
for mod in sorted(module_contents.keys()):
    count = len(module_contents[mod])
    size = sum(len(lines) for _, lines in module_contents[mod])
    print(f"  {mod:20s} : {count:2d} sections, {size:4d} lignes")

if unassigned:
    print(f"\n⚠️  {len(unassigned)} sections non-assignées ({total_unassigned} lignes):")
    for name, size in sorted(unassigned, key=lambda x: -x[1])[:15]:
        print(f"  {name[:70]} ({size} lignes)")

# ── 6. Write module files ─────────────────────────────────────────
STYLES_DIR.mkdir(exist_ok=True)
print(f"\n📝 Écriture des modules dans {STYLES_DIR}/...")

# Module order (cascade order matters!)
MODULE_ORDER = [
    "tokens.css",
    "reset.css",
    "typography.css",
    "components.css",
    "shell-gm.css",
    "map.css",
    "widgets.css",
    "player.css",
    "lobby-auth.css",
    "responsive.css",
    "themes.css",
]

for mod in MODULE_ORDER:
    if mod not in module_contents:
        # Create empty stub
        (STYLES_DIR / mod).write_text(f"/* {mod} — (vide, à remplir) */\n")
        print(f"  {mod}: stub (vide)")
        continue
    
    out_lines = []
    out_lines.append(f"/* {mod} — auto-extracted from styles.css */")
    out_lines.append("")
    
    for section_name, section_lines in module_contents[mod]:
        out_lines.append(f"/* ── {section_name} ── */")
        out_lines.extend(section_lines)
        out_lines.append("")
    
    content = "\n".join(out_lines)
    (STYLES_DIR / mod).write_text(content)
    size_kb = len(content) / 1024
    print(f"  {mod}: {len(out_lines)} lignes, {size_kb:.1f} KB")

# ── 7. Create index.css ───────────────────────────────────────────
print(f"\n📝 Création de index.css...")
index_lines = [
    "/* DnD VTT — Design System (modular CSS) */",
    "/* Auto-generated from styles.css via scripts/split-css.py */",
    "",
]
for mod in MODULE_ORDER:
    index_lines.append(f'@import "./{mod}";')

(STYLES_DIR / "index.css").write_text("\n".join(index_lines) + "\n")

# ── 8. Summary ────────────────────────────────────────────────────
print(f"\n{'='*50}")
print(f"Terminé !")
print(f"{'='*50}")
print(f"Modules créés: {len(module_contents)}")
print(f"Sections non-assignées: {len(unassigned)}")
if unassigned:
    print(f"⚠️  Vérifier les sections non-assignées ci-dessus")
print(f"\nProchaine étape: mettre à jour App.tsx")
print(f"  Remplacer: import './styles.css'")
print(f"  Par:       import './styles/index.css'")
