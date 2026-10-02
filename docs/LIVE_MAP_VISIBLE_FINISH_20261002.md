# Live-Karte: sichtbarer Desktop-Finish

Stand: 2026-10-02. Ausgangspunkt lokal und auf GitHub:
`4eb271358d62d52bced193df14d0dfbbb8881365`, Branch `admin-editor-preview`,
Worktree vor Beginn sauber. Remote `main` vor Änderungen:
`94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.

## Tatsächlich reproduzierter Eindruck

Im lokalen Chromium wurde die Datenbank geöffnet und über die vorhandene
Navigation direkt zur Karte gewechselt. Im Ausgangsstand lag die untere
Kartenkante bei 1920×1080 auf y=1124,39, also außerhalb des Fensters. Nach
Reset und fünf Plus-Klicks (175 %) bewegte eine Mausposition bei 80 % der
Kartenbreite die Ebene in 0,7 Sekunden nur ungefähr 19 px.

Der Browserdurchlauf erfolgte interaktiv über native Chromium-Maus-, Wheel-
und Pointer-Ereignisse. Die tatsächlichen Screenshots vor/nach Bewegung,
Zoom und Drag wurden visuell beurteilt, zusätzlich zu den Regressionstests.
Chromium lief headless; es gab keine manuelle Bedienung eines OS-Fensters.
Die lokale Datenbank verwendete bestehende Auth-Fixtures und einen zuvor
rein lesend aufgenommenen Katalog-/Assetbestand. Produktionsschreibzugriffe
waren ausgeschlossen.

## Sichtbare Korrektur

| Desktopmaß | Ausgangsstand | Jetzt |
| --- | ---: | ---: |
| Navigation / Karte / Dossier, 1920 px | 240 / 1336,55 / 260 px | 172 / 1476,55 / 188 px |
| Anteil der Kartenfläche am Workspace | 71,9 % | 79,4 % |
| Kartenhöhe / Unterkante, 1920×1080 | 734,39 / 1124,39 px | 672 / 1062 px |
| Navigation / Karte / Dossier, 1280 px | 220 / 772 / 240 px | 172 / 872 / 188 px |
| Kartenhöhe / Unterkante, 1280×1080 | 702 / 1090 px | 672 / 1060 px |

Die schmaleren Seitenpanels strecken sich nicht mehr als große leere Flächen
über die gesamte Kartenhöhe. Navigation, Szenariowahl und Routenformular
sind kompakter. Im Dossier stehen Metadaten mit Spiel-X/Y als Paar und
vollständig sichtbare Aktionen; Ressourcen und Abweichler teilen eine Reihe.
Längere Inhalte bleiben über internen Panel-Scroll erreichbar. Die geprüften
normalen Dossiers benötigen bei 1080 px Höhe keinen zusätzlichen Scroll.
Bestehende responsive Umschaltungen bis 1180 px bleiben erhalten.

Die Hover-Kurve wurde im vorhandenen Controller geändert: ruhige Mitte
28 % je Achse statt 44 %, progressive Kurve mit Exponent 1,35 statt 2,
maximal 560 statt 360 px/s pro Achse. Die weiche Beschleunigung verwendet
70 ms, das Abbremsen unverändert 60 ms. Die Frame-Zeit bleibt begrenzt,
jetzt auf 60 ms. Bei derselben 80-%-Mausposition und 175 % Zoom bewegte
sich die Ebene im interaktiven Durchlauf etwa 148 px in 0,7 Sekunden.
Der ergänzende automatisierte Vergleich lieferte zuletzt rund 148 px
gegenüber rund 16 px; zeitabhängige Werte schwanken etwas mit Browserlast.

Der vorhandene Desktop-Hinweis erklärt jetzt „MAUS ZUM RAND = GLEITEN“.
Mobil behält seinen bisherigen Hinweis. Originalkarte, Markerkoordinaten,
Hero-Geometrie, Zoomgrenzen, Cursor-Zoom und Drag bleiben erhalten.
Es gibt weiterhin genau einen Pan-RAF und dieselbe Persistenzlogik;
kein `jma_map_view`-Speichern pro Animationsframe. Fly-by, Shattered Maiden
und Butterfly wurden nicht verändert. Keine neue Schnellnavigation.

## Abnahme und Regression

Der interaktive Durchlauf bei 1920×1080 umfasste Datenbank → Karte, Reset,
175 % über fünf Plus-Klicks, gleitende Bewegung ohne Klick an allen vier
Rändern, ruhige Mitte, Cursor-Zoom, Markerauswahl und zusätzliches Drag.
Rechts/links/oben/unten erschließen jeweils den entsprechenden Kartenbereich.
Die Bildfolgen zeigen deutlich zusätzliche Landschaft in dieser Richtung.
Bei 100 % bleibt die vollständig sichtbare horizontale Achse unbewegt.

Beim Wheel-Zoom von 175 auf rund 193 % blieb der identifizierbare PSI-Marker
unter dem Cursor; die Abweichung seines Mittelpunkts betrug unter 0,04 px.
Drag verschob die Karte um 120/55 px und zeigte den Grabbing-Cursor, ohne
Ghost Image. Das ausgewählte Dossier war samt sämtlichen Aktionen sichtbar.
1920×1080, 1280×1080 und Mobil 390 px wurden visuell geprüft. Kein
horizontaler Overflow; keine abgeschnittenen Controls in den geprüften Ansichten.

- `node tests/map-desktop.cjs`: 78 Checks. Vergleich mit Ausgangsstand,
  sichtbar stärkeres Pan, vier Richtungen und Diagonale, ruhige Mitte,
  Grenzen, Reduced Motion, Cursor-Zoom, Wheel-/Storage-Debounce, Drag,
  Ghost-Verhinderung, Marker/Dialog/Platzierung, einzelne RAF-Schleife,
  Re-Render/Route/DOM-Abbau, erhaltene Fly-by-Instanz, beide Desktopbreiten,
  vollständig sichtbare Dossieraktionen und mobile Touch-/Reload-Regression.
- `node tests/map-consolidation.cjs`: 51 Checks. Bestehende Szenarien,
  Filter, Marker, Routen, Katalog-Verknüpfung, Zoom, Drag, Auth und Touch
  bei 390/360 px bleiben erhalten.

129 Checks insgesamt, keine Browserausnahmen. Mobile Panelmaße und
Schriftgrößen der betroffenen Selektoren stimmen mit dem Ausgangsstand
überein. Die vorhandenen Tests wurden erweitert, keine zweite Steuerung
oder neue Testarchitektur angelegt. Ergebnisse/Screenshots liegen lokal
unter `test-results/map-desktop/` und `/tmp/map-visible-review/`.

Geändert: `live-map.css`, `live-map.js`, deren zwei Cache-Versionen in
`index.html`, `tests/map-desktop.cjs` und dieser Bericht. Keine Änderungen
an Supabase, RLS, Storage, Asset Library, Originalassets oder anderen Seiten.
