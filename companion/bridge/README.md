# Bridge-Adapter (Browser-Foundation)

Implementiert in `live-game-telemetry.js`: `create()`, `connect(port)`, `normalize()`, `disconnect()`. Die bereits bestehende Karte subscribiert normalisierte Snapshots; rohe Bridge-Nachrichten erreichen den Renderer nicht. Kein zweiter Renderer oder Auth-Client.

**Hier wird kein Server, kein nativer/proprietärer Game Reader und kein Hintergrunddienst installiert.** Der Browser-Transport ist vorbereitet und mit einem synthetischen Protokollpartner geprüft; eine echte externe Companion-Verbindung ist NICHT VERIFIZIERT. Die Produktivoberfläche bietet ausschließlich Verbindung/Trennen und Kalibrierung, keine Simulationscontrols.

Anforderungen an einen künftigen, separat zu beauftragenden Publisher:

1. Bind ausschließlich `127.0.0.1`, nie `0.0.0.0`/externes Interface. Keine externen IP-Verbindungen.
2. WebSocket-Origin strikt gegen ausdrücklich zugelassene lokale/Web-App-Origins prüfen; kein `*`. Loopback allein authentifiziert den lokalen Prozess nicht. Keine fremden Origin-Angaben als Freigabe akzeptieren.
3. Eigene Reader-/Game-API-Quelle, Spielbetrieb, Szenario-ID, Achsen, Heading, Timestamp und Einheiten offiziell/nachprüfbar belegen. Keine Speicherzugriffe oder Prozessmanipulation in dieser Foundation.
4. Strikt Protokoll v1, bounded Frames/Frequenz und Heartbeat. Nur gemessene Felder publizieren; fehlende Positions-/Richtungsdaten null, keine erfundenen Werte.
5. Keine Supabase-Sessions oder Credentials, keine Aktionen/Automatisierung in Richtung Spiel, keine Rohdatenhistorie.
6. Browser-Mixed-Content-/Local-Network-Schutz unter dem tatsächlich benutzten Browser/Origin separat testen. Nicht SSL, Origin- oder Sicherheitsprüfungen abschalten, um eine Verbindung zu erzwingen.

Browserstart: Companion im Karten-Statusfeld öffnen, Port → VERBINDEN. Browserstop: TRENNEN oder Seite verlassen. Ein echter zukünftiger Server benötigt eigene Start-/Stop-Anweisungen; solche werden hier mangels Serverprozess ausdrücklich nicht behauptet.

Tests: `node tests/live-game-telemetry.cjs` verwendet deterministische Uhr und FakeSocket. `node tests/live-game-companion.cjs` nutzt echten Chromium-WebSocket-Client mit Playwright-geroutetem synthetischem Peer. Beides ist Simulation, kein Game-End-to-End-Nachweis.
