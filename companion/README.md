# Live Game Companion — Foundation

Stand 08.10.2026. **Kein Game Reader, keine echte Spieltelemetrie und keine offizielle Spiel-/Anti-Cheat-Freigabe nachgewiesen.** Die bestehende Webkarte bleibt die einzige Karte.

Die Website lädt `live-game-telemetry.js`. `JMA_TELEMETRY` stellt unveränderliche normalisierte Snapshots, Subscription, explizites Connect/Disconnect, lokale DEV-Simulation und zentrale affine Kalibrierung bereit. Player-Pin, Richtung und Follow verwenden dieselbe `#lmPlane` und denselben Zoom-/Pan-Controller in `live-map.js`.

## Start / Stop

Für lokale Prüfung im Repository `python -m http.server 5500 --bind 127.0.0.1` starten. Die Kartenroute ist `index.html#/map`, bestehende Anmeldung erforderlich. Server mit Ctrl+C stoppen. Dieser Befehl ist eine lokale Arbeitsanweisung, kein öffentlich bereitgestellter Preview-Dienst.

Die tatsächlich ausgeführte automatisierte Browserprüfung startet selbst einen lokalen HTTP-Server auf **4223**. Bestehende Regressionen verwenden ihre eigenen Ports (4184, 4211, 4189 usw.). Auth/Supabase und der Bridge-Protokollpartner sind dabei ausdrücklich Testfixtures. Screenshots stehen ignoriert unter `test-results/live-game-companion/`.

In der Karten-Toolbar das Szenario-/Statusfeld mit ▾ öffnen: Companion → Loopback-Port (Standard 8787) → COMPANION VERBINDEN. Das startet nur den Browser-Client. **In dieser Foundation wird kein Companion-Serverprozess oder Spiel-Reader mitgeliefert.** Ohne einen separat implementierten lokalen Protokollpartner erfolgt keine Verbindung. TRENNEN beendet Socket, Heartbeat und Reconnect. Seitenverlassen/Reload beendet die alte Verbindung. Keine automatische Verbindung nach Reload.

Eine spätere Bridge muss ausschließlich `127.0.0.1` binden, zulässige Browser-Origins ausdrücklich prüfen und die Daten von einem separat nachgewiesenen Provider normalisieren. Ein laufender Socket allein beweist weder Spielbetrieb noch echte Position. Private Supabase-Tokens gehören nie in dieses Protokoll.

## Kalibrierung

Es gibt aktuell vier Archivmarker, alle ohne numerische `gameX/gameY`; keiner ist eine geeignete Referenz. Kein automatisches Ableiten erfundener Spielkoordinaten oder Weltgrenzen.

Companion → KALIBRIERUNG. Mindestens vier bekannte, nicht kollineare Referenzen im selben Szenario/Kartenbild, je Zeile `GameX, GameY, MapX%, MapY%`; explizit bestätigen. 4–50 Punkte, endliche Werte, Kartenprozente 0–100. Transformation: zentrierte/skalierte affine Least-Squares-Abbildung. Kollineare Spielreferenzen und kollabierte Kartenreferenzen werden abgewiesen. RMS und maximaler Restfehler in **Prozentpunkten** sind Fit-Residuen; kein Nachweis echter Spielgenauigkeit. Mit weiteren unabhängigen Referenzen praktisch validieren, beim Wechsel des Kartenbildes neu kalibrieren.

Nur bestätigte statische Referenzpunkte werden benutzerspezifisch/szenariobezogen über den bestehenden `JMA_STORE` gespeichert. Live-Payloads und Spielerkoordinaten werden ausschließlich im Speicher gehalten. Follow nutzt die vorhandene Kamera; es gibt keine Telemetriehistorie. Eine bewusst zentrierte/normal beendete Kartenansicht kann wie bisher als Kamerazustand gespeichert werden.

## Status / Grenzen

- `none`: OFFLINE, keine Position.
- `simulator`: nur localhost/Loopback-DEV-Origin; Status SIMULATION, Pin SIM. Keine Produktions-Debugoberfläche, kein echtes Spiel.
- `local-companion`: strikt `ws://127.0.0.1:<Port>`. Validiertes JSON kann eine unverifizierte Position liefern. Der angezeigte Pin ist als Quelle NICHT VERIFIZIERT gekennzeichnet. `getInfo().verifiedSource` bleibt **false**.
- `overwolf`: reservierter Modellwert, **kein Provider/SDK implementiert**. Keine öffentliche Once-Human-GEP-Funktion verwendet oder Capability behauptet.

Keine Foundation-Quelle ist als echte Game-Quelle verifiziert. Deshalb wird **LIVE VERBUNDEN derzeit nie ausgegeben**. Eine Bridge kann WARTE AUF SPIEL / SPIEL ERKANNT nach eigenem Payload melden; das ist keine unabhängige Game-Erkennung. Verbindungs-/Frischeverlust wird markiert, die letzte projizierte Position bleibt ausgegraut. Fehlende Kalibrierung, Szenariomismatch oder Projektion außerhalb des Kartenbildes verhindern eine aktuelle Playeranzeige.

Distanzen sind gesperrt, solange Provider und Markerkoordinaten nicht unabhängig verifiziert sind. `distance()` enthält den mathematischen Gate, benutzt Game X/Y und niemals Prozentkoordinaten. Ein späterer echter Provider benötigt zusätzlich einen nachgewiesenen Koordinaten-/Einheitenvertrag; die Foundation behauptet keine Meter. Aktuell bleiben alle drei Distanzanzeigen NICHT VERIFIZIERT.

Der Spieler kann temporär als Routenstart angezeigt werden; erste Station im aktuellen Szenario wird hervorgehoben. Kein automatisches Abhaken/Anlaufen von Stationen, kein Startpunkt in gespeicherten Routen. Manueller Szenariowechsel bleibt Master. Drag/Wheel/Reset lösen Follow, aktive Interaktion blockiert automatisches Zentrieren. Explizites Zentrieren/erneutes Follow ist eine Benutzeraktion. Zoom/Pan/Expanded nutzen dieselbe Instanz.

## Fair Play und Sicherheit

Der Code liest keinen Spielprozess, schreibt nicht in Spielspeicher, injiziert keine DLL und umgeht kein Anti-Cheat. Er sendet keine Spieleingaben, Makros, Bewegungs-/Looting-/Farmingaktionen. Daraus wird **keine offizielle Freigabe** für einen zukünftigen Reader abgeleitet. Zulässigkeit und tatsächliche API-Capabilities sind vor einem realen Provider anhand aktueller offizieller Quellen separat zu prüfen.

Siehe `protocol/README.md`, `protocol/telemetry-v1.schema.json`, `bridge/README.md` und den Tatsachenaudit `docs/LIVE_GAME_COMPANION_FOUNDATION_20261008.md`.
