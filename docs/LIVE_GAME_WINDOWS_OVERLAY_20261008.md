# LIVE GAME COMPANION — privates Windows-In-Game-Overlay — Tatsachenaudit

Datum: **08.10.2026 (Europe/Berlin)**. Ausschließlich Branch `admin-editor-preview`.

## Ausgangslage

- Ausgangs-HEAD: `2d95bbe53a5d7052a38bd258f2bd9faed5474ec4`.
- `main` vor diesem Block: `94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.
- Overwolf-Unpacked-Apps sind auf dem Nutzer-PC aktuell durch Account-/Developer-Autorisierung blockiert.
- Ziel dieses Blocks ist deshalb ausschließlich ein **privates lokales Windows-Overlay ohne Overwolf-Abhängigkeit**.
- Bestehende Website-Karte bleibt die einzige Karten-Engine.

## Tatsächlich implementiert

### Private Windows-Overlay-Route

Ordner: `companion/windows-overlay/`.

- `start-overlay.cmd`: Ein-Klick-Starter über Windows PowerShell.
- `OnceHumanArchivOverlay.ps1`: startet/verwendet den lokalen Website-Server, optional die bestehende Node-Bridge und Microsoft Edge im App-Modus.
- `OverlayNative.cs`: ausschließlich Win32-Fensterfunktionen für Erkennung, DPI, Positionierung, Topmost, Sichtbarkeit, Fokus und Hotkey-Zustand.
- `README.md`: lokale Start-/Grenzen-/Fenstermodus-Dokumentation.

### In-Game-Verhalten

- Standardhotkey: **Shift+F9**.
- Overlay startet versteckt.
- Beim Einblenden wird dasselbe `#/map` geladen und bedienbar über die Once-Human-Clientfläche gelegt.
- Beim Ausblenden wird der Fokus an das erkannte Once-Human-Fenster zurückgegeben.
- Die Overlaygröße folgt der tatsächlichen Game-Clientfläche per `GetClientRect` + `ClientToScreen`.
- Per-Monitor-DPI-Awareness wird gesetzt.
- Standardfenstergröße: 96 % der Game-Clientbreite, 94 % der Höhe; Parameter sind auf 60–100 % begrenzt.
- Edge verwendet ein dediziertes persistentes Profil unter `%LOCALAPPDATA%\OnceHumanArchiv\OverlayEdgeProfile`.

### Lokale Companion-Integration

`companion/bridge/server.js` akzeptiert zusätzlich den Provider `windows-window`.

Dieser Provider meldet ausschließlich:
- ob ein sichtbares passendes Once-Human-Hauptfenster erkannt wurde.

Er darf nicht liefern/behaupten:
- X/Y/Z,
- Heading,
- echte Spielszenen,
- Meter/Entfernungen.

Die Bridge normalisiert `windows-window` immer auf Szene `unknown` und weiterhin auf X/Y/Z/Heading = `null`.

Die Overlay-URL verwendet opt-in:
`?companion=windows-overlay&port=8787#/map`.

Nur bei diesem Query verbindet `live-map.js` einmalig automatisch die bereits vorhandene Telemetrie-Schicht mit der lokalen Bridge. Normale Browser-/Website-Aufrufe ändern ihr bisheriges Verhalten nicht.

## Sicherheitsgrenze

Nicht implementiert:
- `ReadProcessMemory`,
- `WriteProcessMemory`,
- DLL-/Code-Injection,
- `VirtualAllocEx`,
- `CreateRemoteThread`,
- Windows Hooks in den Game-Prozess,
- Anti-Cheat-Bypass,
- Makros,
- automatisierte Eingaben,
- Farming-/Looting-Automation.

Die Game-Erkennung nutzt nur normale Windows-Fenster-/Prozessmetadaten.

## Harte fachliche Grenze

**Echte Live-Spielerposition: NEIN.**
**Echtes Heading: NEIN.**
**Spieler-Pin aus realem Once-Human-X/Y: NEIN.**

Dieser Block löst das vom Nutzer gewünschte private **sichtbare und bedienbare In-Game-Kartenoverlay** ohne Overwolf. Er erfindet keine Positionsquelle.

## Tests

Automatisierbar in der Cloud:
- `tests/windows-overlay.cjs`: 23 statische Architektur-/Sicherheitschecks.
- `tests/companion-bridge.cjs`: erweitert um `windows-window`-Providervertrag.
- `node --check companion/bridge/server.js`.
- `node --check live-map.js`.

Nicht in dieser Linux-/Cloudumgebung ausführbar:
- Windows PowerShell/Win32-Runtime,
- Microsoft Edge App Mode unter Windows,
- echtes Once-Human-Fenster,
- echtes Topmost-Verhalten über dem Spiel,
- exklusives Vollbild.

Diese Punkte müssen auf einem echten Windows-PC geprüft werden. Daher wird **kein erfolgreicher Game-End-to-End-Test behauptet**.

## Nutzer-End-to-End-Test

1. aktuellen Branch `admin-editor-preview` holen.
2. `companion\windows-overlay\start-overlay.cmd` doppelklicken.
3. Once Human in Borderless/Fenstermodus starten.
4. `Shift+F9` drücken.
5. Erwartung: vorhandene Archivkarte erscheint über dem Spiel und ist bedienbar.
6. Marker/Suche/Filter/Zoom/Routen bedienen.
7. erneut `Shift+F9`.
8. Erwartung: Overlay verschwindet und Once Human erhält den Fokus zurück.
9. Falls Node.js vorhanden: Website-Companionstatus soll bei erkanntem Game-Fenster `SPIEL ERKANNT` zeigen; keine Position/Heading anzeigen.

## Branchgrenze

Nur `admin-editor-preview`. `main` wird nicht verändert.

End-HEAD ist der Commit, der diesen Bericht und die Overlay-Dateien hinzufügt; die konkrete SHA wird im Abschluss nach Push genannt.
