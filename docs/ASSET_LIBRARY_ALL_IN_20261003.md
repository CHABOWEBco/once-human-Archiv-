# Gesicherter ALL-IN-Import

Stand: **03.10.2026**. Ausschließlich `admin-editor-preview`. Ausgangs-HEAD lokal und remote: `5804a3f87e28a95189298563c710c0e967766495`, Worktree vor Änderungen clean. `main` bleibt `94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.

**Keine Produktionsuploads oder Produktionsdatenänderungen durch Codex. Keine Migration, keine neue Dependency, keine Änderung an RLS, Storage-Konfiguration, Auth, Asset-Modell oder anderen Websitebereichen.** Schreibtests ausschließlich im bestehenden isolierten Chromium-/PostgreSQL-/Auth-/Storage-Testadapter. Dies ist die Implementierungsprüfung mit synthetischen ZIPs, kein Import oder Mengennachweis sämtlicher realer CMS-Pakete.

## Bestehende Architektur erweitert

Die vorhandene Aktion **ZIP / ORDNER IMPORTIEREN** in der Asset-Bibliothek bietet vor Dateiauswahl zwei Modi:

- **Ein Paket / Teil-ZIPs (01–04):** bisherige explizite `productionPackages`-Allowlist unverändert. Weitere Pakete bleiben hier gesperrt. Cosmetic behält die bestätigte Grenze 1.083; Pakete 02–04 haben weiterhin keine feste Kandidatenzahl.
- **ALL-IN · mehrere Pakete:** mehrere ZIPs und vorbereitete Manifest-/Review-CSVs gemeinsam oder nacheinander analysieren. Weitere Pakete einschließlich 05 und 90 dürfen ausschließlich gültige, eindeutig zugeordnete, nicht in Review befindliche Kandidaten in den gemeinsamen Plan einbringen. Jede Quelle muss zu einer tatsächlich erfolgreich analysierten ZIP gehören. Ein Paketname allein ist keine Freigabe.

Weiterverwendet: `ASSET_LIBRARY_IMPORT`, ZIP-Reader/CRC/Pfadprüfung, `ASSET_LIBRARY_MODEL.inspectUpload()`, vorhandene Typen und Kategorien, deterministische SHA-Repräsentanten, vorhandene kombinierte Asset-Vorschau, `JMA_ASSET_STORE`, private Pfade, `upsert:false`, ID-/Revisions-/Pending-Resume, Rollen/RLS, ein bestehender Produktionscontroller und höchstens zwei Worker. Keine zweite Storage-API, Validierung, Metadatenverwaltung oder Auth-/Persistenzarchitektur.

Die einzige CSS-Änderung erweitert die bestehende `[hidden]`-Regel auf die Importansicht, damit die Einzelpaket-Eingabe und Ordnerauswahl im ALL-IN-Modus trotz vorhandener Grid-/Flex-Regeln verborgen sind. Keine Gestaltung anderer Bereiche.

## Paketidentität und gemeinsame Analyse

Jeder Eintrag behält sein echtes `source_package`, den unveränderten inneren `source_path`, Originalnamen und SHA. `OnceHuman_CMS_Codex_*_READY.zip` und v2-Teilnamen werden für die Paketidentität auf den entsprechenden `OnceHuman_CMS_v2_*.zip`-Namen normalisiert; Original-Archivnamen stehen weiterhin im Bericht. Es gibt keinen künstlichen `source_package = ALL-IN` für Assets.

Wiederholung derselben Quelle wird über **Paket + Pfad + SHA** erkannt. Gleiche relative Pfade in unterschiedlichen Paketen bleiben eigenständige Quellen. SHA-Gruppen, Statistik, Auswahl, Review Queue und Pagination sind paketübergreifend. Ein zusätzlicher Paketfilter und die bestehende Suche erschließen den gemeinsamen Bestand. Die bestehende Grenze 10.000 Einträge und alle ZIP-/CSV-/Bildgrößenlimits bleiben erhalten; höchstens zwei Bilder werden gleichzeitig entpackt/decodiert.

Manifest-/Review-Zeilen mit explizitem Paket gelten nur dort. Unscoped interne CSVs gelten für ihre eigene ZIP. Unscoped externe Zeilen gelten nur bei eindeutigem Paket/Pfad bzw. Originalnamen. Mehrdeutige externe Zuordnungen, widersprüchliche Original-Hashes/-namen und ursprüngliche Review-Einträge bleiben ausgeschlossen; Ordner- oder Dateinamenregeln dürfen diese Sperre nicht umgehen. Nicht unterstützte Typen oder Kategorien bleiben Review. Kein neues Typenmodell und keine visuelle Inhaltsvermutung.

Unlesbare interne Metadaten sperren die betroffene Paketklassifizierung; unlesbare globale Review-/Manifestdateien sperren die gemeinsame Klassifizierung konservativ. Fehler werden mit Quelle ausgegeben. Fehlerhafte ZIPs werden einzeln ausgeschlossen, beschädigte Bilder/CRC-Fehler einzeln markiert. Der übrige sicher analysierte Bestand bleibt erhalten. Historische Metadaten-Leseversuche und Warnungen bleiben in der Sitzung nachvollziehbar; die aktuelle Quarantäne steht separat in `metadata_errors`.

## SHA, Herkunft und Resume

Paketübergreifend identische Originalbytes haben genau einen deterministischen Standardrepräsentanten. Alle Quellen bleiben in `duplicate_sources`, nun einschließlich `source_package`. Gleiche Pfade in verschiedenen Paketen werden bei Merge/Verifikation nicht mehr zusammengeworfen. Die bestehende Metadaten-Größenprüfung bleibt maßgeblich; zu große Provenienz wird nicht stillschweigend gekürzt.

Ein vollständig vorhandener identischer SHA wird übersprungen, ohne aktive Assets zu ändern. Quellpfade mit anderem SHA, mehrere passende Reservierungen oder inkompatible Drafts werden als Konflikt ausgeschlossen. Keine Überschreibung. Eine kompatible Draft-Reservierung unter einem anderen Gruppenmitglied kann mit ihrer **bestehenden ID, Revision und tatsächlichen Herkunft** fortgesetzt werden; nur bei übereinstimmendem Typ und Kategorie. Der ursprünglich ausgewählte Repräsentant bleibt als `selection_id` dem Job zugeordnet, sodass Status, Fehler und Retry im UI sichtbar bleiben.

Der bestehende Store prüft vor Upload erneut Originalbytes, SHA, Magic-Byte-MIME und den Sitzungsscope. ZIP-Dateien mit leerem File-MIME erhalten weiterhin den zentral verifizierten Upload-MIME ohne Änderung der Bytes. Offene bestätigte Storage-Objekte werden beim Resume mit dem Original-SHA verglichen und ohne zweiten Upload/Insert an denselben Draft angehängt. Jeder neue oder resumierte Eintrag bleibt `draft`; null automatische Aktivierungen.

## Gemeinsame Freigabe und Laufzeit

Ein gemeinsamer vollständiger frischer Live-Preflight ermittelt Storage-Bereitschaft, Bestand, Konflikte, bekannte SHAs und Resume-Kandidaten. Seine Gesamtmenge darf die unmittelbar davor bestätigte lokale Dry-Run-Menge nur reduzieren oder gleich lassen. Ein Anstieg blockiert. Die bestehende Cosmetic-Grenze bleibt auch im ALL-IN-Modus paketbezogen wirksam; andere sichere Pakete werden bei deren Überschreitung nicht verworfen.

Eine einzige Bestätigung lautet **`IMPORT <aktuelle Gesamtmenge> DRAFT-ASSETS`**. Vor Start und Fortsetzen wird der gesamte Bestand erneut frisch geprüft. Der bestätigte Plan ist zusätzlich an Paketmenge, IDs, Quellpakete/-pfade, SHA, Typ/Kategorie und Herkunftsquellen gebunden; eine gleich große, aber veränderte Auswahl blockiert ebenfalls. Es werden keine späteren Kandidaten hinzugefügt. UI und Handler sperren Planänderungen und einen zweiten Start auch während des asynchronen Start-Preflights.

Pause/Fortsetzen und kontrollierter Stopp verwenden denselben Controller. Bis zu zwei bereits gestartete Arbeiten werden kontrolliert abgearbeitet; kein dritter Worker. Individuelle Datei-/Paketfehler bleiben im Bericht. Unklare Storage-/DB-Verknüpfung, Sitzung/Rollenfehler und die bisherigen Sicherheitsfehler pausieren weiterhin den Batch. Abschließende Verifikation prüft Draftstatus, private Storage-Verknüpfung, Quell-/SHA-/Klassifizierungsmetadaten, Herkunft aller Kopien und null neue aktive Assets.

Dry-Run- und Importberichte enthalten Gesamtstatistik, Paketstatistik, Quellfehler, ausgeschlossene Dateien mit Grund, Review/Duplikate/Konflikte, bekannte SHA-Inhalte, tatsächliche Uploadbytes, Resume sowie verifizierte Assets. Der Bericht ordnet einen fortgesetzten Datensatz seiner tatsächlichen Paketquelle zu; zusätzliche identische Paketquellen bleiben als Herkunft und abgedeckte Bildinhalte sichtbar.

## Reload und Token-Refresh

Der bestehende Auth-Refresh-Hotfix bleibt unverändert: derselbe Benutzer/Rolle behält Sitzung und Controller ohne unnötigen Vollrender. Echter Logout, Rollen-/Benutzerwechsel oder fehlgeschlagene Identitätsprüfung stoppt weiterhin.

Ein kleiner benutzerspezifischer **sessionStorage-Hinweis** speichert nur Modus, Paketname und ausgewählte Dateinamen. Keine Bildbytes, Produktionsjobs, Freigaben, Token oder alte Bestätigung werden gespeichert. Nach Reload fordert die UI die Original-ZIPs/CSVs erneut an. Erneute Analyse + frischer Live-Preflight + neue Gesamtbestätigung rekonstruieren einen sicheren verbleibenden Plan aus dem bestehenden Backendbestand. Vollständige Assets werden übersprungen, kompatible Drafts resumiert. Es gibt kein automatisches Hochladen nach Reload und keine Persistenz in einem zweiten Asset-System. Neuöffnen im selben Tab verwendet die vorhandene Sitzung; explizites Leeren entfernt den Hinweis.

## Gezielte Browser- und Regressionstests

Neue Suite `tests/asset-library-all-in.cjs` im bestehenden Runner (`--batch-all-in`): **47 Checks**. Fixture mit fünf lesbaren Paketen, einem fehlerhaften ZIP, Manifest/Review, gleichen Pfaden, globalen SHA-Kopien und 15 gültigen Bildern:

- Paket-/Manifest-Namespace, interne/externe CSVs, Manifestpriorität, ursprüngliches Review, falscher Manifest-SHA, unbekannter Typ und mehrdeutiger externer Pfad.
- SHA-Gruppe über Pakete mit genau einem Repräsentanten und vollständiger Herkunft; gleiche Pfade/Bytes behalten beide Paketquellen. Wiederholte ZIP/CSV-Auswahl zählt nicht doppelt.
- Kaputtes ZIP, beschädigtes Bild/CRC, Traversal und enthaltenes Script werden nie importiert/ausgeführt. Defekte interne Review quarantänisiert nur ihr Paket; defekte globale Review gibt keine Kandidaten frei.
- Gemeinsamer Preflight reduziert neun vorgemerkte Inhalte auf sieben sichere Jobs: sechs neu, ein Resume unter der bereits bestehenden ID eines überdeckten Gruppenmitglieds; ein bekannter Inhalt und ein Konflikt ausgeschlossen.
- Unanalysierte Paketclaims, nicht freigegebener Einzelpaketmodus, Live-Anstieg, Änderung eines gleich großen bestätigten Plans und manuelle Freigabe ursprünglicher Review blockieren. Synthetische reine Planung beweist die weiterhin wirksame Cosmetic-Grenze, ohne 1.084 Bilder hochzuladen.
- Native UI: gemeinsame ZIP/CSV-Auswahl, Paketfilter, Suche/Review, falsche/korrekte Gesamtbestätigung. Ein gezielt angehaltener Start-Preflight beweist, dass erneute Dateiauswahl keinen zweiten Controller anlegt.
- Zwei gehaltene Storage-Aufrufe plus gleicher Token-Refresh, Pause und absichtlich unklarer DB-Attach; Reload, Originalauswahl, frischer Preflight und Resume ohne zweiten Storage-Upload/Insert.
- Insgesamt sieben eindeutige verifizierte Drafts, identische Originalbytes/SHA, tatsächlicher PNG-MIME, erhaltene Herkunft, kein überschriebenes Konfliktasset, zuvor aktives Asset vollständig unverändert, null neue aktive Assets.
- Desktop **1920×1080** und **390 px**: kein horizontaler Overflow, mindestens 44px Produktionscontrols, null Browserausnahmen. Screenshots in Chromium visuell geprüft.

Die bestehenden Paket-, Auth-, MIME-, Analyse- und Einzelasset-Regressionen werden unverändert ausgeführt. Der MIME-Test benutzt den echten Browser-Supabase-SDK mit ausschließlich im Speicher beantworteten Fixture-Requests. Keine Produktionsanfragen oder Schreibvorgänge aus diesen Tests.

**422 Prüfungen bestanden, alle neun Prozesse Exit 0:** 47 ALL-IN, 35 Building/Formulas, 35 World Items, 35 Combat, 46 Cosmetic, 37 Auth/ZIP/Pending-Resume, 25 MIME/Originalbytes/SHA, 87 lokale Analyse und 75 Einzelasset-/Rollen-/Editor-/Profil-/Karten-/Tutorial-Prüfungen. Keine Assertions oder Schutzprüfungen deaktiviert. JavaScript-Syntaxchecks und `git diff --check` erfolgreich. Der MIME-Lauf benötigt ausdrücklich `ASSET_TEST_SUPABASE_SDK`; nach Setzen dieses vorhandenen Fixture-Pfads bestand der vollständige Lauf.

```bash
# Vorhandene Umgebung: Browser, Playwright und PGlite; Prozesse nacheinander (Port 4194).
export ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite
export ASSET_TEST_SUPABASE_SDK=/tmp/asset-mime-hotfix/supabase.js
node tests/asset-library.cjs --batch-all-in
node tests/asset-library.cjs --batch-formulas
node tests/asset-library.cjs --batch-world
node tests/asset-library.cjs --batch-packages
node tests/asset-library.cjs --batch-upload
node tests/asset-library.cjs --batch-auth
node tests/asset-library.cjs --upload-mime
node tests/asset-library.cjs --batch-import
node tests/asset-library.cjs
```

Geändert: `asset-library-import.js`, `asset-library.css`, `index.html` (Cacheversionen), `tests/asset-library.cjs`, neue Suite `tests/asset-library-all-in.cjs`, dieser Auditbericht. Ignorierte lokale Artefakte: `test-results/asset-library/all-in-fixture-report.json`, `all-in-1920.png`, `all-in-390.png`. Keine Originalpakete oder Zugangsdaten committed.

**STOPP nach bestandenen Checks, Commit und GitHub-Synchronisation. Kein Produktionsimport aus diesem Codex-Lauf.**
