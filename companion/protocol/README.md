# Loopback-Protokoll v1

Dieses Protokoll ist ein **eigener Foundation-Vertrag**, keine Once-Human-/Overwolf-API. Externer Game Reader: nicht vorhanden. Beispielwerte sind synthetisch.

WebSocket-Endpunkt ausschließlich `ws://127.0.0.1:<Port>`, Port ganzzahlig 1024–65535. Keine Remote-Host-Eingabe. Browser sendet ausschließlich `{ "version": 1, "type": "ping", "timestamp": <Unix-Epoch-Millisekunden> }`. Peer antwortet `pong` mit gleichem Schema und aktuellem Timestamp. Nie Supabase-Tokens, Kontodaten, Cookies als Protokollfelder oder Spieleingaben senden.

Peer → Browser:

```json
{
  "version": 1,
  "type": "telemetry",
  "data": {
    "connected": true,
    "source": "local-companion",
    "gameRunning": true,
    "scene": "ingame",
    "scenario": "way-of-winter",
    "x": 500,
    "y": 500,
    "z": null,
    "heading": 90,
    "timestamp": 0,
    "accuracy": "estimated"
  }
}
```

`timestamp:0` ist im obigen Dokument **ein ungültiger Platzhalter**; für ein gültiges Paket die aktuelle Epoch-Zeit einsetzen. Alle Beispielkoordinaten sind Testwerte, keine behaupteten Spielorte. Quelle ist für diesen Adapter zwingend `local-companion`. Reservierte Modellquellen: `none`, `simulator`, `overwolf`; diese können nicht über den Bridge-Adapter vorgetäuscht werden.

`connected` beschreibt die Verfügbarkeit des Publishers, nicht unabhängig verifiziertes Spieltracking. `scene`: unknown/lobby/ingame/death. `scenario`: expliziter ID-String oder null; keine Synchronisierung der Website-Szenariowahl. X/Y beide echte Zahlen oder beide null; Z/Heading Zahl oder null. Koordinatenbetrag maximal 1e9 als Parser-Sicherheitsgrenze, **keine behauptete Weltgrenze**. Keine numerischen Strings, Boolean/NaN/Infinity. Bei disconnected, gestopptem Spiel oder nicht-ingame werden Pose und Accuracy verworfen.

Heading ist in diesem **normalisierten Vertrag** im Uhrzeigersinn ab Game-**+Y**, 0 ≤ heading < 360; 90 zeigt Game-+X. Die tatsächliche native Heading-Konvention eines Spiels ist NICHT VERIFIZIERT. Ein zukünftiger zulässiger Reader muss nachweislich in diese Konvention konvertieren; die Kalibrierung transformiert den Richtungsvektor ins Kartenbild. Null blendet den Pfeil aus, statt eine Richtung zu erfinden.

Maximal 16 KiB Text pro Nachricht. Valides JSON, Version 1, bekannte Typen/Enums, endliche vollständige Pflichtfelder. Zeitstempel maximal 5 Sekunden alt, maximal 2 Sekunden voraus, strikt zunehmend je Verbindung. Doppelte/alte Pakete werden ignoriert. `accuracy` ist nur eine Publisherangabe, kein Vertrauensbeweis. Unbekannte zusätzliche Felder werden nicht konsumiert oder weitergesendet.

Heartbeat alle 1,5 Sekunden; Verlust/fehlende aktuelle Pose nach maximal 5 Sekunden (aktueller Paketzeitstempel maßgeblich) invalidiert `connected`, schließt die alte Verbindung und startet Reconnect. Backoff 500 ms, 1 s, 2 s, 4 s, 8 s, begrenzt 10 s; gültige Telemetrie setzt die Versuche zurück. Auch ein nie beendeter Handshake ist auf 5 Sekunden begrenzt. TRENNEN/Seitenende invalidiert alle Generationen und Timer, keine Wiederverbindung. Reconnect startet den Monotonie-Vertrag neu, bleibt aber an die Freshness-Grenze gebunden.

`verifiedSource:false` ist derzeit für jeden Provider fest. Der Provider darf dieses Vertrauensattribut nicht per JSON setzen. Kein automatisches LIVE VERBUNDEN, keine Freigabe verifizierter Distanzen. Änderungen an diesem Gate erfordern einen späteren Auftrag und reale Quellenbelege.
