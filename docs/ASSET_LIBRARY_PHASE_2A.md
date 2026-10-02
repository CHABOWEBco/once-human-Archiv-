# Asset Library – Phase 2A: privater Storage und Einzelupload

Stand: 02.10.2026. Branch ausschließlich `admin-editor-preview`. Ausgangs- und tatsächlicher GitHub-HEAD vor Änderungen: `bcf82f256a94f87767abdb7daff6c1d05b426244`, Worktree sauber. GitHub-HEAD vor dem Sichern nochmals unverändert bestätigt. `main`: `94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.

## Bestehende Architektur und bestätigte Storage-Inventur

Die Suche fand eine zentrale `JMA_ASSET_STORE`-Schnittstelle im bestehenden Supabase-Client, einen Admin-Asset-Editor und die vorhandene kombinierte Profilpreview. Diese werden erweitert. Kein zweiter Client, Editor, Authweg oder Assetbestand.

`JMA_MEDIA` ist die bestehende persönliche IndexedDB-Galerie; sie komprimiert Bilder. Sie bleibt unverändert, da der CMS-Upload unveränderte Originalbytes speichern muss. Rollen, `private.has_role_at_least`, Asset-RLS, Revisionstrigger und Statuslogik bleiben die vorhandene Grundlage.

Die öffentliche API konnte private Buckets/Policies nicht vollständig inventarisieren. Der Benutzer führte deshalb die vorbereitete reine SQL-Leseabfrage in der bestehenden produktiven Instanz aus und meldete:

```json
{"buckets":[],"richtlinien":[],"object_counts":[],"asset_storage_columns":[]}
```

Dieser vom Benutzer bestätigte Live-Befund erlaubt genau einen neuen Bucket und zwei neue Spalten. Er ist kein von dieser Cloud selbst ausgeführter SQL-Test. Die abgeschlossene Phase 1 bleibt mit 129 Einträgen insgesamt / 128 aktiven Einträgen bestehen; der archivierte Verifikationseintrag wird nicht gelöscht oder verändert.

## Genau diese neue Migration manuell anwenden

**Einmal den vollständigen Inhalt von [`supabase/migrations/20261002020000_asset_library_storage.sql`](../supabase/migrations/20261002020000_asset_library_storage.sql) im SQL Editor der bestehenden Supabase-Instanz ausführen.** Anschließend im bestehenden Adminbereich → Asset-Bibliothek → „Neu laden“.

Die Migration wurde **nicht produktiv ausgeführt**. Keine alten Migrationen erneut ausführen, kein Reset und kein pauschales `db push` nötig. Die bereits ausgeführte `20261002010000_asset_library.sql` bleibt bytegleich. Die neue Transaktion schreibt keine Seed-, Katalog- oder bestehenden Assetzeilen und lädt keine Dateien hoch. Abweichende Bucketkonfiguration oder deaktivierte Plattform-Storage-RLS führen zum Abbruch. Ein isoliert geprüfter erneuter Lauf bewahrt gespeicherte Zustände.

Vor dieser Migration funktionieren die bisherigen statischen Speicherabläufe weiter. Ein Storage-Upload meldet explizit den fehlenden SQL-Dateinamen und reserviert dann auch keinen neuen Datensatz.

## Datenmodell und Zugriff

- Privater Bucket `archive-assets`, Raster-MIME-Typen `image/png`, `image/jpeg`, `image/webp`; Storage-API-Limit 8 MiB (`8388608` Bytes).
- Die bestehende `public.asset_library` erhält ausschließlich nullable `storage_bucket` und `storage_path`. Beide gemeinsam null oder gültig gesetzt; `file_ref` und Storage-Referenz schließen sich aus. Bestehende `file_ref = assets/...`-Zeilen und Originaldateien bleiben erhalten.
- Pfad `library/<exakte Asset-ID>/<neue UUID>.<png|jpg|webp>`. ID-Segment muss zum Datensatz passen, keine URLs/Traversal; unique Index auf Bucket/Pfad. Jeder Datensatz hat genau eine aktuelle Bildreferenz.
- Die bisherige aktive Bildpflicht wird um Storage erweitert; vorhandene bildlose CSS-Ringe/Kränze/Trophäen bleiben gültig. Ein zusätzlicher Trigger erlaubt die Referenz erst nach Existenz des tatsächlichen Storage-Objekts mit zulässigem MIME-Typ und Größe.
- `status` bestimmt Freigabe; die bestehende generierte `users_available`-Spalte bleibt die einzige abgeleitete Verfügbarkeit. `asset_type` bestimmt den Zweck. `imageUrl(row, expectedType)` prüft diesen Zweck; Abweichler und Waffen werden nicht automatisch Profilbilder. Keine Umstellung der Profilauswahl.

Storage-Policies verwenden den vorhandenen serverseitigen Rollenhelfer:

| Policy | Wirkung für `archive-assets` |
| --- | --- |
| `archive_assets_read` | anon/user lesen nur exakt das aktuell referenzierte Objekt eines aktiven Assets; Moderator/Admin/Owner lesen auch Entwürfe und zugehörige alte/staged Versionen. |
| `archive_assets_upload` | INSERT ausschließlich Moderator/Admin/Owner und nur unter der bereits existierenden Asset-ID mit normalisiertem UUID-Pfad. |
| `archive_assets_read_guard`, `archive_assets_upload_guard` | Restriktive Ergänzungen verhindern Umgehungen durch spätere allgemeinere Policies. |
| `archive_assets_no_overwrite`, `archive_assets_no_delete` | Kein Client überschreibt oder löscht Objekte; Austausch nutzt neue UUID-Versionen. |
| `archive_assets_bucket_no_update`, `archive_assets_bucket_no_delete` | Clients können den Bucket weder öffentlich machen noch entfernen. |

Die restriktiven Bedingungen lassen andere Buckets unbeeinflusst. Die neuen privaten Policy-Helfer besitzen einen festen leeren `search_path`; vorhandene Auth-/Rollen-/Asset-Policies werden nicht ersetzt. Kein Service-Key im Frontend.

Auslieferung: Der vorhandene Store erzeugt bei Bedarf kurzlebige Signed URLs (60 Sekunden) und hält sie höchstens 45 Sekunden als wiederverwendbaren Cacheeintrag im Arbeitsspeicher, getrennt nach Benutzer/Rolle, Revision, Status, Pfad und Zweck. Es werden **keine Signed URLs in Datenbank oder Browser-Persistenz gespeichert**. Nach Deaktivierung werden keine neuen Benutzer-URLs ausgestellt. Eine zuvor ausgestellte URL kann bis zum Ablauf ihrer maximal 60 Sekunden noch genutzt werden; bereits heruntergeladene Bilder sind nicht rückrufbar. Die alten öffentlichen Repositorydateien bleiben öffentlich wie bisher.

## Kontrollierter Einzelupload

1. Eine Datei auswählen; Signatur, Dateiendung/MIME, Größe und browserseitige Lesbarkeit prüfen. Lokale Blob-Preview, Name/Typ/Kategorie/Status/Metadaten im bisherigen Formular. Auswahl, nativer Dateiname und Entwurf bleiben bei gewöhnlichem Render erhalten; Auswahl kann verworfen werden.
2. „In Supabase speichern“: Bei einer neuen ID erst einen bildlosen, nicht freigegebenen `draft` mit Revision 1 reservieren. Bei einem bestehenden Datensatz dessen aktuellen Zustand zunächst nicht ändern.
3. Unveränderten `File` in einen frischen UUID-Pfad hochladen (`upsert:false`). SHA-256, Originaldateiname, MIME, Bytes und Abmessungen in `metadata.upload` dokumentieren; keine Neukomprimierung.
4. Erst nach Upload den aktuellen Pointer und gewünschten Status mit dem bisherigen Revisionsschutz speichern. Neue Uploaddatensätze erhalten beim ersten erfolgreichen Ablauf Revision 2; spätere Änderungen erhöhen wie bisher jeweils um 1. Der SQL-Trigger überprüft die tatsächliche Objektmetadaten-Existenz.
5. Lokale Auswahl freigeben und die tatsächlich gespeicherte Datei über Signed URL anzeigen. Profiltypen verwenden weiterhin dieselbe Avatar-/Rahmen-/Banner-Komposition, ohne das Konto zu ändern.

Ein fehlgeschlagener neuer Upload bleibt als sicherer bildloser Entwurf erhalten, auch im Editor nicht als freigegeben angezeigt. Die Sitzung übernimmt seine ID/Revision, damit Wiederholen keinen zweiten INSERT erzeugt. Der ursprüngliche Datei-Entwurf bleibt zum Wiederholen verfügbar. Bei fehlgeschlagenem Ersatz oder Versionskonflikt bleibt die bisherige aktuelle Bildreferenz erhalten. Ein nach Upload fehlgeschlagener Commit kann ein unreferenziertes privates Objekt hinterlassen; normale Benutzer können es nicht signieren. Kein automatisches Löschen alter/staged Dateien; eine spätere Bereinigung gehört nicht zu Phase 2A.

Formate/Limits: PNG, JPG/JPEG, WebP; höchstens 8 MiB, 8192 Pixel je Seite und `32 × 1024 × 1024` Pixel insgesamt. SVG, GIF, ZIP und beliebige andere Typen sind keine Uploadformate. Byte-Signatur und Bild-Decodierung werden im Browser geprüft; der Storage-Server setzt Bucket-MIME-/Byte-Limits durch. Keine zusätzliche serverseitige Bildverarbeitung oder neue Uploadarchitektur.

## Tests und Live-Grenzen

**220 isolierte Prüfungen bestanden:**

- `tests/asset-library-storage-sql.cjs`: 83 Prüfungen der echten PostgreSQL-RLS mit PGlite. Private Bucketkonfiguration, Erhalt einer 129-Zeilen-Bestandsfixture und der 21 Katalogeinträge, alle fünf Leserollen, drei Schreibrollen, Draft/Active/Inactive/Archived, fehlende/inkompatible Objekte, normalisierte Referenzen, Versionserhalt, kein Überschreiben/DELETE, Schutz vor breiten Fremd-Policies, andere Buckets unverändert, Wiederholbarkeit/Konfliktabbruch.
- `tests/asset-library-sql.cjs`: alle 49 bestehenden Phase-1-SQL-Prüfungen weiterhin bestanden.
- `tests/asset-library.cjs`: 75 Browserprüfungen mit Chromium und einem lokalen Supabase-Auth-/Storage-API-Adapter gegen die echte isolierte PostgreSQL-RLS. Alte statische Speicherwege vor Storage-Migration, explizit blockierter Vormigrationsupload, Auswahl/Render/Preview, unveränderte PNG/JPEG/WebP-Bytes samt Hash, UUID-Kollisionenschutz, reservierter Draft und Wiederholen, Uploadfehler und Commitkonflikt, Zwecktrennung, kombinierte Preview einschließlich zusätzlicher Originalbildansicht bei CSS-Ringen/Kränzen/Trophäen, Status/Revision/Reload, Benutzerfreigabe und serverseitig abgewiesene Signierung archivierter/inaktiver Objekte, Desktop/390 px/Touch-Zielgröße/Tastaturspeicherung/kein Overflow. Bestehendes Profil, Karte, einzelner Fly-by und Pilot-Tutorial samt Begleiter rendern weiter. Keine Browserexception.
- `tests/catalog-storage.cjs`: alle 13 bestehenden Katalogeditorprüfungen bestanden, einschließlich Bearbeiten/Reload, Erstellen, Revisionskonflikt, unberechtigter Benutzer und Desktop/390 px.

Screenshots wurden unter dem ignorierten `test-results/asset-library/` visuell geprüft. Die Tests verwenden lokal erzeugte kleine Rasterfixtures; keine Originalassets wurden bearbeitet oder produktiv hochgeladen.

Reproduzierbar nach Installation von `@electric-sql/pglite@0.5.8` außerhalb des Checkouts:

```bash
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library-storage-sql.cjs
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library-sql.cjs
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs
node tests/catalog-storage.cjs
```

Live nur lesend nachgeprüft: öffentliche Asset-API HTTP 200 mit 128 ausschließlich aktiven Einträgen; Katalog HTTP 200 mit den gegenüber dem Aufgabenbeginn unveränderten 21 Einträgen inklusive Inhalt/Revision. Die Storage-Spaltenabfrage liefert weiterhin HTTP 400 / `42703`, passend zur noch nicht angewendeten neuen Migration. Der Gesamtbestand 129 und der archivierte Test sind die zuvor dokumentierte Benutzer-SQL-Bestätigung, keine mit anon lesbare Gesamtzählung.

**Live noch offen:** manuelle Anwendung dieser neuen Migration und anschließender echter Upload/Preview/Status-/Rollen-Test gegen die produktive Supabase-Storage-API. Isolierte Plattformfixtures ersetzen keinen Live-Storage-Transportnachweis. In dieser Phase gab es keine produktiven SQL-, Storage- oder Metadaten-Schreibaktionen.

Preview: https://raw.githack.com/CHABOWEBco/once-human-Archiv-/admin-editor-preview/index.html#/admin (bestehende Moderator-/Admin-/Owner-Anmeldung → Asset-Bibliothek).

Kein ZIP-/Massenimport, keine automatische Kategorisierung oder Massenfreigabe, keine Profil-Auswahl-Umstellung. Phase 2B wurde nicht begonnen. STOPP nach Synchronisierung.
