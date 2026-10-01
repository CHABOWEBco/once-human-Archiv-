# Minimales Tutorial-Grundsystem – Einsteiger-Pilot

Ausgang: aktueller GitHub-HEAD `1d2b0ef49e4f880d4579df16fc08dcf1ed32ddd4`, ausschließlich `admin-editor-preview`.

Pilot: **Die ersten 5 Minuten im JazzeMeow Archive** (`g-start`), fünf Schritte. Auf `#/guides` befindet sich ausschließlich an diesem bestehenden Guide der zusätzliche Button **TUTORIAL STARTEN**. Die normale Kapitelansicht aller sechs Guides bleibt erhalten: sechs Guides, 27 unveränderte Kapitel. Titel und Erklärungstext im Tutorial stammen unmittelbar aus `ARCHIVE_DATA`; keine Texte/Kapitel neu erfunden oder umgeschrieben.

`guide-tutorial.js` stellt eine kleine wiederverwendbare Steuerung bereit: `JMA_TUTORIAL.start(guideId)`, `previous()`, `next()`, `complete()`, `close()` und `getState()`. Nur der Einsteiger-Pilot ist in der Oberfläche angeschlossen. Keine anderen fünf Guides ausgerollt.

Die Sitzung hält im Arbeitsspeicher ihre ID, Guide-ID, Schrittindex, Gesamtzahl, offen/geschlossen und abgeschlossen. Doppelte Starts sind gesperrt. Vor/Zurück bleibt innerhalb der Kapitelgrenzen; erst auf dem letzten Schritt wechselt der Weiter-Button zu **TUTORIAL ABSCHLIESSEN**. Schließen/Abschluss entfernt den Dialog und seine aktiven Routenbeobachter; Wiederöffnen erzeugt eine neue Sitzung bei Schritt 1. Kein automatisches Durchschalten, kein localStorage und keine Supabase-/Cloud-Persistenz.

Ein nativer modaler Dialog außerhalb von `#app` bleibt samt Fokus und Sitzungszustand bei normalen UI-Re-Renders bestehen. Escape und Schließen führen zum Startbutton zurück. Normale und stille Routenwechsel räumen auf. Ältere Dialog-close-Ereignisse können eine sofort neu geöffnete Sitzung nicht schließen. Farben, Typografie und vorhandene Buttons werden übernommen; Mobil-Controls umbrechen, Touch-Ziele sind mindestens 44px hoch. Keine Animation und kein Mutanten-Guide.

## Gezielte Validierung

- `node tests/guide-tutorial.cjs`: **77 Prüfungen bestanden**, Desktop 1920, Tablet 768, Mobil 390/360 px. Originalinhalte aller Kapitel, normale Aufklappfunktion, Pilotstart, Vor/Zurück, Grenzen, Fortschritt, Abschluss, Wiederöffnen, doppelte Starts, stabile Dialoginstanz/Schritt bei Re-Render, schnelles Schließen/Wiederöffnen, Routenbereinigung, Tastatur/Enter/Escape/Fokusrückgabe und native Touch-Bedienung.
- Alle Buttons vollständig im Dialog/Viewport, keine horizontale Überbreite; Reduced Motion funktioniert unverändert ohne Animation. Keine Browser-JavaScript-Fehler.
- `node tests/map-flyby-motion.cjs`: zwei kurze Desktop-/Mobil-Fly-by-Vergleiche bestanden. Fly-by-Dateien und Originalasset unverändert.
- Screenshots von Desktop, Tablet und beiden Mobilbreiten lokal unter `test-results/guide-tutorial/`; Desktop/Mobil visuell geprüft. Testresultate dort in `results.json`. Syntax und `git diff --check` bestanden. Chromium mit Testauthentifizierung, kein Live-Supabase-/Realgeräte-Nachweis.

Andere Websitebereiche und alle bisherigen Fixes bleiben erhalten. Kein Mutanten-Guide, keine zusätzlichen Tutorialinhalte und kein Rollout auf die anderen fünf Guides.

Preview: https://raw.githack.com/CHABOWEBco/once-human-Archiv-/admin-editor-preview/index.html#/guides

STOPP nach Pilot.
