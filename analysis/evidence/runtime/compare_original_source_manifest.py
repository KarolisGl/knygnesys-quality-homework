from pathlib import Path

BEFORE = Path('/home/airuk/Desktop/knygnesys-quality-homework/analysis/evidence/runtime/Knygnesys-main-before.manifest')
AFTER = Path('/home/airuk/Desktop/knygnesys-quality-homework/analysis/evidence/runtime/Knygnesys-main-after.manifest')

def source_lines(path: Path) -> set[str]:
    return {
        line for line in path.read_text(encoding='utf-8').splitlines()
        if '/target/' not in line and not line.endswith('/target')
    }

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
print('original_source_content_manifest=UNCHANGED')
