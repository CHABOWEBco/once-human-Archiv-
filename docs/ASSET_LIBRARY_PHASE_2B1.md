# Phase 2B.1 — lokaler ZIP-/Batch-Dry-Run

Stand: 02.10.2026. Ausschließlich `admin-editor-preview`. Lokaler und tatsächlicher GitHub-HEAD vor Änderungen: `82bdbf49ab9752dd7ad250d8fd41090d76d6c324`, Worktree sauber. Remote vor dem Checkpoint erneut unverändert geprüft. `main`: `94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.

## Freigegebener Umfang und Pilotgrenze

Implementiert: Analyse → Klassifizierung → Duplikate → Vorschau → Auswahl → Review Queue → exportierbarer DRY RUN. **Keine Produktions-Schreiboperation und kein funktionsfähiger Bulk-Upload.** Der abschließende Button „IMPORT NOCH NICHT FREIGEGEBEN“ ist deaktiviert. Alle vorbereiteten Kandidaten haben `status = draft`, keine Bild-/Storage-Referenz und keine Benutzerfreigabe.

Das hochgeladene Original `OnceHuman_CMS_v2_01_Profile_Cosmetics_Shop.zip` konnte **nicht** geöffnet werden: Das Executor-Downloadtool weist Dateien über 32 MiB zurück. Daher existiert noch keine belastbare Statistik des echten Pilotpakets und keine Aussage darüber, wie viele seiner Assets automatisch zugeordnet werden können. Der Benutzer hat ausdrücklich die vollständige Implementierung trotz dieser Grenze freigegeben und eigenständig lesbare Teil-ZIPs unter 32 MiB für später angekündigt. Der echte Pilot-Dry-Run bleibt bis zur Nachlieferung offen; keine Testzahlen werden als Pilotzahlen ausgegeben.

## Wiederverwendung der bestehenden Architektur

Vor Änderungen geprüft: `asset-library.js`, `asset-library-model.js`, `admin-panel.js`, `supabase-client.js`, `JMA_ASSET_STORE`, Bildvalidierung, Profilpreview sowie vorhandene Migrationen/Rollen/RLS und Bucketdefinition `archive-assets`. Keine bestehende ZIP-Bibliothek oder Batchanalyse vorhanden.

- Der neue Button steht neben „+ Neues Asset“ in derselben Asset-Bibliothek. Der Import ist deren lokaler Arbeitsmodus; kein weiterer Adminbereich oder Assetbestand.
- `asset-library-import.js` kapselt ausschließlich die lokale Sitzung, ZIP-/Ordner-Datenquelle, Klassifizierung und deren UI. Es implementiert keine Storage-/DB-API und ruft `JMA_ASSET_STORE.save()` nicht auf.
- Gültige Bilder laufen durch die unveränderte `ASSET_LIBRARY_MODEL.inspectUpload()`: Signatur, Endung/MIME, Decodierbarkeit, 8 MiB, 8192 Pixel je Seite und maximal 32 × 1024 × 1024 Pixel.
- Die bestehende kombinierte Preview wurde in `previewMarkup()` parametrisiert. Einzelupload und Batch verwenden dieselbe Avatar-/Rahmen-/Banner-Komposition und `JMA_PROFILE.avatar()`. Vorhandene CSS-Ringe/Kränze bleiben unterstützt; zusätzliche Rasterdekorationen sind wie bisher separat als Originalbild prüfbar. Keine zweite Profilpreview, keine Änderung der Kontoausstattung.
- Bekannte Assetzeilen kommen aus derselben bereits geladenen und mit Originalbestand zusammengeführten Bibliothek. Die bestehende Bildauslieferung/Hydrierung bleibt zuständig für gespeicherte ergänzende Previewbilder.
- Vorhandene Typen, Metadaten-JSON, Statuslogik und Rollen `moderator/admin/owner` bleiben Grundlage. Normale Benutzer erhalten weder Import-UI noch Zugriff auf die direkte Analysefunktion.

`asset-library-model.js`, `supabase-client.js`, `admin-panel.js`, sämtliche SQL-Migrationen, Rollen/RLS, Storage, Katalog, Karte, Fly-by, Guides und Profilimplementierung bleiben unverändert. **Keine neue Tabelle und keine Migration erforderlich.** Keine produktiven Daten wurden verändert.

## Gemeinsame Teil-ZIP-Sitzung

Vor dem ersten Einlesen den gemeinsamen Paketnamen setzen; Standard ist der vollständige Name des Cosmetic-Pilotpakets. Nach Beginn ist er für diese Sitzung schreibgeschützt. „Neues Paket / Sitzung leeren“ beginnt eine neue lokale Sammlung.

ZIPs, Bildbatch oder Ordner werden nacheinander zur Sammlung hinzugefügt. Alle Kandidaten erhalten dasselbe `metadata.source_package`; `source_path` ist der Originalpfad innerhalb des jeweiligen ZIPs bzw. `webkitRelativePath` bei Ordnerauswahl. ZIP-Teilnamen werden separat als geladene Quellen im Bericht dokumentiert.

Gleiches Paket + gleicher Originalpfad + gleicher Bild-SHA-256 ergibt denselben logischen Kandidaten; eine erneute Teil-Auswahl erzeugt keinen zweiten Kandidaten und ändert dessen ID nicht. Unterschiedliche Pfade mit identischem SHA bleiben getrennte sichtbare Bildduplikate. Derselbe Pfad mit unterschiedlichen Bytes bleibt als zwei Kandidaten erhalten; beide werden zunächst nicht automatisch vorgemerkt und erhalten einen Pfadkonflikthinweis. Eine eindeutig bekannte Klassifizierung wird dadurch nicht in die reine Klassifizierungs-Review verschoben. Ungültige Dateien werden anhand Pfad, Größe, Fehler und, soweit vorhanden, ZIP-CRC wiedererkannt; aus ihnen entstehen keine Importkandidaten.

Gewöhnliche UI-Re-Renders erhalten Sitzung, Klassifizierung, technische IDs und Auswahl. Auch erneutes Hinzufügen eines Teils bewahrt manuelle Zuordnungen sowie explizite Vormerken-/Überspringen-Entscheidungen. Schließen/erneutes Öffnen innerhalb der Asset-Bibliothek erhält die Ergebnisse, startet keine Analyse und gibt Preview-URLs frei. Routen-/Adminbereichswechsel, Rollenwechsel und `pagehide` brechen Arbeiten ab und geben die lokale Sammlung frei. Kein Cloud-/LocalStorage-Sitzungsbestand wird angelegt.

## Klassifizierung und Metadaten

Priorität: passendes Manifest/Review-Daten → eindeutiger Ordner → eindeutige Klassifizierung identischer Bildbytes → explizite Dateinamensregel → ZUORDNUNG PRÜFEN. Eine klare höhere Zuordnung wird nicht durch eine niedrigere ersetzt. Keine Bildinhaltserkennung.

Erkannt werden `OnceHuman_CMS_v2_Manifest.csv` und `OnceHuman_CMS_v2_Review_Queue.csv`, auch separat oder vor den ZIPs. CSV unterstützt UTF-8/BOM, Komma/Semikolon/Tab, zitierte Trennzeichen, Zeilenumbrüche und doppelte Anführungszeichen. Übliche deutsche/englische Spaltennamen werden zu Pfad, Originalname, Paket, SHA, Typ, Kategorie und Anzeigename zugeordnet.

- Pfad muss mit der echten Datei übereinstimmen. Fehlt ein Pfad, ist ein exakter Originalname nur bei eindeutiger Namenszuordnung verwendbar. Ein vorhandener SHA oder Originalname muss zu den tatsächlichen Bytes bzw. dem Dateinamen passen; Abweichungen werden angezeigt und nicht als Metadatenbeleg übernommen. Ein abweichendes Paket wird nicht übernommen.
- Kanonische Typ-/Kategoriebezeichnungen und feste deutsche/englische Aliase nutzen das vorhandene Modell. Ein klarer Typ kann seine bestehende Standardkategorie liefern; eine fehlende Typangabe bei klarer Kategorie kann durch einen eindeutigen Ordner ergänzt werden. Explizite unbekannte Felder werden nicht stillschweigend ersetzt.
- Unbekannte Kategorien, widersprüchliche klare Metadaten und explizite Review-Markierungen bleiben ungeklärt. Boolean-Flags wie `needs_review=true` werden respektiert; `reviewed/resolved` wird nicht fälschlich erneut als Review interpretiert. Ein vollständiger klarer Manifestbeleg bleibt gegenüber einer bloßen unsicheren Review-Vermutung maßgeblich.
- Ordner erkennen ausdrückliche Typwörter einschließlich nummerierter/zusammengesetzter Namen. Die spezifische Phrase „Avatar Frames“ bezeichnet Rahmen. Ein bloßer „Images“-Ordner oder `image1.png` erfindet keinen Website-Verwendungszweck. Ein vorhandener klarer Zweck wie `Frames/Images` bzw. `Website/Images` bleibt nutzbar.
- Identische SHA-Gruppen werden über alle Teile hinweg gemeinsam klassifiziert. Eine eindeutige sichere Zuordnung darf ungeklärte bzw. niedrigere Dateinamensregeln ergänzen. Mehrere unterschiedliche Verwendungszwecke identischer Bytes werden nicht automatisch vereinheitlicht.
- Die Review Queue zeigt ausschließlich gültige Bilder ohne zuverlässig bestätigten Typ/Kategorie. Ungültige Dateien und reine Pfadkonflikte besitzen ihre eigenen Hinweise.

Vorbereitete Datensätze laufen durch `ASSET_LIBRARY_MODEL.validate()`. Technische IDs sind `asset-<crypto.randomUUID()>`; Dateinamen führen zu keinem Überschreiben. Das bestehende `metadata` enthält `source_package`, `source_path`, `original_name`, `sha256`, `classification_source`, `classification_reason` sowie bei verwendeten Manifestdaten die begrenzte Original-Metadatenzeile. Kein zweites Backend-Metadatenmodell.

Status ist unabhängig von Typ/Kategorie. Manifeststatus `active` oder eine eindeutige Zuordnung aktivieren kein Asset. Bestehende Datensätze werden nicht umgetypt; derselbe Bildhash kann mehrere spätere Verwendungsdatensätze besitzen.

## Duplikate und Erkennungsgrenzen

Getrennte Hinweise für Namensgleichheit, EXAKTES BILDDUPLIKAT im Batch, IDENTISCHES BEKANNTES BILD, BEREITS IMPORTIERT und NEU. Namen werden normalisiert verglichen; gleicher Name gilt niemals als Bytegleichheit. Auch gleiche vorbereitete Anzeigenamen werden markiert.

Bekannte SHA kommen aus `metadata.sha256` oder dem bereits bestehenden `metadata.upload.sha256`. „Bereits importiert“ erfordert zusätzlich passendes Paket und Originalpfad. Ein bekannter Hash allein ist noch kein Resume-Nachweis. Die Oberfläche zeigt ausdrücklich, wie viele geladene bekannte Assets überhaupt einen gespeicherten Hash besitzen. Alte statische Assets ohne gespeicherten SHA werden nicht als geprüfte exakte Bildduplikate ausgegeben; ihre Namen sind vergleichbar. Es gibt keine automatische Nachsignierung/Downloadaktion aller vorhandenen Bilder, keine Zusammenführung, kein Löschen und kein Überschreiben.

Neue, eindeutige, duplikatfreie Kandidaten werden automatisch vorgemerkt. Bildduplikate/bereits bekannte Bilder und unklare Fälle beginnen übersprungen. Berechtigte Admins können eindeutige Duplikate bewusst vormerken. Mehrfachauswahl unterstützt sichtbare Seite, alle gefilterten eindeutigen/unklaren/Duplikate und Auswahl aufheben. Typ/Kategorie lassen sich gemeinsam bestätigen; Vormerken/Überspringen bleibt lokal und ausschließlich `draft`.

## ZIP-Sicherheit, Performance und neue Dependency

Genau eine zusätzliche Bibliothek: **fflate 0.8.2**, unveränderte lokal eingebundene UMD-Datei, 32.665 Bytes, MIT. Bezugsquelle, SHA-512-Tarballprüfung und SHA-256 der vendorten Datei stehen in `vendor/README.md`. Keine zweite Library, kein Laufzeit-CDN. Die Anwendung nutzt nur den lesenden `AsyncInflate`-Pfad; Tests erzeugen ZIP-Fixtures mit `zipSync`.

ZIP-Zentralverzeichnis wird vor dem Lesen begrenzt geprüft. Absolute/Traversal-/Backslash-/Kontrollzeichenpfade, versteckte Systemdateien, Symlinks, verschlüsselte Einträge und andere Kompressionsverfahren werden ausgeschlossen. Lokaler Dateikopf und Verzeichnisname müssen übereinstimmen; Grenzen, tatsächliche entpackte Länge und CRC werden kontrolliert. Unterstützt: normale einteilige ZIPs mit STORE/DEFLATE, UTF-8 und CP437-Namen. ZIP64 und mehrteilige physische Split-Archive werden explizit abgewiesen; die vorgesehenen Teilpakete müssen eigenständige ZIPs sein. ZIP-Inhalte werden ausschließlich als Daten gelesen, nie ausgeführt.

Grenzen: ZIP maximal 512 MiB; 10.000 logische Dateien pro Sammlung; je ZIP maximal 2 GiB deklarierter entpackter Umfang; Zentralverzeichnis/CSV jeweils maximal 4 MiB; einzelne CSV-Metadatenzeile maximal 16 KiB; Rasterdateien nach bestehendem 8-MiB-/Dimensionslimit. Beschädigte CSVs werden nicht teilweise als Klassifizierung übernommen und bleiben mit Fehlerzählung sichtbar.

Analyse hat zwei parallele Bildjobs. Entpacken läuft in abbrechbaren Bibliotheksworkern mit kleinen komprimierten Eingabeblöcken, Laufzeit- und Ausgabelimits. SHA nutzt Web Crypto. Files werden je Kandidat gelesen/validiert und anschließend verworfen; ZIP-Mitglieder bleiben lazy lesbar. Ordner behalten unveränderte File-Referenzen. Keine Base64-Kopien oder Canvasverarbeitung der Originalbilder.

Verzeichnis- und Klassifizierungsschleifen geben regelmäßig an die UI ab. Fortschritt wird ohne kompletten App-Re-Render aktualisiert. Eine fehlgeschlagene/abgebrochene Ergänzung bewahrt das vorherige vollständige Ergebnis. Die Liste rendert maximal **24 Zeilen pro Seite**, mit Suche und Filtern nach Name/Pfad, Typ, Kategorie, Status, Duplikatstatus, Klassifizierungsquelle und Review. Lokale Thumbnails werden nur für die aktuelle Seite gelesen; alle Object URLs und laufenden Previewjobs werden bei Wechsel/Schließen freigegeben.

Der JSON-Bericht enthält Gesamt-/Bild-/Fehlerzahlen, PNG/JPEG/WebP, Größen/Dimensionen je Datei, Quellen, automatische/manuelle/ungeklärte Zuordnungen, Duplikate, Known-/Resume-Nachweise, Auswahlergebnis, Typ-/Kategorieverteilung und vollständige nachvollziehbare Kandidaten. Er enthält keine Signed URLs und kann keine Produktionsoperation auslösen.

## Verifikation

**220 isolierte Browserprüfungen bestanden:**

- 64 neue Batchprüfungen über den bestehenden Auth-/PostgreSQL-/Chromium-Testadapter: ZIP/Ordner/JPEG/WebP, beschädigte ZIP/Bilder/CRC, deklarierte Inflate-Ausgabegrenze, verschlüsselte Mitglieder, CP437, Traversal/Systemdateien, CSV-Varianten/Fehler/Boolean-Review, Manifest-/Ordner-/SHA-/Dateinamenspriorität, unbekannte Kategorien, getrennte Namens-/Bildduplikate, gemeinsames Paket/Teiladdition/Wiederholung, CSV vor/nach ZIP, stabile IDs/manuelle Entscheidungen, JSON-Dry-Run, Suche/Filter, Review/Bulk, kombinierte Profilpreview, Abbruch/Re-Render/Schließen/erneutes Öffnen, 1.620 Bilder mit 24 DOM-Zeilen, Desktop 1920 und 390 px einschließlich nativer Touch-Auswahl, Rollen und Route-Cleanup.
- 75 bestehende Asset-Editor-/Storage-Prüfungen weiterhin bestanden: Einzelupload, unveränderte Originalbytes, Revision/Status/RLS, Profilpreview, bestehende Profil-/Karten-/Tutorialfunktionen sowie Desktop/Mobil.
- 34 bestehende Katalog-/Asset-Verknüpfungsprüfungen und 47 direkte Datenbank-Admin-Prüfungen weiterhin bestanden: vorhandene Fuchs-ID/Metadaten, Bildverknüpfung, Dossier/Admin-Popup und Responsive.

Der Batchtest vergleicht sämtliche isolierten Assetzeilen vor/nach dem gesamten UI-Ablauf und überwacht API-Anfragen: **null Schreibaktionen / null Storageuploads**. Keine Browserexception. Screenshots Desktop/390 px einschließlich mobiler kombinierter Preview wurden visuell betrachtet. Keine Produktions-Supabase-Mutation und kein echter kosmetischer Assetupload.

Reproduktion mit der bestehenden Cloud-Installation:

```bash
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-import
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --catalog-link
```

### Ausschließlich synthetischer Klassifizierungs-Dry-Run — kein Pilotbefund

Zwei lokal erzeugte Mini-ZIPs plus separates Manifest und Review-CSV, mit einer expliziten bekannten Hash-Fixture:

| Kennzahl | Ergebnis |
| --- | ---: |
| Logische Dateien | 18 |
| Metadaten-CSV | 2 |
| Gültige Bilder / ungültige Dateien | 10 / 6 |
| Automatisch eindeutig / weiterhin Review | 8 / 2 |
| Manifest / Ordner / SHA / Dateinamensregel | 1 / 3 / 4 / 0 |
| Namensduplikate einschließlich bekannter Name | 3 Dateien |
| Exakte Bildduplikate | 8 Dateien / 4 Gruppen |
| Bekannt / belegter Reimport | 1 / 1 |
| Vorgemerkt / übersprungen | 1 / 9 |
| Typen | avatar 3, frame 3, banner 4 |
| Kategorien | profile 9, unresolved 1 |
| Unbekannte vorbereitete Kategorie | `not-a-known-category` (Review) |

Die explizite Dateinamensregel ist separat nachgewiesen; im kombinierten Sample werden ihre Treffer durch höhere SHA-/Ordnerbelege ersetzt. Wiederholte Teile/CSV erhöhen die logische Dateianzahl nicht. Der zusätzliche 1.620-Bilder-Test ist eine Last-/UI-Fixture, kein Produktions-Assetbestand.

Ignorierte aktuelle Testartefakte: `test-results/asset-library/batch-classification-fixture.json`, `batch-fixture-dry-run.json`, `batch-desktop.png`, `batch-mobile.png`, `batch-mobile-preview.png`. Originalpakete und Testbilder werden nicht committed.

## Geänderte Dateien und Checkpoint

`asset-library.js`, `asset-library.css`, `index.html`, neu `asset-library-import.js`, Erweiterung des bestehenden Testharness `tests/asset-library.cjs`, neu `tests/asset-library-import.cjs`, `vendor/fflate-0.8.2.min.js`, `vendor/fflate-LICENSE.txt`, `vendor/README.md`, dieser Auditbericht.

Preview: `index.html#/admin` → mit bestehender berechtigter Anmeldung „Asset-Bibliothek“ → „ZIP / ORDNER IMPORTIEREN“. Der finale immutable Commit-/Preview-Stand wird im Abschluss genannt. Externe Raw-Githack-Abrufe sind in dieser Cloud netzwerkseitig gesperrt; die Anwendung wurde lokal mit echtem Chromium geprüft.

**STOPP nach dem Checkpoint.** Der echte Pilot-Dry-Run wartet auf die angekündigten Teil-ZIPs. Phase 2B.2 wird ohne separates GO nicht begonnen.
