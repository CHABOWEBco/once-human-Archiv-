# Phase 2B.2D — Paket 04 Building / Formulas

Stand: **03.10.2026**. Ausschließlich `admin-editor-preview`. Ausgangs-HEAD lokal und remote bestätigt: `608727885fc7f09d052a7e275a0468a3d94e1f7f`; Worktree vor Änderungen clean. `main` bleibt unverändert `94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.

**Kein Produktionsimport durch Codex, keine Produktionsdaten verändert, keine Migration, keine neue Dependency.** Schreibtests ausschließlich im vorhandenen isolierten Chromium-/PostgreSQL-/Auth-/Storage-Adapter.

Der Benutzer meldete den erfolgreichen Paket-03-Restlauf: 96 neue Drafts, ein vorhandener Draft resumed, zwei vorhandene Assets erkannt, 97 verifiziert, null Fehler/Konflikte/offene Attachments/neue aktive Assets. Dieser Nachweis wird dokumentiert; der Produktionslauf wird nicht wiederholt.

## Minimale Paketfreigabe

Ein Eintrag in der bestehenden eingefrorenen `productionPackages`-Konfiguration erlaubt exakt `OnceHuman_CMS_v2_04_Building_Formulas.zip`: Label **Building / Formulas**, Reportmodus `BUILDING FORMULAS PRODUCTION BATCH`, `maxCandidates:null`. Der bestehende Freigabehinweis und die Blockiermeldung nennen nun die vier erlaubten Pakete. Nur die Cacheversion des Importer-Scripts wurde erhöht.

Pakete 01/02/03 bleiben freigegeben; Cosmetic behält seine bestätigte Grenze 1.083. Paket 04 bekommt keine feste Kandidatenzahl. Paket 05, 90 und alle anderen Namen bleiben gesperrt. Die vor dem asynchronen Preflight erfasste lokale Dry-Run-Menge bleibt maßgeblich: Live kleiner/gleich erlaubt, größer STOPP. Ein späterer Zuwachs über die bestätigte Preflight-Menge blockiert vor Workerstart. Bestätigung weiterhin `IMPORT <aktuelle Menge> DRAFT-ASSETS`.

Unverändert weiterverwendet: ZIP-Reader und explizite Analyse-/Preview-Signale, Production-Reads ohne altes Analyse-Signal, Manifest-/Review-Priorität, vorhandenes Typenmodell, Magic-Byte-MIME und SHA vor Upload, Originalbytes, deterministische SHA-Repräsentanten und `duplicate_sources`, vollständiger Live-Preflight, Rolle/RLS/Storage-Bereitschaft, ID-/Revisions-/Pending-Resume, `JMA_ASSET_STORE`, `upsert:false`, max. zwei Worker, Pause/Fortsetzen, begrenzte Attach-Retries und abschließende Live-Verifikation. Auth-Refresh-Hotfix bleibt vollständig erhalten. Jeder neue/resumierte Datensatz bleibt draft; bestehende aktive Assets werden nicht verändert.

Keine neue Building-/Formula-Klassifizierungsregel. Explizite vorhandene Manifestdaten sind maßgeblich; unsupported Typen oder unklare Kategorien müssen weiter in Review bleiben. Es gibt keinen neuen DB-Typ „formula“ und keine Inhaltsvermutung aus Bild/Dateiname.

## Gemeinsame Test-Fixture erweitert

Die bestehende `tests/asset-library-batch-packages.cjs` hat einen Building/Formulas-Modus; keine zweite Testschnittstelle oder Importarchitektur. Der vorhandene Runner bietet `--batch-formulas` neben World und Combat.

Paket-04-Fixture: sieben PNGs, Manifest und Review-CSV. Das explizite Fixture-Manifest legt `item/items` für einen Formula-Kandidaten unter dem widersprechenden Weapons-Ordner und den reservierten Formula-Draft fest, sowie `image/website` für ein Archivvisual unter Resources. Diese ausschließlich synthetischen Testdaten prüfen die Priorität und vorhandene Typen, ohne die realen Paketbilder semantisch zu interpretieren. Die identische Kopie liegt lexikalisch vor dem Original; trotzdem gewinnt der eindeutige Manifest-Repräsentant und beide Quelldateien bleiben in `duplicate_sources` erhalten.

- Analyse ohne bekanntes Inventar: vier eindeutige vorgemerkte Inhalte, zwei Review-Fälle, eine redundante Kopie. Null Uploads/DB-Inserts während der Analyse.
- Frischer isolierter Preflight: drei verbleibende Kandidaten, zwei neue und ein resumierbarer Draft; ein vollständig vorhandener identischer SHA wird übersprungen.
- Lokale Ausführung über denselben Controller: drei verifizierte Drafts, null neue aktive Batchassets/offene Attachments. Resume gleiche ID, erwartete Revision, kein zweiter Datensatz. Drei Originalbilder werden unverändert mit identischem SHA und verifiziertem PNG-MIME gespeichert.
- Der bereits aktive Vergleichsdatensatz bleibt einschließlich Metadaten, Revision und Zeitstempel bytegleich.
- Original-Review bleibt auch nach lokaler Umklassifizierung ausgeschlossen. Live-Anstieg über Dry Run und bestätigten Preflight blockiert. Eine reine synthetische Planung mit 1.084 Kandidaten beweist das Fehlen einer kopierten Cosmetic-Grenze für Paket 04; diese Planobjekte werden nicht hochgeladen.
- Allowlist-Prüfungen für alle vier genehmigten Namen, Blockierung 05/90 und eines weiteren unbekannten Namens. Mischungen abweichender Source-Pakete blockieren.
- Native UI 1920 und 390 px: falsche/korrekte dynamische Bestätigung, gesperrter Start ohne Bestätigung, mindestens 44px Controls und kein horizontaler Overflow. Screenshots lokal in Chromium visuell geprüft.

Dies ist kein Dry Run des tatsächlichen großen Building-Pakets. Dessen Menge entsteht ausschließlich aus der eigenen lokalen Auswahl und dem anschließenden frischen authentifizierten Live-Preflight.

## Dateien und Artefakte

Geändert: `asset-library-import.js`, `index.html`, `tests/asset-library.cjs`, `tests/asset-library-batch-packages.cjs`, dieser Auditbericht. Keine Änderung an Auth/Store/Modell, Supabase-Konfiguration, Rollen/RLS, Storage, CSS oder anderen Websitebereichen.

Ignorierte Artefakte: `test-results/asset-library/batch-package-04-fixture-report.json`, `batch-package-04-1920.png`, `batch-package-04-390.png`. Keine Original-ZIPs, SDK-Dateien oder Zugangsdaten committed.

Im eigenen Admin-Browser: Asset-Bibliothek → ZIP / ORDNER IMPORTIEREN. Vor Dateiauswahl das gemeinsame Ursprungspaket exakt auf `OnceHuman_CMS_v2_04_Building_Formulas.zip` setzen; passende Originaldateien und vorbereitete Manifest-/Review-CSVs auswählen. Analyse abwarten, Live-Preflight prüfen, Review/Konflikte/Menge kontrollieren. Nur die aktuell angezeigte Bestätigungsphrase verwenden. Keine automatische Veröffentlichung. Codex startet diesen Produktionslauf nicht.

## Abgeschlossene Validierung

**213 Prüfungen bestanden, alle sechs Prozesse Exit 0:** 35 Building/Formulas-, 35 World-Items-, 35 Combat-, 46 Cosmetic-Batch-, 37 Auth-/ZIP-/Pending-Resume- und 25 MIME-/Originalbyte-/SHA-Prüfungen. Keine Assertions oder Schutzprüfungen entfernt. JavaScript-Syntaxchecks und `git diff --check` erfolgreich.

Der bestehende Auth-Test hält während sechs realen ZIP-Jobs die ersten beiden Storage-Aufrufe und die Identitätsabfragen an: gleicher Benutzer/Rolle mit `TOKEN_REFRESHED` behält Scope und Importer ohne Vollrender/Pause; sechs verifizierte Drafts, maximal zwei Worker. Logout, anderer Benutzer, echte Rollenänderung und fehlgeschlagene Identitätsabfrage stoppen weiterhin. Ein alter Analyse-Abbruch und ein separater Preview-Abbruch beeinträchtigen die Production-ZIP-Reads nicht. Offenes Pending mit gleichem Storage-SHA wird ohne zweiten Upload/Insert angehängt; abweichender SHA blockiert.

Der echte Browser-Supabase-SDK-Test bleibt im Speicher beantwortet und bestätigt unveränderte PNG-/JPEG-/WebP-Bytes und SHA mit verifiziertem MIME im tatsächlichen multipart Upload. Kein Produktionsrequest aus diesen Fixtures.

```bash
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-formulas
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-world
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-packages
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-upload
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-auth
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite ASSET_TEST_SUPABASE_SDK=/tmp/asset-mime-hotfix/supabase.js node tests/asset-library.cjs --upload-mime
```

**STOPP nach Commit und GitHub-Synchronisation. Freigegeben ausschließlich Pakete 01/02/03/04; kein Produktionsimport aus diesem Codex-Lauf.**
