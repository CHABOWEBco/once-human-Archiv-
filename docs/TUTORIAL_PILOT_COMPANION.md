# By-the-Wind – Begleiter nur im Einsteiger-Piloten

Ausgang: aktueller GitHub-HEAD `8b90ce6ece5ad598852eb33f4af04ca76a4cef3a` auf `admin-editor-preview`.

Nur `g-start` („Die ersten 5 Minuten im JazzeMeow Archive“, fünf Originalschritte) erhält den Begleiter. Die bestehende Tutorialsteuerung und alle Texte bleiben erhalten; kein Rollout auf andere Guides und keine neue Architektur.

Das bestehende `assets/live-map/by-the-wind.png` bleibt byteidentisch zum hochgeladenen Original. Ein eigener dekorativer Knoten wird einmal an den vorhandenen Sitzungsdialog angehängt. Eine reservierte Grid-Spalte neben dem Text hält Figur, Text und Controls auseinander. Desktop: 116×144px-Szene mit Perspektive; Mobil: 74×102px, kleinere Szene. `pointer-events:none`, `aria-hidden=true`, kein Fokus/Audio/neuer Text.

Nach dem Dekodieren des Bildes dauert der weiche Eintritt 720ms. Langsamer Body-Drift über 8,4 Sekunden, kleine Tiefenwechsel, subtile X/Y/Z-Rotation und Scale-Breathing begleiten die Sitzung. Der Ruhemodus enthält nur dezente Schatten, keine Unschärfe. Schrittwechsel ändern lediglich Neigung/Tiefe um wenige Grad/Pixel mit 800ms-Übergang; derselbe Knoten, dasselbe Bild und dieselbe Eintrittsanimation bleiben bei Re-Renders erhalten.

Schließen/Abschluss setzt den vorhandenen Sitzungszustand sofort auf geschlossen und blendet den Begleiter 260ms aus. Danach werden Dialog, Animationen, temporäre Listener und Timer entfernt; ein begrenzter Fallback garantiert Bereinigung. Sofortiges Wiederöffnen beendet eine eventuell noch laufende alte Exit-Phase vor dem neuen Start, sodass keine doppelten Begleiter entstehen. Routenwechsel räumen unmittelbar auf.

Reduced Motion zeigt den Begleiter statisch: kein Eintritt, Hover oder Step-Übergang. Wechsel der Präferenz kann den Eintritt derselben Sitzung nicht wiederholen; Aktivieren während des Ausblendens räumt sofort auf. Keine dauerhafte Speicherung.

## Gezielte Validierung

- `node tests/guide-tutorial.cjs`: **109 Prüfungen bestanden**, 1920/768/390/360px. Originaltexte und normale Guide-Funktionen, Tutorialstart, fünf Schritte, Vor/Zurück, stabile Begleiter-/Bild-/Animationsinstanz bei Step/Re-Render, Schließen/Abschluss, erneutes Öffnen, schnelles Wiederöffnen, Tastatur/Touch und Fokusrückgabe. Nur der Pilot erhält einen Begleiter, auch der wiederverwendbare Controller ergänzt bei anderen Guides keinen.
- Getrennte Rechtecke für Begleiterszene, Erklärung und Buttons; Controls vollständig im Viewport, kein horizontaler Overflow. Originalbild lädt korrekt und bleibt im Ruhemodus scharf. Reduced Motion inklusive Präferenzwechsel und Exit-Bereinigung geprüft. Keine JavaScript-Fehler.
- `node tests/map-flyby-motion.cjs`: zwei Desktop-/Mobil-Fly-by-Prüfungen bestanden. Karten-Fly-by, vorhandene Kartenwesen und deren Asset-/CSS-/JS-Dateien unverändert.
- Desktop- und Mobilaufnahmen visuell geprüft; Ergebnisse lokal `test-results/guide-tutorial/`. Syntax und `git diff --check` bestanden. Isoliertes Chromium mit Testauthentifizierung; kein Live-Supabase-/Realgeräte-Nachweis.

Produktänderungen nur in `guide-tutorial.js`/`.css` und deren Cache-Versionen in `index.html`. Die anderen fünf Guides, Profil, Admin, Supabase, Navigation und alle vorherigen Fixes bleiben erhalten.

Preview: https://raw.githack.com/CHABOWEBco/once-human-Archiv-/admin-editor-preview/index.html#/guides

Beim Einsteiger-Guide **TUTORIAL STARTEN** wählen. STOPP nach diesem Pilot.
