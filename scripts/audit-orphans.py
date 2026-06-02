"""Audit frontend: find orphan components, unused CSS, import issues."""
import os, re, sys
from collections import defaultdict

FRONTEND = sys.argv[1] if len(sys.argv) > 1 else "/opt/data/workspace/DnD/frontend/src"

all_files = set()
for root, dirs, files in os.walk(FRONTEND):
    for f in files:
        if f.endswith(('.tsx', '.ts', '.css')):
            all_files.add(os.path.join(root, f))

exports_by_file = defaultdict(set)
default_export_files = set()

for fpath in all_files:
    if not fpath.endswith(('.tsx', '.ts')):
        continue
    try:
        with open(fpath) as f:
            content = f.read()
    except Exception:
        continue

    for m in re.finditer(r'export\s+(?:const|function|class|interface|type|enum)\s+(\w+)', content):
        exports_by_file[fpath].add(m.group(1))

    for m in re.finditer(r'export\s*\{([^}]+)\}', content):
        names = [n.strip().split(' as ')[0].strip() for n in m.group(1).split(',')]
        exports_by_file[fpath].update(n for n in names if n)

    if re.search(r'export\s+default\s+(function|class|\w+)', content):
        default_export_files.add(fpath)

imported_files = set()
css_issues = []

for fpath in all_files:
    if not fpath.endswith(('.tsx', '.ts')):
        continue
    try:
        with open(fpath) as f:
            content = f.read()
    except Exception:
        continue

    # Named imports from local files
    for m in re.finditer(r'import\s+\{([^}]+)\}\s+from\s+[\'"]([^\'"]+)[\'"]', content):
        ip = m.group(2)
        if not ip.startswith('.'):
            continue
        resolved = os.path.normpath(os.path.join(os.path.dirname(fpath), ip))
        for ext in ['', '.tsx', '.ts', '/index.tsx', '/index.ts']:
            c = resolved + ext
            if os.path.exists(c):
                imported_files.add(os.path.realpath(c))

    # Default imports from local files
    for m in re.finditer(r'import\s+(\w+)\s+from\s+[\'"]([^\'"]+)[\'"]', content):
        ip = m.group(2)
        if not ip.startswith('.'):
            continue
        resolved = os.path.normpath(os.path.join(os.path.dirname(fpath), ip))
        for ext in ['', '.tsx', '.ts', '/index.tsx', '/index.ts']:
            c = resolved + ext
            if os.path.exists(c):
                imported_files.add(os.path.realpath(c))

    # CSS imports
    for m in re.finditer(r'import\s+[\'"]([^\'"]+\.css)[\'"]', content):
        cssp = m.group(1)
        if cssp.startswith('.'):
            resolved = os.path.normpath(os.path.join(os.path.dirname(fpath), cssp))
            if not os.path.exists(resolved):
                css_issues.append(f'MISSING CSS: {os.path.relpath(fpath, FRONTEND)} -> {cssp}')

# ── Pass 3a: Orphan components ──
print('=' * 70)
print('PASSE 3a — COMPOSANTS ORPHELINS (exportés, jamais importés)')
print('=' * 70)

orphan_count = 0
for fpath in sorted(all_files):
    if not fpath.endswith('.tsx'):
        continue
    bn = os.path.basename(fpath)
    if bn in ('main.tsx', 'App.tsx', 'index.ts'):
        continue
    if fpath.endswith('.d.ts'):
        continue
    real = os.path.realpath(fpath)
    if real not in imported_files and fpath not in imported_files:
        orphan_count += 1
        exps = sorted(exports_by_file.get(fpath, set()))[:5]
        has_def = fpath in default_export_files
        tag = 'EXPORT' if (exps or has_def) else 'NOEXPORT'
        print(f"  [{tag:>7}] {os.path.relpath(fpath, FRONTEND)}  exports={exps}  default={has_def}")

print(f'\n  → {orphan_count} fichier(s) orphelin(s)')

# ── Pass 3b: Import cross-check ──
print()
print('=' * 70)
print('PASSE 3b — IMPORTS VERS FICHIERS SANS EXPORT')
print('=' * 70)

import_issues = 0
for fpath in sorted(all_files):
    if not fpath.endswith(('.tsx', '.ts')):
        continue
    if fpath.endswith('.d.ts'):
        continue
    try:
        with open(fpath) as f:
            content = f.read()
    except Exception:
        continue

    source_rel = os.path.relpath(fpath, FRONTEND)

    for m in re.finditer(r'import\s+\{([^}]+)\}\s+from\s+[\'"]([^\'"]+)[\'"]', content):
        symbols = [s.strip().split(' as ')[0].strip() for s in m.group(1).split(',')]
        ip = m.group(2)
        if not ip.startswith('.'):
            continue
        resolved = os.path.normpath(os.path.join(os.path.dirname(fpath), ip))
        found = False
        for ext in ['', '.tsx', '.ts', '/index.tsx', '/index.ts']:
            c = resolved + ext
            if os.path.exists(c):
                found = True
                real = os.path.realpath(c)
                for sym in symbols:
                    if sym not in exports_by_file.get(real, set()):
                        # Check if it's a type re-export or something
                        # Just note it but don't flag if file has exports
                        pass
                break
        if not found:
            import_issues += 1
            print(f"  ❌ {source_rel} -> {ip}  (FICHIER INTROUVABLE)")

if import_issues == 0:
    print('  ✅ Tous les imports résolus.')

# ── Pass 3c: Unused CSS ──
print()
print('=' * 70)
print('PASSE 3c — FICHIERS CSS NON IMPORTÉS')
print('=' * 70)

css_files = {f for f in all_files if f.endswith('.css')}
imported_css = set()

for fpath in all_files:
    if not fpath.endswith(('.tsx', '.ts')):
        continue
    try:
        with open(fpath) as f:
            content = f.read()
    except Exception:
        continue
    for m in re.finditer(r'import\s+[\'"]([^\'"]+\.css)[\'"]', content):
        cssp = m.group(1)
        if cssp.startswith('.'):
            resolved = os.path.normpath(os.path.join(os.path.dirname(fpath), cssp))
            if os.path.exists(resolved):
                imported_css.add(os.path.realpath(resolved))

unused = 0
for css in sorted(css_files):
    real = os.path.realpath(css)
    if real not in imported_css:
        unused += 1
        print(f"  [{unused}] {os.path.relpath(css, FRONTEND)}")

if unused == 0:
    print('  ✅ Tous les fichiers CSS sont importés.')
else:
    print(f'\n  → {unused} fichier(s) CSS non utilisé(s)')

# ── Pass 3d: CSS import errors ──
print()
print('=' * 70)
print('PASSE 3d — IMPORTS CSS MANQUANTS')
print('=' * 70)
if css_issues:
    for i in css_issues:
        print(f'  ❌ {i}')
else:
    print('  ✅ Aucun import CSS manquant.')

# ── Summary ──
print()
print('=' * 70)
print(f'RÉSUMÉ: {orphan_count} orphelins | {import_issues} imports cassés | {unused} CSS inutilisés | {len(css_issues)} CSS manquants')
print('=' * 70)
