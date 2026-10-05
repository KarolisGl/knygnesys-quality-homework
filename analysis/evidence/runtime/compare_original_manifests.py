from pathlib import Path

BEFORE = Path('/home/airuk/Desktop/knygnesys-quality-homework/analysis/evidence/runtime/Knygnesys-main-before.manifest')
AFTER = Path('/home/airuk/Desktop/knygnesys-quality-homework/analysis/evidence/runtime/Knygnesys-main-after.manifest')


def load(path: Path) -> dict[str, tuple[str, str]]:
    result = {}
    for line in path.read_text(encoding='utf-8').splitlines():
        digest, size, relative = line.split(' ', 2)
        result[relative] = (digest, size)
    return result


before = load(BEFORE)
after = load(AFTER)
added = sorted(set(after) - set(before))
removed = sorted(set(before) - set(after))
changed = sorted(path for path in set(after) & set(before) if after[path] != before[path])
print(f'before_files={len(before)} after_files={len(after)}')
print(f'added={len(added)} removed={len(removed)} changed={len(changed)}')
for label, paths in [('added', added), ('removed', removed), ('changed', changed)]:
    print(label + ':')
    for path in paths[:200]:
        print('  ' + path)
