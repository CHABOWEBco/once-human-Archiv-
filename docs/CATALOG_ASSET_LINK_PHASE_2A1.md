# Phase 2A.1 – Katalogbilder aus der zentralen Asset-Bibliothek

Stand: 02.10.2026. Ausschließlich `admin-editor-preview`, Ausgangs- und überprüfter GitHub-HEAD `0a8c510d0907e6064cb22e9c1937c8b2cdafa544`; Worktree vor Änderungen sauber. `main` bleibt bei `94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.

## Live-Bestand und Fuchs-ID

Der Benutzer bestätigt die erfolgreiche manuelle Anwendung von `20261002020000_asset_library_storage.sql`. Die öffentliche REST-Abfrage bestätigt die vorhandenen Storage-Spalten. Kein administrativer SQL-Zugang und keine authentifizierte Live-Owner-Sitzung stehen dieser Cloud zur Verfügung. Es wurden keine produktiven Daten oder Dateien geschrieben.

Der bestehende Live-Katalog hat weiterhin 21 Einträge. **Fuchs heißt tatsächlich `cat-tier-fuchs`**, nicht `cat-fuchs`; auch der Repository-Grundbestand verwendet diese ID. Die Abfrage auf `catalog_entries.id = 'cat-fuchs'` liefert keine Zeile. Deshalb keine Umbenennung, kein Alias und kein neuer Produktionsdatensatz: Die bestehende Verbindung lautet `catalog_id = 'cat-tier-fuchs'`, kanonisches Asset `catalog:cat-tier-fuchs`, Kategorie Tiere & Fisch / Asset-Typ `catalog`.

Die anon-Abfrage liefert derzeit 127 aktive Assets und 20 aktive Katalogverbindungen. Das kanonische Fuchs-Asset bzw. eine aktive Fuchs-Verbindung ist für anon derzeit nicht sichtbar. Der aktuelle private Status und die Referenz des Fuchs-Assets sind mit diesen Rechten nicht auslesbar; daraus folgt kein behaupteter Live-Storage-Bilderfolg. Die anderen sichtbaren Katalog-Assets entsprechen dem bekannten Modell: kanonische `catalog:<ID>`-Zeilen, zugehörige `catalog_id`, Typ item/weapon/resource/deviation/catalog; bestehende statische `file_ref`, aktuell ohne Storage-Pointer. Die alten Kategorien-Bilddateien fehlen teilweise im Repository und behalten den bisherigen Website-Fallback.

**Für das echte Fuchs-Bild im bestehenden Editor:** `catalog:cat-tier-fuchs` auswählen, `catalog_id = cat-tier-fuchs` und Typ `catalog` beibehalten, Originalbild über den vorhandenen Einzelupload speichern und auf `active` setzen. Nach Neuaufruf/Reload zeigt `#/database` dieses Bild in Fuchs-Karte und Detail. Es wurde in diesem Block kein Fuchs-Bild erzeugt oder automatisch hochgeladen.

## Eine vorhandene Architektur

Keine neue Tabelle, Uploadkomponente, Datenbankmigration oder Supabase-Verbindung. Weiterhin die bestehende `asset_library`, ihre FK-Spalte `catalog_id`, ihr Editor, `catalog_entries`, Rollen/RLS, Status-/Revisionslogik sowie `JMA_ASSET_STORE.imageUrl` und dessen 60-Sekunden-Signed-URL-System.

Der vorhandene Store besitzt zwei kleine zusätzliche Zugriffe:

- `catalogAsset(entry)`: vorhandene Zuordnung für die Verwaltung finden, kanonische ID zuerst; auch Entwürfe/inaktive/archivierte Zuordnungen bleiben für berechtigte Verwalter auffindbar. Eine falsch typisierte Zuordnung kann so ebenfalls im richtigen bestehenden Editor korrigiert werden.
- `catalogImage(entry)`: ausschließlich aktive, exakt per `catalog_id` passende Bildassets für die normale Website auflösen. Das gilt ausdrücklich auch für Owner/Admin, deren RLS SELECT ansonsten private Entwürfe erlaubt.

Der gemeinsame Metadaten-Snapshot wird nur im Arbeitsspeicher gehalten, je Benutzer/Rolle getrennt, höchstens 45 Sekunden wiederverwendet. Gleichzeitige Bildanfragen teilen denselben Metadaten-Ladevorgang. Explizites `load()` lädt neu; erfolgreiche bestehende Asset-Saves aktualisieren denselben Snapshot. Keine zweite persistente Bilddatenbank. Signed URLs bleiben weiterhin ausschließlich im vorhandenen temporären URL-Cache bzw. in der Bilddarstellung, niemals in `entry.image`, DB-Metadaten oder Browser-Persistenz.

## Zweck und deterministische Reihenfolge

Es zählt die exakte `catalog_id === entry.id`, keine Namensähnlichkeit, ID-Ableitung oder Fuchs-Aliasregel. Profiltypen avatar/frame/banner/ring/wreath/trophy und Website-Bildtyp image sind ausgeschlossen. Kategorien items/weapons/resources/deviations erlauben jeweils den vorhandenen entsprechenden Typ item/weapon/resource/deviation oder den allgemeinen Katalogbildtyp `catalog`. Andere Kategorien, einschließlich Tiere & Fisch, verwenden `catalog`.

Auswahl unter aktiven, zweckkompatiblen Kandidaten:

1. Gültige normalisierte Storage-Referenz im privaten `archive-assets` vor statischer Referenz.
2. Innerhalb derselben Quellenart die bestehende kanonische ID `catalog:<entry.id>` bevorzugen.
3. Danach `sort_order` aufsteigend und stabile ID lexikografisch aufsteigend.
4. Signed URL über das vorhandene `imageUrl(row, row.asset_type)` beziehen und das Bild außerhalb der sichtbaren Ansicht decodieren. Nicht lesbare/verweigerte Bilder fallen zum nächsten gültigen Kandidaten durch.
5. Ohne nutzbares aktives zentrales Bild das bisherige `entry.image`-/Kategoriebild-/Glyph-Verhalten beibehalten. Legacy-Werte werden nicht entfernt oder überschrieben.

Ein deaktiviertes zentrales Bild wird nach erneuter Datenauflösung nicht gewählt. Die bereits in Phase 2A dokumentierte Grenze bleibt: Eine zuvor ausgestellte URL gilt bis zu ihren 60 Sekunden; bereits heruntergeladene Bilder können nicht rückgerufen werden. Die öffentlichen alten Repository-Fallbackdateien bleiben öffentlich.

## Bestehende Ansichten und Editor

`app.js` ergänzt den vorhandenen `catalogArt`-Weg um asynchrone Befüllung der bestehenden Karten- und Detail-Bildfläche. Inhalte, Suche, Filter, Sortierung, Pagination und Sammlung bleiben ihre bisherigen Funktionen. Erst erfolgreich decodierte Bilder werden eingesetzt. Kleine DOM-Gültigkeits-/Anfragetickets verhindern, dass ein verspätetes Fuchs-Bild nach Filterwechsel eine andere Karte oder einen anderen Detaildatensatz befüllt. Es gibt keinen globalen Re-Render beim Eintreffen einer URL; ein offener Dialog bleibt offen. Index und Fund-Badge bleiben erhalten.

Karten verwenden weiterhin ihre feste Bildflächenhöhe. Die Detail-Bildfläche reserviert die bestehenden Fallbackmaße 200 px auf Desktop und 60 px auf Mobil, damit asynchrone Bilder die Dialogfelder nicht verschieben. Kein Redesign oder Änderung anderer Seiten.

Der bestehende Inhaltseditor zeigt bei vorhandener Zuordnung „BILD · ZENTRALE ASSET-BIBLIOTHEK“ und die zugehörige Asset-ID/Status. „Asset-Bibliothek öffnen“ führt zum vorhandenen Asset-Editor, wählt genau den Datensatz aus und lädt vor Bearbeitung seine aktuelle gespeicherte Revision. Die bisherigen Schutzabfragen für ungesicherte Entwürfe bleiben erhalten. Kein zweiter Datei-Upload. Der Legacy-Pfad bleibt im Katalogdatensatz erhalten und ist als Fallback im Titel des Hinweises sichtbar. Für unzugeordnete Einträge bleibt der bisherige Bildpfad-Dialog erhalten; bei nicht prüfbarer zentraler Zuordnung wird kein konkurrierender Bildpfad-Dialog angeboten. Text-/Katalogspeicherung funktioniert weiter unabhängig davon.

Auch die vorhandene Inhaltseditor-Vorschau nutzt denselben zentralen Resolver; die bestehende Logo-Fallbackdarstellung bleibt bestehen. Der neue zentrale Button passt bei 390 px und hat eine 44-px-Touchhöhe.

## Gezielte Tests

**88 Prüfungen bestanden**, keine Vollprüfung des gesamten Projekts:

- `ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --catalog-link`: 34 fokussierte Integrationsprüfungen. Der neue Test `tests/catalog-assets.cjs` verwendet den vorhandenen Browser-/Auth-/Storage-Adapter und echte PostgreSQL-RLS mit PGlite. Der Adapter wurde lediglich um die vorhandenen Katalog-Schreibfelder ergänzt.
- `node tests/database.cjs`: alle 41 bestehenden Datenbankprüfungen; Filter, Pagination, Suche, Sammlung, Detail, Listenansicht, Desktop/390/360 px, kein Overflow und keine Browserexception.
- `node tests/catalog-storage.cjs`: alle 13 vorhandenen Katalogeditorprüfungen; Speichern/Reload/Erstellen, Revision/Konflikt, Rollen und Desktop/390 px.

Der fokussierte Test prüft beide IDs bewusst getrennt: die tatsächliche ursprüngliche `cat-tier-fuchs`-Verbindung und eine **ausschließlich lokal eingefügte** `cat-fuchs`-Fixture mit den vorhandenen Fuchs-Texten. Das testet auch den exakten ID-Fall aus dem Auftrag, ohne eine Produktions-ID umzubenennen. Als reine technische Bildfixture dient das schon vorhandene Branding-PNG unverändert, kein erfundenes Fuchs-Bild. Eine zusätzliche Test-URL liefert dieselbe bestehende Datei für den Legacy-Originalpfad. Alle Uploads, Statusänderungen und Katalog-Schreibtests laufen ausschließlich lokal.

Geprüft: statischer Legacy- und zentraler Originalpfad, aktiver Upload → catalog_id → signed Karte/Detail, unveränderte Bytes, stabile Bildflächen, Badge-/Dialogerhalt, Signed-URL-Wiederverwendung und Reload, Draft/Inactive/Archived auch als Owner ausgeschlossen, echte RLS-Abweisung der Benutzer-Signierung, falsche catalog_id, Profil-/falscher Fachtyp ausgeschlossen, mehrere Kandidaten deterministisch, nicht lesbare Datei übersprungen, 390 px, verspätete Antwort nach Filterwechsel, zentrale Editor-Kennzeichnung, keine zweite Uploadkontrolle, Weiterleitung und aktuelle Assetrevision, bestehende Asset-/Katalog-Saves und unveränderte ursprüngliche 21 Katalogzeilen. Keine Browserexception. Screenshots unter dem ignorierten `test-results/asset-library/` wurden visuell geprüft.

Live nur lesend: Die 21 `id`/`entry`/`revision`-Werte entsprechen dem erhaltenen Phase-2A-Lese-Snapshot. Storage-Spalten live vorhanden; aktuell für anon keine aktive Fuchs-Verbindung. Der echte Fuchs-Upload bzw. seine Freigabe wird nicht automatisch vorgenommen und ist kein behauptetes Live-Testergebnis.

## Umfang / Abschluss

Geändert: `supabase-client.js`, `app.js`, `admin-panel.js`, `admin-panel.css`, `asset-library.js`, `styles.css`, `index.html`, `tests/asset-library.cjs`, `tests/catalog-assets.cjs` und dieser Bericht. Keine Änderung an Migrationen, Originalassets, Katalog-Grunddaten, Rollen/RLS, persönlicher Mediengalerie, Profil, Karten, Mutanten oder Tutorial.

**Keine weitere SQL-Migration nötig.** Keine Phase 2B, kein ZIP-/Massenimport und keine produktiven Massenänderungen.

Preview: https://raw.githack.com/CHABOWEBco/once-human-Archiv-/admin-editor-preview/index.html#/database (bestehende Anmeldung). Admin-Verwaltung unverändert unter `#/admin`.
