# LIVE GAME COMPANION — prüfbarer Tatsachenaudit

Datum: **08.10.2026 (Europe/Berlin)**. Arbeitsbranch ausschließlich `admin-editor-preview`.

- Ausgangs-HEAD lokal und remote: **`ed896ccc0a38bcf39af124bef0577175f1ec342f`**. Worktree vor diesem Block clean.
- End-HEAD: **der Hinzufügen-Commit dieses Auditberichts**, eindeutig auflösbar mit `git log --diff-filter=A -1 --format=%H -- docs/LIVE_GAME_COMPANION_FOUNDATION_20261008.md`. Seine ausgeschriebene SHA wird im Abschlussbericht genannt. Der Bericht kann seine eigene Commit-SHA nicht als Literal enthalten, ohne diese zu verändern.
- `main` unverändert: **bestätigt**, **`94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`**, Remote vor Beginn und vor dem Commit geprüft; die zusätzliche Prüfung nach Push wird im Abschluss gemeldet.
- **Echte Telemetrie vorhanden: NEIN. Proprietärer/native Game Reader vorhanden: NEIN. Companion-Server vorhanden: NEIN.**
- Keine Produktionsdaten geändert, keine Migration, keine zusätzliche Runtime/Dependency, keine Änderungen an Supabase/RLS/Storage, Assetimport/CMS, Profil, Katalog oder anderen Websitebereichen.

## Preview-Befund

Der Auftrag liefert als Nutzerbeleg `net::ERR_ABORTED 429 (Too Many Requests)` bei JS/CSS von `rawcdn.githack.com`. Dies ist ein Auslieferungs-/Rate-Limit-Befund, kein Beleg eines Anwendungscodefehlers. Kein Umbau von `app.js`/Boot als angebliche 429-Reparatur. Githack ist aus dieser Cloud nicht abrufbar; eine öffentliche Preview ist **NICHT VERIFIZIERT**.

Die neue Browserprüfung läuft über echten lokalen HTTP auf **`http://127.0.0.1:4223/index.html#/map`**. Der Testserver startet/endet mit dem Testprozess und ist kein dauerhaft veröffentlichter Zugang. Auth/Supabase sind bestehende Testfixtures; keine produktive Anmeldung. Bestehende Kartenregressionen haben eigene lokale HTTP-Ports. Für eigene lokale Arbeit ist `python -m http.server 5500 --bind 127.0.0.1` in `companion/README.md` dokumentiert; Port 5500 ist eine Anleitung, kein behaupteter laufender Dienst.

## A/B/C — implementierte Aussagen und Belege

| A: Tatsächlich implementiert | B: Datei/Funktion | C: Testbeleg | Grenze / Status |
| --- | --- | --- | --- |
| Normierter, unveränderlicher In-Memory-Snapshot mit allen elf geforderten Feldern | `live-game-telemetry.js`: `blank()`, `normalize()`, `create()` | `tests/live-game-telemetry.cjs`: Formate, Enums, Pflichtfelder, Freeze | Eigener Datenvertrag, keine Spiel-API |
| Wechselbare none/simulator/local-companion-Zustände; Overwolf nur reservierter Quellwert | `create()`, `simulator()`, `connect()`, `disconnect()` | Provider-/Loopback-/Production-Origin-Prüfungen | Kein Overwolf-Adapter/SDK, keine echte Quelle |
| Nur Loopback-Port; JSON-, Versions-, Finite-, Zeit- und Monotonievalidierung | `connect()`/`normalize()` | FakeSocket- und Chromium-Protokolltests | Browser kann die Herkunft eines lokalen Publisherprozesses nicht authentifizieren |
| Heartbeat, Handshake-Timeout, Pose-Expiry und begrenzter Backoff | `create()` Timer/Generationsschutz | Deterministische Uhr: lost/reconnect/stop, near-stale expiry | Kein realer Companion-Server nachgewiesen |
| Pin/Pfeil und CSS-Positionsinterpolation innerhalb derselben `#lmPlane` | `live-map.js`: `updatePlayer()`; `live-map.css`: `.lm-player`, `.lm-player-heading` | Browser: Mittelpunkt, 0/90/180/270, gleiche Plane, Reduced Motion | Simulation/Publisherdaten eindeutig unverifiziert; kein zusätzlicher Player-RAF |
| Zentrale affine Transformation und Richtungsvektor mit tatsächlichem Plane-Seitenverhältnis | `calibrate()`, `project()`, `heading()` | Vier synthetische Referenzen, Rangfehler, Residuen, Aspect-Test | Kein verifiziertes reales Game-Koordinatensystem |
| Kalibrierungsdialog, 4–50 explizit bestätigte Referenzen, RMS/max Residuum | `live-map.js`: `calibrationFor()`, `openCalibration()` | Browser: drei Punkte abgewiesen, vier gespeichert, Reload | Bestätigung ist Benutzerangabe; Residuum beweist keine reale Genauigkeit |
| Follow/Center im bestehenden Zoom-/Pan-Controller, Drag/Wheel/Reset lösen Follow | `centerPlayer()`, `userInteraction()`, bestehende Pointer/Wheel-Binder | Browser: Follow, neue Probe, Drag/Wheel, explizites Center, Expanded | Bei Clamp an Kartenrändern ist perfekte Zentrierung geometrisch nicht immer möglich |
| Manueller Szenariowechsel bleibt Master | `state()`/Bind-Szenariowahl, `updatePlayer()` Szenariogate | Browser: manibus-Wechsel und abweichendes Publisher-Szenario | Keine automatische Szenariosynchronisierung |
| Temporärer Routenstart und nächste geordnete Station im aktuellen Szenario | `.lm-player-start`, `updatePlayer()` | Browser: tatsächliche sichtbare SVG-Linie, Stationklasse, Draft unverändert | Kein automatischer Stationsfortschritt oder gespeicherter Spielerstart |
| Distanzgate für ausgewählten/nächsten sichtbaren/ nächsten Routenmarker | `distance()` und Dialogauswertung in `updatePlayer()` | Unverifizierte Quelle/Marker/Simulator abgewiesen; synthetischer 3-4-5-Test | **Aktuell alle drei Anzeigen NICHT VERIFIZIERT**, da echte Quelle fehlt. Keine Meter aus Prozenten |
| Keine Wiederherstellung von Rohpose/Verbindung nach Reload | `create()` Default none, `pagehide` Cleanup; benutzerspezifische statische Referenzen über `JMA_STORE` | Browser: Reload OFFLINE, Pin verborgen; nur Kalibrierung bleibt | Bewusst gespeicherte Kameraansicht bleibt bestehender Kartenmechanismus; keine Telemetriehistorie |

## Koordinatenbestand und Kalibrierung

`archive-data.js` enthält **vier** Archivmarker (Silo 08/PSI/EX1/Delta); alle `gameX/gameY` sind leere Strings. Numerische Kartenprozente allein sind keine Kalibrierung. Anzahl vorhandener vollständiger Archivpaare **0**. Beleg: VM-Inspektion des realen Datenmodells und Browserassertion. Daten/Markertexte werden nicht umgeschrieben. Eigene bestehende Marker mit vollständigem Zahlenpaar können als unbestätigte Vorschläge im Kalibrierungsdialog erscheinen; niemals automatisch als verifiziert übernehmen.

Die affine Abbildung hat sechs Parameter. Mindestens vier nicht kollineare, bestätigte Referenzen; zentrierte/skalierte Least-Squares-Lösung mittels pivotierter Elimination, Prüfung auf Rang-/Flächenverlust. Restfehler in Karten-Prozentpunkten. Keine erfundenen Min/Max-Weltkoordinaten, kein angenommener Maßstab, keine umgewandelten Pseudometer. Fehlende Kalibrierung, anderer Szenariobezeichner oder außerhalb liegende Projektion erlauben keinen aktuellen Pin. Die gespeicherte Bildbindung prüft den Assetpfad, keinen Inhaltshash; bei Austausch derselben Bilddatei müssen Referenzen manuell neu bestätigt werden. Ein vorheriger Pin kann als letzte **unverifizierte**, ausgegraute Anzeige stehenbleiben; Simulationsherkunft bleibt erhalten.

Heading-Konvention ist ausdrücklich **unser Protokoll** (0 = Game +Y, 90 = +X, clockwise). Native Once-Human-/Overwolf-Heading-Konvention **NICHT VERIFIZIERT**. Der zukünftige Adapter müsste diese nachweisen und konvertieren. Der Pfeil berücksichtigt die Kalibrierungsachsen und das gemessene Bildseitenverhältnis; fehlendes Heading blendet ihn aus.

## Architektur / Protokoll / Sicherheit

Ein zusätzlicher gekapselter Browser-Helper `live-game-telemetry.js`, vor `live-map.js` geladen. Bestehende Karte und Controller bleiben Master. Keine zweite Karte, kein zweiter Zoom-/Pan-/Follow-Controller, kein zusätzlicher Player-RAF, keine zweite Persistenzarchitektur. Subscription wird bei jedem Controller-Dispose entfernt; same-scenario Rerenders behalten Sitzung/Follow, Szenario-/Benutzerscopewechsel verwerfen den alten projizierten Pin. Normale und Expanded-Ansicht besitzen dieselben Nodes.

Loopback-Endpunkt literal `ws://127.0.0.1:<1024–65535>`. Nachricht maximal 16 KiB, Version 1, Whitelistmodell, X/Y zusammen Zahl oder null, Z/Heading nullable, NaN/Infinity/numerische Strings abgewiesen. Epoch-Millisekunden ≤5 s alt, ≤2 s voraus, monoton pro Verbindung. Bei gestopptem Spiel/lobby/death keine aktuelle Pose. Outbound nur ping/version/timestamp, keine Supabase-Tokens oder Spieleingaben. Heartbeat 1,5 s, Frische-/Handshake-Timeout 5 s; Retry 500 ms → max. 10 s, Reset nach validem Paket. Explizites Trennen invalidiert Timer/Generationen.

`getInfo().verifiedSource` bleibt **für jeden Foundation-Provider false** und kann nicht per Payload gesetzt werden. Auch ein `accuracy:"exact"`-Publisher kann keine echte Quelle vortäuschen. LIVE VERBUNDEN wird derzeit nie gemeldet. SPIEL ERKANNT bedeutet nur eine unverifizierte Publisherangabe; Dialog zeigt Game Reader NICHT VORHANDEN, Quelle NICHT VERIFIZIERT und scene. Kein automatisches Aktivieren einer produktiven Simulationsoberfläche: Simulator nur auf lokalen DEV-/Test-Origins, keine Produktionscontrols.

Dokumentation/Schema: `companion/README.md`, `companion/protocol/README.md`, `companion/protocol/telemetry-v1.schema.json`, `companion/bridge/README.md`. Das Schema ist Dokumentation; Runtime-Validierung erfolgt zentral in `normalize()`. Es ist kein Once-Human-API-Schema. Die Bridge-Struktur liefert den Browser-Adapter und Anforderungen für einen zukünftigen Server, **keinen angeblich schon vorhandenen Dienst**.

## D — tatsächlich im Browser geprüft

Chromium auf Linux, echte lokale HTTP-Auslieferung. Browserhandlungen mit Playwright gesteuert: Kalibrierungsform, Follow/Center, Pointer-Drag/Wheel, Szenariowahl, Expanded/Close, native Touchbetätigung der neuen Controls, Reload und Reduced Motion. Positionen/Heading sind DEV-Simulationswerte. Der WebSocket-Client im Chromium wird mit einem **Playwright-gerouteten synthetischen Protokollpartner** geprüft, kein Spiel und kein externer Bridgeprozess.

Manuelle visuelle Kontrolle der erzeugten Chromium-Screenshots bei **1920×1080 und 390 px**: ein Pin in bestehender Plane, Status/Quellwarnung, lesbare Controls/Dialog, kein horizontaler Overflow. Das ist eine Bildprüfung, **kein manueller Spieltest und keine physische Bedienung eines echten Games**. Zusätzliche native Touch-/Pinch-/Marker-/Expanded-Prüfungen in unveränderten Kartenregressionen.

## E/F — ausdrücklich nicht geprüft; Simulation gegenüber echter Telemetrie

**NICHT VERIFIZIERT:** reale Once-Human-Position, echte native Blickrichtung/Achsen/Einheiten, Szenario-ID-Zuordnung einer offiziellen Game-API, echte Weltkalibrierung, Overwolf-GEP-Capabilities, Windows-Companionprozess, lokaler Game Reader, tatsächlicher externer WebSocket-Server, Mixed-Content-/Private-Network-Verhalten auf RawCDN im Nutzerbrowser, offizielle Anti-Cheat-/Spielerlaubnis, Safari/Firefox/physisches Mobilgerät, öffentlich ausgelieferte Githack-Preview.

Simulation: alle testweisen X/Y/Heading und angeblichen Game-Zustände, FakeSocket/Clock in Node, gerouteter Protokollpartner und Auth/Supabase-Fixtures in Chromium. Echt geprüft: eigene Validierungs-/Timer-/DOM-/Gesten-/Transformationsimplementierung, lokales HTTP, CSS/Geometrie und Bytegleichheit des Archivmarkerbestands. **Echte Game-Telemetrie: NEIN.**

## G/H/I — externe API, nachgewiesene Daten und noch fehlende Fähigkeiten

- Externe **Game-/Overwolf-API tatsächlich verwendet: KEINE**. Die Foundation verwendet nur Browser-WebSocket/DOM und bestehende lokale Karten-/Store-Schnittstellen. Keine neue produktive Supabase-Operation.
- Nachweislich von einer externen Game-API gelieferte Daten: **KEINE**. Eine Bridge-Nachricht ist kein Nachweis eines Game Readers.
- Offizielle Rechercheziele: `https://dev.overwolf.com/` und `https://www.oncehuman.game/`. Abrufversuch **08.10.2026**, Cloud-Proxy antwortet **403 Forbidden**. Inhalt/Capabilities/Freigaben **NICHT VERIFIZIERT**; diese URLs werden nicht als Fähigkeitsbeleg ausgegeben. Keine Drittanbieter-Aussage und keine Annahme wird als offizielle Freigabe dargestellt.
- Noch nicht vorhanden: echter zulässiger Provider/Reader, serverseitige Bridge, belegte Game-Koordinaten-/Heading-/Einheitendefinition, unabhängig verifizierte Kalibrierung, verifizierte Distanzen/echter LIVE-Status, automatische Szenariosynchronisierung und automatischer Routenfortschritt.
- Zukünftige Bridge benötigt Loopback-Bind und strikte Originprüfung. Clientseitige Loopback-Einschränkung ersetzt keine Authentifizierung des lokalen Prozesses. Vor echtem Provider eigener Nachweis-/Freigabeblock erforderlich.

## Fair-Play-Grenzen dieses Codes

Kein Lesen/Schreiben von Spielprozessspeicher, keine DLL-Injection, keine Prozessmanipulation oder Anti-Cheat-Umgehung. Keine Spielinputs, Makros, automatisierte Bewegung, Looting oder Farming. Beleg: neue Runtime ist ausschließlich Browser-JS/DOM/WebSocket; Companionverzeichnis besteht aus Protokoll/Dokumentation. Keine nativen Binaries/Reader/Automationsschnittstellen. Diese eigenen Implementierungseigenschaften sind **keine Behauptung über offizielle Erlaubnis** für einen zukünftigen Reader.

## Tests / geänderte Dateien / Reproduktion

**368 Prüfungen bestanden, sieben Prozesse Exit 0:** 61 Telemetrie-Unitchecks, 45 neue Chromium-Companionchecks, 51 kanonische Kartenchecks, 123 Desktop/Mobilchecks, 36 Fly-by-Checks, 2 Bewegungsqualitätsassertions und 50 Navigations-/Kartenchecks. JavaScript-Syntax, JSON-Schema-Parsing und `git diff --check` ebenfalls erfolgreich. Produktions-Schreiboperationen: **0**. Die neue Dialogprüfung misst mindestens **44×44 px** einschließlich Schließen. Die anfangs beobachtete 1px-Mobileabweichung des Unicode-Pfeils wurde mit einem CSS-Chevron behoben; der bestehende exakte Mobilvergleich blieb unverändert.

Neue Tests: `tests/live-game-telemetry.cjs`, `tests/live-game-companion.cjs`. Kartenregressionen bleiben erhalten. `tests/map-flyby.cjs` erhält nur einen optionalen `MAP_REGRESSION_BASE`, damit der unveränderte Layoutvergleich den **aktuellen Ausgangs-HEAD** verwenden kann; historischer Default/Assertions bleiben erhalten. Dessen Default zeigt auf einen Stand vor bereits abgeschlossenen Desktop-/Expanded-Arbeiten und ist keine passende Referenz für diesen neuen Block. Keine Assertions deaktiviert oder Prozenttoleranzen erweitert.

Geändert: `live-game-telemetry.js`, `live-map.js`, `live-map.css`, `index.html` (Script/Cacheversionen), `companion/README.md`, `companion/protocol/README.md`, `companion/protocol/telemetry-v1.schema.json`, `companion/bridge/README.md`, beide neuen Tests, oben genannter Baseline-Parameter im Fly-by-Test und dieser Bericht. Keine Änderungen am bisherigen Kartencontroller-Schema, Weltbild oder Mutantenassets.

```bash
node tests/live-game-telemetry.cjs
node tests/live-game-companion.cjs
node tests/map-consolidation.cjs
node tests/map-desktop.cjs
MAP_REGRESSION_BASE=ed896ccc0a38bcf39af124bef0577175f1ec342f node tests/map-flyby.cjs
node tests/map-flyby-motion.cjs
node tests/navigation-map.cjs
```

Vorhandene Cloud: Playwright über `CODEX_PRIMARY_RUNTIME_NODE_MODULES`; System-Chromium `/usr/bin/chromium`. Die vorhandenen Regressionen erwarten `/tmp/once-human-chrome/opt/google/chrome/chrome`; dafür wurde außerhalb des Checkouts ein Symlink auf das installierte Chromium erstellt (`mkdir -p /tmp/once-human-chrome/opt/google/chrome`, anschließend bei fehlendem Executable `ln -s /usr/bin/chromium /tmp/once-human-chrome/opt/google/chrome/chrome`). Keine neue Dependency oder Abschaltung von TLS-/Sicherheitsprüfungen. Syntaxchecks, JSON-Parsing und `git diff --check` separat ausführen. HTTP-Testserver/Browser werden nach Testende geschlossen.

Ignorierte Artefakte: `test-results/live-game-companion/results.json`, `1920.png`, `390.png`, `390-dialog.png`, bestehende Kartenregressionsartefakte. Keine Testpose, Credentials oder Originalassets committed.

**Ende dieses Blocks nach bestandener Validierung, Commit und GitHub-Sync. STOPP. Kein echter Telemetrie-/Produktionslauf durch Codex.**
