# LIVE GAME COMPANION — offizieller Provider / lokale Bridge — Tatsachenaudit

Datum: **08.10.2026 (Europe/Berlin)**. Ausschließlich Branch `admin-editor-preview`.

## Ausgangslage

- Ausgangs-HEAD: `d17a936d043664a651313b0efca87238922b96eb` (`feat(map): add verified-boundary player telemetry foundation`).
- `main` vor dem Block: `94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.
- Die bestehende Foundation hatte Player-Layer, Kalibrierung, Follow, Distanz-Gates und einen Loopback-WebSocket-Client, aber **keinen realen Bridge-Server und keinen realen Provider**.
- Dieser Block verändert keine Website-Kartenlogik, keine Marker, keine Supabase-Daten, keine RLS-/Storage-Regeln und keine Assetbibliothek.

## Ergebnis — was real implementiert wurde

### 1. Reale lokale Bridge

Datei: `companion/bridge/server.js`.

- echter Node-HTTP/WebSocket-Prozess,
- Bind ausschließlich `127.0.0.1`,
- kompatibel mit dem bestehenden Website-Endpunkt `ws://127.0.0.1:8787`,
- explizite Browser-Origin-Allowlist,
- authentifizierter lokaler Provider-POST per Bearer-Token,
- `/health` ohne Credentials/Spielerpose,
- Protokoll-v1-Ping/Pong,
- periodische frische Telemetrie-Snapshots,
- fünf Sekunden Provider-TTL,
- keine Persistenz von Rohtelemetrie.

### 2. Reale Overwolf-Native-Provider-App

Ordner: `companion/overwolf/`.

Die App nutzt die offiziell dokumentierten Overwolf-APIs:

- `overwolf.games.getRunningGameInfo2()` für laufendes Spiel,
- `overwolf.games.events.setRequiredFeatures()` mit `gep_internal`, `game_info`, `match_info`,
- `overwolf.games.events.onInfoUpdates2` für `game_info.scene`,
- `overwolf.games.events.onNewEvents` für Match-Events,
- `overwolf.web.sendHttpRequest()` für den ausschließlich lokalen Bridge-POST,
- `overwolf.settings.hotkeys.onPressed` für den Overlay-Hotkey,
- `overwolf.windows.obtainDeclaredWindow` / `restore` / `hide` für das In-Game-Fenster.

Game-ID: **23930** (Once Human).

### 3. In-Game-Overlay

`companion/overwolf/overlay.html` lädt ausschließlich eine lokal konfigurierte URL (`127.0.0.1` oder `localhost`), standardmäßig:

`http://127.0.0.1:5500/index.html#/map`

Standardhotkey: **Shift+F9**.

Damit wird die bestehende Webkarte als Overwolf-In-Game-Fenster verwendet; es entsteht keine zweite Karten-Engine.

## Harte Grenze: Spielerposition / Heading

**Echte Live-X/Y/Z-Position: NEIN.**  
**Echtes Heading: NEIN.**  
**Proprietärer Game Reader: NEIN.**

Begründung: Die aktuelle öffentliche Overwolf-Dokumentation für Once Human listet nur:

- `gep_internal`,
- `game_info.scene` mit `lobby`, `ingame`, `death`,
- `match_info`-Events `knockout`, `level_up`, `match_start`, `match_end`, `death`.

Keine dokumentierte Position, kein Heading. Der neue Overwolf-Provider sendet deshalb keine Pose. Die Bridge verwirft außerdem etwaige X/Y-/Heading-Felder eines `overwolf-gep`-POSTs und erzeugt für diese Felder ausschließlich `null`.

Die bereits vorhandene Website zeigt somit echte Overwolf-Prozess-/Szeneninformation, aber keinen behaupteten Live-Spieler-Pin. Player-Follow/Distanz bleibt korrekt gegated.

## Sicherheitsgrenze

Nicht implementiert:

- ReadProcessMemory oder anderer Spielspeicherzugriff,
- DLL-/Code-Injection,
- Signatur-/Offset-Scanner,
- Anti-Cheat-Bypass,
- DMA,
- Makros oder automatisierte Spielsteuerung,
- automatisiertes Looting/Farming,
- versteckte Live-Ressourcen-/Gegnererkennung.

Das ist bewusst so: Once Human verbietet Cheats, unfaire Dritttools und Automatisierung, die die Spielbalance/Fairness beeinträchtigen. Aus der Existenz anderer Companion-Produkte wird keine eigene offizielle Reader-Freigabe abgeleitet.

## Tests dieses Blocks

In der Arbeitsumgebung tatsächlich ausgeführt:

### Bridge

`node tests/companion-bridge.cjs`

**8/8 Checks bestanden**:

1. Serverstart + ausdrückliche Pose-Grenze.
2. Health ohne erfundene Pose.
3. Provider benötigt Token.
4. GEP-Provider akzeptiert, Pose-Felder werden verworfen.
5. Browser erhält Spiel-/Szenenstatus.
6. X/Y/Heading bleiben null.
7. JSON-Ping/Pong kompatibel zur bestehenden Website.
8. Fremde Browser-Origin wird mit 403 abgewiesen.

### Overwolf-Adapter

`node tests/companion-overwolf.cjs`

**9/9 Checks bestanden**:

1. nur die drei dokumentierten Once-Human-GEP-Featurefamilien,
2. nur Loopback-Bridge-POST,
3. Initialstatus ohne Pose,
4. keine erfundenen Positions-/Heading-Felder,
5. dokumentierte Szene wird übernommen,
6. nur dokumentierte Match-Events,
7. unbekannte Szene überschreibt Zustand nicht,
8. Bridge-Token nur im lokalen Provider-Request,
9. Hotkey toggelt das deklarierte Overlay.

Zusätzlich ausgeführt:

- `node --check` für Bridge und Overwolf-JavaScript,
- JSON-Parse/Strukturcheck des Overwolf-Manifests.

**Nicht ausgeführt / nicht behauptet:** echter Windows-Overwolf-Client, echtes Once Human, tatsächliche GEP-Laufzeitdaten auf dem Nutzer-PC, In-Game-Overlay im echten Spiel. Diese Umgebung ist keine Windows-/Overwolf-Spielmaschine. Der echte End-to-End-Lauf muss lokal auf Windows erfolgen.

## Externe Tatsachenquellen — Abruf 08.10.2026

### Primär / offiziell

1. Overwolf — Once Human Game Events  
   https://dev.overwolf.com/ow-electron/live-game-data-gep/supported-games/once-human/  
   Belegt Featurefamilien, Szene und die fünf Match-Events; keine Position/Heading dokumentiert.

2. Overwolf — `overwolf.web` API  
   https://dev.overwolf.com/ow-native/reference/web/ow-web/  
   Belegt lokalen HTTP-Transport via `sendHttpRequest()`.

3. Overwolf — `overwolf.windows` API  
   https://dev.overwolf.com/ow-native/reference/windows/ow-windows/  
   Belegt deklarierte Fenster sowie restore/hide.

4. Overwolf — Hotkeys API  
   https://dev.overwolf.com/ow-native/reference/settings/hotkeys-api/  
   Belegt `onPressed` und Manifest-Hotkeys.

5. Overwolf — Manifest  
   https://dev.overwolf.com/ow-native/reference/manifest/manifest-json/  
   Belegt Game-Targeting, Permissions, Windows, Hotkeys und Launch Events.

6. Overwolf offizielles Typen-Repository — Once Human ID 23930  
   https://github.com/overwolf/ow-electron-packages-types/blob/main/gep-supported-games.d.ts

7. Once Human — Fair Play Policy  
   https://www.oncehuman.game/20251127/43274_1229046.html

8. Once Human — Fair Play Announcement 30.09.2026  
   https://www.oncehuman.game/news/devBlog/20260930/40781_1315610.html  
   Belegt aktuelle Maßnahmen gegen automatisierte Scripts/Third-Party-Assistance zum Farming.

## Start / tatsächlicher Nutzer-End-to-End-Test

1. `companion\start-local.cmd` oder Website + Bridge separat starten.
2. Provider-Token aus dem Bridge-Terminal kopieren.
3. Overwolf Developer Client öffnen und `companion/overwolf/manifest.json` als unpacked App laden.
4. Token/Port/Karten-URL speichern.
5. Once Human starten.
6. Prüfen, ob Companion-Status `Once Human erkannt`, anschließend Szene `lobby`/`ingame`/`death` meldet.
7. Website-Karte → Companion → Port 8787 → verbinden.
8. `Shift+F9` im Spiel prüfen.
9. Erwartung: Spiel-/Szenenstatus echt; Player-Pin bleibt ohne separate autorisierte Positionsquelle aus.

## Schlussfolgerung

Die Companion-Infrastruktur ist jetzt nicht mehr nur Foundation: lokaler Bridge-Server, offizieller Overwolf-GEP-Provider und In-Game-Overlay sind implementiert. Die **letzte fachliche Lücke für echtes Player-Tracking ist eine zulässige Positions-/Heading-Quelle**, die die öffentlich dokumentierte Once-Human-GEP-API derzeit nicht bereitstellt. Diese Lücke wird nicht durch erfundene Offsets oder einen Anti-Cheat-riskanten Reader kaschiert.
