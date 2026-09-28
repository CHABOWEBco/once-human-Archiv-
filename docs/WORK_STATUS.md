# Once Human Archiv – Arbeitsstatus

Stand: 2026-09-28

## Verifizierter Git-/GitHub-Stand
- Repository: `CHABOWEBco/once-human-Archiv-`
- Branch: `main`
- ursprünglicher Initial-Commit: `4f9974f682355be08731ee76847a548d54453455`
- gesicherter Neubau-Baseline-Commit: `b4b0018777c01dca7d7702ad2bb5ca7a48c69a9b`
- Deployment-Dokumentation der Baseline: `a601c32a7e223695295ff0604c2756bb28a0715f`
- Datenbank-Arbeitspaket auf GitHub: `9553ea440558c64d3c7594849cc8ae30a07f62ec`
- Datenbank-Tree: `acb7b32313a4ee2792efd84cdda71853749d58b6`
- `README.md` aus dem Initialstand bleibt unverändert erhalten.
- Runtime-/Review-Dateien (`http.log`, `http.pid`, `screenshots/`, `assets/reference/ref-*.webp`) bleiben bewusst außerhalb der Produktions-Commits.

## GitHub Pages
- Baseline-Deployment: erfolgreich.
- Datenbank-Deployment: Workflow `pages build and deployment`, Run `36462767796`, Commit `9553ea440558c64d3c7594849cc8ae30a07f62ec`, Ergebnis `success`.
- Normale Navigation zu lokalen oder externen URLs wird in der verfügbaren Chromium-Laufzeit durch eine Administrator-Policy (`ERR_BLOCKED_BY_ADMINISTRATOR`) blockiert.
- Für die Browserprüfung des aktuellen Arbeitsstands wird deshalb Chromium über CDP mit exakt den lokalen HTML-/CSS-/JS-Dateien befüllt. Das umgeht nur den blockierten Navigationsschritt; Renderer, DOM, Events, LocalStorage-Logik und Responsive-CSS laufen dabei im echten Chromium.

## Soll-So-/Designbasis
- Die vorhandene Startseite bleibt unverändert die visuelle Baseline.
- Die sechs gelieferten Soll-So-Referenzen bleiben lokal als Arbeitsgrundlage erhalten.
- Gemeinsame Navigation, Typografie, dunkle Flächen, Cyan-Akzente, Rahmen, Buttons, Bildsprache und Responsive-Verhalten werden auf den Fachseiten weitergeführt.
- Es wurde kein zweites Ersatzprojekt und keine neue Designbasis angelegt.

## Datenquellen
- `data-catalog.json` / `catalog-data.js`: kuratierter R18.3/R7-Katalog mit 21 konkreten Datensätzen in 14 Kategorien.
- `archive-data.js`: aus dem erhaltenen R18.3-Altprojekt extrahierte Fachbestände für Guides, Karte, Build-Planer, Techwerkbank, Blaupausen, Mods, Abweichler, Memetik, Fahrzeuge, Kreaturen, Vergleiche, Meldungen und Untersuchungsnotizen.
- Unbelegte Spielkoordinaten werden nicht erfunden. Die vier übernommenen Winter-Silo-Marker besitzen nur die im Altstand belegten internen Kartenpositionen; leere Spielkoordinaten bleiben sichtbar leer.
- Im Altstand als reine Demo-/Platzhalterdaten gekennzeichnete `seed.items` werden nicht als neuer Katalog ausgegeben.

## Routen
Die 28 rekonstruierten Routen bleiben unverändert: `home`, `dashboard`, `news`, `database`, `map`, `hunt`, `routes`, `planner`, `guides`, `patchwatch`, `secrets`, `builds`, `community`, `submissions`, `profile`, `collection`, `weapon-blueprints`, `armor-blueprints`, `armor-materials`, `deviations`, `mods`, `compare-weapons`, `compare-armors`, `memetics`, `vehicles`, `creatures`, `tech-workbench`, `exchange`.

### Aktueller Implementierungsstatus
- `home`: vorhandene Baseline, nicht neu gebaut.
- `database`: implementiert, auf GitHub gepusht und Pages-Deployment erfolgreich.
- übrige 26 Routen: lokal als eigenständige Fachseiten implementiert und im aktuellen Chromium-Test gerendert; der GitHub-Push dieses Ausbaupakets ist zum Zeitpunkt dieses Dokumentationsschritts noch ausstehend.
- Der frühere generische Entwicklungs-Platzhalter ist nur noch technischer Fallback für eine unbekannte/fehlende Renderer-ID; keine der 28 registrierten Routen fällt im Browsertest darauf zurück.

## Funktionsumfang des aktuellen Ausbaupakets
- `dashboard`: persönliche Kennzahlen und direkte Werkzeugzugriffe aus gemeinsamem LocalStorage-Zustand.
- `news`: Kategorien und aufklappbare Meldungsdetails aus dem erhaltenen Projektstand.
- `map`: sechs Szenarioebenen, vier belegte Winter-Silo-Marker, Suche/Kategorie, Marker-Details, Zoom, Drag/Pan, lokale Marker, Routenentwurf und Weitergabe an Farmrouten.
- `hunt`: aus der Datenbank übernommene Jagdziele, Priorität, Erledigtstatus, Entfernen.
- `routes`: Kartenmarker zu lokalen Routen speichern, öffnen, löschen.
- `planner`: Einsatzpläne mit Jagdziel, Build, Route, Fokus, Datum und Notiz speichern/löschen.
- `guides`: sechs übernommene Guides, Suche/Kategorie und Kapitelansicht.
- `patchwatch`: Prüfstatus/Alter der Katalogdaten plus lokale Prüfnotizen.
- `secrets`: Prüfstatusfilter und lokale Untersuchungsnotizen.
- `builds`: 12 vorhandene Planner-Slots, reale Datenoptionen soweit im Altstand vorhanden, Effektfilter, Vorlagen, Speichern/Laden/Löschen und JSON-Kopie.
- `community`: lokale Themenräume, Beiträge, Likes und Löschen; ausdrücklich kein behauptetes Server-Backend.
- `submissions`: lokale strukturierte Prüfqueue für Funde, Korrekturen, Tech-Formeln und Guide-Hinweise.
- `profile`: gemeinsamer Anmeldezustand, Anzeigename, lokaler Datenexport und gezieltes Löschen von Werkzeugdaten.
- `collection`: Favoriten/Gefunden-Status aus dem Katalog.
- Datenfachseiten: Waffen-/Rüstungsblaupausen, Rüstungsmaterialien, Abweichler, Mods, Memetik, Fahrzeuge und Kreaturen aus übernommenen R18.3-Daten.
- `compare-weapons`: drei Waffen, vier Fokusmodi und transparenter gewichteter Vergleichsindex inklusive korrekt abgeleitetem Basis-DPS.
- `compare-armors`: zwei vorhandene Referenzstufen; fehlende Werte bleiben `—` statt erfunden zu werden.
- `tech-workbench`: Reverse Engineering, Erfindungs-Materialmix und 13 feste Fertigungsrezepte mit Mengenrechnung.
- `exchange`: lokale Werkstattbeiträge für Builds/Suche/Biete und Build-Kopie; kein Echtgeld-Handel und kein behauptetes Backend.

## Durchgeführte technische Tests
- `node --check app.js`: bestanden.
- `node --check catalog-data.js`: bestanden.
- `node --check archive-data.js`: bestanden.
- `node --check routes-full.js`: bestanden.
- Renderer-Smoke-Test: 26 neue Fachrenderer vorhanden; zusammen mit `home` und `database` exakt 28/28 Routen, keine fehlende und keine zusätzliche Route.
- Echter Chromium-CDP-Render: 28/28 Routen gerendert, 0 Entwicklungs-Platzhalter, 0 Runtime-Exceptions.
- Chromium-Interaktionen bestanden: Datenbanksuche/Detail/Favorit/Jagdliste; Karte Marker/Route/Zoom/eigener Marker; 12-Slot-Build speichern; Tech-Rezeptmenge; Registrierung/Profil; globale Suche; Jagdliste; Routen speichern; Einsatzplan; Guide-/News-Details; Community; Einreichungen; Sammlung; Waffenvergleich; Tech-Erfindung; Community-Werkstatt.
- Waffenvergleich-DPS-Normalisierung wurde im Review korrigiert und danach mit unterschiedlichen DPS-/Krit-Resultaten erneut erfolgreich geprüft.
- Responsive Chromium-Test über alle 28 Routen bei 1440 px und 390 px: kein horizontaler Seitenüberlauf.
- Lokaler HTTP-Server: Projektressourcen werden weiterhin mit HTTP 200 ausgeliefert; die Browser-Policy verhindert lediglich die direkte Navigation dorthin.

## Aktuelle visuelle Prüfdateien (lokal, bewusst nicht committed)
- `screenshots/database-desktop-current.png` – 1672×2286
- `screenshots/database-mobile-current.png` – 390×6048
- `screenshots/map-desktop-current.png` – 1672×1243
- `screenshots/map-mobile-current.png` – 390×2601
- `screenshots/builds-desktop-current.png` – 1672×1139
- `screenshots/builds-mobile-current.png` – 390×3307
- `screenshots/tech-workbench-desktop-current.png` – 1672×1283
- `screenshots/tech-workbench-mobile-current.png` – 390×2545

## Noch offen vor Abschluss des Ausbaupakets
1. Lokalen Diff final prüfen und als klaren Commit sichern.
2. Exakt diesen Tree als Fast-Forward auf den dann nochmals geprüften Remote-`main` übertragen.
3. Commit/Dateien direkt auf GitHub verifizieren.
4. GitHub-Pages-Run dieses Ausbaupakets bis `success` prüfen und anschließend diesen Abschnitt mit finalem Remote-Commit/Run ergänzen.
