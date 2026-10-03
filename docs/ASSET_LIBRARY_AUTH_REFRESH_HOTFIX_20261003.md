# Phase 2B.2C — Auth-Refresh-/ZIP-Lebenszyklus-Hotfix

Stand: **03.10.2026**. Branch ausschließlich `admin-editor-preview`. Ausgangs-HEAD lokal/remote: `66861c030617bec0432421242029fe16c0272434`, Worktree zuvor clean. `main` unverändert `94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.

**Kein Produktionsimport durch Codex, keine Produktionsdaten geändert, keine Migration, keine neue Dependency.** Alle Schreibtests laufen ausschließlich im vorhandenen lokalen Chromium-/Auth-/PostgreSQL-/Storage-Testadapter. Paket-Allowlist, Dry-Run-Obergrenze, Rollen/RLS, max. zwei Worker, Bestätigung, SHA/MIME-Validierung, Pause/Resume und Draft-only bleiben erhalten.

## Bestätigte Ursachen

1. `loadIdentity(session)` setzte vor den asynchronen Profil-/Rollenabfragen die gültige Rolle auf null. Derselbe Benutzer hatte dadurch während eines normalen Refreshs vorübergehend einen anderen `assetScope()` (`user-id:` statt `user-id:owner`). Der Scope-Schutz stoppte korrekt vor dem DB-Attach.
2. Der Auth-Listener rendert bisher nach jedem Auth-Ereignis die App komplett. Der Importer beobachtet den bestehenden Admin-DOM und seine Berechtigungen; ein unnötiger Refresh/Rebind kann die Importansicht schließen und deren Analysecontroller abbrechen.
3. ZIP-Entries definierten `read(readSignal=signal)`, wobei `signal` dauerhaft aus der ursprünglichen Analyse stammte. Späteres `job.item.read()` ohne Signal erbte deshalb einen bereits abgebrochenen Analysecontroller; das erzeugte die Folgefehler „Analyse abgebrochen.“.

Der Benutzer meldete für den echten Paket-03-Lauf: Dry Run 649, Preflight 647, 550 verifiziert, zwei vollständig vorhandene, 97 Fehler (ein offenes Attachment plus 96 ZIP-Folgeabbrüche), null Konflikte/neue aktive Assets, 18.814.285 Bytes, 855 Review und 701 redundante Kopien ausgeschlossen. Diese Zahlen sind der vom Benutzer gelieferte Produktionsnachweis; sie wurden hier nicht durch einen weiteren Produktionslauf reproduziert.

## Bestehende Auth-Synchronisierung korrigiert

`acceptIdentitySession()` aktualisiert die Session unmittelbar im bestehenden Auth-Listener. Beim selben Benutzer bleiben das letzte vollständige Profil, die Rolle und der Account während der Abfragen erhalten. `loadIdentity()` lädt neue Werte ausschließlich lokal und übernimmt Profil/Rolle/Account nach beiden erfolgreichen Abfragen zusammen, ohne asynchronen Zwischenzustand.

Ein Epoch-Zähler verhindert, dass verspätete Abfragen nach einem neueren Auth-Ereignis oder Logout alte Identitäten wiederherstellen. Logout und andere Benutzer invalidieren die vorherige Identität sofort. Echte Rollenänderungen werden nach erfolgreicher Rollenabfrage übernommen und damit vom bestehenden Scope-Schutz erkannt. Ein fehlgeschlagener Identitätsrefresh verwirft die alten Berechtigungen; es gibt kein Offenhalten bei fehlgeschlagener Autorisierungsabfrage.

Bei `TOKEN_REFRESHED` desselben Benutzers wird nur bei einer relevanten Änderung des sichtbaren Profil-/Account-/Rollenstatus gerendert. Ein normaler unveränderter Refresh aktualisiert den Token und validiert die Identität, ohne kompletten App-Render oder Importer-Abbau. Andere relevante Auth-Ereignisse und Recovery behalten ihren Render-/Benachrichtigungsweg.

## Getrennte ZIP-Lebenszyklen

Ein ZIP-Entry `read(readSignal)` hat kein gebundenes Default-Abbruchsignal mehr. Analyse und Preview verwenden bereits ihre ausdrücklich übergebenen eigenen Signale. Der bestehende Produktionsjob liest weiterhin ohne Analyse-Signal. CRC, Größen-/Pfadprüfung, Magic Bytes, Originalbytes und SHA bleiben unverändert. Die vorhandene Produktionspause stoppt neue Reservierungen/Uploads und wartet kontrolliert auf bereits gestartete Arbeiten; kein zweiter Controller oder RAF.

## Offener Draft / Resume

`asset-226412b7-6c74-4091-a6b8-abfb9a26db86`, Quelle `Database/Resources_Materials/Inferior Copper Pickaxe.png`, bleibt auf dem vorhandenen Resume-Pfad: ein kompatibler Draft mit gleicher Paket-/Quellpfad-/SHA-/Typ-/Kategoriezuordnung und `metadata.import_pending` wird als resumierbar erkannt. Der bestehende Store lädt das reservierte Storage-Objekt herunter und prüft seinen SHA gegen die neu ausgewählten Originalbytes. Bei Übereinstimmung: gleiche ID und Storage-Pfad, kein erneuter Upload/Insert, nur fehlender DB-Attach, eine Revision weiter, `import_pending` entfernen, Status draft. Bei SHA-Abweichung: Konflikt/STOPP, keine Verknüpfung und kein Überschreiben.

Die neue lokale Fixture verwendet ausdrücklich die gemeldete ID und den gemeldeten Quellpfad, mit isolierten Testbytes. Sie erzeugt ein bestätigtes Uploadobjekt und einen durch Attach-Fehler offenen Draft, liest die ZIP neu ein und prüft einen frischen Preflight/Resume. Das verifiziert die Mechanik, nicht den aktuellen Produktionsdatensatz. Dessen aktueller Zustand wird erst beim nächsten eigenen authentifizierten Live-Preflight geprüft. Die 96 Kandidaten ohne Storage-Schreibvorgang werden anhand der neu eingelesenen ZIPs und des frischen Inventars erneut geplant; es werden keine vergangenen Fehlzustände ungeprüft übernommen.

## Gezielte Tests

Neue Suite `tests/asset-library-batch-auth.cjs`, im vorhandenen Runner `--batch-auth`:

- Native Admin-UI, Paket-03-ZIP mit sechs eindeutigen Ressourcen und vier wartenden Jobs; die ersten zwei tatsächlichen Storage-Aufrufe werden gehalten, während ein gleicher Benutzer mit gleicher Rolle seinen Token refresht und beide Identitätsabfragen noch ausstehen.
- Token sofort aktualisiert; vollständige Identität während der Abfrage erhalten; kein kompletter App-Render, gleiche Asset-Shell/offene Sitzung; alle sechs ZIP-Jobs danach verifiziert, null Fehler/Pause/aktive Assets, exakt sechs Uploads und sechs Rows, maximal zwei gleichzeitig. Verifizierter PNG-MIME und `upsert:false` bleiben erhalten.
- Abgebrochener alter Analysecontroller und separat abgebrochenes Preview-Signal: Preview-Read abgebrochen, spätere ZIP-/Produktionsreads erfolgreich, unverändertes ursprüngliches leeres ZIP-File-MIME vor der zentralen Normalisierung.
- Bestätigtes offenes Storage-Objekt: frischer Preflight und Resume auf derselben gemeldeten Asset-ID, null zweiter Upload/Insert, Originalpfad erhalten, Pending entfernt und Draftrevision einmal erhöht. Falscher Storage-SHA blockiert.
- Logout während einer älteren wartenden Refreshabfrage, anderer Benutzer, echte Rollenänderung bei derselben Benutzer-ID und fehlgeschlagene Identity-Abfrage stoppen jeweils die Warteschlange. Höchstens die beiden schon laufenden Uploads werden abgearbeitet und als Pending erhalten. Ein verspäteter Refresh stellt keinen ausgeloggten Benutzer wieder her.
- 1920 px und 390 px: Importer/Bestätigung bleiben bedienbar, kein horizontaler Overflow, mindestens 44px Touchcontrols; Screenshots in Chromium visuell geprüft, keine Browserausnahmen.

Weitere vollständig ausgeführte Regressionen: 33 Paket-03-, 33 Paket-02-, 46 Cosmetic-Batch-, 25 MIME-/Byte-/SHA-Prüfungen mit echtem Browser-Supabase-SDK, 75 Einzelasset-/Rollen-/Editor-/Profil-/Karten-/Tutorial-Prüfungen sowie 87 lokale Analyse-/Duplikat-/Review-/Preview-/Abbruch-/Reopen-Prüfungen. Die letzte Suite bestätigt zusätzlich, dass lokale Analyse und Interaktionen keine DB-/Storage-Schreiboperation auslösen. Alle Adapteraufrufe gehen ausschließlich an localhost oder den im Speicher beantworteten SDK-Fixture-Fetch; keine Produktions-Schreiboperation.

## Dateien

`supabase-client.js` (atomarer Refresh/Render-/Race-Schutz), `asset-library-import.js` (Signal-Lebenszyklus), `index.html` (Cacheversionen der zwei geänderten Scripts), `tests/asset-library.cjs` (Auth-Ereignisse im vorhandenen Adapter/Runner), `tests/asset-library-batch-auth.cjs` und dieser Auditbericht. Kein weiterer Websitebereich, keine SQL-Migration, kein neuer Storage-Helfer.

Ignorierte Testartefakte: `test-results/asset-library/batch-auth-fixture-report.json`, `batch-auth-1920.png`, `batch-auth-390.png`. Keine Original-ZIPs oder Zugangsdaten committed.

**336 Prüfungen bestanden, alle sieben Prozesse Exit 0:** 37 gezielte Auth-/ZIP-/Attachment-Prüfungen und 299 bestehende Regressionen. Syntaxprüfung der geänderten JavaScript-/Testdateien und `git diff --check` ebenfalls erfolgreich. Keine Assertions deaktiviert und keine Sicherheitsprüfung entfernt.

```bash
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-auth
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-world
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-packages
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-upload
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite ASSET_TEST_SUPABASE_SDK=/tmp/asset-mime-hotfix/supabase.js node tests/asset-library.cjs --upload-mime
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-import
```

**STOPP nach Commit und GitHub-Synchronisation. Kein Produktivimport aus diesem Codex-Lauf.**
