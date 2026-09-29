# Funktionstransfer mit erhaltener visueller Basis

Arbeitsbranch: `functional-transfer`, direkt erstellt von `f743c4b6b8050e38d029cda1b1ba1be06361dac9` (Tree `3e8c555a3dfaa2f927f7e6bbb218e60fd72e4f4c`). Funktionsquelle: `aba88639f6e5dad367c46b22fc7ec0ac65565a07`; dessen Tree entspricht dem vorhandenen lokalen fertigen Stand `d2aebd1`.

Die Startseite, das Dashboard und 21 weitere Route-Renderer bleiben unverändert. Profil, Datenbank, Build-Planer, Karte und Techwerkbank verwenden ihre vorhandenen Seitenstrukturen, Klassen und IDs. Beide originalen CSS-Dateien bleiben vollständig erhalten; nur funktionale Regeln wurden angehängt. Der notwendige Karten-Toolbar-Umbruch verhindert blockierte Zoom-/Marker-Controls. Kein neues Font-, Branding- oder Seitenlayout.

Übernommen wurden:

- Kontogetrennte Werkzeugdaten mit Migration bestehender LocalStorage-Daten; Profilgestaltung in Supabase-Metadaten und lokal, originale Avatar-/Rahmenauswahl, eigene Avatar- und Galerie-Uploads über IndexedDB. Die bestehende Archivvorschau bleibt bei leerer persönlicher Galerie ausdrücklich als Vorschau gekennzeichnet.
- Profiltext, Banner, Farben, Ringe, Kränze, echte Archiv-Meilensteine/Trophäen, Build-Highlight und Widget-Auswahl im bisherigen Profil-Drawer.
- Datenbank-Suche, Kategorien/Status/Favoriten, Sortierung, Raster/Liste, Favoriten/Jagdliste/Gefunden, bestehender Detaildialog, 12er-Paginierung und direkte globale Suchtreffer. Verifizierte Originalbildpfade können später im vorhandenen Karten-/Detailbereich angezeigt werden.
- Validierter Build-JSON-Import/Export und bestehendes Speichern/Laden. Künstliche Vorlagen-Vergleichswerte und Ratings entfallen.
- Eigene Kartenmarker, Filter, gespeicherte Routen und deren Linien; bestehendes Pan/Zoom. Eigene Marker werden mit echten Klickpositionen gespeichert; gelöschte Marker werden aus Routen entfernt.
- Techwerkbank-Kategorien, Tier-/Statusfilter, Sortierung, Raster/Liste, Details und persistenter Analysestatus; Materialmischungen speichern/laden/löschen; Produktionsmengen aus vorhandenen Rezeptdaten. Erfundene Materialmengen, Qualitätsklassen und Zusatzanalysen wurden entfernt. Vorhandene Tech-Art bleibt als Illustration gekennzeichnet.
- Katalog-Importvalidierung mit stabilen IDs, Kategorien, Unicode-Bildpfaden, Datei-/Symlink-/Traversal-Prüfung und gemeinsamem JSON/JS-Export. Die bisherigen Daten bleiben unverändert. Die 12.211 Itembilder sind nicht enthalten; keine neuen Ersatzbilder wurden erzeugt.

Vor den Browserprüfungen gesichert: lokaler Zwischencommit `605bd47`, GitHub-Zwischencommit `02d91e366e7eec2318ca5f4cc2ee0c085cee94f2`, identischer Tree `07e96ee67c47a0148b92a2156e32055a75f63df9`; zusätzlich Branch `recovery/functional-transfer-checkpoint`.

Prüfungen:

```sh
node tests/baseline.cjs
node tests/state.cjs
node tests/import-catalog.mjs
node tests/functional-transfer.cjs
git diff --check
```

Syntax aller Projekt-JavaScriptdateien und der gezielten Tests geprüft. Die Browserprüfung enthält 36 Kernprüfungen (keine Responsive-/Route-Matrix): Such-/Sammelfunktionen, Build-JSON samt Ablehnung unbekannter Ausrüstung, Marker/Routen, Techfilter und Rezeptmultiplikation, Materialmischung, Profilgestaltung/Banner/Farben nach Reload, Galerie-Upload nach Reload, Widget-Auswahl, Escape und eindeutige DOM-IDs. Auth wird im Test über eine abgefangene Testfixture geprüft; die produktive Supabase-Konfiguration und bestehende Login-/Registrierungs-/Passwort-/Session-Implementierung bleiben erhalten. Ein echter Login wurde ohne Zugangsdaten nicht durchgeführt.

`main` bleibt unverändert auf `f16f1cfb68a0c855134a2ed9516280204a98856c`. Kein Force-Push und kein PR. Der bisherige `design-preview`-Stand wird nicht verändert.
