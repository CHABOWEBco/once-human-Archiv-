# Phase 2B.2A — Cosmetic-Produktions-Uploader vorbereitet

Stand: **03.10.2026**. Ausschließlich `admin-editor-preview`. Lokaler und tatsächlicher Remote-Ausgangsstand: `6bd132dfac1b30c331c297b87f38ec9cefe497e9`, Worktree sauber. `main`: unverändert `94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.

**Dieser Codex-Lauf hat keine Produktionsdaten verändert und keinen Cosmetic-Produktionsupload ausgelöst.** Die Anwendung ist für den späteren Start durch den Benutzer im authentifizierten Admin-Browser vorbereitet. Testuploads fanden ausschließlich in der isolierten PostgreSQL-/Storage-Fixture statt. Keine Veröffentlichung, kein Service-Role-Key, keine Migration oder neue Dependency.

## Hotfix vom 03.10.2026 — verifizierter MIME im ZIP-Upload

Ausgangspunkt dieses gesonderten Hotfixes: `d0544454e8966dfd7f2d6bbcbe986d03ef81f485`, lokal und remote bestätigt, Worktree sauber. Der Benutzer meldete zwei reservierte Drafts und null hochgeladene Bytes nach Ablehnung von `application/octet-stream`. Diese Produktionsmeldung stammt vom Benutzer; der Hotfix-Lauf greift nicht schreibend auf die Produktion zu.

Die Ursache wurde mit dem tatsächlichen Browser-Supabase-SDK und einer vollständig lokalen, im Speicher beantworteten Fetch-Funktion reproduziert: Bei einem File mit leerem `type` enthält die Multipart-Datei `application/octet-stream`, auch wenn die Uploadoption `contentType:'image/png'` korrekt ist. Der bisherige Testadapter leitete dagegen ausschließlich die Option als MIME weiter und konnte diesen Unterschied nicht entdecken. Er verwendet jetzt den tatsächlichen File-MIME und verweigert leere/unzulässige Typen wie der Bucket.

Der bestehende zentrale `saveAsset()`-Pfad erzeugt unmittelbar vor seinem einzigen Storage-Uploadaufruf ein `File` aus den bereits validierten Originalbytes mit demselben Namen und Änderungsdatum sowie `type:info.mime`. `info.mime` stammt unverändert aus `ASSET_LIBRARY_MODEL.inspectUpload()`, nicht aus der Dateiendung. Bytes werden lediglich in ein File verpackt, nicht konvertiert oder neu codiert. Batch und Einzelupload verwenden denselben Fix. Die Cacheversion des Store-Scripts wurde erhöht.

Die gezielte Chromium-Prüfung verwendet den echten ZIP-Reader für PNG, JPEG und WebP mit intern leerem File-MIME. Sie prüft Magic Bytes, die beim SDK ankommende Datei, die tatsächlich vom echten SDK erzeugten Multipart-Dateitypen, byteidentische Original-/Upload-/Storage-Inhalte und unveränderte SHA-Werte. Eine negative Kontrolle reproduziert den Fehler ohne MIME-Normalisierung. Falsche Endung, beschädigte PNG-Datei und ein falscher deklarierter MIME bleiben vor Reservation/Upload blockiert.

**146 Hotfix-Prüfungen bestanden, alle Prozesse Exit 0:** 25 gezielte MIME-/Originalbyte-/SDK-/Resume-Prüfungen, 46 bestehende Batch-Upload-Sicherheitsprüfungen und 75 bestehende Asset-Editor-/Einzelupload-Prüfungen. Die Regressionen enthalten Desktop und 390 px. Sie wurden nacheinander mit dem bestehenden isolierten PostgreSQL-/Chromium-Adapter ausgeführt; keine Assertion wurde deaktiviert.

Zwei lokale Drafts mit gespeichertem `import_pending`, ohne Bildreferenz und mit Revision 2 wurden vor Reload angelegt. Nach nativer erneuter ZIP-Auswahl erkennt der frische Preflight beide als resumierbar; der Upload verwendet dieselben IDs und jeweils Revision 3 nach Attach. Es entstehen keine zweiten Datensätze. Alle drei geprüften Batchassets bleiben `draft`, benutzerverfügbar false, neue aktive Assets null. Das sichert den vom Benutzer gemeldeten Zustand der zwei Fehl-Drafts ab; eine neue produktive Live-Inventarprüfung erfolgt erst in dessen Browser.

Keine Änderung an Preflight, Pause/Resume, Parallelität, Rollen/RLS, Original-ZIP-Reader oder Migrationen. Kein Produktionsupload durch Codex. Der echte SDK-Code ist die bereits in `index.html` verwendete Frontend-Dependency, ausschließlich für den Test nach `/tmp` geladen; keine neue Dependency oder Vendoring.

```bash
curl -fLsS https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js -o /tmp/supabase-mime-test.js
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite ASSET_TEST_SUPABASE_SDK=/tmp/supabase-mime-test.js node tests/asset-library.cjs --upload-mime
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-upload
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs
```

Der isolierte Ergebnisbericht `test-results/asset-library/upload-mime-fixture-report.json` enthält beide Resume-IDs, tatsächliche Multipart-Dateitypen, Originalbytes und SHA des getesteten Browser-SDKs. Er ist keine produktive Importbestätigung. Geändert im Hotfix: `supabase-client.js`, `index.html`, `tests/asset-library.cjs`, neu `tests/asset-library-upload-mime.cjs`, dieser Auditnachtrag.

## Bestehende Architektur

Der Uploader bleibt ein Modus von `ASSET_LIBRARY_IMPORT` innerhalb der vorhandenen Asset-Bibliothek. `JMA_ASSET_STORE.saveBatch()` ist ein kleiner Wrapper um den bisherigen `saveAsset()`-Kern, nicht ein zweiter Uploadpfad. Es gibt weiterhin genau einen SDK-Storage-Uploadaufruf; Reservation, `commitAsset()`, Bildvalidierung, Hashing, Versionsprüfung und Storage-Pfade werden gemeinsam verwendet.

`ASSET_LIBRARY_MODEL.inspectUpload()` prüft vor jedem Schreibvorgang erneut Originaldatei, echte MIME-Signatur, passende Endung, Größe und Dimensionen. Der SHA wird erneut aus den Originalbytes berechnet und muss dem Dry Run entsprechen. Es gibt weder Re-Encoding noch Resize oder andere Bildbearbeitung. Die ursprünglichen Profil-/Dossier-Previews werden weiterbenutzt.

Bestehende Rollen/RLS, `archive-assets`, Metadaten und Draft-/Revisionslogik bleiben erhalten. Es werden keine Tabellen, Spalten, Policies oder Storage-Buckets angelegt. Der vorhandene Einzeluploadpfad und die übrigen Websitebereiche bleiben funktional erhalten.

## Live-Preflight vor jedem Start und Fortsetzen

Der Preflight ist ausschließlich lesend und verwendet den bestehenden authentifizierten Supabase-Client:

1. Echte Benutzer-Sitzung serverseitig über `auth.getUser()` prüfen; ID muss zur laufenden Sitzung passen.
2. Aktuelle Rolle aus `user_roles` neu lesen; nur moderator/admin/owner mit übereinstimmender Sitzung.
3. `asset_library` frisch direkt laden, mit exakter Gesamtzählung und vollständiger Pagination. Geänderte Gesamtzahlen, wiederholte IDs oder abgebrochene/fehlende Seiten sperren den Start. Eine kleinere API-Seitengrenze wird anhand der tatsächlichen Seitenlänge berücksichtigt.
4. Die bestehenden Storage-Spalten auf allen Zeilen und die Lesbarkeit von `archive-assets` prüfen. Seed-/Fallbackdaten können keinen erfolgreichen Preflight erzeugen.
5. Private Daten müssen positiv sichtbar sein: Mindestens ein tatsächlich nicht aktiver Datensatz muss im authentifizierten Inventar vorhanden sein. Im bestehenden Pilotbestand ist dafür der archivierte Live-Verifikationseintrag geeignet. Ohne diesen positiven Nachweis erscheint STOPP, statt ausschließlich öffentliche aktive Zeilen als vollständigen Privatbestand zu behandeln.

Das ist ein operativer API-Nachweis innerhalb der bestehenden, unveränderten Rollen/RLS, keine neue SQL-Policyprüfung. Vorhandene Produktions-Authdaten stehen Codex hier nicht zur Verfügung; der tatsächliche Live-Preflight wird erst im Browser des Benutzers ausgeführt.

Alte Live-Bildreferenzen ohne gültigen gespeicherten Hash werden mit höchstens zwei parallelen Lesejobs lokal gehasht, damit die zwei bekannten Alt-Avatare nicht wieder als neue Uploads erscheinen. Statische Pfade müssen durch den bisherigen Pfadvalidator erlaubt sein; private Storage-Referenzen werden über denselben SDK-Client gelesen. Diese Byte-Nachweise bleiben temporär und werden **nicht** in Live-Metadaten geschrieben. Nicht lesbare Legacy-Referenzen werden als nicht hashverifiziert angezeigt. Sie ersetzen niemals den vollständigen Live-Inventarcheck.

Für die tatsächlichen Bildbytes haben temporär verifizierte Hashes und `metadata.upload.sha256` Vorrang vor älteren Source-Hashes. Hat ein Admin das gespeicherte Bild später geändert, wird es nicht fälschlich anhand der alten ZIP-Herkunft als identisch behandelt und niemals durch diesen Batch überschrieben.

## Kandidatenabgleich

Der Ausführungssatz wird nach dem Live-Reload aus den vorhandenen, vorgemerkten Repräsentanten gebildet. Review-Dateien, ausdrücklich in der ursprünglichen Review-CSV markierte Pfade, covered-Kopien, ungültige Dateien und unvollständige Kandidaten werden ausgeschlossen. Eine lokale manuelle Typbestätigung kann die 133 ursprünglichen Review-Fälle nicht in diesen Pilot-Produktivimport schleusen.

- **Bereits vollständig vorhanden:** Identischer tatsächlicher Bildhash mit gültiger Bild-/Storage-Referenz; kein Upload, keine Änderung des bestehenden Datensatzes, auch wenn er aktiv oder archiviert ist.
- **Resumierbarer Draft:** Genau ein passender Datensatz mit identischem Paket, Originalpfad und SHA, Status draft, passenden Typ-/Kategorieangaben, geladener Revision und ohne Bildreferenz. Bestehende ID, Revision, Anzeigename und sonstige bestehende Zuordnungen bleiben erhalten.
- **Neuer Kandidat:** Keine vorhandene vollständige Referenz, Reservation oder Herkunftskollision.
- **Konflikt:** Gleicher Originalpfad mit anderem/fehlendem SHA, mehrere passende Drafts oder eine inkompatible Reservation. Kein automatisches Fortsetzen oder Überschreiben.

Ein einzelner Bildhash kann standardmäßig nur einen Produktivkandidaten haben. Manuell zusätzlich vorgemerkte covered-Kopien werden nicht hochgeladen. Bei mehr als **1.083 nach Live-Abgleich verbleibenden Uploadkandidaten** wird der gesamte Start mit STOPP gesperrt. Weniger ist zulässig und wird in der Übersicht erklärt. Andere Ursprungspakete sind nicht für diesen Produktionspfad freigegeben.

Die lokale Analyse verwendet dieselbe Unterscheidung: Ein bekannter SHA ohne gültige Bildreferenz wird nicht als bereits erfolgreich importiert ausgeschlossen. Dadurch bleibt nach Reload und echter Dateiauswahl der Repräsentant eines reservierten Drafts für den anschließenden Live-Resume vorgemerkt. Dieser Fall wurde zusätzlich über die native Oberfläche geprüft; die ursprüngliche Reimport-Fixture weist jetzt ausdrücklich eine fertige Bildreferenz nach.

Konflikte bleiben sichtbar und werden übersprungen; die fehlerfreien Kandidaten können nach Bestätigung importiert werden. Für den bestätigten echten Cosmetic-Pilot gab es in der isolierten Neuplanung keine Konflikte.

## Draft-Reservation und Storage-/Attach-Sicherheit

Jeder neue Datensatz wird ausschließlich als `draft` reserviert. Im bestehenden `metadata` werden `source_package`, `source_path`, `original_name`, `sha256`, Klassifizierungsquelle/-grund und die vollständigen `duplicate_sources` erhalten. Zusätzlich gibt es eine technische `import_batch`-ID.

Vor dem Upload wird die geplante unveränderliche Objektadresse als `metadata.import_pending = {storage_path, sha256}` im reservierten Draft gesichert. Das ist keine neue DB-Spalte. Bei älteren unvollständigen Drafts wird dieselbe ID mit geladener Revision verwendet. Die Reservation ist keine Erfolgsbestätigung.

Beim Resume wird ein bereits unter dieser Absicht vorhandenes Objekt gelesen und sein SHA gegen das erneut geprüfte lokale Original verifiziert. Stimmt es, wird ausschließlich die DB-Verknüpfung nachgeholt. Fehlt es nach sicherem Not-found-Nachweis, wird auf denselben geplanten Pfad hochgeladen. Andere Fehler führen nicht zu blindem Schreiben auf einen neuen Pfad. `upsert:false` und die vorhandene No-Delete-/No-Overwrite-Policy bleiben bestehen.

Nach Storage-Erfolg wird der Attach bei transienten Fehlern maximal dreimal mit begrenztem Backoff versucht. Nach jedem fehlgeschlagenen Versuch wird der Live-Datensatz gelesen: Ist genau dieser Pfad bereits mit passenden Source-/SHA-Metadaten und Status draft verknüpft, gilt der verlorene Response als Erfolg. Andernfalls pausiert der Batch und meldet Asset-ID, Bucket, genauen Storage-Pfad und ob der Upload bestätigt wurde. Es wird nichts automatisch gelöscht.

Ein Storagefehler bewahrt die Reservation und die Adresse für einen sicheren erneuten Versuch. Eine verlorene Berechtigung oder ein Sitzungswechsel pausiert die Queue. Auth-Scope wird auch im gemeinsamen Store vor Reservation/Upload/Attach geprüft; verbleibende Jobs werden nicht unter einer anderen Anmeldung fortgesetzt.

## Steuerung, Performance und Navigation

Höchstens **zwei** Jobs gleichzeitig. Es wird keine vollständige Requestmenge von 1.083 gestartet. Pause und „Nach aktuellen Uploads stoppen“ verhindern neue Jobs; bereits laufende Requests dürfen sauber fertig werden. Fortsetzen prüft das Live-Inventar erneut. Doppelte Startaktionen können keinen zweiten Workerpool erzeugen.

Auch ein bereits während der Dateivalidierung pausierter Job beginnt keine neue Reservation oder Storage-Anfrage. Hat eine Reservation bereits begonnen, wird vor einem noch nicht begonnenen Upload erneut geprüft und die gesicherte Absicht erhalten. Bereits erfolgreich hochgeladene Objekte werden noch sauber verknüpft.

Jeder Assetzustand erscheint in der bestehenden paginierten Liste: WARTET, VALIDIERUNG, UPLOAD, DB-VERKNÜPFUNG, ERFOLGREICH, BEREITS VORHANDEN, FORTGESETZT, FEHLER oder KONFLIKT. Fehler können einzeln wieder auf WARTET gesetzt und anschließend fortgesetzt werden. Fortschrittsanzeigen zählen erledigte, verifizierte, vorhandene und fehlgeschlagene Einträge sowie bestätigte Uploadbytes. Die aktuellen Bytes sind die Summe der Dateigrößen der gerade aktiven Uploadrequests; der SDK liefert keinen granularen Streaming-Prozentfortschritt.

Die Liste bleibt bei maximal 24 DOM-Zeilen. Status-Redraws werden gebündelt, damit Thumbnails und DOM nicht pro Netzwerkcallback neu erzeugt werden. Keine Bildbytes oder Fortschrittszähler werden in LocalStorage gespeichert. Nach Reload: dieselben ZIP-Parts/CSVs erneut wählen, Live-Preflight neu ausführen, fertige Assets überspringen und reservierte Drafts fortsetzen. Supabase bleibt die Source of Truth.

`beforeunload` warnt während Startprüfung und laufenden Uploads vor Verlassen/Reload. Interne Navigation stoppt weitere Jobs und lässt bereits laufende Arbeit auslaufen. Eine während Navigation abgebrochene Preflight-Antwort kann keine neue Importsitzung wiederherstellen. Die Bedienung wird nicht aggressiv gesperrt.

Die vorhandene Asset-Bibliothek lädt nach dem Lauf ihren Bestand erneut, damit die neuen Drafts auch beim Rückwechsel sichtbar sind.

## Abschlussverifikation und Bericht

Nach jedem abgeschlossenen oder pausierten Lauf wird die Tabelle erneut direkt und vollständig gelesen. Erfolgsanzeigen werden gegen Live-Zeilen geprüft: exakt draft, nicht benutzerverfügbar, gültiger `archive-assets`-Pfad, derselbe verknüpfte Pfad, gespeicherter Upload-SHA, vollständige Source-/Klassifizierungsmetadaten, Batch-ID und vollständige Duplicate-Quellen.

Zusätzlich wird geprüft, dass **0 Assets mit dieser Batch-ID active** sind. Fehlgeschlagene Verifikation wird als STOPP/Pause angezeigt, nicht als erfolgreicher Abschluss ausgegeben.

Der lokal herunterladbare Importbericht enthält Originalplanung, bestätigtes Pilotlimit, Menge nach Preflight und nach neuestem Live-Recheck, neue/resumierte/vorhandene Assets, redundante Kopien, unangetastete Review-Zahl, Konflikte/Fehler, verifizierte Erfolge, hochgeladene Bytes, aktive Dateigrößen und offene Storage-/Attach-Fälle mit konkreten Adressen. Ein vor dem Start heruntergeladener Bericht ist eine Planung, kein Nachweis eines bereits ausgeführten Imports.

## Echte Cosmetic-Dateien: isolierte native Browserplanung

Die drei vorhandenen echten Part-ZIPs sowie Manifest und Review-CSV wurden erneut über die native Chromium-Dateiauswahl analysiert. Der Auth-/PostgreSQL-/Storage-Adapter war dabei vollständig lokal. Der frische Preflight verwendete 128 bestehende Seedzeilen plus eine private RLS-Fixture, keine Produktivsession.

| Ergebnis | Isolierte Neuplanung mit echten Dateien |
|---|---:|
| Gültige PNGs | 1.663 |
| Manifestklassifiziert / Review | 1.530 / 133 |
| Duplikatdateien / Gruppen | 700 / 234 |
| Neue Repräsentantengruppen / reine Review-Gruppen | 225 / 9 |
| Neue Uploadkandidaten nach Preflight | **1.083** |
| Durch zusätzliche Legacy-Byteprüfung bereits vorhanden | **2** |
| Resumierbare Drafts / Konflikte | 0 / 0 |
| Review ausgeschlossen | **133** |
| Durch Repräsentanten abgedeckte redundante Kopien ausgeschlossen | **447** |
| Geplante Originalbytes | **51.720.237** |
| API-Schreibaktionen / Uploads / Produktionsaufrufe | **0 / 0 / 0** |

Der Start blieb ohne Bestätigung deaktiviert. Der echte Produktions-Preflight kann diese Zahl aufgrund des aktuellen privaten Live-Bestands reduzieren; die Anzeige im Browser ist maßgeblich, nicht diese isolierte Testzahl.

## Tests

**289 Prüfungen bestanden, alle Prozesse Exit 0:** 46 Produktions-Uploader-Prüfungen, 87 bestehende Dry-Run-/Duplikat-Prüfungen, 75 Asset-Editor-/Einzelupload-Prüfungen, 34 Katalog-Asset-Verknüpfungen und 47 bestehende Datenbank-Admin-Prüfungen. Hinzu kommt die oben dokumentierte native Planung mit den echten drei Cosmetic-Parts und beiden CSVs ohne Schreibaktionen. Chromium wurde auf Desktop und 390 px geprüft; der vorhandene Datenbank-Admin-Test enthält außerdem 360 px.

Die abschließenden isolierten Prüfungen umfassen neue Kandidaten, vollständige bestehende Assets, ID-/Revision-Resume, Herkunfts-/SHA-Konflikte, mehrere Reservationen, ursprüngliche Review trotz lokaler Umklassifizierung, covered-Kopien, SHA-Abweichung vor dem Schreiben, Storagefehler, transienten/permanenten Attachfehler, verlorenen Response, Reload mit bereits vorhandenem Objekt, Pause/Fortsetzen, maximal zwei Jobs, doppelte Starts, Stop während Preflight, verlorene Berechtigung, gewechselten Auth-Scope, fehlende Sitzung/Bucket/Privatevidence/Migrationsspalten, exakte und kleinere API-Seiten, wiederholte IDs, 1.083-Limit, andere Pakete sowie Desktop und 390 px einschließlich Fehler-Retry/Touchzielen.

Bestehende lokale Batch-, Einzelupload-/Editor- und Katalog-Verknüpfungsregressionen wurden ebenfalls ausgeführt. Alle Suiten verwenden den vorhandenen festen Testport und liefen nacheinander. Die früheren Screenshotprüfungen warteten zu früh auf ein noch ausstehendes UI-Refresh; der finale Busy-Zustand und Timerabschluss machen diesen Zustand explizit. Keine Assertion wurde deaktiviert.

```bash
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-upload
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-import
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --catalog-link
```

## Exakte spätere Bedienung

1. Finale Commit-Preview `index.html#/admin` öffnen, mit bestehendem moderator/admin/owner anmelden, **Asset-Bibliothek → ZIP / ORDNER IMPORTIEREN** öffnen.
2. Nur die drei `OnceHuman_CMS_v2_01_Profile_Cosmetics_Shop_Part01/02/03.zip` sowie `OnceHuman_CMS_v2_Manifest.csv` und `OnceHuman_CMS_v2_Review_Queue.csv` auswählen. Gemeinsames Paket muss `OnceHuman_CMS_v2_01_Profile_Cosmetics_Shop.zip` sein. Analyse vollständig abwarten.
3. **Live-Preflight prüfen** anklicken. Neue Kandidaten, vorhandene Bilder, resumierbare Drafts, Review/Redundanz, Konflikte und Bytes prüfen. Bei STOPP nicht starten; Fehlerursache klären und neu laden. Eine Zahl unter 1.083 ist zulässig. Review bleibt ausgeschlossen.
4. Die angezeigte Phrase exakt in das Bestätigungsfeld eingeben, z. B. **IMPORT 1083 DRAFT-ASSETS**, und erst danach den gleichnamigen Importbutton anklicken. Die tatsächliche angezeigte Zahl verwenden.
5. Tab offen lassen. **Pause** lässt laufende Uploads fertig werden; **Fortsetzen** gleicht erneut live ab. **Fehler erneut versuchen** setzt nur den betreffenden Fehler auf WARTET; anschließend Fortsetzen. Bei offenen Storage-/DB-Fällen zuerst den Importbericht herunterladen, keine Objekte löschen. Bei Unsicherheit STOPP; nach Reload dieselben Originaldateien erneut wählen und Preflight neu ausführen.
6. Nach Abschluss auf erfolgreiche Live-Verifikation und **0 neue aktive Assets** achten; **Importbericht herunterladen**. Die Assets bleiben draft. Es gibt in diesem Block keine Sammelfreigabe oder automatische Profilveröffentlichung.

## Geänderte Dateien

`asset-library-import.js`, `asset-library.js`, `asset-library.css`, `supabase-client.js`, `index.html` (Cacheversionen), bestehender Testadapter `tests/asset-library.cjs`, präzisierte Reimport-Fixture `tests/asset-library-import.cjs`, neu `tests/asset-library-batch-upload.cjs`, historischer Verweis in `docs/ASSET_LIBRARY_PHASE_2B1A.md`, dieser Auditbericht. Keine Änderung an Modell, Migrationen, Rollen/RLS, Bucket, normalen Karten-/Profil-/Admin-Popup-Funktionen oder anderen ZIP-Paketen.

Testartefakte liegen im ignorierten `test-results/asset-library/`: `batch-upload-fixture-report.json`, `batch-upload-desktop.png`, `batch-upload-mobile.png`, `batch-upload-mobile-error.png`, `cosmetic-production-preflight-fixture.json`, `cosmetic-production-preflight-desktop.png`. Original-ZIPs und große JSONs werden nicht committed.

**STOPP nach dem GitHub-Checkpoint. Der reale Cosmetic-Import wird ausschließlich vom Benutzer im authentifizierten Browser gestartet. Keine anderen Pakete importieren.**
