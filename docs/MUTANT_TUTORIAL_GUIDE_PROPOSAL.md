# Tutorial-Guide – technischer Vorschlag, noch nicht implementiert

Die vorhandene Guides-Route rendert Kapitel und bindet deren Aufklappbuttons; eine Tutorial-Schrittsteuerung existiert dort noch nicht. Diese Route bleibt unverändert.

Für spätere Tutorials einen kleinen separaten Guide-Controller mit `show({tutorialId, stepId, anchor})`, `moveTo(anchor)` und `hide()` vorsehen. Er verwendet dasselbe unveränderte `assets/live-map/by-the-wind.png`, aber eigene dezente Ein-/Ausblend- und Hover-Bewegungen statt den Kartenflug wiederholt abzuspielen.

Eine stabile Tutorial-Sitzung mit Schritt-ID verwaltet den einzelnen dekorativen DOM-Knoten außerhalb des neu gerenderten Inhalts. Erscheinen nur bei Tutorialstart oder ausdrücklich neuem Schritt; derselbe Schritt darf nach einem UI-Re-Render nur seinen Anker aktualisieren. Kein globales „gesehen“-Flag und keine Kopplung an Karten-State-Keys. Beim Tutorialende, Routenwechsel oder entfernten Text-/Dialoganker Animationen, Beobachter und Knoten sauber entsorgen.

Die Figur neben dem jeweiligen Erklärungstext verankern, mit reserviertem Abstand zu Buttons und Text. Position per ResizeObserver/Scroll und gebündeltem requestAnimationFrame aktualisieren; auf Mobil bei Platzmangel weglassen. `pointer-events:none`, `aria-hidden=true`, kein eigener Fokus. Erklärung, Tastatursteuerung und Semantik gehören weiterhin zum zugänglichen Tutorialdialog. Bei Reduced Motion höchstens statisch anzeigen, ohne Hover-/Flugbewegung.

Erst bei einem gesonderten Tutorial-Auftrag integrieren und den Controller extrahieren. Jetzt kein neues Modul, kein Dialog und keine Tutorials geändert.
