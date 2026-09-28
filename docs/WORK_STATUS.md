# Once Human Archiv – Arbeitsstatus

## Verifizierter Git-/GitHub-Ausgangsstand
- Repository: `CHABOWEBco/once-human-Archiv-`
- Branch: `main`
- ursprünglicher Initial-Commit: `4f9974f682355be08731ee76847a548d54453455`
- gesicherter Neubau-Baseline-Commit auf GitHub: `b4b0018777c01dca7d7702ad2bb5ca7a48c69a9b`
- Baseline-Tree: `e474de7d59535052721a355744c6e19eafba0b8a`
- `README.md` aus dem Initialstand wurde unverändert beibehalten.
- Runtime-/Review-Dateien (`http.log`, `http.pid`, `screenshots/`, `assets/reference/ref-*.webp`) sind bewusst nicht Bestandteil des Produktions-Commits.

## GitHub Pages
- Workflow: `pages build and deployment`
- Run: `36458594210`
- Commit: `b4b0018777c01dca7d7702ad2bb5ca7a48c69a9b`
- Ergebnis: `success` (Build und Deploy erfolgreich).
- Das erzeugte `github-pages`-Artefakt wurde heruntergeladen und bytegenau gegen den lokalen Baseline-Stand verglichen.
- Verifiziert bytegleich: `index.html`, `app.js`, `styles.css`, `data-routes.json`, `404.html`, `README.md`, Dokumentation und alle acht Produktions-WebP-Assets.
- Direkter HTTP-Abruf der öffentlichen `github.io`-URL aus dem Container ist wegen DNS-/Netzwerkrestriktionen dieser Laufzeit nicht möglich; der erfolgreiche GitHub-Pages-Deploy und dessen Build-Artefakt sind dagegen direkt verifiziert.

## Soll-So-Referenz
- 6 gelieferte Soll-So-Referenzen werden lokal als visuelle Arbeitsgrundlage erhalten.
- Produktionsassets der Startseite basieren auf der gelieferten Startseitenreferenz; die Oberfläche selbst ist echtes HTML/CSS/JavaScript.
- Die aktuelle Startseite bleibt die verbindliche Designsprache für alle weiteren Routen.

## Routen
- 28 bestehende Haupt-Routen aus dem früheren Projektstand rekonstruiert; siehe `data-routes.json`.
- Keine Route wurde erfunden, entfernt oder umbenannt.

## Fertigstatus
### Startseite (`home`)
Status: **implementiert und als Baseline auf GitHub gesichert**.

Tatsächlich vorhanden:
- responsiver Header und Hauptnavigation
- bilddominanter Hero nach Soll-So-Komposition
- Login-/Registrierungsdialog mit lokalem Entwicklungszustand
- sechs Schnellzugriffe
- News-/Update-Bereich
- Plattformzahlen und Community-Bereich
- Footer + lokale Newsletter-Demo
- globale Routensuche
- Hash-Routing für alle 28 registrierten Routen

Browserstatus:
- vorhandene echte Desktop-/Mobile-Browser-Screenshots des Baseline-Designs bleiben lokal erhalten.
- ein erneuter Chromium-/Playwright-Lauf nach dem GitHub-Deploy wurde versucht, aber durch die Laufzeit mit `ERR_BLOCKED_BY_ADMINISTRATOR` sowohl für `http://127.0.0.1` als auch für `file://` blockiert.
- direkter lokaler HTTP-Server-Test liefert weiterhin HTTP 200; `node --check app.js` besteht.
- Wegen der Browserrestriktion wird kein neuer Browser-Test fälschlich als bestanden dokumentiert.

### Noch nicht fertig
Die übrigen 27 Routen sind im Routing vorhanden, aber noch nicht als vollständige Fachseiten fertiggestellt. Sie bleiben so lange offen, bis Implementierung und die jeweils möglichen technischen/visuellen Prüfungen erfolgt sind.

## Nächstes Arbeitspaket
1. Datenbank/Katalog aus dem vorhandenen R18.3-Projektstand rekonstruieren und funktional integrieren.
2. Danach interaktive Karte aus den vorhandenen Karten-/Marker-Daten.
3. Anschließend Builds/Build-Planer und Techwerkbank.
4. Weitere Routen systematisch vollständig ausbauen.
