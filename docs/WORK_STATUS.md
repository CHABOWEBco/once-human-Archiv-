# Once Human Archiv – Arbeitsstatus

## Verifizierter Ausgangsstand
- Repository: `CHABOWEBco/once-human-Archiv-`
- Branch: `main`
- geprüfter HEAD vor Neubau: `4f9974f682355be08731ee76847a548d54453455`
- Repository-Inhalt bei Prüfung: nur `README.md`
- GitHub-Pages-Lauf des Initialstands: erfolgreich
- Schreibversuch über aktuellen GitHub-Connector: 403 `Resource not accessible by integration`; Repository dadurch unverändert.

## Soll-So-Referenz
- aktuelle Datei: `Soll So(2)(2).zip`
- 6 PNG-Referenzen, je 1672×941
- Produktionsassets der Startseite sind Bildausschnitte aus der gelieferten Startseitenreferenz; UI selbst ist echtes HTML/CSS/JS.

## Routen
28 bestehende Haupt-Routen aus den früheren Projektdateien rekonstruiert. Siehe `data-routes.json`.

## Aktuelles Arbeitspaket
### Startseite
Status: implementiert, Browserprüfung noch ausstehend.

Umgesetzt:
- responsiver Header und Hauptnavigation
- bilddominanter Hero nach Soll-So-Komposition
- echtes Login-/Registrierungs-UI mit lokalem Entwicklungszustand
- sechs Schnellzugriffe
- News-/Update-Bereich
- Plattformzahlen
- Community-Bereich
- Footer + lokale Newsletter-Demo
- globale Routensuche
- 28 Routes im Hash-Router, Browser-Zurück/Vorwärts und reload-sicher für GitHub Pages

### Nicht als fertig markiert
Alle übrigen 27 Routen sind nur im Routing registriert und bekommen erst nach Fachlogik-/Browserprüfung den Status „fertig“.

## Nächste Schritte
1. Startseite Desktop/Mobile in Chromium testen und echte Screenshots erzeugen.
2. Datenbank aus vorhandenen realen Altprojektdaten aufbauen.
3. Karte aus vorhandenen Kartendaten/Markerquellen aufbauen.
4. Danach Builds und Techwerkbank.
