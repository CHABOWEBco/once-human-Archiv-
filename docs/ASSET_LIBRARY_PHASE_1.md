# Zentrale Admin-Asset-Bibliothek – Phase 1

Stand: 02.10.2026. Ausgangspunkt: `admin-editor-preview` bei `bd2da100616131bba41649d84d31890c7be9d0c9`, identisch mit dem zuvor geprüften Remote-HEAD; Worktree vor diesem Block sauber. `main`: `94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.

## Inventar und bestehende Verbraucher

| Quelle | Speicherung | Bestand / Verwendung |
| --- | --- | --- |
| `public.catalog_entries` | Supabase, JSONB + Revision | Live read-only: 21 Einträge. Bestehender Inhaltseditor und Katalog bleiben unverändert. Die Migration liest den tatsächlichen Live-Bestand, auch spätere Einträge. |
| `profile-assets.js` | Statische Dateien | 36 Avatare, 30 Rahmen, 6 Banner. Banner teilen Dateien mit Website-Hintergründen. IDs werden in Profil-Zuordnungen verwendet. |
| `routes-full.js` / `routes-full.css` | CSS / feste Definitionen | 3 Ringe, 2 Kränze, 8 Trophäen. Trophäen entstehen weiterhin aus persönlichem Werkzeug-Fortschritt, ohne globale Vergabe durch diese Bibliothek. |
| Website-Bilder | Statische Dateien | 19 Metadaten für Branding, Weltkarte, drei Mutanten und 14 bestehende Referenzbilder; 3 zusätzliche Techwerkbank-Bilder. Karten-/Fly-by-/Tutorial-Verbraucher behalten ihre Referenzen. |
| Profilgestaltung | Supabase Auth `user_metadata` + kontobezogener lokaler Zustand | Bereits gewählte Avatar-/Rahmen-/Banner-IDs, Ringe/Kränze und Darstellung bleiben erhalten. |
| Eigene Uploads / Galerie | Eigentümerbezogenes IndexedDB `once-human-media` | Persönliche `upload-*`-Referenzen sind kein öffentlicher Assetbestand; kein Export oder globales Freigeben privater Dateien. |

Zusammen: **128 Metadaten** beim derzeitigen Live-Bestand: 85 Profil-/CSS-/Trophäen-Einträge, 22 Website-Bilder und 21 Katalogverweise. Gemeinsame Dateien dürfen unterschiedliche Metadaten-IDs für unterschiedliche Verbraucher besitzen. Die alternative statische Datei `assets/live-map/shattered-maiden.webp` bleibt erhalten; der aktuelle Verbraucher verwendet das PNG. Keine Datei wurde entfernt, kopiert oder hochgeladen.

Die 21 aktuellen Katalog-Bildpfade verweisen auf im Repository fehlende Altdateien (`assets/r7`, `assets/r13`, `assets/ohdex`). Diese bereits vorhandenen Referenzen bleiben im Katalog und in den Bibliotheksmetadaten erhalten. Fehlende Bilder erhalten eine erkennbare Vorschau-Meldung bzw. ein Thumbnail-Symbol; keine erfundenen Ersatzbilder oder Katalogänderungen. Neu geänderte Dateipfade werden vor dem Speichern auf Erreichbarkeit geprüft.

## Datenmodell und Rechte

Neue minimale Tabelle `public.asset_library`; die Katalogtabelle besitzt andere Datensatz-Semantik und wird nicht um Profil-CMS-Felder erweitert. Die Bibliothek teilt den vorhandenen Supabase-Client, Auth-Sitzung, Rollen-Enum und privaten Rollenhelfer. Es gibt keine zweite Auth- oder Schreibarchitektur.

Felder: stabile `id`, `name`, `asset_type`, frei benennbare `category`, sichere lokale `file_ref`, optionale `catalog_id` mit FK/RESTRICT, `status`, `sort_order`, JSONB-`metadata`, `revision`, serverseitige Erstellungs-/Änderungszeit und Actor-UUIDs. Historische Actor-UUIDs bleiben Auditmetadaten, wenn ein Auth-Konto gelöscht wird; Assets werden dadurch nicht geändert oder gelöscht.

Typen: Avatar, Rahmen, Banner, Ring, Kranz, Trophäe, Item, Waffe, Ressource, Abweichler, sonstiges Katalogbild und Website-Bild. Neue Kategorien können eingegeben werden. `profile:*`, `catalog:*` und `website:*` bilden stabile Bestands-IDs. Neue Datensätze starten als Entwurf mit UUID; die ID ist nach dem Anlegen schreibgeschützt.

`draft`, `active`, `inactive`, `archived` sind die vier Statuswerte. `users_available` ist eine generierte Spalte (`status = 'active'`), keine zweite Freigabe-Wahrheit. Die UI zeigt ausdrücklich JA/NEIN; Aktivieren, Deaktivieren, Archivieren und Reaktivieren geschehen über das Statusfeld bzw. die Freigabe-Checkbox. Kein Hard-Delete-Bedienelement, keine DELETE-Policy/-Grants.

RLS erlaubt anon/user ausschließlich SELECT aktiver Einträge. Moderator/Admin/Owner dürfen alle Bibliotheksdatensätze lesen, erstellen und bearbeiten, entsprechend der vorhandenen Katalog-Rollenstruktur. Schreibfelder sind per Spaltengrants beschränkt. Der Server stempelt Zeiten/Actor und erzwingt Revision 1 beim INSERT bzw. `old + 1` beim UPDATE. Das Frontend setzt zusätzlich `WHERE id = ... AND revision = geladene_revision`; Konflikte überschreiben keine neueren Daten und behalten den Entwurf. Frontend-Rollenprüfungen ergänzen RLS. Kein Service-Key wird eingesetzt.

Der Seed ergänzt Metadaten mit `ON CONFLICT DO NOTHING`: vorhandene Freigaben, Namen und Revisionen werden bei erneutem Ausführen nicht überschrieben. Katalogeinträge bleiben ihre bestehende Quelle; der Metadaten-Editor verändert weder `catalog_entries.entry` noch dessen Revision. Bildlose/unsichere Katalogreferenzen werden im Metadaten-Seed als Entwurf erfasst. Der vorhandene Inhaltseditor bleibt für Katalogtexte zuständig.

## Oberfläche und Vorschau

Zusätzlicher Navigationspunkt **Asset-Bibliothek** im bestehenden Admin-HUD. Mitte: Suche, Typ-/Kategorie-/Statusfilter, Bestand und Metadatenformular. Rechts: reine Live-Vorschau; bei kleinen Viewports folgt sie unter dem Editor.

Profilvorschau kombiniert Avatar/Rahmen/Banner mit dem vorhandenen `JMA_PROFILE.avatar`-Markup und Profil-CSS. Einziger Zusatz am Profilmodul: read-only Export vorhandener Ring-/Kranz-/Trophäen-Definitionen. Ring/Kranz und Trophäensymbol können im selben Vorschaubereich dargestellt werden; eine Trophäenvorschau vergibt keine Auszeichnung. Normale Assets zeigen Bild, Name, Typ/Kategorie, Status, Freigabe, Dateireferenz und JSON-Metadaten.

Entwurf, Auswahl und Filter bleiben im Bibliotheksmodul während gewöhnlicher UI-Re-Renders stabil. Gespeicherte Änderungen kommen ausschließlich aus Supabase, mit serverseitiger Revision. Es gibt keinen lokalen Schreib-Fallback. Bei fehlender Tabelle oder Netzfehler ist der erkannte Originalbestand lesbar und Speichern gesperrt, mit klarer Fehlermeldung. Rollen-/Kontowechsel leeren den Admin-Cache.

## Bewusst offene Verbraucher-Anbindung / Migration

Die neue Bibliothek liefert normalen Nutzern nur aktive Einträge. Die bisherigen statischen Profil-Selektoren und Website-/Katalog-Verbraucher werden in Phase 1 **nicht** auf diese Tabelle umgestellt. Entsprechend blendet ein Metadaten-Statuswechsel noch keine alte statische Profil-Auswahl aus. Dieser Übergang ist in der Oberfläche ausdrücklich benannt.

Vor einer späteren Anbindung muss festgelegt werden, wie bereits zugewiesene deaktivierte/archivierte Profil-IDs weiterhin angezeigt werden: bestehende Zuordnung erhalten, keine erneute Auswahl anbieten, ggf. read-only Auflösung historischer Referenzen. Ebenso sind gemeinsame Bilddateien, Katalog-/Website-Referenzen und freigabeabhängige öffentliche Metadaten zu berücksichtigen. Es wurde keine Entscheidung zur Bereinigung bestehender Zuordnungen vorweggenommen. Statische Dateien bleiben öffentlich; RLS schützt Metadaten und macht bestehende URLs nicht privat.

Phase 2/3: Ordner-/ZIP-Import, Supabase Storage und Uploadpipeline, weitere Verbraucher-Anbindung, kontrollierte Entfernung/Referenzprüfung. Nichts davon wurde begonnen; bestehende Profilkategorien und Website-Design bleiben erhalten.

## Live-Aktivierung – abgeschlossen, Nachweisgrenzen dokumentiert

Migration: [`20261002010000_asset_library.sql`](../supabase/migrations/20261002010000_asset_library.sql).

Voraussetzung sind die bereits bestehenden Rollen-/Katalogtabellen und der private Rollenhelfer. **Nur diese neue Migration** im SQL-Editor der vorhandenen Supabase-Instanz ausführen; kein Reset, keine erneute Ausführung alter CREATE-TABLE-Migrationen. Die Migration läuft in einer Transaktion, seeded Bestandsmetadaten und fordert einen PostgREST-Schema-Reload an.

Beim ursprünglichen Implementierungsabschluss fehlte `asset_library` noch mit HTTP 404 / `PGRST205`. Anschließend hat der Nutzer die Migration in der produktiven Instanz angewendet und die erfolgreiche SQL-Live-Verifikation bestätigt: **129 Assets insgesamt, 128 aktiv; Testeintrag archiviert, Revision 4, Benutzerfreigabe false**. Die Cloud-Nachprüfung bestätigt unabhängig den vollständigen unveränderten aktiven Seed, die öffentliche Ausblendung nicht aktiver Assets und den unveränderten 21-Einträge-Katalog. Anonymer INSERT wurde live abgewiesen. Der administrative SQL-/Dashboard-Zugang ist weiterhin nicht an die Cloud-Aufgabe gebunden; Rollen-Einzeltests und authentifizierter Browser-Reload werden nur soweit tatsächlich belegt dokumentiert. Vollständiger Abschluss mit Quellen und Nachweisgrenzen: [`ASSET_LIBRARY_LIVE_VERIFICATION_20261002.md`](ASSET_LIBRARY_LIVE_VERIFICATION_20261002.md).

## Gezielte Prüfung

Bestanden am 02.10.2026:

- 49 PostgreSQL/PGlite-Checks: tatsächliche alte Rollen-/Katalogmigrationen + neue SQL-Datei; Seed, Live-Bestands-Erweiterung, Idempotenz, alle drei Verwaltungsrollen, aktive Lesesicht, User-/anon-Schreibsperre, Revisionskonflikt, Identitätsschutz, FK/Pfade einschließlich kodierter Traversierung, keine Hard-Deletes, unveränderte Katalogdaten, Auth-Kontolöschung ohne Assetänderung.
- 38 Chromium-Checks gegen dieselbe isolierte PostgreSQL-Datenbank über lokalen Testadapter; Auth als Fixture: Inventar, initial geladene Revision, Suche/Filter, Create/Edit, vier Statuszustände, Freigabe/Reload, Konflikt/Entwurf, JSON-Fehler, reine kombinierte Vorschau, Rollen, fehlende Live-Tabelle, Desktop/390 px, Buttons/Overflow/Tastatur, Profil/Karte/Fly-by und Tutorial-Pilot mit Begleiter.
- 13 vorhandene `catalog-storage.cjs`-Checks: bestehender Inhaltseditor einschließlich Desktop/390 px, Create/Edit/Reload/Revisionskonflikt und unberechtigtem Nutzer.

Die Tests schreiben keine Live-Supabase-Daten. Screenshots: `test-results/asset-library/desktop.png` und `mobile.png` (ignorierte lokale Prüfausgaben). Karten-/Fly-by-/Tutorial-Dateien wurden nicht geändert.

Reproduzierbar ohne App-Build / Repo-Abhängigkeiten:

```bash
npm install --prefix /tmp/asset-library-sql-test --cache /tmp/asset-library-npm-cache @electric-sql/pglite@0.5.8 --no-audit --no-fund
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library-sql.cjs
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs
node tests/catalog-storage.cjs
```

Playwright/Chromium verwenden die vorhandene Cloud-Testkonfiguration. Die ergänzende Testinstallation und Befehle wurden als wiederverwendbarer Umgebungsentwurf gespeichert; Veröffentlichung dieses Entwurfs erfolgt separat über Environment Settings.
