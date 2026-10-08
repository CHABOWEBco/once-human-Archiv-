# Once Human Archiv — privates Windows-In-Game-Overlay

Dieses Overlay benötigt **keine Overwolf-Developer-Freischaltung**. Es verwendet ausschließlich lokale Windows-/Browserfunktionen und die bestehende Archivkarte.

## Was es macht

- startet oder verwendet den lokalen Archiv-Webserver auf `127.0.0.1:5500`,
- startet die vorhandene lokale Companion-Bridge auf `127.0.0.1:8787`, wenn Node.js verfügbar und der Port frei ist,
- öffnet Microsoft Edge im App-Modus mit der vorhandenen `#/map`-Seite,
- erkennt das sichtbare Once-Human-Hauptfenster über Windows-Fenster-/Prozessmetadaten,
- richtet das Kartenfenster DPI-korrekt innerhalb der echten Game-Clientfläche aus,
- entfernt den normalen Edge-Fensterrahmen und hält die Karte als Topmost-Fenster über dem Spiel,
- `Shift+F9` blendet die Karte ein/aus,
- beim Einblenden ist die Karte interaktiv: Suche, Marker, Filter, Zoom, Routen usw. sind die vorhandenen Website-Funktionen,
- beim Ausblenden wird der Fokus an Once Human zurückgegeben,
- verschiebt/resized sich mit dem Game-Fenster,
- blendet sich aus, wenn kein Once-Human-Fenster erkannt wird.

Die Karte wird **nicht dupliziert**. Das Overlay lädt dieselbe lokale Website-Route.

## Start

Doppelklick:

```text
companion\windows-overlay\start-overlay.cmd
```

Danach Once Human starten bzw. geöffnet lassen und im Spiel:

```text
Shift + F9
```

Nochmal `Shift+F9` = Karte ausblenden und Fokus zurück zum Spiel.

## Voraussetzungen

Pflicht:

- Windows 10/11,
- Microsoft Edge,
- Python Launcher `py` oder `python` im PATH (für den lokalen Website-Server).

Für den automatischen Companion-/`SPIEL ERKANNT`-Status zusätzlich:

- Node.js im PATH.

Ohne Node.js funktioniert das In-Game-Kartenoverlay trotzdem; nur die lokale Bridge wird nicht automatisch gestartet.

## Fenstermodus

Für ein normales Windows-Overlay ist **randloses Vollbild (Borderless)** oder **Fenstermodus** am zuverlässigsten. Exklusives Vollbild kann normale Topmost-Windows ausblenden; das ist eine Windows-/Grafikmodusgrenze, kein Kartenfehler.

## Größen

Standardmäßig nutzt das Overlay 96 % der Game-Clientbreite und 94 % der Höhe. Optional aus einem Terminal:

```powershell
powershell -ExecutionPolicy Bypass -File companion\windows-overlay\OnceHumanArchivOverlay.ps1 -OverlayWidthPercent 90 -OverlayHeightPercent 90
```

Zulässiger Bereich wird intern auf 60–100 % begrenzt. Kein CSS-Scale-Trick: die Website selbst wird nicht skaliert; nur das native Overlay-Fenster erhält eine passende Größe.

## Persistenz

Edge verwendet ein eigenes lokales Profil unter:

```text
%LOCALAPPDATA%\OnceHumanArchiv\OverlayEdgeProfile
```

Dadurch bleiben Login-/Websitezustände und lokale Kartenwerte dieses Overlay-Browsers zwischen Starts erhalten. Rohtelemetrie wird dadurch nicht neu persistiert.

## Aktuelle harte Grenze

Dieses Overlay macht die **Karte im Spiel sichtbar und bedienbar**, liefert aber weiterhin **keine echte Spieler-X/Y/Z-Position und kein Heading**. Die öffentliche Once-Human-GEP-Schnittstelle stellt diese Werte nicht bereit. Der Windows-Overlay-Provider meldet nur, ob ein passendes sichtbares Once-Human-Fenster läuft; er liest keinen Spielspeicher.

Kein `ReadProcessMemory`, kein `WriteProcessMemory`, keine DLL-Injection, kein Code-Injection, kein Anti-Cheat-Bypass, keine Makros und keine automatisierte Spielsteuerung.
