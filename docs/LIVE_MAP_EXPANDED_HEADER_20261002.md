# Live-Karte: Desktop, Maximierung und gemeinsamer Header

Stand: 2026-10-02. Zu Beginn waren Worktree und Remote synchron auf
`18b61c298a5fba21172086526d68127df3a929e2`, Branch `admin-editor-preview`.
Der im ergänzten Auftrag genannte `4eb271358d62d52bced193df14d0dfbbb8881365`
ist dessen Vorgänger. Der bereits abgeschlossene sichtbare Desktop-Finish
wurde erhalten und nicht erneut implementiert. Remote `main` vor Änderungen:
`94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.

## Maßstab und vorhandene Bedienung

Die zuvor große seitliche Flächenbelegung und die außerhalb des 1080-px-
Fensters liegende untere Kartenkante ließen die Mitte kleiner wirken. Die
bereits korrigierten Proportionen bleiben erhalten:

| Ansicht | Navigation | Karte | Details |
| --- | ---: | ---: | ---: |
| Normal, 1920×1080 | 172 px | 1476,55 × 672 px | 188 px |
| Normal, 1280×1080 | 172 px | 872 × 672 px | 188 px |
| Maximiert, 1920×1080 | Drawer bei Bedarf | 1896 × 1056 px | Drawer bei Bedarf |
| Maximiert, 1280×1080 | Drawer bei Bedarf | 1256 × 1056 px | Drawer bei Bedarf |

Die normale Kartenfläche belegt 79,4 % des Desktop-Workspace. Hero und
Browserzoom wurden nicht verändert; keine Skalierung der gesamten Website.
Die stärkere vorhandene Hover-Kurve bleibt ebenfalls erhalten: mittlere
28 % je Achse ruhig, Exponent 1,35, maximal 560 px/s pro Achse, weiche
70-ms-Beschleunigung und 60-ms-Abbremsung. Bei 175 % und 80-%-Mausposition
bewegt sich die Karte in rund 0,7 s ungefähr 145–150 px, statt rund 19 px
im Ausgangsstand `4eb2713`. Rechts/links/oben/unten erschließen jeweils
den entsprechenden Weltbereich. Vollständig sichtbare Achsen bei 100 %
bleiben ruhig, Pointerleave stoppt sofort.

Wheel-Zoom verankert weiterhin den gewählten Bildpunkt am Cursor, bis
Clamp-Grenzen Vorrang haben. Zoom bleibt bei 100–260 %, ± jeweils 15
Prozentpunkte, Reset 100 %/Mitte. Der tatsächliche PSI-Marker blieb im
Chromium-Zoomvergleich unter dem Cursor. Native Drag-Bewegung funktioniert
zusätzlich mit Pointer Capture; Hover pausiert währenddessen. Bestehende
lokale `dragstart`-/Bilddrag-/Textauswahl-Verhinderung bleibt erhalten.

## Ein Darstellungszustand derselben Karte

`⛶ KARTE MAXIMIEREN` setzt `is-expanded` auf dem bestehenden `#lmWorkspace`.
Die Shell liegt fixed mit 12 px Außenabstand und z-index 2200 über der Seite.
Der dunkle Hintergrund, Scroll-Lock auf html/body und inert gesetzte
Umgebung gehören nur zu diesem Zustand. Der globale Header wird per
`visibility:hidden` ausgeblendet und behält seine Layoutposition. Die
vorübergehende Mindesthöhe der Seite verhindert einen Layoutsprung.

`#lmBoard`, `#lmPlane`, Originalbild, Zoom-Controls und Controller bleiben
beim Umschalten dieselben DOM-Objekte. Hover, Wheel, Drag, Marker, +/−/Reset
verwenden unverändert dieselbe Steuerung. Es gibt keinen neuen Binder,
zweiten Kartenrenderer, zweiten Pan-RAF oder zusätzlichen View-Speicher.

FILTER und DETAILS zeigen die bestehenden Asides als seitliche Overlay-
Drawer. Es ist höchstens ein Drawer geöffnet; erneuter Buttonklick oder
sein X schließt nur den Drawer. Markerauswahl öffnet Details automatisch.
Die Karte wird dabei nicht verkleinert. Drawerhöhe ist durch den Viewport
begrenzt, längere Inhalte bleiben scrollbar. Ein vorhandener nativer
Marker-Dialog bleibt oberhalb der maximierten Karte bedienbar.

Marker-/Filter-/Szenario-/Routenaktionen im maximierten Zustand aktualisieren
nur vorhandene Inhaltsbereiche. `navigationMarkup`, `markerMarkup` und
`detailMarkup` sind gemeinsame Quellen für Normalansicht und Inhaltsupdate.
Weiter sichtbare Marker behalten ihre Nodes; ein Szenariowechsel entfernt
wie zuvor nicht zugehörige Marker. Suche erhält Fokus und Caret. Delegierte,
über denselben AbortController verwaltete Listener vermeiden erneutes Binden
der aktualisierten Panelinhalte. Normale Vollseiten-Renders behalten ihren
bisherigen Lebenszyklus; sie bauen einen aktiven Maximierungszustand sauber ab.

`× SCHLIESSEN` und Escape beenden den Modus und fokussieren den ursprünglichen
Maximieren-Button. Tab bleibt im geöffneten Karten-HUD. Escape in einem
nativen Marker-Dialog schließt zunächst diesen Dialog. Scrollposition,
inert-Vorwerte und Header-Sichtbarkeit werden beim Beenden wiederhergestellt.
Unter 1181 px wird Maximieren nicht angeboten; ein Größenwechsel in diesen
Bereich beendet einen geöffneten Modus sauber.

## Geometrie und Persistenz

Die bestehende Messung und der bestehende ResizeObserver erfassen beide
Größenwechsel. Pan-Offsets werden im Verhältnis des alten/neuen Bild-Fit
umgerechnet, damit der gleiche normierte Weltpunkt in der Viewportmitte
bleibt. Zoom bleibt erhalten; `apply()` verwendet danach die neu berechneten
Bounds und clampet bei Bedarf. Drawer ändern diese Geometrie nicht.

Der vorhandene `persist()` schreibt weiterhin ausschließlich `jma_map_view`
mit `{zoom,x,y}`. Maximierte Offsets werden beim Serialisieren auf den
normalen Fit bezogen, damit normales Reentry/Reload dieselbe Weltposition
verwenden kann. Es gibt keine zweite Persistenzlogik oder neue Storage-Keys.
Aktive Hover-Frames schreiben weiterhin nichts. Stop/Gestenende und das
vorhandene Debounce regeln die Speicherung.

Der vorhandene Hashwechsel-Disposer läuft in der Capture-Phase vor dem
Seitenrenderer. Dadurch kann er auch nach einem Resize die normale
Geometrie messen und speichern, bevor die alte DOM-Struktur verschwindet.
Route-/Pagehide-/DOM-Abbau entfernen Lock, inert und Beobachter zuverlässig.
Der bestehende dekorative Fly-by wird nur im Stapelkontext derselben Shell
weiterverwendet; Instanz, Originalasset, Kurven, Laufzeit und einmaliger
Start bleiben erhalten. Shattered Maiden und Butterfly bleiben unverändert.

## Header-Ursache und Bereinigung

Zwei Karten-Sonderregeln verursachten den abweichenden Eindruck:

- `body.route-map .topbar` überschrieb Hintergrund, Schatten und Unterlinie.
  Dieser Block wurde aus `live-map.css` entfernt.
- `body.route-map.ui-preferences-active` legte die Interface-Schrift am
  gesamten Body fest. Dadurch erbten auch Logo und Navigation diese Schrift,
  während die anderen vier Hauptseiten die gemeinsame Basisschrift nutzten.
  Nur diese Body-Schriftdeklaration wurde aus `settings-page.css` entfernt.
  Der bereits bestehende `#app`-Font-Scope erhält die Interface-Schrift im
  Karteninhalt, ohne Änderungen an der Theme-Engine.

Der normale Header verwendet nun exakt die gemeinsame Basis aus
`site-header.css`. Logo, Text-/Iconpositionen, Suche, Account, Settings,
Abstände, Höhe, Hintergrund, Schatten und Active-Tab-Geometrie stimmen
bei 1920 und 1280 px über Datenbank, Karte, Builds, Techwerkbank und Guides
überein. Nur der aktive Menüpunkt wechselt. Interface-Akzent bleibt an der
vorhandenen gemeinsamen Accent-Regel angeschlossen. Keine Gegenregeln,
zweite Headerimplementierung oder neue `!important`-Deklarationen.

## Browserabnahme und Tests

Interaktiv gesteuerter lokaler Chromium mit nativen Maus-/Wheel-Ereignissen
(headless). Screenshots/Bildfolgen wurden tatsächlich visuell beurteilt.
Auth-Fixtures und ein zuvor rein lesend erfasster Katalog-/Assetbestand
dienten der lokalen Prüfung; Produktions-Supabase-Aufrufe waren blockiert.

Bei 1920×1080: fünf Header-Screenshots, Datenbank → Karte, Reset/175 %, alle
vier Randrichtungen ohne Klick, Cursor-Zoom am PSI-Marker, Drag, Maximieren,
Marker/Details, Details schließen, Filter/Suche, Karte schließen und Escape.
Die normale Karte setzt mit Zoom, Auswahl und Filtern weiter fort.
1280×1080: Normalansicht, Maximierung, Marker/Details und Rückkehr visuell
geprüft. 390 px: bestehende Touch-/Pinch-/Marker-/Filterbedienung erhalten;
kein horizontaler Overflow und kein sichtbarer Maximieren-Button.

- `node tests/map-desktop.cjs`: **123 Checks**, darunter DOM-Identität,
  ein Pan-RAF/ein Observer, Drawer ohne Kartenverkleinerung, Cursor-Zoom,
  Drag/Ghost, Fokus/Escape, unveränderte Normalbedienung, zehn Header-
  Vergleiche, Resize/Reentry, Scroll-Lock-Abbau und native Touch-Regression.
- `node tests/map-consolidation.cjs`: **51 Checks**, bestehende Szenarien,
  Routen, Marker/Katalog-Anbindung, Auth, Zoom/Drag, Mobile 390/360 und Reload.
- `node tests/shared-map-hud.cjs`: **193 Checks**, sieben Theme-Scopes,
  persönliche Profilfarbe, bestehende Builds/Tech/Guides/Tutorials und
  gemeinsame Shine-Logik, Responsive und andere Seitenfunktionen.

**367 Checks**, keine Browserausnahmen. Screenshots/Resultate lokal unter
`test-results/map-desktop/` und `/tmp/map-visible-review/` (nicht eingecheckt).
Geänderte Dateien: `live-map.js`, `live-map.css`, `site-header.css`, die eine
Schriftdeklaration in `settings-page.css`, vier Cache-Versionen in `index.html`,
der bestehende Test `tests/map-desktop.cjs` und dieser Bericht. Keine Änderungen
an Supabase/RLS/Storage/Asset Library, Auth, Kartendaten, Markerkoordinaten,
anderen Seitenfunktionen oder der Theme-Engine. Keine Phase 2B, kein ZIP-Import.
