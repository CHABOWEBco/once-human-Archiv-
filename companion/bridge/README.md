# Once Human Archiv — lokale Loopback-Bridge

`server.js` ist der reale lokale Transport zwischen der bestehenden Website-Karte und einem zulässigen lokalen Provider.

## Start

```bat
node companion\bridge\server.js
```

Standard:

- Bind: `127.0.0.1`
- Port: `8787`
- Browser-WebSocket: `ws://127.0.0.1:8787` (kompatibel mit der bestehenden Website; `/telemetry` wird ebenfalls akzeptiert)
- Health: `http://127.0.0.1:8787/health`
- Provider: `POST http://127.0.0.1:8787/provider`

Beim Start erzeugt die Bridge standardmäßig einen zufälligen Provider-Token und gibt ihn im Terminal aus.

Optional:

```bat
set JMA_BRIDGE_PORT=8787
set JMA_BRIDGE_TOKEN=MEIN_LOKALER_TOKEN
set JMA_BROWSER_ORIGINS=http://127.0.0.1:5500,http://localhost:5500
node companion\bridge\server.js
```

## Browser-Sicherheit

Der WebSocket akzeptiert nur explizit konfigurierte Browser-Origins. Remote-Interfaces werden nicht gebunden. Ein Browser von einer fremden Origin erhält HTTP 403 beim Upgrade.

## Provider-Sicherheit

`/provider` ist nur über Loopback erreichbar und benötigt:

```text
Authorization: Bearer <JMA_BRIDGE_TOKEN>
```

Aktuell akzeptiert die Bridge zwei eng begrenzte Provider-Typen:

- `overwolf-gep`: offizielle Overwolf-GEP-Prozess-/Szeneninfos.
- `windows-window`: private Windows-Overlay-Erkennung; meldet ausschließlich `gameRunning`, Szene bleibt immer `unknown`.

Beispiel Overwolf:

```json
{
  "provider": "overwolf-gep",
  "gameRunning": true,
  "scene": "ingame",
  "events": ["match_start"]
}
```

Zulässige Szenen: `unknown`, `lobby`, `ingame`, `death`.

Zulässige Events: `knockout`, `level_up`, `match_start`, `match_end`, `death`.

`windows-window` darf keine Position, kein Heading und keine Spielszenen behaupten. Etwaige X/Y/Z-/Heading-Felder werden wie beim Overwolf-Provider nicht in das Website-Protokoll übernommen.

**X/Y/Z/Heading aus einem `overwolf-gep`-POST werden absichtlich nicht übernommen**, weil die öffentliche Once-Human-GEP-Dokumentation diese Daten nicht bereitstellt.

Die Website erhält daher für diesen Provider:

```json
{
  "connected": true,
  "source": "local-companion",
  "gameRunning": true,
  "scene": "ingame",
  "scenario": null,
  "x": null,
  "y": null,
  "z": null,
  "heading": null,
  "accuracy": "unknown"
}
```

Der Zeitstempel wird von der Bridge frisch und monoton erzeugt.

## Heartbeat

Die vorhandene Website sendet Protokoll-v1-JSON-Pings. Die Bridge antwortet mit einem `pong` und demselben Timestamp. Zusätzlich wird alle zwei Sekunden ein aktueller Snapshot versendet. Ein Provider gilt nach fünf Sekunden ohne Update als veraltet.

## Grenzen

Dies ist kein Game Reader. Der Server öffnet keinen Spielprozess, liest keinen Speicher und schreibt nichts ins Spiel. Er automatisiert keine Eingabe und umgeht kein Anti-Cheat.
