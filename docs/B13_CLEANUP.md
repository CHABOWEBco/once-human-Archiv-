# B-13 – konservative Altstrukturprüfung

Ausgang: aktueller GitHub-HEAD `eeb4bcfdb3bd1b7edd70288864ff31d621daa03c` auf `admin-editor-preview`. B-07 war bereits abgeschlossen und wurde nicht erneut implementiert.

Entfernt wurden ausschließlich neun CSS-Regeln aus `routes-full.css`: Backdrop inklusive hidden-Regel, alter Drawer-Container inklusive hidden-Regel, vier ausschließlich diesem Container zugeordnete Header-Regeln und dessen mobile Containerregel. Der B-07-Commit hat das zugehörige Drawer-Markup bereits entfernt. Keine JavaScript-Datei und keine aktive Responsive-Regel geändert. Gemeinsam genutzte drawer-body/nav/content-Klassen des Einstellungseditors bleiben erhalten.

Bewusst behalten:

- Globale `.cyan-btn`/`.dialog-close`-Regeln in `live-map.css`: haben aktive Verbraucher außerhalb der Karte; bloßes Scoping würde die bestehende Darstellung verändern.
- Wiederholte Selektoren: responsive, Theme- und spätere Kaskadenkorrekturen sind kein Beleg für ungenutzten Code. Keine pauschale Zusammenführung.
- Alte Kartenrenderer und Binder: bleiben im ersten Routenregister als Fallback registriert, bevor `live-map.js` die kanonische Karte übernimmt. Gemeinsames `allMarkers` wird auch von Farmrouten verwendet. Keine Entfernung bei möglicher Weiterverwendung.
- Profilpreview und Binder: Referenzen/Settings-Registrierung vorhanden; keine eindeutig referenzlosen benannten Funktionen in `routes-full.js` gefunden. Preview- und Editor-Helfer erhalten.

## Validierung

- `node tests/b07-profile.cjs`: 42 Prüfungen bestanden.
- `node tests/map-consolidation.cjs`: 51 Prüfungen bestanden, inklusive Admineditor-/Katalogschutz und Touch/Mobil.
- Zusätzlicher isolierter Chromium-Vergleich gegen Ausgangs-CSS: Startseite, Profil, Profileinstellungen, Karte und Admin bei 1920 und 390 px; zehn Zustände mit identischen DOM-Elementen, Rechtecken und berechneten Layout-/Darstellungsstyles. Kein alter Drawer/Backdrop im DOM. Animationen ausschließlich im Vergleichstest deaktiviert. Ergebnisse lokal `/tmp/b13-regression.log`.
- `git diff --check`: bestanden. Tests verwenden Auth-Fixture, keine echten Supabase-Schreiboperationen; kein Live-Login-Nachweis.

Produktänderung ausschließlich `routes-full.css`. Admineditor, Supabase, Karten und Profilfunktionen erhalten. `main` blieb auf `94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.

Preview: https://raw.githack.com/CHABOWEBco/once-human-Archiv-/admin-editor-preview/index.html

STOPP. Mutanten-/Fly-by-Finish nicht begonnen.
