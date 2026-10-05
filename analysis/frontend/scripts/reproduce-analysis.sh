#!/usr/bin/env bash
# Re-run checks on the credential-free publication copy, not the original archive.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT="$(cd "$ROOT/../../knygnesys-ui" && pwd)"
TOOLS="$ROOT/tools"
EVIDENCE="$ROOT/evidence"
mkdir -p "$EVIDENCE"

capture() {
  local name="$1"
  shift
  set +e
  "$@" >"$EVIDENCE/$name.log" 2>&1
  local rc=$?
  set -e
  printf '%s exit=%s\n' "$*" "$rc" >>"$EVIDENCE/$name.log"
  printf '%s exit=%s\n' "$name" "$rc"
  if [[ "$name" == "existing-eslint" && "$rc" == 1 ]]; then
    return 0 # Baseline rule violations are retained as evidence.
  fi
  return "$rc"
}

capture npm-ci-tools npm --prefix "$TOOLS" ci
capture npm-ci-project npm --prefix "$PROJECT" ci
capture production-build npm --prefix "$PROJECT" run build
capture vitest-non-watch npm --prefix "$PROJECT" test -- --watch=false
capture existing-eslint npm --prefix "$PROJECT" run lint
capture tsc-app "$PROJECT/node_modules/.bin/tsc" --noEmit -p "$PROJECT/tsconfig.app.json"
capture tsc-spec "$PROJECT/node_modules/.bin/tsc" --noEmit -p "$PROJECT/tsconfig.spec.json"

set +e
(cd "$PROJECT" && "$TOOLS/node_modules/.bin/eslint" --config "$TOOLS/eslint-sonar.config.mjs" src --format json --output-file "$EVIDENCE/sonar-eslint.json") >"$EVIDENCE/sonar-eslint.stdout.log" 2>&1
rc=$?
printf 'isolated SonarJS ESLint exit=%s\n' "$rc" >>"$EVIDENCE/sonar-eslint.stdout.log"
printf 'sonar-eslint exit=%s\n' "$rc"
set -e
if [[ "$rc" != 0 ]]; then exit "$rc"; fi

capture maintainability node "$ROOT/scripts/measure-maintainability.mjs"
capture structure node "$ROOT/scripts/measure-structure.mjs"
capture maintainability-normalised python3 "$ROOT/../normalise_mi.py" "$EVIDENCE/maintainability.json" "$EVIDENCE/maintainability-normalised.json"
