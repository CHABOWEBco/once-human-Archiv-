# Phase 2B.2B — bestehender Batchimport für Database / Combat

Stand: **03.10.2026**. Branch ausschließlich `admin-editor-preview`. Lokaler und tatsächlicher Remote-Ausgangspunkt: `1533b160d2dacbf0959358ce88c03a41503cec15`, Worktree sauber. `main` unverändert bei `94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.

**Keine Produktionsdaten verändert, kein Produktionsupload durch Codex.** Alle Schreibtests verwenden ausschließlich den bestehenden isolierten PostgreSQL-/Auth-/Storage-Adapter. Keine Migration, keine neue Dependency, keine neue Importarchitektur.

Der Benutzer bestätigte den erfolgreichen Cosmetic-Produktivpilot mit 1.083 verifizierten Drafts (1.081 neu und 2 resumed), 2 zuvor vollständig vorhandenen Bildern, 0 Fehlern/Konflikten/offenen Attachments und 0 neuen aktiven Assets. Diese Live-Angaben stammen vom Benutzer; dieser Block wiederholt weder den Produktivimport noch eine authentifizierte Produktionsinventur.

## Kleine explizite Paketkonfiguration

`ASSET_LIBRARY_IMPORT` enthält eine eingefrorene Konfiguration für genau zwei Ursprungspakete:

| Exaktes `source_package` | Zusätzliche Paketgrenze | Verbindliche Grenze aus dem aktuellen Dry Run |
|---|---:|---|
| `OnceHuman_CMS_v2_01_Profile_Cosmetics_Shop.zip` | 1.083 wie bisher | Anzahl eindeutiger vorgemerkter Bildinhalte |
| `OnceHuman_CMS_v2_02_Database_Combat.zip` | keine feste Zahl | Anzahl eindeutiger vorgemerkter Bildinhalte |

Andere Pakete bleiben gesperrt. Ein Paketname wird nicht über Objekt-Prototypen oder ähnliche Dateinamen akzeptiert. Gültige Quelldateien müssen zu genau dem aktuellen `source_package` gehören. Die ursprünglichen ZIP-/Dateigrößen- und Eintragsgrenzen bleiben bestehen; sie werden nicht durch eine erfundene Produktivmenge für Paket 02 ersetzt.

Die aktuelle Zahl `selected_unique_image_contents` wird **vor** dem asynchronen Live-Preflight aus dem lokalen Dry Run erfasst. Die Produktionssitzung behält diesen Wert für Start und Resume. Eine frische Live-Prüfung darf die verbliebene Uploadmenge reduzieren oder beibehalten, aber nie über diesen erfassten Wert erhöhen. Für Cosmetic gilt zusätzlich die vorhandene Grenze 1.083. Beide STOPP-Prüfungen laufen vor dem Start der Worker.

Auch die bereits bestätigte Preflight-Menge darf beim anschließenden Start/Resume nicht wachsen. Paketwechsel oder eine nachträglich vergrößerte Menge sperren die Ausführung, bevor Jobs geändert oder Uploads begonnen werden. Änderungen der lokalen Vormerkung vor dem Start verwerfen wie bisher den Preflight und benötigen eine neue Prüfung.

Der herunterladbare Bericht enthält nun `source_package`, den paketspezifischen Modus und `confirmed_dry_run_limit`. Das bestehende `confirmed_pilot_limit` bleibt für Cosmetic 1083 und ist für Paket 02 ausdrücklich `null`. Oberfläche und Bestätigung verwenden weiterhin die tatsächliche Preflight-Menge: `IMPORT <ANZAHL> DRAFT-ASSETS`.

## Unveränderte gemeinsame Verarbeitung

Klassifizierung, ZIP-Reader, Magic-Byte-Validierung, MIME-Hotfix, Originalbytes und `JMA_ASSET_STORE` bleiben erhalten. Kein zusätzlicher Uploader oder Package-Renderer. Waffen verwenden `weapon`; vorbereitete Mods übernehmen den im Manifest angegebenen bestehenden Typ, beispielsweise `item` mit Kategorie `items`. Es wurde weder ein DB-Typ `mod` erfunden noch anhand des Aussehens umklassifiziert.

Manifestpriorität, deterministische SHA-Repräsentanten und vollständige `duplicate_sources` bleiben unverändert. Ursprüngliche Review-Einträge bleiben auch nach lokaler Umklassifizierung ausgeschlossen. Bereits vollständig vorhandene SHA-Bilder werden ohne Umtypisierung/Statusänderung übersprungen. Passende bildlose Drafts werden mit bestehenden IDs und Revisionen fortgesetzt.

Maximal zwei Worker, Pause/Resume, unveränderliche Storage-Absicht, No-Overwrite, begrenzte Attach-Retries, Pause bei unklarer Verknüpfung und abschließende Live-Verifikation werden weiterverwendet. Jeder neue oder resumierte Datensatz bleibt `draft`; keine automatische Freigabe oder Änderung aktiver Assets.

## Isolierte Paket-02-Fixture

Ein echter lokal erzeugter ZIP mit sieben PNG-Dateien plus Manifest und Review-CSV wurde im bestehenden Chromium-Importer analysiert. Er enthält eine Waffe mit identischer Kopie, einen per Manifest als `item/items` vorbereiteten Mod trotz `Weapons`-Ordner, einen vorbereiteten Database-Gegenstand, ein bereits vorhandenes Bild, eine explizite Review-Datei und ein unklar benanntes Bild.

- Lokaler Dry Run ohne bekanntes Inventar: **4 eindeutige vorgemerkte Inhalte**, **2 Review-Fälle**, **1 redundante Kopie**. Keine Schreibaktionen in der Analyse.
- Frischer isolierter Inventarabgleich: **3 verbleibende Uploads**, davon **2 neu**, **1 resumierter Draft**, **1 bereits vollständig vorhandener SHA übersprungen**. Der vorhandene SHA stammt aus einer wahrheitsgemäß hochgeladenen lokalen Cosmetic-Fixture.
- Isolierte Ausführung: **3 erfolgreich verifizierte Drafts**, **0 neue active**, **0 offene Attachments**. Bestehende Resume-ID erhalten, Revision von 1 über Reservation auf 3 fortgeschrieben, kein zweiter Datensatz.
- Gespeicherte Bytes und SHA für alle drei PNGs identisch zum ZIP-Original; Storage erhält `image/png`.
- Synthetischer reiner Plan mit 1.084 eindeutigen Kandidaten: Paket 02 erlaubt, Cosmetic blockiert. Dieser Mengencheck lädt keine erfundenen SHA-/Byte-Inhalte hoch.
- Desktop 1920 und Mobil 390: native Dateiauswahl, Paketname, Preflight, falsche/richtige Bestätigungszahl, 44px Controls und kein horizontaler Overflow geprüft. Die normale Bibliothek berücksichtigt bereits vorhandene Bilder hier schon beim lokalen Dry Run.

Das ist eine lokale Regression-Fixture, kein Dry Run des tatsächlichen großen Database/Combat-Produktionspakets und kein Live-Importbericht. Seine tatsächliche Produktivmenge wird erst aus den vom Benutzer ausgewählten Originaldateien und dem folgenden Live-Preflight bestimmt.

## Prüfungen und Bedienung

**186 Prüfungen bestanden, alle Prozesse Exit 0:** 28 neue Paketfreigabe-/Paket-02-Prüfungen, 46 bestehende Cosmetic-Batch-Sicherheitsprüfungen, 87 bestehende lokale Dry-Run-/Duplikat-Prüfungen und 25 MIME-/Originalbyte-/Resume-Prüfungen einschließlich echtem Browser-Supabase-SDK. Desktop und 390 px geprüft, keine Chromium-Ausnahmen. Keine Assertion deaktiviert oder Sicherheitsprüfung entfernt.

```bash
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-packages
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-upload
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-import
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite ASSET_TEST_SUPABASE_SDK=/tmp/asset-mime-hotfix/supabase.js node tests/asset-library.cjs --upload-mime
```

Der vorhandene Browser-SDK-Test verwendet nur einen im Speicher beantworteten Fixture-Fetch und reproduziert auch den früheren Octet-stream-Fehler als negative Kontrolle. Keine Supabase-Produktionsaufrufe. Alle Suiten laufen nacheinander wegen des bestehenden festen Testports.

Späterer Benutzerstart: authentifiziert als Moderator/Admin/Owner **Asset-Bibliothek → ZIP / ORDNER IMPORTIEREN** öffnen. Vor Dateiauswahl das Feld **Gemeinsames Ursprungspaket** auf `OnceHuman_CMS_v2_02_Database_Combat.zip` setzen. Die zugehörigen Original-ZIPs und vorhandenen Manifest-/Review-CSVs wählen, lokale Analyse abwarten, **Live-Preflight prüfen**, Zahlen/Review/Konflikte kontrollieren und erst dann die angezeigte exakte Phrase eingeben und bestätigen. Draftstatus bleibt verbindlich. Andere Pakete nicht starten.

## Dateien und Artefakte

Geändert: `asset-library-import.js`, `index.html` (Importer-Cacheversion), `tests/asset-library.cjs` (Modus im bestehenden Adapter), neu `tests/asset-library-batch-packages.cjs`, historischer Verweis in `docs/ASSET_LIBRARY_PHASE_2B2A.md`, dieser Auditbericht. Keine Änderung an Store, Modell, Rollen/RLS, Bucket, Migrationen, CSS oder anderen Websitebereichen.

Ignorierte lokale Artefakte: `test-results/asset-library/batch-package-02-fixture-report.json`, `batch-package-02-1920.png`, `batch-package-02-390.png`. Keine Originalpakete oder SDK-Dependency committed.

**STOPP nach Commit und GitHub-Synchronisation. Codex startet keinen Produktionsimport. Nur Pakete 01 und 02 sind freigegeben.**
