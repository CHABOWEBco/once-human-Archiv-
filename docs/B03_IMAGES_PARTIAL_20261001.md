# B-03 – Bildfehler, Teilabschluss

Stand: 2026-10-01 (Europe/Berlin). Branch admin-editor-preview. Freigabe ausschließlich belegte vorhandene Originale oder bereits vorhandene Fallbacks; keine freie Bildauswahl.

Ausgangs-Remote-HEAD: b7ae8d72b90e5f6f27b0819e5ea08446daf0ef3a.
Checkpoint: checkpoint-b03-images-20261001 auf diesem HEAD.
Produktcommit auf GitHub: 0f014a81c660cd4c617cf21aafdec94d168bfe3b.
main unverändert: 94ab9f8fa408fc1ed3bd1721961321c0cec2eb45.

## Erledigter Teil: Admin-Bilder

admin-panel.js verwendet bereits assets/branding/once-human-logo.png als Fallback bei leerem Bildpfad. Dieser konkret bestehende Fallback wird nun auch bei Lade-/Decodierfehlern der Kartenbilder und ausgewählten Vorschau aktiviert. Er bleibt bei weiteren Eintragswechseln wirksam. Bereits fehlgeschlagene Bilder werden beim Binden erfasst. Ein Fehler des Fallbacks löst keine Wiederholungsschleife aus. Gültige Bilder werden nicht überschrieben. Kein erfundenes Itembild, keine Änderung der Katalogpfade oder Katalogdaten.

Produktänderung ausschließlich sechs neue Binderzeilen in admin-panel.js. Keine HTML-Vorlage, kein CSS, keine Navigation, kein Asset geändert; keine Elemente oder Funktionen entfernt.

## Gezielt geprüft

Sieben Prüfungen mit Chromium und bestehender Auth-Testfixture (Owner-Testrolle) bestanden:
1. 21 Katalogkarten und ausgewählte Vorschau laden den vorhandenen Fallback: keine kaputten Bilder mehr in diesem Bereich.
2. Wiederholter Eintragswechsel funktioniert; Drawer-Abmessungen bleiben gleich.
3. Gültiges vorhandenes Original bleibt unverändert (temporäre Testzuweisung).
4. Filter/Textvorschau funktionieren; Katalogdaten unverändert.
5. Desktop- und Mobil-Screenshots bei 1920/390 px erstellt und visuell geprüft.
6. Fehlender Fallback erzeugt keine Endlosschleife (nur im Test abgefangener 404).
7. Keine Browser-JavaScript-Ausnahmen.

node --check admin-panel.js und git diff --check bestanden. Kein echtes Backend verändert. Screenshots admin-editor-1920.png und admin-editor-390.png zeigen eine Testidentität und den bewusst ungespeicherten Testtitel Auditvorschau; dieser Titel ist keine Produktdatenänderung.

## Offener Teil: Shattered Maiden

assets/live-map/shattered-maiden.webp ist beschädigt (14998 Bytes, kein gültiger WebP-Header). Auch die einzige Dateiversion in der erreichbaren Git-Historie, aus Commit 7699bc9, hat identische beschädigte Bytes. Kein gültiges eindeutig zugeordnetes Original gefunden. Das bereitgestellte ZIP enthält sechs andere benannte Wesen und kein eindeutig zugeordnetes Shattered-Maiden-Original. Für den Navigator gibt es im vorhandenen Renderer keinen passenden festgelegten Bild-Fallback.

Deshalb kein Austausch gegen Butterfly Emissary, Profilrahmen oder frei gewählte ZIP-Datei. Kartenwesen, Animation, Ring, Label, Layer und beide Kartenrouten bleiben unverändert. B-03 ist damit ausdrücklich nur teilweise abgeschlossen.

## STOPP und nächste Arbeit

Nächste notwendige Arbeit bleibt der offene Kartenbildteil von B-03. Dafür wird ein gültiges Original von Shattered Maiden oder eine ausdrücklich vom Nutzer bestimmte Ersatzdatei benötigt. Die Auswahl eines anderen Wesens wäre eine freie sichtbare Entscheidung und liegt außerhalb dieses GO.

Erst danach folgt B-04: mobile Titel-/Grid-Überstände; deren Korrektur betrifft Layout/CSS und braucht gesondertes GO. Kein Block wurde übersprungen, um die erlaubten drei Blöcke zu füllen.

Preview: https://raw.githack.com/CHABOWEBco/once-human-Archiv-/admin-editor-preview/index.html

STOPP. Warten auf die eindeutige Bildzuordnung/Freigabe; keine weitere Produktänderung.
