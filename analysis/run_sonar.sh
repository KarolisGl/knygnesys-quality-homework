#!/usr/bin/env bash
# Run from any directory. Requires a locally installed official SonarScanner CLI.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${SONAR_TOKEN:?Generate a project analysis token in the local SonarQube UI and set SONAR_TOKEN without publishing it}"
export SONAR_HOST_URL="${SONAR_HOST_URL:-http://127.0.0.1:19000}"
SCANNER="${SONAR_SCANNER_CLI:-sonar-scanner}"
command -v "$SCANNER" >/dev/null || { printf 'SonarScanner CLI not found: set SONAR_SCANNER_CLI to its executable path\n' >&2; exit 1; }
mkdir -p "$ROOT/analysis/sonarqube"
(cd "$ROOT/knygnesys-app" && bash mvnw test dependency:copy-dependencies -DincludeScope=test -DoutputDirectory=target/sonar-dependencies) > "$ROOT/analysis/sonarqube/preparation.log" 2>&1
if [[ ! -d "$ROOT/knygnesys-ui/node_modules" ]]; then
  npm --prefix "$ROOT/knygnesys-ui" ci
fi
(cd "$ROOT" && "$SCANNER" -Dsonar.qualitygate.wait=true) > "$ROOT/analysis/sonarqube/scanner.log" 2>&1
printf 'Scan and server processing completed. Open %s/dashboard?id=knygnesys-homework\n' "$SONAR_HOST_URL"
printf 'A failed quality gate is not a scanner installation error: inspect the saved log.\n'
