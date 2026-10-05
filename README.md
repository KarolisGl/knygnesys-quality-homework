# Knygnesys: code-quality homework

Public academic demonstration copy of Knygnesys for the first code-quality homework.

- `deliverables/Knygnesys_ataskaita.docx`: Lithuanian report.
- `deliverables/Knygnesys_run_and_defence.html`: English run-and-defence guide.
- `analysis/`: executed evidence, measurement configurations and reproduction scripts.
- `knygnesys-app/`: Spring Boot backend, Java 21.
- `knygnesys-ui/`: Angular frontend.
- `db-migration/`: SQL schema migrations.

## Scope and provenance

The starting workspace was a source archive without Git history. The Java and TypeScript application sources are preserved; `analysis/source-manifest.json` records the hashes of the original copied files. Private configurations, the original administrator seed, machine-local agent settings, deployment workflows and Postman collections are not published. A fresh local-only runtime configuration and a no-op replacement for the administrator seed are provided. This is not the original project's development history.

The homework is for a two-person team. Each person must verify and take responsibility for one of the two distinct review fragments. The title page and reviewer names must be completed by the students. AI assistance is disclosed; generated review preparation must not be represented as completed independent student review.

## Safe local run

Prerequisites: Git, supported Node.js/npm, a Java 21 **JDK**, Python 3 and Podman.

From the repository root:

```sh
podman run -d --name knygnesys-homework-db \
  -p 127.0.0.1:15432:5432 \
  -e POSTGRES_USER=knygnesys_demo \
  -e POSTGRES_DB=knygnesys_homework \
  -e POSTGRES_HOST_AUTH_METHOD=trust docker.io/library/postgres:15
podman exec knygnesys-homework-db pg_isready -U knygnesys_demo -d knygnesys_homework
python3 analysis/setup_database.py
```

Wait for database readiness before the schema command. Setup refuses a database that already has public tables. It uses `psql`, not Flyway; no Flyway history is claimed.

**Local disposable demo only:** trust authentication is intentional and bound to loopback. Never expose this database to the network, use real data or reuse real user passwords.

Backend, from `knygnesys-app/`:

```sh
bash mvnw test
bash mvnw package
java -jar target/knygnesys-app-0.0.1-SNAPSHOT.jar
```

Frontend, in another terminal from `knygnesys-ui/`:

```sh
npm ci
npm run start -- --host 127.0.0.1
```

Open `http://localhost:4200`. Backend: `http://localhost:10032`. API schema: `/api-docs`. Register a disposable account; no original administrator credentials are included. The app is a coursework baseline, not a security-hardened product. Read the detailed guide for metrics, failed checks, limits, exact tool commands and defence preparation.

## Checks

Frontend: `npm run test -- --watch=false`, `npm run build`, `npm run lint`, `npx tsc --noEmit -p tsconfig.app.json`.
Backend: `bash mvnw test`, `bash mvnw package`.
Saved failures are kept as failures. A compiler pass is not a claim that lint passes; a smoke test is not proof of complete coverage.

## Local SonarQube and recorded findings

The real SonarQube Community Build instance is at `http://localhost:19000/dashboard?id=knygnesys-homework` on the prepared machine, bound to loopback only. Server version: `26.9.0.129388`; SonarScanner CLI: `8.1.0.6389`. This uses H2 for evaluation, not production. The guide contains the pinned image digest, first-start procedure and token-safe scanner commands.

Run `bash analysis/run_sonar.sh` with `SONAR_TOKEN` and an official scanner available, then `python3 analysis/export_sonar.py` for the public local project's evidence. Native MQR results: maintainability A, reliability D, security D; 85 unique findings. Maintainability debt ratio: 0.1%, estimated effort: 192 minutes. Impact categories overlap and must not be summed as unique findings. The repeat scan's gate is OK because new-code `new_violations` is zero at a zero threshold; existing findings remain. No coverage report was imported. Neither result is a full quality/coverage guarantee. Scanner semantic warnings are preserved in its log.

Supporting measurements remain separate: ESLint/SonarJS method metrics, TypeScript import graph, emitted-JavaScript MI and an explicitly scoped Java AST decision counter. `analysis/frontend/scripts/reproduce-analysis.sh` and `analysis/measure_java_structure.py` reproduce those. Install the Java parser's pinned Python dependencies from `analysis/requirements.txt` in an isolated environment. Existing lint violations are reported, not relabelled as successful checks.

## Document verification and remaining student work

The report was opened and saved through LibreOffice, its real contents index and page fields were refreshed, and its rendered PDF used embedded Times New Roman. The standalone HTML guide was rendered at desktop and mobile widths with no horizontal page overflow or JavaScript errors. `analysis/deliverable-ad-hoc.json` labels these focused checks as ad-hoc verification, not whole-suite success. Source hashes matched the preserved manifest.

The university's current general process document delegates detailed formatting to faculties/departments. Since the team's department is unspecified, exact template compliance is **unverified**; the report appendix and `analysis/formatting-provisional.md` state explicit academic layout defaults. Complete the first page and actual reviewer attribution; confirm any department-specific template before submission. No student review or before/after code improvement is fabricated.

No new licence is imposed on the original source. Publication is for the requested academic analysis; existing source notices are retained.
