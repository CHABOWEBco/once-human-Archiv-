# Once Human Archiv — Overwolf Native Provider

Dieser Ordner ist eine **offizielle Overwolf-GEP-Anbindung für die öffentlich dokumentierten Once-Human-Daten**. Er liest keinen Spielspeicher und enthält keinen proprietären Reader.

## Was diese App wirklich liefert

- erkennt Once Human über Overwolf `getRunningGameInfo2()` (Game-ID 23930),
- registriert `gep_internal`, `game_info`, `match_info`,
- übernimmt den offiziell dokumentierten `game_info.scene`-Wert (`lobby`, `ingame`, `death`),
- empfängt die dokumentierten Match-Events `knockout`, `level_up`, `match_start`, `match_end`, `death`,
- sendet diesen Status über `overwolf.web.sendHttpRequest()` an die lokale Archiv-Bridge,
- stellt die bestehende lokale `#/map`-Seite als In-Game-Overlay bereit,
- schaltet das Overlay über `Shift+F9` ein/aus.

Die öffentliche Once-Human-GEP-Dokumentation enthält **keine X/Y/Z-Position und kein Heading**. Deshalb sendet dieser Provider diese Daten nicht und die Website darf daraus keinen Live-Spieler-Pin ableiten.

## Lokaler Start

1. Website im Repository starten: `python -m http.server 5500 --bind 127.0.0.1`.
2. Bridge starten: `node companion/bridge/server.js`. Den ausgegebenen Provider-Token kopieren.
3. Overwolf Developer Client installieren und `companion/overwolf/manifest.json` als unpacked App laden.
4. In den Companion-Einstellungen Port `8787`, den Bridge-Token und `http://127.0.0.1:5500/index.html#/map` speichern.
5. Once Human starten. Der Provider meldet Prozess-/Szenenstatus an die Bridge.
6. Im Spiel `Shift+F9` drücken, um die bestehende Karte als Overlay zu öffnen/schließen.
7. In der Website-Karte: Companion → Port 8787 → verbinden. Ohne autorisierte Positionsquelle bleibt der Spieler-Pin bewusst aus.

## Grenzen

Der Overwolf-Code wurde statisch/syntaktisch geprüft, kann in dieser Cloud aber nicht im echten Overwolf Windows Client ausgeführt werden. Der Game-End-to-End-Test muss auf Windows mit Overwolf + Once Human erfolgen. Das ist eine Laufzeitgrenze, keine behauptete erfolgreiche Spielprüfung.
