# Once Human Archiv — Spielerposition: Quellen- und Freigabeprüfung

**Datum:** 2026-10-09  
**Branch:** `admin-editor-preview`  
**Art:** Reiner Recherche-/Entscheidungsblock. Keine Laufzeitänderungen.

## Ausgangsstand (beobachtet)

- Lokaler Webserver `127.0.0.1:5500` und Windows-Overlay funktionieren am Nutzer-PC.
- Companion-Bridge `127.0.0.1:8787` meldet nach gezielter Portbereinigung `provider: "windows-window"`, `gameRunning: true` und Browser-Clients.
- Windows-Provider meldet absichtlich `scene: "unknown"` und **keine X/Y/Z-/Heading-Daten**. Der Website-Companion-Dialog bestätigt ausdrücklich „Game Reader: NICHT VORHANDEN“ und „NICHT VERIFIZIERT“.
- Overlay V3 (frei verschiebbare/resizable Fensterkanten) ist vom Nutzer vor Ort erfolgreich getestet. **Nicht verändern.**
- Bereits vorhanden: `live-game-telemetry.js`, bestehender Map-Pin/Follow, Kalibrierungsfunktion und `companion/bridge/server.js`. Die Karten-Engine soll nicht dupliziert werden.

## Verifizierbare externe Informationen

### Overwolf GEP — kein aktueller Positionskanal

Quelle: https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/once-human/ (abgerufen 2026-10-09).

Die offizielle Once-Human-Seite dokumentiert:

- Features: `gep_internal`, `game_info`, `match_info`.
- `game_info.scene`: `lobby`, `ingame`, `death`.
- Events: `knockout`, `level_up`, `match_start`, `match_end`, `death`.
- **Kein `location`-, Spieler-`x/y/z`- oder `heading`-Feld dokumentiert.**

**Entscheidung:** Nicht aus Szene/Match-Events künstlich Koordinaten ableiten. Das bestehende `companion/overwolf/` nur als echten Szenen-/Eventprovider betrachten.

### TH.GL — reales Tracking, Fremdintegration noch ungeklärt

- https://www.th.gl/companion-app — nennt Once Human als unterstütztes Spiel, Live-Tracking und Second-Screen-Modus. Betreiber erklärt, dass seine Anwendung von Starry Studio freigegeben sei.
- https://www.th.gl/faq/apps-bannable — Aussagen zur Freigabe sind **Betreiberangaben**, keine Freigabeerklärung für beliebige Drittsoftware.
- https://www.th.gl/faq/companion-driver-unavailable — TH.GL nennt ausdrücklich `Companion App → THGL Bridge Host → THGL Driver (kernel driver)`. Das ist eine eigene integrierte Technik, **keine dokumentierte öffentliche Player-Pose-API**.
- https://www.th.gl/faq/see-friends-on-map — Peer Link teilt freiwillig Positionen zwischen TH.GL-Nutzern; Zuschauer können einen Link öffnen. Das belegt *noch keine lizenzierte, dokumentierte Datenschnittstelle für das Once Human Archiv*.
- https://www.th.gl/partner-program — als öffentlicher Kontaktweg nennt TH.GL einen Discord und eine DM an `devleon`. Partnerprogramm bezieht sich primär auf Promotion; Datennutzung ausdrücklich gesondert anfragen.

**Rechercheergebnis:** In den öffentlich eingesehenen TH.GL-Dokumenten bislang kein autorisierter Export (HTTP/WebSocket/SDK) für externe Echtzeit-Player-Pose erkennbar. Auch Peer Link darf nicht ohne Erlaubnis reverse-engineert, gescrapt oder als inoffizielle Telemetriequelle verwendet werden. Nicht behaupten, TH.GL könne oder werde eine solche API liefern.

### Bitte um Zusammenarbeit (nur Entwurf; nicht versendet)

> Hello TH.GL team, I maintain an independent Once Human fan archive and interactive map. We already have a local, read-only game-detection bridge and an in-game browser overlay. We would love to show the *local player's own live position* on our existing map, with explicit opt-in. Does TH.GL offer a documented and licensed API, SDK, or consent-based export (e.g. from Peer Link) for player X/Y/heading that third-party maps may consume? If so, could you share integration documentation, usage limits, licensing, coordinate conventions and any requirements from Starry Studio? We do not want to inspect private APIs, copy your data, modify the game or bypass protections. Thank you!

## Sicherer technischer Integrationsplan (nur bei dokumentierter Berechtigung)

1. Quelle/Vertrag schriftlich klären: API-Doku, Rechte, zulässige Nutzungsarten, nutzerseitiges Opt-in, private lokale Verarbeitung und Rate Limits.
2. Datenbeleg: echte Samples aus **autorisierter** Quelle, Einheiten, Koordinatensystem, Welt/Szenario, Zeitstempel und Heading-Konvention.
3. Kleiner separater `position-provider`-Adapter vor der vorhandenen Bridge; keine zweite Map, kein Game-Memory-Reader, kein Umgehen von Anti-Cheat. Vorhandene `windows-window`- und `overwolf-gep`-Provider niemals zu Positionsprovidern umetikettieren.
4. Quellen-Authentifizierung, Loopback-Only, alterungs-/zeitbasierte Validierung, kein Speichern von Posen. `verifiedSource` nur nach unabhängig prüfbarer Herkunft und verifiziertem Kalibrierungs-/Transformationsnachweis.
5. Kalibrierung mit **mindestens vier** überprüften Referenzpunkten pro Kartenasset/Szenario durchführen; keine erfundenen Weltgrenzen, Entfernungen oder abgeleiteten Koordinaten.
6. Synthetische Tests zuerst; danach echter PC-Join-/Bewegungs-/Szenariowechseltest mit der explizit autorisierten Quelle.

## Alternativen, falls keine API angeboten wird

- TH.GL-App mit ihrem eigenen Live-Pin separat nutzen; **keine** automatische Datenintegration in unser Archiv behaupten.
- Benutzergeführte Standortmarkierung oder ausdrücklich erlaubter, optischer Bildschirmabgleich *nur wenn Once Human die notwendigen Koordinaten sichtbar ausgibt*; Machbarkeit und Erlaubnis gesondert prüfen.
- Bestehendes Archiv-Overlay und Companion mit `SPIEL ERKANNT` behalten; Follow/Distanz bleiben deaktiviert, bis echte Koordinaten nachgewiesen sind.

## Abnahmekriterien für den nächsten freigegebenen Block

- Quelle öffentlich dokumentiert oder vom Rechteinhaber ausdrücklich freigegeben.
- Schema/Samples nachprüfbar; Position wird beim Laufen plausibel aktualisiert.
- Kein Zugriff auf Spielprozessspeicher, keine Kernel-Treiber-Entwicklung, keine DLL-Injection oder Anti-Cheat-Umgehung im eigenen Projekt.
- Existing Overlay V3, Live-Karte, Supabase, Marker, Navigation und `main` unverändert.
- Bis dahin: **keine Codeänderungen und kein falscher LIVE-Pin**.

**Status:** Prüfrecherche abgeschlossen, externe Datenschnittstelle **NICHT BESTÄTIGT**. Nächster sinnvolle Schritt ist die Kontaktaufnahme zu TH.GL und/oder Starry Studio und die Prüfung einer schriftlich autorisierten externen Schnittstelle.
