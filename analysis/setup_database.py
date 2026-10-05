"""Apply the published migrations to a NEW disposable local demo database.
This demonstration uses psql, not Flyway; do not use on an existing database.
"""
from pathlib import Path
import subprocess
ROOT = Path(__file__).resolve().parents[1]
CONTAINER = 'knygnesys-homework-db'
CMD = ['podman', 'exec', '-i', CONTAINER, 'psql', '-U', 'knygnesys_demo', '-d', 'knygnesys_homework', '-v', 'ON_ERROR_STOP=1']
check = subprocess.run(CMD + ['-Atc', "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"], text=True, capture_output=True, check=True)
if check.stdout.strip() != '0':
    raise SystemExit('Refused: demo database is not empty. No migrations were applied.')
files = sorted((ROOT/'db-migration/src/main/resources/db/migration').glob('V*.sql'))
# Current migration versions are V1 to V8. Numeric ordering also supports later versions.
files.sort(key=lambda p: int(p.name.split('__')[0][1:]))
sql = '\n'.join(p.read_text(encoding='utf-8') for p in files)
subprocess.run(CMD + ['--single-transaction'], input=sql, text=True, check=True)
print('Applied:', ', '.join(p.name for p in files))
