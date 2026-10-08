# Once Human Archiv — Live Game Companion

Stand 08.10.2026. Die bestehende Website-Karte bleibt die einzige Karten-Engine. Die Foundation aus `live-game-telemetry.js` ist jetzt um zwei reale lokale Komponenten ergänzt:

1. **Loopback-Bridge** in `companion/bridge/server.js`.
2. **Overwolf-Native-Provider** in `companion/overwolf/`, der ausschließlich öffentlich dokumentierte Once-Human-GEP-Daten nutzt.

## Was jetzt tatsächlich funktioniert

- Die Website kann sich wie bereits vorgesehen mit `ws://127.0.0.1:8787` verbinden.
- Die Bridge läuft real als lokaler Node-Prozess, bindet nur `127.0.0.1`, prüft Browser-Origins und verlangt für Provider-POSTs einen Bearer-Token.
- Der Overwolf-Provider erkennt Once Human (Game-ID 23930), registriert `gep_internal`, `game_info`, `match_info` und sendet den dokumentierten Szenenstatus an die Bridge.
- Das Overwolf-Fenster kann die bestehende lokale `#/map`-Seite als In-Game-Overlay anzeigen; Standardhotkey `Shift+F9`.
- Die Bridge sendet niemals erfundene X/Y/Z-/Heading-Werte.

## Was weiterhin NICHT vorhanden ist

Die öffentlich dokumentierte Once-Human-GEP-Schnittstelle liefert aktuell keine Spielerposition und kein Heading. Deshalb gibt es weiterhin **keine verifizierte Live-Spielerposition**. Der vorhandene Player-Pin, Follow-Modus und die Distanzlogik werden erst nutzbar, wenn eine separat zulässige und nachgewiesene Positionsquelle vorhanden ist.

Kein Spielspeicher-Reader, keine DLL-Injection, kein Anti-Cheat-Bypass, keine Automatisierung.

## Schnellstart unter Windows

### Variante A — per Hand

Terminal 1 im Repository:

```bat
py -m http.server 5500 --bind 127.0.0.1
```

Terminal 2:

```bat
node companion\bridge\server.js
```

Die Bridge zeigt beim Start einen zufälligen **Provider token** an. Diesen Token nur lokal verwenden und in die Overwolf-Companion-Einstellungen eintragen.

Website:

```text
http://127.0.0.1:5500/index.html#/map
```

In der Website-Karte: **Companion → Port 8787 → COMPANION VERBINDEN**.

### Variante B — Starter

`companion\start-local.cmd` startet lokalen Website-Server und Bridge in getrennten Fenstern. Voraussetzungen: Python (`py`) und Node.js im PATH.

## Overwolf

Siehe `companion/overwolf/README.md`.

Kurzfassung:

1. Overwolf Developer Client installieren.
2. `companion/overwolf/manifest.json` als unpacked App laden.
3. Bridge-Token in den Companion-Einstellungen speichern.
4. Once Human starten.
5. `Shift+F9` toggelt die lokale Archivkarte im Spiel.

Die Overwolf-App nutzt nur offizielle APIs für Spielprozessstatus, GEP-Szene, Match-Events, lokale HTTP-Kommunikation und Fenster/Hotkeys.

## Sicherheit

- Bridge bindet nur `127.0.0.1`.
- Website-WebSocket akzeptiert standardmäßig nur `http://127.0.0.1:5500` und `http://localhost:5500` als Origin.
- Zusätzliche lokale Origins nur explizit über `JMA_BROWSER_ORIGINS` konfigurieren.
- Provider-Endpunkt braucht `Authorization: Bearer <token>`.
- Keine Supabase-Tokens oder Website-Sessions im Companion-Protokoll.
- Keine Rohpose wird gespeichert.
- Position und Heading bleiben `null`, solange keine nachgewiesene Positionsquelle existiert.

## Tests dieses Companion-Blocks

Lokal in der Arbeitsumgebung ausgeführt:

```text
node tests/companion-bridge.cjs
node tests/companion-overwolf.cjs
```

- 8 Bridge-Protokoll-/Sicherheitschecks.
- 9 synthetische Overwolf-Providerchecks.
- JS-Syntax und Manifest-JSON statisch geprüft.

Der echte Overwolf-Windows-Client und Once Human selbst können in der Cloud-Arbeitsumgebung nicht gestartet werden. Ein echter Windows-End-to-End-Lauf bleibt deshalb ausdrücklich offen.
