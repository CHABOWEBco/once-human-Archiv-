# Live-Karte: Desktop-Maßstab und Maussteuerung

Stand: 2026-10-02. Ausgangspunkt und Remote-HEAD vor Änderungen:
`198d1d6b23912e9c8851ae419adba37382cae055`, Branch `admin-editor-preview`,
Worktree sauber. Remote `main`: `94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.

## Bestand und Maßstab

Die aktive Steuerung ist `bindLiveMap()` in `live-map.js`. Der ältere
`bindMap()` in `routes-full.js` ist durch die kanonischen Renderer/Binder
überlagert und wurde nicht verändert. Der bestehende Controller wurde
weiterentwickelt; Datenquelle, Markerkoordinaten und View-Schema bleiben gleich.

Der direkte Browservergleich von Datenbank und Karte bei 1920×1080 zeigt
bereits identische Außenbreite, Hero-Höhe, Abstände und Hero-Geometrie.
Der kleinere Eindruck stammt aus der geringeren mittleren Nutzfläche der
Dreiteilung sowie den kleineren Beschriftungen im Karten-Workspace.

| Messwert | Vorher | Danach |
| --- | ---: | ---: |
| Außenbreite, 1920 px | 1858,55 px | 1858,55 px |
| Hero-Höhe, 1920 px | 222 px | 222 px |
| Navigation / Karte / Details, 1920 px | 270 / 1246,55 / 320 px | 240 / 1336,55 / 260 px |
| Kartenhöhe, 1920 px | 734,39 px | 734,39 px |
| Navigation / Karte / Details, 1280 px | 245 / 697 / 290 px | 220 / 772 / 240 px |
| Kartenhöhe, 1280 px | 702 px | 702 px |
| Kartenbreite / Höhe, Mobil 390 px | 376 / 430 px | 376 / 430 px |

Bestehende CSS-Regeln wurden direkt angepasst. Desktop-Schriftgrößen sind
größer und konsistenter mit dem Archiv-Workspace. Auf Mobil greifen die
ursprünglichen Größen. Das Routenformular kann seine Eingabespalte verkleinern,
damit der Speichern-Button im schmaleren Panel vollständig sichtbar bleibt.
Keine Änderung am gemeinsamen Hero, Theme-System oder Browserzoom; Kartenzoom
weiterhin 100–260 %, ± jeweils 15 Prozentpunkte und Reset auf 100 % / Mitte.

## Schnellnavigation

Im aktuellen HEAD existiert keine bestätigte mobile Navigation zu drei festen
Kartenpositionen. Der aktive Renderer enthält Szenariowahl, Marker-Auswahl,
Routen sowie Ressourcen-/Abweichler-Suchaktionen. Diese sind bereits auf
Desktop und Mobil erreichbar und springen nicht zu festen Koordinaten.
Auch der inaktive Alt-Renderer definiert keine solchen festen Sprungziele.
Nach Rückmeldung des Nutzers wurde dieser Auftragspunkt ausdrücklich
gestrichen. Keine neuen Ziele, Controls oder Navigationslogik angelegt.

## Controller

- Hover nur für echte Maus-Pointer bei `(hover:hover) and (pointer:fine)`.
  Die mittleren 44 % jeder Achse bilden die Ruhezone. Außerhalb steigt die
  Geschwindigkeit quadratisch bis maximal 360 px/s pro Achse. Das Vorzeichen
  erschließt Weltinhalt in Cursor-Richtung, statt die Bildfläche dorthin zu ziehen.
- Zeitbasierte Annäherung an die Zielgeschwindigkeit: 90 ms beim Beschleunigen,
  60 ms beim Abbremsen. Reduced Motion verwendet die Zielgeschwindigkeit direkt
  und stoppt ohne inertialen Nachlauf. Pointerleave stoppt immer sofort.
- Bounds stammen aus dem bestehenden Cover-Fit und Zoom. Vollständig sichtbare
  Achsen und erreichte Grenzen laufen nicht weiter; kein Overscroll oder Federn.
- Genau ein Pan-RAF pro Board. Pointermove aktualisiert den Zielzustand.
  Bewegung läuft über `translate3d` auf der bestehenden Kartenebene.
  Fit-Abmessungen werden bei Bildladen/Resize gemessen. Der Transform-Hinweis
  besteht nur während Hover-Pan bzw. Drag. Im Stillstand endet der Pan-RAF.
  Der vorhandene dekorative Fly-by-RAF bleibt unabhängig und unverändert.
- Marker/Controls pausieren Pan auch dann, wenn ein bewegter Marker unter den
  ruhenden Cursor gelangt. Drag, Pinch, Platzierung und offene Dialoge pausieren
  ebenfalls. Toolbarinteraktion, Blur und Seitenscroll stoppen automatisch.
- Wheel verankert die Skalierung am tatsächlichen Cursorpunkt. Pixel-, Zeilen-
  und Seitendeltas werden normalisiert, je Event begrenzt und exponentiell
  angewandt. Kleine Trackpad-Deltas bleiben klein. Wheel wird nur am Board
  abgefangen; außerhalb bleibt Seitenscroll erhalten. An Bounds hat Clamp Vorrang.
- Drag verwendet weiterhin die Pointer-Map und Pointer Capture. Pan pausiert
  während aktiver Gesten; Pointerup/Cancel/Capture-Verlust bereinigen den Zustand.
  Board-Cursor: move, aktiver Drag: grabbing, Marker: pointer, Platzierung: crosshair.
- Das ursprüngliche Drag-Verhalten wurde mit nativen Browserereignissen
  reproduziert: Im geprüften Chromium folgte die Karte bereits und es entstand
  kein Ghost Image. Die Oberfläche ist zusätzlich durch lokale `dragstart`-
  Verhinderung, `user-select:none`, `-webkit-user-drag:none` für Board-Bilder
  und saubere Pointer-Zustände abgesichert. Kein globales Drag-/Selection-Verbot.

## Persistenz und Lebenszyklus

`apply()` schreibt ausschließlich die Darstellung und markiert einen veränderten
View als ungespeichert. `jma_map_view` behält `{zoom,x,y}` und den bestehenden
`JMA_STORE`-Zugang. Hover speichert beim Stoppen/Verlassen. Wheel und Drag nutzen
250 ms Debounce; Gestenende, Buttons, Reset und Controller-Abbau speichern sofort.
Unveränderte Views werden nicht erneut geschrieben. Ein laufender Hover-Pan
verursacht keine Storage-Writes pro Frame.

Der Controller wird vor Map-Re-Render/Re-Bind, bei Hashwechsel, Pagehide und
auch bei externem Entfernen des Boards aufgeräumt. AbortController entfernt
seine Listener, RAF/Timer werden beendet und Resize-/Removal-Observer getrennt.
Auch das Entfernen eines ruhenden Boards innerhalb des Workspace wird erkannt.
Der vorhandene einmalige Fly-by startet durch Map-Re-Render nicht neu.

## Verifikation

Lokaler Chromium-Browser mit bestehenden Auth-/Daten-Fixtures; Produktions-
Supabase-Aufrufe der Tests werden blockiert. Keine Produktionsdaten geändert.

- `node tests/map-desktop.cjs`: **70 Checks bestanden**. Ausgangsvergleich,
  native Maus, fünf Pan-Richtungen bei 175 %, Ruhezone, progressive Kurve,
  vier Grenzen ohne Jitter, 100-%-Achse, normal/reduced motion, Cursor-Zoom
  rein/raus, kleine/extreme Deltas, Board-/Seitenscroll, Drag/Ghost/Selection,
  Marker, Platzierung, Dialog, Storage-Burst und Hover ohne Frame-Writes,
  Route-Reentry, maximal ein Pan-RAF, aktive/ruhende DOM-Entfernung,
  unveränderte Fly-by-Instanz, 1280 px und native Touch-Regression bei 390 px.
- `node tests/map-consolidation.cjs`: **51 Checks bestanden**. Szenarien,
  Bestandsmarker, Filter, Routen, lokale Markeranlage, Katalog-Verknüpfung,
  Zoomgrenzen/Reset, Drag, Touch/Pinch, Reload und Auth-Gate. Der Wheel-Test
  wartet jetzt auf die bewusst verzögerte Persistenz.
- `node tests/shared-map-hud.cjs`: **193 Checks bestanden**. Gemeinsame
  Hero-Geometrie, geschützte Archivseiten, Themes, Profilfarbe, gemeinsamer
  Shine-Helper und bestehendes Tutorial bleiben funktionsfähig.

**314 Checks**, keine Browserausnahmen. Desktop 1920×1080 und 1280×1080 sowie
Mobil 390×844 visuell geprüft. Mobile Panel-Geometrie und Schriftgrößen der
geänderten Selektoren stimmen mit dem Ausgangsstand überein; kein Overflow.
Screenshots/Resultate liegen lokal in `test-results/map-desktop/` (gitignored).

Geändert: `live-map.js`, `live-map.css`, zwei Cache-Versionen in `index.html`,
`tests/map-desktop.cjs`, Wartebedingung in `tests/map-consolidation.cjs`, dieser
Bericht. Keine Änderungen an Archiv-/Kartendaten, anderen Seiten, Theme-Engine,
Supabase, Auth, RLS, Storage, Asset Library oder Originalassets.
