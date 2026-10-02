# Shared Live-Map HUD – Abschlussaudit 2026-10-02

Ausgangspunkt: `admin-editor-preview` / `6950f26edac23150323789654c9667d5f47893b4`.
Lokaler HEAD und GitHub-HEAD stimmten vor Beginn überein; Worktree war sauber.
`main` wurde weder ausgecheckt noch beschrieben. Remote-Vergleichswert:
`94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.

## Umsetzung und Bereinigung

Die vorhandenen Seiten-, Hero- und Typografieregeln der Live-Karte in
`live-map.css` werden nun mit den vier ausdrücklich zugeordneten HUD-Routen
geteilt. Kein neuer Renderer, keine zweite Hero-Architektur. Der vorhandene
`hero()`-Renderer besitzt eine optionale HUD-Darstellung; alle bisherigen
RF-Verbraucher außerhalb des Auftrags behalten ihre ursprüngliche Ausgabe.

Entfernt/ersetzt wurden die Datenbank-Geometrie nach Profilvorbild samt alten
310/290/280/390/430-px-Hero-Varianten, der separate 500-px-Tech-Hero mit alten
Breiten/Copy-Rahmen/Breakpoint-Kompositionen sowie die alten flachen Oberflächen
von Build-Slots und Guidekarten. Redundante Tech-/Datenbank-Panelverläufe,
Schatten und Tech-Karten-Pseudorahmen wurden durch die gemeinsame Basis ersetzt.
Die bestehenden Tech-Bilder, Materialauswahl, internen Experiment-Visuals und
Fertigungsinformationen bleiben erhalten. Responsive Slot-Spalten und alle
bestehenden RF-Hero-Regeln für andere Seiten wurden erhalten.

Gemeinsam sind Außenkanten, Header-Abstand, Hero-Proportionen, warme Kicker,
große Titel, Atmosphärenüberlagerung, HUD-Kanten, Cyan-Systemkante, dunkle
Glas-Panels, Rahmen, Schatten, Radius-Tokens und 44-px-Bedienelemente.
Jede Route verwendet weiterhin ihr eigenes bestehendes Hintergrundbild.
Mobile Heroes wachsen entsprechend ihrem tatsächlichen Inhalt.

`SCOPED_ROUTES` in der bestehenden `settings-page.js`-Engine umfasst nun die
sieben tatsächlichen Router-IDs: `admin`, `map`, `profile`, `database`, `builds`,
`tech-workbench`, `guides`. Weiterhin derselbe Preference-Key,
`JMA_STORE`-Speicherweg, `read()/write()/apply()` und dieselben `--ui-*`-Tokens.
Die Einstellungen nennen sieben Bereiche und zeigen eine kompakte Matrix;
die vorhandenen drei visuellen Vorschauen bleiben erhalten.

Der Interface-Akzent steuert gezielt Kicker, Titelteil, aktive Navigation,
Auswahl, Fokus, Buttons und Reflexion. Feste Cyan-/Rot-Systemelemente werden
nicht pauschal ersetzt. Die persönliche Profilfarbe bleibt unabhängig;
Profilstruktur und Profil-Editor wurden nicht verändert.

`ADMIN_PANEL.bindLiquidCards()` bleibt der einzige Karten-Pointer-Helper.
Vorhandene WeakSet-/RAF-Mechanik bleibt erhalten. Die vier Routen binden ihre
geeigneten Karten, Statusmodule und Aktionsbuttons an denselben Helper.
Normale Inputs und Material-Menüoptionen erhalten keinen Liquid-Effekt.
Die gemeinsame Reflexion ist ruhiger, mit kontrolliertem Lichtpunkt,
reduziertem Lift und einem schwächeren Tilt auf den vier HUD-Routen.
Touch und Reduced Motion unterdrücken Tilt. Kein zweiter Theme-/Shine-Helper.

CSS-Audit: keine neu eingeführten doppelten Selektorblöcke im selben
Media-Scope; kein zusätzliches `!important`. Bestehender bewusster
Accessibility-Fokuscode bleibt erhalten. Keine Override-Wand am Dateiende.

## Abnahme des vollständigen Auftrags

| Punkt | Nachweis / Ergebnis |
|---|---|
| 1 – Live-Karte als Referenz | Alle vier Routen verwenden dieselbe extrahierte Karten-Shell. |
| 2 – Hero-Vorlage | Gemeinsame Geometrie, HUD-Kanten, Atmosphäre und Tiefenwirkung; routeneigene Bilder. |
| 3 – Titel/Kicker | DATEN/BANK, BUILD-/PLANER, TECH-/WERKBANK; GUIDES bleibt ungeteilt. |
| 4 – Routenspezifische Funktionen | Bestehende Renderer, Binder und Speicherwege erhalten; funktional getestet. |
| 5 – Globale RF-Heroes | Unverändert für andere Routen; Community, Planer und Patchwatch gegen Baseline verglichen. |
| 6 – Datenbank | Filter/Katalog, alleiniger Detaildialog, Admineditor und zentrale Assets erhalten. |
| 7 – Builds | HUD-Profil und zwölf Slots, bestehende Speicherung und JSON-Import/Export getestet. |
| 8 – Techwerkbank | Gemeinsamer Hero; Reverse, Erfindung und Fertigung einschließlich Rechner erhalten. |
| 9 – Guides | HUD-Toolbar/Karten und sichtbare Kapitelzustände; sechs Guides/27 Kapitel unverändert. |
| 10 – Theme-Scope | 3 → 7 tatsächliche IDs; ehrliche Scope-Matrix und Beschreibung. |
| 11 – Einstellungen | Accent, Radius, Dichte, Schrift, Bewegung, Fokus, Raster und Kompaktheit an vorhandene Engine angebunden. |
| 12 – Persönliche Profilfarbe | Vier Interface-Akzente mit unveränderter persönlicher Goldfarbe getestet; Profilregression bestanden. |
| 13 – Liquid | Derselbe idempotente Helper; kein kopierter Pointercode; Touch/Reduced Motion geprüft. |
| 14 – Panel-Sprache | Gemeinsame Rahmen-/Radius-/Verlauf-/Schatten-Tokens und Signalzustände. |
| 15 – Clean Refactor | Alte Sonderregeln direkt bereinigt; keine neue CSS-Tail-Schicht oder neue !important-Regeln. |
| 16 – Design-Freiheit | Ausschließlich visuelle Vereinheitlichung und notwendige Touch-/Fokus-Nacharbeit. |
| 17 – Visuelle Abnahme | Fünf aktuelle Screenshots bei 1920×1080 direkt betrachtet und verglichen; 390-px-Abnahme zusätzlich. |
| 18 – Theme-Test | Magenta/Cyan/Orange/Violett auf allen sieben Bereichen, kompletter Navigationsweg und Reload; Hell/Auto zusätzlich. |
| 19 – Funktionstest | Datenbank, Admin/Assets, Builds, alle Tech-Tabs, Guides/Tutorial und Karte; Produktionsschreibzugriffe ausgeschlossen. |
| 20 – Schutz | Kein Diff an Schema, Migrationen, RLS, Storage, Asset-/Katalog-/Auth-Clients, Karten-JS, Profilstruktur oder Tutorial-JS/CSS. |
| 21 – Abschluss | Audit vor Commit; Sicherung ausschließlich auf admin-editor-preview, danach GitHub- und main-Vergleich. |

## Tests und Sichtprüfung

587 erfolgreiche gezielte Checks:

- `tests/shared-map-hud.cjs`: 193 – Geometrie bei 1920/1280/390/360,
  vier Akzente × sieben Routen, vollständiger Navigationsweg und Reload,
  persönliche Profilfarbe, Hell/Auto, Radius/Dichte/Schrift/Bewegung/Fokus/Raster/
  Kompaktheit, Builds/Import/Export, Tech-Tabs/Rechner/Mix, Guides/Tutorial,
  Shared-Helper/Idempotenz, Touch/Reduced Motion, mobile Tech-Tabs,
  unveränderte nicht beauftragte RF-Heroes.
- `tests/database.cjs`: 43 – Suche, Filter, Sortierung, Pagination, Sammlung,
  Modal und Listenansicht, Desktop/390/360.
- `tests/database-composition.cjs`: 66 – gemeinsame Map-/Datenbank-Geometrie,
  Modal-/Scroll-/Fokus-Lifecycle, Admineditor, vier Profilfarben und Shared-Helper.
- `tests/asset-library.cjs --catalog-link`: 34 Katalog-Asset- und 47
  Datenbank-Admin-Checks mit bestehenden isolierten SQL/RLS/Storage-Fixtures.
- `tests/guide-tutorial.cjs`: 109 – originale Kapitel, fünf Pilot-Schritte,
  Sitzung, gleiche By-the-Wind-Instanz, Abschluss/Schließen/Reload, Touch,
  Tastatur, Responsive und Reduced Motion.
- `tests/b07-profile.cjs`: 42 – vorhandene Profil-/Einstellungsfunktionen und
  unveränderte Profilgeometrie im bestehenden Baselinevergleich.
- `tests/map-consolidation.cjs`: 51 – Szenarien, Filter, Marker, Route, Zoom,
  Pan, Touch, Dialoge und Auth-Gate. Alter Testselektor wurde an den bereits
  bestehenden alleinigen Katalogdialog angepasst; kein Karten-Code geändert.
- `tests/map-flyby-motion.cjs`: 2 – unveränderte Bewegungsqualität bei 1920/390.

Zusätzlich: Syntaxchecks für die geänderten JavaScript-Dateien,
`git diff --check`, CSS-Duplikat-/!important-Audit und Schutzdatei-Diff.

Bei 1920×1080 haben alle fünf Heroes dieselben Werte:
linke Kante 30,72 px, rechte Kante 1889,27 px, Breite 1858,55 px,
Oberkante 86 px, Unterkante 308 px, Höhe 222 px, Radius 12 px bei
Standardeinstellungen. Gleicher Schatten und Abstand zur folgenden Fläche.
Bei 390 px gemeinsame Kanten 7/383 px, Oberkante 70 px und Radius 12 px;
Höhen richten sich nach dem jeweiligen Inhalt. Kein horizontaler Overflow.
Screenshots zusätzlich bei 390 px einschließlich Tech-Erfindung/-Fertigung,
Dossier und bestehendem Adminmodal visuell betrachtet.

Screenshots: `test-results/shared-map-hud/` (lokale, ignorierte Prüfarbeitsdateien).
Weitere Fuchs-/Admin-Aufnahmen: `/tmp/database-final-screenshots/`.

## Live-Fuchs und Grenzen des Nachweises

Rein lesender Live-Zugriff bestätigt `catalog:cat-tier-fuchs`,
`catalog_id=cat-tier-fuchs`, Status `active`, privaten Bucket `archive-assets`
und Original `Fox.png` (PNG, 304×304, 44.753 Bytes).
Datenbank-/Dossier-Screenshots bei 1920 und 390 verwenden diesen tatsächlichen
Assetinhalt und einen öffentlichen Live-Datensnapshot über lokale,
lesende Transport-Fixtures. Die Adminrolle ist dabei eine lokale Testrolle,
keine behauptete produktive Admin-Sitzung. Schreibtests laufen ausschließlich
in isolierten Fixtures; keine Produktionsdaten wurden geändert.

## Geänderte Dateien

Laufzeit (11): `app.js`, `styles.css`, `routes-full.js`, `routes-full.css`,
`live-map.css`, `settings-page.js`, `settings-page.css`, `admin-panel.js`,
`admin-panel.css`, `site-header.css`, `index.html` (Cache-Versionen).

Tests (3): `tests/shared-map-hud.cjs`, `tests/database-composition.cjs`,
`tests/map-consolidation.cjs`.

Dokumentation (1): `docs/SHARED_MAP_HUD_20261002.md`.

Keine Phase 2B. Kein ZIP-Import. Abschluss dieses Blocks, danach STOPP.
