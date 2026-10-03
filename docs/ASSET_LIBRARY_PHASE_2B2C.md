# Phase 2B.2C — Paket 03 Database / World Items

Stand: **03.10.2026**. Ausschließlich `admin-editor-preview`. Ausgangs-HEAD lokal und remote bestätigt: `545548e936504c71dfe9714fd47103f0dc798db7`; Worktree vor Änderungen sauber. `main` bleibt unverändert `94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.

**Kein Produktionsimport, keine Produktionsdaten geändert, keine Migration, keine neue Dependency.** Sämtliche Schreibtests laufen ausschließlich in der vorhandenen isolierten Auth-/PostgreSQL-/Storage-Fixture. Der Benutzer meldete Paket 02 produktiv erfolgreich: 654 neue und verifizierte Drafts, 700 redundante Kopien ausgeschlossen, null Review/Konflikte/Fehler/offene Attachments/neue aktive Assets. Dieser Lauf wiederholt weder den Produktivimport noch eine authentifizierte Produktionsinventur.

## Minimale Freigabe

Ein zusätzlicher Eintrag in der bestehenden eingefrorenen Paketkonfiguration erlaubt exakt `OnceHuman_CMS_v2_03_Database_World_Items.zip`, beschriftet **Database / World Items**, mit Reportmodus `DATABASE WORLD ITEMS PRODUCTION BATCH` und `maxCandidates:null`. Die Hinweise nennen jetzt Pakete 01, 02 und 03. Die Cacheversion ausschließlich des Importer-Scripts wurde erhöht.

Die Einträge für Cosmetic und Database/Combat bleiben erhalten. Cosmetic behält seine genehmigte Grenze 1.083; World Items bekommt keine feste Produktivzahl. Pakete 04, 05, 90 und alle anderen bleiben gesperrt.

Die vor dem asynchronen Preflight erfasste lokale Dry-Run-Menge bleibt die Grenze. Live darf sie reduzieren oder beibehalten; ein Anstieg blockiert mit STOPP. Zusätzlich darf die später frisch geladene Menge nicht über die bereits bestätigte Preflight-Menge wachsen. Die vorhandene Prüfung und Sitzung werden vollständig weiterverwendet. Die Bestätigung bleibt `IMPORT <aktuelle Preflight-Menge> DRAFT-ASSETS`.

Kein zweiter ZIP-Reader, Uploader, Store oder Controller. Manifest-/Review-Auswertung und Typenmodell wurden nicht verändert. Keine neue Regel für Material-/World-Dateinamen, keine visuelle Inhaltsvermutung. Bestehende eindeutige Manifestinformationen haben Vorrang vor Ordner-/Dateinamenhilfen. Originale Review-Einträge bleiben auch nach lokaler Umklassifizierung ausgeschlossen.

Unverändert: Magic-Byte-Validierung und MIME-Normalisierung, Originalbytes und SHA unmittelbar vor Upload, deterministische Repräsentanten, `duplicate_sources`, vollständiger Rollen-/Storage-/Inventar-Preflight, ID-/Revision-Resume, `upsert:false`, maximal zwei Worker, Pause/Fortsetzen, begrenzte Attach-Retries, Pause bei unklarer Verknüpfung und abschließende Live-Verifikation. Neue und resumierte Batchassets bleiben draft, keine Veröffentlichung und keine Änderung vorhandener aktiver Assets.

## Wiederverwendete lokale Test-Fixture

Die bestehende Paket-02-Testdatei besitzt jetzt einen World-Modus statt einer kopierten Testsuite. Derselbe Testadapter, ZIP-Reader und Produktionscontroller prüfen beide Pakete. Die frühere Blockierprobe für Paket 03 wurde durch getrennte Proben für 04/05/90 mit konsistenten Source-Metadaten ersetzt; sie prüft tatsächlich die Allowlist.

Paket-03-ZIP-Fixture: sieben PNGs plus Manifest und Review-CSV. Das Manifest klassifiziert eine Datei im `Items`-Ordner als `resource/resources`, eine im `Weapons`-Ordner als `deviation/deviations` und eine im `Resources`-Ordner als `item/items`. Diese absichtlich widersprechenden Ordner prüfen die Manifestpriorität. Die Ressourcen-Kopie liegt unter einem lexikalisch früheren Pfad, trotzdem bleibt die eindeutige Manifestdatei der deterministische Repräsentant; beide Quellen bleiben erhalten.

- Lokaler Dry Run ohne bekanntes Inventar: **4 eindeutige vorgemerkte Inhalte**, **2 Review-Fälle**, **1 redundante Kopie**. Null Uploads/DB-Schreibvorgänge während der Analyse.
- Frischer isolierter Abgleich: **3 verbleibende Kandidaten**, **2 neu**, **1 resumierbarer Deviation-Draft**, **1 bereits vollständig vorhandenes Bild übersprungen**.
- Isolierte Ausführung: **3 live gegen die Fixture verifizierte Drafts**, **0 neue aktive Batchassets**, **0 offene Attachments**. Resume verwendet dieselbe ID und bestehende Revision, kein zweiter Datensatz.
- Gespeicherte PNG-Bytes und SHA unverändert; MIME exakt `image/png`. Die bereits aktive Vergleichs-Fixture bleibt einschließlich Status, Metadaten, Revision und Zeitstempel unverändert.
- Original-Review bleibt trotz lokaler Typ-/Kategorievermutung ausgeschlossen. Eine künstlich höhere Menge vor dem Workerstart blockiert. Ein reiner synthetischer Plan mit 1.084 Kandidaten ist für Paket 03 zulässig, für Cosmetic gesperrt; die erfundenen Plan-SHAs werden nicht hochgeladen.
- Native Dateiauswahl/Preflight/Bestätigung bei 1920 und 390 px, falsche und korrekte Bestätigungsmenge, mindestens 44px Controls, kein horizontaler Overflow und keine Browserausnahmen geprüft.

Das ist eine Regression-Fixture, kein Dry Run des tatsächlichen großen World-Items-Pakets. Dessen Produktivmenge entsteht erst aus den vom Benutzer ausgewählten Originaldateien und dem anschließenden frischen Live-Preflight.

**137 Prüfungen bestanden, alle Prozesse Exit 0:** 33 World-Items-Prüfungen, 33 vollständige Paket-02-Fixture-/Freigabeprüfungen, 46 bestehende Cosmetic-Batch-Sicherheitsprüfungen und 25 MIME-/Originalbyte-/Resume-Prüfungen mit echtem Browser-Supabase-SDK. Desktop 1920 und Mobil 390 geprüft, keine Chromium-Ausnahmen. Keine Sicherheitsprüfung oder Assertion entfernt.

```bash
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-world
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-packages
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-upload
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite ASSET_TEST_SUPABASE_SDK=/tmp/asset-mime-hotfix/supabase.js node tests/asset-library.cjs --upload-mime
```

Der vorhandene echte Browser-SDK-MIME-Test verwendet weiterhin ausschließlich seinen im Speicher beantworteten Fixture-Fetch. Alle Tests laufen nacheinander wegen des bestehenden festen Ports. Keine Assertion deaktiviert.

## Bedienung und Dateien

Später im eigenen authentifizierten Admin-Browser: **Asset-Bibliothek → ZIP / ORDNER IMPORTIEREN** öffnen, vor Dateiauswahl das gemeinsame Ursprungspaket exakt auf `OnceHuman_CMS_v2_03_Database_World_Items.zip` setzen, zugehörige Original-ZIPs und vorhandene Manifest-/Review-CSVs wählen, Analyse abwarten, **Live-Preflight prüfen**, Menge/Review/Konflikte kontrollieren und ausschließlich die angezeigte Bestätigungsphrase verwenden. Nach Abschluss Live-Verifikation und Bericht prüfen. Alles bleibt draft. Codex startet diesen Import nicht.

Geändert: `asset-library-import.js`, `index.html`, `tests/asset-library.cjs`, bestehende gemeinsame `tests/asset-library-batch-packages.cjs`, historischer Verweis in `docs/ASSET_LIBRARY_PHASE_2B2B.md`, dieser Auditbericht. Keine Änderung an Modell/Store, Migrationen, Rollen/RLS, Bucket, CSS oder anderen Websitebereichen.

Ignorierte Artefakte: `test-results/asset-library/batch-package-03-fixture-report.json`, `batch-package-03-1920.png`, `batch-package-03-390.png`. Keine Original-ZIPs oder SDK-Dateien committed.

**STOPP nach Commit und GitHub-Synchronisation. Nur Pakete 01/02/03 freigegeben.**
