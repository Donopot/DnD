#!/usr/bin/env python3
"""Analyse et nettoie le CSS mort de styles.css.

Stratégie : 
1. Extraire toutes les règles CSS (sélecteur → bloc)
2. Vérifier si chaque classe est utilisée dans le code source
3. Supprimer les règles dont TOUS les sélecteurs de classe sont inutilisés
4. Garder les règles qui ont au moins UN sélecteur vivant
"""

import re, glob, sys
from pathlib import Path

ROOT = Path("/opt/data/workspace/DnD/frontend/src")

# ── 1. Lire tout le code source ──────────────────────────────────
print("1. Lecture du code source...")
src_text = ""
for pat in ["**/*.tsx", "**/*.ts"]:
    for f in ROOT.glob(pat):
        if "node_modules" in str(f):
            continue
        try:
            src_text += f.read_text() + "\n"
        except Exception:
            pass
print(f"   {len(src_text):,} caractères lus")

# ── 2. Extraire les classes CSS vivantes du source ───────────────
# On cherche className="cls" ou 'cls' ou className={`cls`} etc.
# Méthode simple : si le nom de classe apparaît dans le source, il est vivant
def is_alive(class_name: str) -> bool:
    if len(class_name) < 2:
        return False
    return class_name in src_text

# ── 3. Lire et parser styles.css ────────────────────────────────
print("\n2. Analyse de styles.css...")
css_path = ROOT / "styles.css"
css_text = css_path.read_text()
css_lines = css_text.split("\n")
print(f"   {len(css_lines):,} lignes")

# ── 4. Stratégie par bloc de règles ──────────────────────────────
# On parcourt ligne par ligne et on détecte les blocs { ... }
# Chaque bloc a un selecteur (lignes avant {) et un body (entre { et })

blocks = []  # [(selector_lines, body_lines, start_line_num)]

i = 0
while i < len(css_lines):
    line = css_lines[i].strip()
    
    # Skip empty lines, comments, @-rules, :root
    if not line or line.startswith("/*") or line.startswith("//") or line.startswith("*/"):
        i += 1
        continue
    
    # Skip @media, @keyframes, @supports blocks — handle separately
    if line.startswith("@"):
        # Find the matching closing brace for @-rules
        depth = 0
        j = i
        while j < len(css_lines):
            for ch in css_lines[j]:
                if ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        blocks.append((css_lines[i:j+1], [], i + 1))
                        i = j + 1
                        break
            if depth == 0:
                break
            j += 1
        else:
            i += 1
        continue
    
    # Regular CSS rule: collect selector lines until {
    selector_start = i
    brace_line = -1
    for j in range(i, min(i + 20, len(css_lines))):
        if "{" in css_lines[j]:
            brace_line = j
            break
    
    if brace_line == -1:
        i += 1
        continue
    
    # Collect selector text
    selector_lines = css_lines[i:brace_line + 1]
    
    # Find closing }
    depth = 0
    body_start = brace_line
    body_end = -1
    for j in range(brace_line, len(css_lines)):
        for ch in css_lines[j]:
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    body_end = j
                    break
        if body_end != -1:
            break
    
    if body_end == -1:
        i = brace_line + 1
        continue
    
    body_lines = css_lines[brace_line:body_end + 1]
    blocks.append((selector_lines, body_lines, selector_start + 1))
    i = body_end + 1

print(f"   {len(blocks)} blocs CSS détectés")

# ── 5. Pour chaque bloc, vérifier si ses classes sont vivantes ──
print("\n3. Détection du CSS mort...")

dead_blocks = []
alive_blocks = []
dead_bytes = 0

for selector_lines, body_lines, start_line in blocks:
    selector_text = " ".join(selector_lines)
    
    # Extraire les classes du sélecteur
    classes = set(re.findall(r'\.([a-zA-Z_][a-zA-Z0-9_-]*)', selector_text))
    ids = set(re.findall(r'#([a-zA-Z_][a-zA-Z0-9_-]*)', selector_text))
    
    # Éléments HTML seuls (sans classe/id) — on les garde
    element_selectors = set(re.findall(r'(?:^|[,>\s+])([a-zA-Z][a-zA-Z0-9]*)(?=[^{,]*(?:,|\{|\s|\.|#|:|\[))', selector_text))
    # Simplifié : si le sélecteur commence par un élément HTML simple sans classe
    has_bare_element = bool(re.match(r'^\s*[a-zA-Z][a-zA-Z0-9]*(?:\s*[,{])', selector_text.strip()))
    
    # Vérifier si TOUTES les classes sont mortes
    all_classes_dead = True
    any_class_alive = False
    for cls in classes:
        if is_alive(cls):
            any_class_alive = True
            all_classes_dead = False
            break
        # Vérification supplémentaire : parfois className utilise des compositions
        if f'"{cls}' in src_text or f"'{cls}" in src_text or f"`{cls}" in src_text:
            any_class_alive = True
            all_classes_dead = False
            break
    
    # Vérifier les IDs
    any_id_alive = False
    for id_ in ids:
        if is_alive(id_):
            any_id_alive = True
            break
    
    # Si aucune classe ni ID n'est vivant, et pas d'élément HTML nu → mort
    is_dead = False
    if classes and all_classes_dead and not any_id_alive:
        is_dead = True
    elif not classes and not ids and not has_bare_element:
        # Aucune classe, aucun ID, pas d'élément → probablement du bruit
        is_dead = True
    
    if is_dead:
        block_text = "\n".join(selector_lines + body_lines)
        dead_blocks.append((start_line, classes, block_text))
        dead_bytes += len(block_text)
    else:
        alive_blocks.append((start_line, selector_lines, body_lines))

print(f"   Blocs morts: {len(dead_blocks)}")
print(f"   Blocs vivants: {len(alive_blocks)}")
print(f"   Octets morts: {dead_bytes:,} ({dead_bytes/1024:.0f} KB)")

# ── 6. Afficher le top des blocs morts ────────────────────────────
print(f"\nTop 15 blocs morts (par taille):")
dead_by_size = sorted(dead_blocks, key=lambda x: -len(x[2]))
for start_line, classes, text in dead_by_size[:15]:
    class_list = ", ".join(sorted(classes)[:5])
    print(f"  L{start_line}: {len(text):5d} octets — .{class_list}")

# ── 7. Afficher un résumé pour le plan ────────────────────────────
print(f"\n{'='*60}")
print(f"RÉSUMÉ")
print(f"{'='*60}")
print(f"Total blocs:     {len(blocks)}")
print(f"Blocs vivants:   {len(alive_blocks)}")
print(f"Blocs morts:     {len(dead_blocks)} → {dead_bytes/1024:.1f} KB à supprimer")
print(f"Classes totales: ~732 (estimé)")
print(f"Économie:        {dead_bytes/len(css_text)*100:.1f}% du fichier")
