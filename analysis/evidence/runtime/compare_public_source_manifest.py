from pathlib import Path

ROOT = Path('/home/airuk/Desktop/knygnesys-quality-homework')
BEFORE = ROOT / 'analysis/evidence/runtime/knygnesys-quality-homework-before.manifest'
AFTER = ROOT / 'analysis/evidence/runtime/knygnesys-quality-homework-after.manifest'
ALLOWED_PREFIXES = ('analysis/runtime_smoke.py', 'analysis/runtime-analysis.md')

def source_lines(path: Path) -> set[str]:
    values = set()
    for line in path.read_text(encoding='utf-8').splitlines():
        relative = line.rsplit(' ', 1)[-1]
        if relative.startswith('analysis/evidence/runtime/'):
            continue
        if relative.startswith('knygnesys-app/target/') or relative == 'knygnesys-app/target':
            continue
        if relative in ALLOWED_PREFIXES:
            continue
        values.add(line)
    return values

before = source_lines(BEFORE)
after = source_lines(AFTER)
print(f'before_source_files={len(before)} after_source_files={len(after)}')
print(f'added_source={len(after - before)} removed_source={len(before - after)}')
print('added_source_paths:')
for line in sorted(after - before):
    print(f'  {line}')
print('removed_source_paths:')
for line in sorted(before - after):
    print(f'  {line}')
if before != after:
    raise SystemExit(1)
print('public_application_source_manifest=UNCHANGED')
