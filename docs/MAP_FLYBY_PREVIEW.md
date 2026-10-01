# By-the-Wind – 2.5D-Fly-by zur Sichtprüfung

Ausgang: aktueller GitHub-HEAD `dfbe0a23c6f5d3a15f062b4e8d978f4dae688b97`, ausschließlich `admin-editor-preview`.

Verwendet: `2 By-the-Wind(1).png` aus dem vom Benutzer hochgeladenen ZIP; unverändert als `assets/live-map/by-the-wind.png` übernommen. SHA-256 beider Dateien identisch: `03a91cd44b96d68745ea7b8ce5b597666b2e9c5398745a5b4d07c46495f5fac7`. Keine generierten oder extern beschafften Assets.

Ein Durchflug dauert 6,4 Sekunden. Perspektive, translate3d, Skalierung, drei Rotationsachsen und segmentweises Easing bilden eine gebogene diagonale Bahn: klein/unscharf in der Ferne, deutlich größer/scharf beim nahen Vorbeiflug rechts unten, anschließend seitlich zurück in die Tiefe und aus dem Bild. Dezente Schatten, keine neue Farbgestaltung. Desktop- und Mobilkurve werden einmal pro Besuch gewählt. Bildschirmgrößenwechsel passt die Kartenbegrenzung an, ohne die Animation neu zu starten.

Die dekorative Ebene bleibt außerhalb des neu gerenderten App-Inhalts, folgt der sichtbaren Kartenfläche und ist darauf beschnitten. Keine Änderungen an Kartenkoordinaten, State-Keys oder bestehender Creature-Darstellung. `pointer-events:none`, keine Bedienelemente/Tabstopps. Das Bild wird vor Beginn dekodiert und die Ebene nach Ende entfernt.

Ein flüchtiger Besuchszustand startet den Flug beim ersten Karten-Binder-Aufruf. Suche, Filter, Markerwahl, Zoom/Pan und Re-Render behalten denselben Animationsknoten und dessen Zeitachse. Verlassen der Karte entfernt die Ebene und setzt den Besuch zurück; erneutes Betreten und Reload dürfen wieder einmal starten. Der Live-map-Alias bleibt kompatibel. Kein localStorage-Gesehen-Flag. Bei Reduced Motion kein Start; Aktivieren während des Fluges bricht ihn ab, Deaktivieren spielt denselben Besuch nicht nochmals ab.

## Gezielte Prüfung

- `node tests/map-consolidation.cjs`: 51 Prüfungen bestanden, einschließlich sechs Szenarien/Winterstandard, Suche/Fokus, Filter, Marker, eigene Marker, Kataloglinks, Details, Zoom bis 260 %, Maus-Pan/Reset, Farmrouten/Speichern/Öffnen, Reload, native Touch-/Pinch-Bedienung, Auth-Alias und Admin/Katalogschutz (21 Einträge, 14 Kategorien, keine Schreiboperationen).
- `node tests/map-flyby.cjs`: 36 Prüfungen bestanden. Direkte Kartenöffnung, Startseite/Header, Alias, Reload, einmaliger Start und identische Animationsinstanz bei Suche/Filter/Zoom/Marker/Re-Render und Bildschirmgrößenwechsel; Entfernung nach Ende, Reduced Motion während des Fluges und bei Einstieg.
- 1920, 1280, 768, 390 und 360 px: Perspektivmatrizen und wachsende/abnehmende scheinbare Größe gemessen; zehn Original-Layout/Creature-Vergleiche (pro Breite aktuelle und Ausgangsversion), keine Geometrieänderung, kein horizontaler Overflow, keine defekten Szenenbilder. Nahphase bleibt unter 70 % der Kartenbreite. Keine JavaScript-Ausnahmen.
- Desktop-/Mobilaufnahmen der Fern-, Annäherungs-, Nah- und Rückflugphase visuell geprüft; lokal unter `test-results/map-flyby/`, dort auch Messwerte. Syntax und `git diff --check` bestanden. Isoliertes Chromium mit Auth-Fixture; keine echten Supabase-Schreiboperationen und kein Realgeräte-/Safari-Nachweis.

Produktänderungen ausschließlich Asset, additive Ergänzungen in `live-map.js`/`live-map.css` und deren Cache-Versionen in `index.html`. Shattered Maiden, Butterfly Emissary, B-07, B-13, Profil, Admin, Supabase und bisherige Fixes erhalten.

Preview: https://raw.githack.com/CHABOWEBco/once-human-Archiv-/admin-editor-preview/index.html#/map

Nach Sichtprüfung folgt der separate Website-/Code-Review. Keine weiteren Mutanten oder Designänderungen begonnen.
