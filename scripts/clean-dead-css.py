#!/usr/bin/env python3
"""Nettoie le CSS mort de styles.css — supprime uniquement les blocs
dont TOUS les sélecteurs de classe/ID sont inutilisés dans le code source.

SÉCURITÉ :
- Ne supprime JAMAIS :root, html, body, *, [attr], @media, @keyframes
- Ne supprime pas les blocs avec des sélecteurs d'élément nu (button, input...)
- Vérifie chaque classe et ID individuellement
"""

import re
from pathlib import Path

ROOT = Path("/opt/data/workspace/DnD/frontend/src")
CSS_FILE = ROOT / "styles.css"
BACKUP_FILE = ROOT / "styles.css.bak"

# ── 1. Lire le code source ────────────────────────────────────────
print("📖 Lecture du code source...")
src_text = ""
for pat in ["**/*.tsx", "**/*.ts"]:
    for f in ROOT.glob(pat):
        if "node_modules" in str(f):
            continue
        try:
            src_text += f.read_text() + "\n"
        except Exception:
            pass

# ── 2. Lire le CSS ────────────────────────────────────────────────
print("📖 Lecture de styles.css...")
css_text = CSS_FILE.read_text()
css_lines = css_text.split("\n")

# Sauvegarde
BACKUP_FILE.write_text(css_text)
print(f"💾 Sauvegarde: {BACKUP_FILE}")

# ── 3. Fonctions utilitaires ──────────────────────────────────────
def is_used_in_source(cls_or_id):
    """Vérifie si une classe ou ID apparaît dans le code source."""
    if len(cls_or_id) < 2:
        return True  # trop court pour être fiable
    # Recherche simple + variantes className
    if cls_or_id in src_text:
        return True
    # Recherche dans className="..."
    if f'className="{cls_or_id}' in src_text:
        return True
    if f"className='{cls_or_id}" in src_text:
        return True
    tmpl = "className={`" + cls_or_id
    if tmpl in src_text:
        return True
    # Recherche comme classe dans une string
    if f'"{cls_or_id}"' in src_text:
        return True
    if f"'{cls_or_id}'" in src_text:
        return True
    return False

def extract_selectors(selector_text):
    """Extrait classes, IDs, et éléments HTML d'un sélecteur."""
    # Nettoyer les commentaires
    clean = re.sub(r'/\*.*?\*/', '', selector_text)
    
    classes = set(re.findall(r'\.([a-zA-Z_][a-zA-Z0-9_-]*)', clean))
    ids = set(re.findall(r'#([a-zA-Z_][a-zA-Z0-9_-]*)', clean))
    
    # Éléments HTML nus (pas de . ou # devant)
    # Un sélecteur comme "button.primary" a un élément "button"
    elements = set()
    # Séparer par virgule pour les sélecteurs multiples
    parts = clean.split(",")
    for part in parts:
        part = part.strip()
        # Premier mot avant tout . ou # ou : ou [ ou espace
        m = re.match(r'^([a-zA-Z][a-zA-Z0-9]*)', part)
        if m:
            el = m.group(1)
            if el not in ('from', 'to'):  # keyframes
                elements.add(el)
    
    return classes, ids, elements

def is_special_protected(selector_text):
    """Vérifie si le sélecteur contient des éléments protégés."""
    protected_patterns = [
        r':root', r'^\s*\*', r'html', r'body',
        r'\[',  # attribute selectors
        r'::',  # pseudo-elements
        r':before', r':after', r':hover', r':focus', r':active',
        r':nth-', r':first-', r':last-', r':not\(', r':has\(',
    ]
    for pat in protected_patterns:
        if re.search(pat, selector_text):
            return True
    return False

# ── 4. Parser et filtrer ──────────────────────────────────────────
print("🔍 Analyse et filtrage...")

output_lines = []
i = 0
removed_blocks = 0
removed_bytes = 0
kept_blocks = 0

while i < len(css_lines):
    line = css_lines[i]
    stripped = line.strip()
    
    # Passer les lignes vides et commentaires isolés
    if not stripped or stripped.startswith("/*") or stripped.startswith("//") or stripped == "*/":
        output_lines.append(line)
        i += 1
        continue
    
    # Gérer @media, @keyframes, @supports — on les garde toujours
    if stripped.startswith("@"):
        depth = 0
        j = i
        while j < len(css_lines):
            for ch in css_lines[j]:
                if ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        # Inclure tout le bloc
                        for k in range(i, j + 1):
                            output_lines.append(css_lines[k])
                        kept_blocks += 1
                        i = j + 1
                        break
            if depth == 0:
                break
            j += 1
        else:
            output_lines.append(line)
            i += 1
        continue
    
    # Gérer :root — toujours garder
    if re.match(r'^\s*:root', stripped):
        depth = 0
        j = i
        while j < len(css_lines):
            for ch in css_lines[j]:
                if ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        for k in range(i, j + 1):
                            output_lines.append(css_lines[k])
                        kept_blocks += 1
                        i = j + 1
                        break
            if depth == 0:
                break
            j += 1
        else:
            output_lines.append(line)
            i += 1
        continue
    
    # Collecter le bloc de règle
    brace_line = -1
    for j in range(i, min(i + 30, len(css_lines))):
        if "{" in css_lines[j]:
            brace_line = j
            break
    
    if brace_line == -1:
        output_lines.append(line)
        i += 1
        continue
    
    # Sélecteur (lignes i à brace_line)
    selector_text = " ".join(css_lines[k].split("/*")[0] for k in range(i, brace_line + 1))
    
    # Trouver la fermeture
    depth = 0
    end_line = -1
    for j in range(brace_line, len(css_lines)):
        for ch in css_lines[j]:
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end_line = j
                    break
        if end_line != -1:
            break
    
    if end_line == -1:
        output_lines.append(line)
        i += 1
        continue
    
    # Décider si on garde ou supprime
    should_keep = True
    
    # Protection spéciale
    if is_special_protected(selector_text):
        should_keep = True
    else:
        classes, ids, elements = extract_selectors(selector_text)
        
        # Si le sélecteur a des éléments HTML nus (button, input, div, etc.) → garder
        html_elements = {'html', 'body', 'head', 'div', 'span', 'p', 'a', 'img',
                        'button', 'input', 'textarea', 'select', 'option', 'form',
                        'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot',
                        'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                        'header', 'footer', 'nav', 'main', 'section', 'article',
                        'aside', 'details', 'summary', 'dialog', 'label', 'fieldset',
                        'legend', 'pre', 'code', 'blockquote', 'hr', 'br',
                        'svg', 'path', 'circle', 'rect', 'canvas', 'video', 'audio',
                        'strong', 'em', 'small', 'abbr', 'time', 'iframe'}
        
        has_html_element = bool(elements & html_elements)
        
        if has_html_element:
            should_keep = True
        elif classes or ids:
            # Vérifier si AU MOINS UNE classe ou ID est utilisé
            any_alive = False
            for cls in classes:
                if is_used_in_source(cls):
                    any_alive = True
                    break
            if not any_alive:
                for id_ in ids:
                    if is_used_in_source(id_):
                        any_alive = True
                        break
            
            if not any_alive:
                should_keep = False
    
    if should_keep:
        for k in range(i, end_line + 1):
            output_lines.append(css_lines[k])
        kept_blocks += 1
    else:
        block_text = "\n".join(css_lines[i:end_line + 1])
        removed_bytes += len(block_text)
        removed_blocks += 1
    
    i = end_line + 1

# ── 5. Écriture ────────────────────────────────────────────────────
output_text = "\n".join(output_lines)
CSS_FILE.write_text(output_text)

new_lines = len(output_lines)
old_lines = len(css_lines)

print(f"\n{'='*50}")
print(f"RÉSULTAT")
print(f"{'='*50}")
print(f"Blocs supprimés:  {removed_blocks}")
print(f"Blocs conservés:  {kept_blocks}")
print(f"Octets supprimés: {removed_bytes:,} ({removed_bytes/1024:.0f} KB)")
print(f"Lignes avant:     {old_lines:,}")
print(f"Lignes après:     {new_lines:,}")
print(f"Réduction:        {removed_bytes/len(css_text)*100:.1f}%")
print(f"\n📄 Fichier nettoyé: {CSS_FILE}")
print(f"💾 Backup:          {BACKUP_FILE}")
print(f"Pour restaurer: cp {BACKUP_FILE} {CSS_FILE}")
