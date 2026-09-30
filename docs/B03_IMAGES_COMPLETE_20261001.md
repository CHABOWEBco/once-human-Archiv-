# B-03 – Abschluss mit Original-PNG

Stand: 2026-10-01 (Europe/Berlin). Branch admin-editor-preview. Ausgangs-Remote-HEAD 8503a0a8f9076740fad38758e8922f1bc6536aa0; Checkpoint checkpoint-b03-original-20261001 auf diesem HEAD. main unverändert auf 94ab9f8fa408fc1ed3bd1721961321c0cec2eb45.

## Original gefunden und unverändert übernommen

Die gültige Shattered Maiden.png wurde separat vom Nutzer bereitgestellt und unter /✅WebSite - Once Human🚀/Shattered Maiden.png gefunden. Sie ist nicht Bestandteil von Once_Human_Mutanten_Assets(1).zip; dieses enthält weiterhin nur die sechs bereits inventarisierten Dateien. Die frühere Schlussfolgerung aus dem lokalen Checkout/ZIP war unvollständig: Die separat bereitgestellte Originaldatei wurde nun direkt geprüft.

Quelle: libfile_57f35ed3f3d8819189f3244df863e09a; 30269 Bytes, PNG, 304 × 304 px, RGBA, Alphawerte 0–255.
SHA-256: f3ce113d68f9cfaad5855d173be1319a143e2f916e1ef0ceb02e4fef359adf01.

assets/live-map/shattered-maiden.png ist eine byteidentische Kopie dieses Originals. Keine Konvertierung, Skalierung der Datei, Farbänderung oder Bildbearbeitung. live-map.js verweist mit genau einer geänderten src-Zeile auf diese PNG. Die beschädigte WebP-Datei wurde nicht entfernt. Bestehende Animation, Größe, Position, Layering, Ring, Label, Butterfly und Kartenfunktionen unverändert. Der bereits gesicherte Admin-Fallback bleibt bestehen. Damit ist B-03 abgeschlossen.

## Gezielte Prüfung

Sieben Chromium-Prüfungen bestanden:
1. Repository-PNG byteidentisch mit Nutzeroriginal.
2. Desktop-Bild-/Containermaße, Position, Animationsparameter, Layer und Markerbestand direkt gegen den vorherigen Renderer verglichen: unverändert.
3. Navigator-PNG und vorhandener Butterfly werden korrekt decodiert.
4. Zoom und Reset weiterhin funktional.
5. Mobile Bildgröße 55 × 55 px, Animation 3,6 s, Navigator-Z-Index 8 unverändert.
6. Reduced Motion deaktiviert die Animation weiterhin.
7. Keine Browser-JavaScript-Ausnahmen.

Desktop-/Mobil-Screenshots erstellt und gesichtet. Browserprüfung lokal mit der vorhandenen Auth-Testfixture; keine Live-Accounts oder Supabase-Daten verändert. node --check live-map.js und git diff --check bestanden. Keine Styles, Navigation, Datenmodelle oder anderen Funktionen geändert.

## Nächster Block und STOPP

B-04: Mobile Titel und insbesondere die Geheimnisse-Karten ragen über die Viewportgrenze. Erforderlich sind Änderungen an Umbruch-/Grid-/Responsive-CSS. Das betrifft sichtbar Layout/CSS und erfordert ein neues GO. Keine B-04-Änderung; keine weiteren Blöcke übersprungen oder zum Auffüllen begonnen.

Preview: https://raw.githack.com/CHABOWEBco/once-human-Archiv-/admin-editor-preview/index.html#/live-map

STOPP. Warten auf GO für B-04.
