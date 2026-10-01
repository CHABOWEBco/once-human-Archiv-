# Kartenvergleich und Zusammenführung

Ausgang: admin-editor-preview / 7109e16728024c099132533c21601d093bc0393a. Sauber, mit GitHub synchron. Lokal und remote gesichert als checkpoint-before-map-consolidation-20261001-7109e16. main bleibt 94ab9f8fa408fc1ed3bd1721961321c0cec2eb45.

## Phase 1: tatsächlicher Funktionsvergleich vor Änderung

| Funktion | Einordnung | Tatsächlicher Bestand / Zusammenführung |
|---|---|---|
| Szenarien | gleich | Dieselben sechs ARCHIVE_DATA.map.scenarios; keine eigenen Szenario-Bilddaten, dieselbe Weltkarte |
| Standard-Szenario | unterschiedlich | map: way-of-winter; live-map: erster Eintrag nalcott. Vorhandenen gespeicherten Wert weiterverwenden, Standard der Hauptkarte übernehmen |
| Markerbestand | gleich | Vier Originalmarker plus alle eigenen Marker, identische IDs und Positions-/Szenariofelder |
| Eigene Marker | gleich | JMA_STORE jma_custom_markers; Name/Kategorie/Notiz/Spielkoordinaten/Position/Szenario/created/catalogIds; Erstellen/Löschen, Referenzen aus Entwurf und gespeicherten Routen entfernen |
| Dialog | unterschiedlich | Gleiche Felder/Pflichtgrenzen; unterschiedliche Standardkategorie Eigener Fund / Eigener Marker. Vorhandene Kategorien unverändert lesen; Live-Dialog beibehalten |
| Markerfilter | gleich / andere Controls | map: Kategorienknöpfe und zusätzlich Dropdown; live-map: Kategorienknöpfe, alphabetisch sortiert; dieselbe Kategorieauswahl und Filterwirkung |
| Suche | gleich / andere Controls | Name/Kategorie/Notiz/location; map zwei synchronisierte Inputs, live-map ein Input; Fokus und Textcursor nach Refresh erhalten |
| Schnellfilter Ressourcen/Abweichler | nur map | Detailbuttons setzen bestehenden Suchkey; in Live-Dossier übernehmen |
| Suche fokussieren | nur map | Marker-auswählen-Button im leeren Detailbereich; in Live-Dossier übernehmen |
| Markerlabels | ungenutzte Altlogik | map bindet mapLabels/jma_map_labels, rendert aber kein solches Control/keine Labels; kein vorhandenes sichtbares Feature. Altcode/Key nicht löschen, kein erfundenes Feature hinzufügen |
| Zoom | unterschiedlich | Beide min 100%, ±15 Prozentpunkte, Rad ±10; map max 240%, live-map max 260%; 260% beibehalten, alle alten Zwischenwerte bleiben möglich. Keine aktuell vorhandene 75%- oder feste 125%-Auswahl |
| Pan, Begrenzung, Fill | gleich | Weltkarte füllt Viewport, Verschieben innerhalb Bildgrenzen, Marker behalten Bildschirmgröße |
| Reset | gleich | jma_map_view={zoom:1,x:0,y:0}; separater Filterreset ohne Datenlöschung |
| Maus | gleich | Pointer-Drag, Wheel ohne Scroll-Leak, Markerwahl und Platzierung |
| Touch/Pinch | gleich | Pointer-Capture, Zweifinger-Zoom um Mittelpunkt plus Pan; pointerup/cancel/lostpointercapture |
| Markerwahl / Detail | unterschiedlich | Gleicher selected-Key, Notiz/Szenario/Kategorie/Koordinaten; map zeigt zusätzlich verified-Prüfstatus. Live zeigt eigene/Archiv-Kennung und Navigator; verified übernehmen |
| Katalogverknüpfung | map-Handler / dormant | data-map-catalog-Handler vorhanden, aktueller Renderer rendert keine Links, Originalmarker haben leere catalogIds. Kompatiblen vorhandenen Session-Key für tatsächlich verknüpfte Einträge in Live verwenden |
| Routenerstellung | gleich / Live zusätzlich | Beide dieselbe jma_route_draft-IDliste/Polyline; Live hat Entfernen/Toggle und Save direkt in linker Navigation |
| Speichern | gleich / Validierung anders | Farmroutenseite akzeptiert nichtleeren Namen, Live verlangt mindestens zwei Zeichen; auf gleiche nichtleere Pflichtvalidierung bringen, keine Namen/IDs umschreiben |
| Farmrouten | gleich | Dieselbe jma_routes-Liste und #/routes: öffnen/entfernen, Draft übernehmen, erstes Markerszenario wählen und Filter zurücksetzen |
| Routen über Szenarien | gleich | IDliste bleibt vollständig; Linien nur im aktiven Szenario. Kein Umbau auf neues Routenschema |
| Karten-/View-State | gleich | jma_map_view, jma_map_scenario, jma_map_q, jma_map_cat, jma_map_selected; keine parallelen Live-Keys |
| Kontotrennung / Persistenz | gleich | Marker/Routen/Draft sind vorhandene kontogetrennte JMA_STORE-Werkzeugdaten. Karten-UI-Keys sind bestehender browserweiter State. Keine neue Migration oder Löschung |
| Externe Links | unterschiedlich | Hauptnavigation/Home/Dashboard/Farmrouten/Admin/Footer: map; Account und Einstellungen: live-map. map bleibt kanonisch, live-map bleibt kompatibler Alias |
| Mobil | unterschiedlich visuell | Beide responsive, Live hat Karte vor linker Navigation und Dossier darunter. Live-Aufbau beibehalten |
| Reduced Motion | Live zusätzlich | Vorhandene lm-navigator/lm-butterfly/lm-scan-Animationen sowie Betriebssystem-/UI-Präferenzen; unter kanonischer Route erhalten |
| Wesen / Animationen | nur Live | Original Shattered Maiden PNG, Butterfly-WebP, vorhandenes Schweben/Bewegen/Scan; unverändert erhalten, kein Fly-by |

Die Funktionswege sind eindeutig. Kein unterschiedlicher Marker-/Routenspeicher vorhanden. Die alte Renderer-/Binder-Implementierung und ihr CSS bleiben zunächst als nicht aktive Altstruktur erhalten; sie werden nicht gelöscht oder als zweite sichtbare Oberfläche gerendert.

## Phase 2/3: umgesetzter Stand

- `#/map` rendert und bindet die vorhandene Live-Karte. `#/live-map` wird vor Auth-Gate und Darstellung per `history.replaceState` auf `#/map` normalisiert; kein zusätzlicher History-Eintrag. Beide Registry-Namen bleiben kompatibel.
- Navigation „Karte“, Farmrouten, Dashboard-, Footer- und Katalogwege behalten `map`. Account-/Einstellungslinks zeigen jetzt ebenfalls auf `map`. Die bisherige Oberfläche wird nicht mehr angezeigt; ihr Code und alle Daten bleiben erhalten.
- Nur fehlende Funktionen ergänzt: Suche fokussieren, Ressourcen-/Abweichler-Schnellsuche, verified-Prüfstatus und bestehender Katalog-Session-Handoff für tatsächlich vorhandene catalogIds. Nichtleere Routennamen funktionieren auf beiden Speicherwegen; Winter bleibt der bisherige Standard ohne gespeicherte Szenarioauswahl.
- IDs, alle `jma_*`-Keys, Konto-Scope, Marker-/Routenfelder, Szenarien, Draft und gespeicherte Routen unverändert. Keine Datenmigration nötig und kein vorhandener Datenbestand überschrieben. Gemischte Szenario-Routen behalten sämtliche Stationen; nur die aktive Teilstrecke wird gezeichnet.
- Live-Hero, linke Navigation, Kartenfläche, rechtes Dossier, Original-Shattered-Maiden/Butterfly und vorhandene Animationen erhalten. Live-CSS und Präferenz-CSS ausschließlich auf den kanonischen Route-Selektor umgestellt, einschließlich Mobil/Reduced Motion. Keine Fly-by-Animation.
- Routenzähler: 29 verschiedene Seiten plus kompatibler Karten-Alias (weiterhin 30 unterstützte Route-Pfade). 27 reguläre Routen/7 Hauptnavigationspunkte unverändert. Historische Dokumentation mit vormals 30 eigenständigen Oberflächen bleibt als Historie erhalten.

## Gezielte Prüfung

| Prüfung | Ergebnis |
|---|---|
| `tests/map-consolidation.cjs` | 51 bestanden: beide URLs, sechs Szenarien, Original-/Bestandsmarker, Suche/Cursor, Kategorien/Schnellfilter, Fokus, Katalogdetail, Zoom 100–260%, Maus/Pan/Rad/Reset, bestehende und neue Farmrouten, Markeranlage/Löschabbruch/gezielte Referenzbereinigung, Reload, Navigation, Alias-Auth-Gate |
| Desktop / Mobil | 1920, 390 und 360 px ohne horizontalen Überlauf; Screenshots geprüft |
| Native Touch | CDP-Touch-Pinch und Einfinger-Pan, Marker per Touch anlegen/speichern, Reload-Persistenz bestanden |
| `tests/navigation-map.cjs` | 50 bestanden; reguläre Routen, Mobilnavigation, Maus/Touch/Pointer-Cancel und Persistenz |
| `tests/rest-b.cjs` | 30 bestanden; Export-/State-Umfang, Rollen-/Backend-Abgrenzung, Routenzahl/Suchumfang, bestehende Texte/Mobil |
| `tests/catalog-storage.cjs` | 13 bestanden; Editor mit 21 Einträgen/14 Kategorien, Revision/Reload, neue IDs, Eingabe-/Duplikat-/Rechteprüfung |
| `tests/control-orbit.cjs` | 17 bestanden; ursprüngliche 12-s-Admin-Animation, Reduced Motion und unveränderte übrige berechnete Darstellung |
| `tests/state.cjs` | Migration, Löschumfang, Kontotrennung, beschädigter Speicher und atomarer Import-Rollback bestanden |
| Statische Erhaltung | JS-Syntax und Diff-Check bestanden. `routes-full.js`, State-/Auth-/Supabase-/Katalogdaten, Assets und Supabase-Verzeichnis gegenüber Ausgangs-HEAD unverändert. CSS-Inhalt exakt gleich nach Normalisierung des Route-Selektors; Admin-Orbit-Fix unverändert |

Tests in Chromium mit lokalem Auth-/Katalog-Fixture, ohne Produktions-Katalogschreibzugriff. Native Touch geprüft; kein gesonderter realer iOS-/Safari-Gerätetest. Die zwei Testauffälligkeiten waren Prüfablauffehler (falscher ausgewählter Marker, Großschreibung der sichtbaren Überschrift); Produktlogik musste dafür nicht geändert werden. Stylesheetvergleich wartet jetzt auf den tatsächlichen Ladeabschluss und fertigen Animationsframe.

## Abgrenzung / offene Punkte

Keine Backend-/RLS-/Revisionsänderung; keine Änderung an `public.catalog_entries`, bestehenden 21 Einträgen oder 14 Kategorien. B-01–B-06, B-08–B-12/B-14 und Editorarbeiten bleiben erhalten. `main` unverändert; Sicherungs-Checkpoint bleibt bestehen. B-07, B-13 und Live-Karten-Visual-Finish/Fly-by bleiben gesperrt. Der zuvor dokumentierte Supabase-Recovery-Redirect-Konfigurationspunkt bleibt außerhalb dieses Auftrags offen.


## Nachtrag: doppelter Profil-/Account-Kartenpunkt entfernt

Ausgang `dcaca4b8b5782668065f6a94aa3a376d32bb832d`, vor Änderung lokal und auf GitHub als `checkpoint-before-account-map-entry-20261001-dcaca4b` gesichert. Ausschließlich dynamischen Kartenlink im Account-Dropdown (`app.js`) und den separaten Live-Karten-Reiter der Profil-/Einstellungs-Sidebar (`settings-page.js`) entfernt. Alle übrigen Account-/Sidebar-Punkte exakt mit dem Ausgangsstand verglichen und erhalten; bestehende Darstellungsvorschauen in den Einstellungen behalten. Cache-Versionen der beiden Skripte aktualisiert; zwei bestehende Testaussagen auf den nun ausdrücklich gewünschten fehlenden Account-Link angepasst.

20 gezielte Chromium-Prüfungen mit lokalem Auth-/Katalog-Fixture bestanden: unveränderte Hauptnavigation, Header „Karte“ öffnet Live-Oberfläche unter `#/map`, direkter `#/live-map`-Alias, Reload, kein Kartenpunkt in Account-/Profil-/Einstellungsnavigation, übrige Menüpunkte unverändert, Desktop 1920 und Mobil 390 px, keine Browserfehler. Screenshots kontrolliert. Syntax/Diff-Check bestanden. Kartenimplementierung, CSS/Layout, Animationen, Profilimplementierung, Headerimplementierung, Assets, State, Auth, Admin-Editor und Supabase gegenüber Ausgang unverändert. `main` unverändert. Keine anderen Arbeiten begonnen.
