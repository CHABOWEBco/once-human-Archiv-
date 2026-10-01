# Fly-by – Bewegungsfinish zur Preview

Ausgang: neuester GitHub-HEAD `1d3cc252f194d60c569db074b6f2d93acac1df2a` auf `admin-editor-preview`.

Nur die neuen Fly-by-Keyframes und ihre CSS-Cache-Version wurden verändert. Das Original-PNG, sämtliche JavaScript-Auslöser, 6,4 Sekunden Laufzeit, Reduced Motion, Kartenlayout und vorhandene Wesen bleiben unverändert.

Die bisherigen sechs Flugposen mit unterschiedlich einsetzenden Segment-Easings wurden durch 41 gleichmäßig abgetastete Punkte einer kontinuierlichen kubischen Bezierbahn ersetzt. Ein halber Kosinus steuert die Reisegeschwindigkeit; die Tiefe besitzt einen weichen Scheitel bei 54 % des Fluges. Damit gehen Anflug, naher Vorbeiflug und Rückflug ineinander über. Scale und Schatten folgen der Nähe. Drei dezente Rotationsachsen und ein 2,5px-Körperdrift ergänzen die Flugbahn. Minimale Unschärfe bis 0,38px ist ausschließlich auf den schnellen mittleren Teil begrenzt; Eintritt/Austritt blenden weich. Separate Mobilkurve und unveränderte Perspektive bleiben erhalten.

Validierung:

- `node tests/map-flyby.cjs`: 36 Prüfungen bestanden, darunter einmaliger Aufruf, identische Animation bei Karteninteraktionen/Re-Render/Resize, alias/reload, Reduced Motion sowie unveränderte Layouts/Wesen bei 1920/1280/768/390/360px. Keine defekten Bilder, kein Overflow und keine JS-Ausnahmen.
- `node tests/map-flyby-motion.cjs`: zwei Desktop-/Mobilvergleiche gegen die vorige Fly-by-Version bestanden. Am bisherigen 58%-Übergang sinkt die relative Änderung des Bildschirm-Geschwindigkeitsvektors (20ms-Abtastung vor/nach dem Übergang) von 0,951 auf 0,011 bei 1920px und von 0,993 auf 0,012 bei 390px. Dies belegt den geglätteten Übergang, keine allgemeine Framerate-/AAA-Garantie.
- Fern-, Annäherungs-, Nah- und Rückflugaufnahmen visuell geprüft. Lokale Ergebnisse unter `test-results/map-flyby/`, einschließlich `motion-quality.json` und `*-premium-*.png`.
- Syntax und `git diff --check` bestanden. Chromium mit Testauthentifizierung; kein Realgeräte-/Safari-Nachweis. Keine erneute vollständige Website-Auditsuite nötig, da nur die dekorative Bewegung geändert wurde.

[Tutorial-Guide-Vorschlag](MUTANT_TUTORIAL_GUIDE_PROPOSAL.md): nur Konzept, keine Tutorialintegration.

Preview: https://raw.githack.com/CHABOWEBco/once-human-Archiv-/admin-editor-preview/index.html#/map

STOPP nach Preview. Keine anderen Karten-, Profil-, Admin- oder Websitebereiche verändert.
