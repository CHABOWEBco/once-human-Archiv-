# Vorhandene Control-Layer-Animation wiederhergestellt

Stand: 01.10.2026. Ausgangs-HEAD `6533300be169c5c668a3403b51caa176f8699745` auf admin-editor-preview, lokal/remote identisch und sauber. Vor Änderung lokaler und GitHub-Checkpoint `checkpoint-before-control-orbit-20261001-6533300`. main bleibt `94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.

## Ursache und Historiennachweis

Die ursprüngliche `.signal-orbit`-Regel und `@keyframes admin-spin` wurden mit `03463c7` eingeführt und sind im aktuellen admin-panel.css unverändert vorhanden: `animation:admin-spin 12s linear infinite`, Ziel `rotate(360deg)`. In B-11/B-12/B-14 gab es keine Änderungen an admin-panel.css, settings-page.css oder settings-page.js.

Mit `d2fcd47` kam die allgemeine Einstellungen-Regel `body.ui-preferences-active:not(.ui-smooth) #app *` hinzu, die bei ausgeschalteten „Weichen Animationen“ auch die vorhandene Kreisdrehung auf 0 Sekunden setzte. Im unmittelbar vorherigen Stand `f7e50f2` / `d2fcd47^` lief der Kreis bei derselben Einstellung weiterhin mit 12 Sekunden. Dies ist im isolierten Browser reproduziert. Mit eingeschalteter Einstellung funktionierte die Drehung bereits im Ausgangsstand; die Nutzerkonfiguration dieser Sitzung wurde nicht verändert.

## Minimale Änderung

Nur der bestehende Abschaltselektor erhält `:where(:not(.signal-orbit))`. Der Kreis verwendet dadurch wieder seine originale Regel; keine neue Animation, kein neuer Keyframe und keine zusätzliche Designschicht. `:where` erhöht die Selektorspezifität nicht. Alle anderen Elemente bleiben unter der vorhandenen Bewegungseinstellung. Die bestehende Betriebssystemregel `prefers-reduced-motion:reduce` schaltet den Kreis weiterhin ab. index.html aktualisiert ausschließlich die Versionskennung dieses Stylesheets.

## Gezielte Prüfung und Erhalt

17 Prüfungen in tests/control-orbit.cjs bestanden: tatsächlicher zeitlicher Transform-Fortschritt, Originalname/-dauer/-easing/-endrotation, Standardbewegung und OS-Bewegungsreduktion; sämtliche übrigen berechneten Styles, Inhalte und Geometrie gegen den Checkpoint identisch auf Admin-Overview, Home, Einstellungen, Profil und Live-Karte, jeweils mit weichen Animationen an/aus. Screenshot des unveränderten Overviews gesichtet. 21 unveränderte Einträge und 14 Kategorien im Editor vorhanden, keine JavaScript-Ausnahmen.

Die 13 vorhandenen isolierten Editorprüfungen bestanden erneut, inklusive Speichern/Reload, neuer Eintrag, Revisionsschutz, Pflichtfelder, Duplikatabwehr und unberechtigter Rolle. Kein Produktionsschreibtest, keine Supabase-Änderung. Daten-/Auth-/State-/Katalog-/Rendererdateien, Assets, sonstige CSS und frühere Dokumentation bleiben byteidentisch zum gesicherten Ausgangsstand. B-07, B-13 und Live-Karten-Finish/Fly-by wurden nicht bearbeitet. Keine bisherigen B-Fixes zurückgenommen. Kein Reset, Branch-Rollback, Commit-Rückbau oder Wiederherstellen ganzer alter Produktdateien.

Nachweise liegen in test-results/control-orbit (ignorierte lokale Browserartefakte). Wiederholbarer Test gegen den unveränderten Checkpoint mit tests/control-orbit.cjs.

STOPP nach gezielter Sicherung und Synchronisierung auf admin-editor-preview.
