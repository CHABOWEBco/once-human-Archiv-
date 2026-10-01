# B-07 – Profil/Layout

Stand: 2026-10-02 00:07 CEST.
Freigabe ausschließlich B-07. Ausgang: `admin-editor-preview`, HEAD `9b21c0c62ec81e600d751525b737721f29cf789a`; Remote vor Beginn erneut geprüft, Worktree sauber. `main`: `94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.

## Ursache und gezielte Korrektur

Die bestehende Banner-Kategorie überschreibt die Vorschau-Mindesthöhe mit 174 statt 154 px. Bei 1920/1280 px betrug die Gesamtvorschau dadurch 187 statt 167 px; bei 390/360 px 187 statt 145 px. Nur diese zusätzliche Mindesthöhe entfernt. Vorhandene Banner-Spalten, Farben, Typografie, Bilder, Effekte und Responsive-Basishöhen bleiben erhalten.

Zusätzlich bestätigter Rasterfehler bei 768 px: Das feste Profilfenster verteilt Resthöhe auf zwei implizite Auto-Zeilen. Die Sidebar wächst beim Wechsel zu „Über mich“ bzw. „Highlights“ von 85 auf bis zu 140,78 px; die Vorschau und der Inhalt darunter wandern mit. Die bestehende Profil-Regel unter 900 px legt jetzt die Sidebar-Zeile auf ihre Inhaltshöhe und weist den restlichen Platz der Arbeitsfläche zu (`max-content minmax(0,1fr)`). Die bestehende Sidebar, Editorposition und Desktop-/Mobilstruktur bleiben die Grundlage; kein neues Layout und keine zusätzliche Designschicht.

## Nachgewiesen ungenutzter Drawer

Vorher auf der Hauptprofilroute: versteckter Drawer, Backdrop und 95 unsichtbare Auswahlbuttons. Beide sichtbaren „Profil anpassen“-Buttons führen bereits ausschließlich zu `#/settings/profile`; keine aktive Öffnungslogik setzt den Drawer sichtbar. Repositoryweite Referenzprüfung bestätigt nur die alte Renderstelle, Close-/Backdrop-Binder und den hierfür vorgesehenen Tastaturhandler.

Entfernt: versteckte Drawer-/Backdrop-DOM-Struktur auf der Hauptprofilroute, deren Close-/Escape-/Fokusfalle und der nicht mehr erreichbare alternative Editor-Render-/Tabaufbau. Der aktuelle Editor wird weiterhin unter Einstellungen → Profil gerendert und gebunden.

Die Trophäenmarkierung und Favoritenanzeige wurden bisher zusammen mit dem versteckten Editor initialisiert. Diese beiden bestehenden Anzeigeoperationen laufen nun direkt im Hauptprofil-Binder mit der gespeicherten Profilgestaltung; ihre sichtbare Ausgabe bleibt identisch. Aktive Wrapperklassen `profile-ref-drawer-body` und `profile-ref-drawer-content` sowie deren CSS bleiben erhalten, weil sie vom aktuellen Editor verwendet werden. Allgemeine CSS-/Altstruktur-Bereinigung ist B-13 und wurde nicht begonnen.

## Gezielte Verifikation

42 Chromium-Prüfungen mit bestehendem isoliertem Auth-Adapter und schreibgeschütztem Katalog-Fixture bestanden. Keine echten Supabase-Anfragen, keine Katalogschreiboperationen und keine Browser-JavaScript-Ausnahmen.

| Breite | Vorschauhöhe über alle zehn Kategorien | Ursprung des Inhalts über alle Kategorien |
|---|---:|---:|
| 1920 px | 167 px | 474,44 px |
| 1280 px | 167 px | 461,63 px |
| 768 px | 167 px | 520,16 px |
| 390 px | 145 px | 544,44 px |
| 360 px | 145 px | 544,44 px |

Alle vorhandenen Banner einschließlich Standardauswahl geprüft; Vorschauhöhe und Dokumentposition des folgenden Inhalts bleiben stabil. Native Auswahlklicks können den jeweiligen Scrollcontainer regulär zum geklickten Eintrag scrollen; dies wird bei der Messung von einem Layoutsprung unterschieden.

- Sichtbares Hauptprofil vor/nach Änderung bei 1920 und 390 px für Übersicht und Sammlung exakt verglichen: Texte, Geometrie und sämtliche berechneten CSS-Eigenschaften identisch. Bestehende Animationen für den Vergleich nur im Test deterministisch angehalten.
- Beide vorhandenen Bearbeiten-Einstiege, zehn Editor-Kategorien und alle 95 tatsächlichen Editor-Auswahlbuttons erhalten.
- Livevorschau für Namen sowie kombinierte Avatar-/Rahmenanzeige beim Kategorienwechsel geprüft.
- Name, Avatar, Rahmen, Banner, Farbe, Profiltext, Highlight, Widgets, Ring, Kranz und Trophäe gespeichert und nach Reload geprüft.
- Trophäenanzeige, Favoriten-Showcase und Widget-Sichtbarkeit auf der Hauptprofilroute geprüft.
- Galerie-Upload mit IndexedDB-Reload, eigener Avatar-Upload/Speichern/Reload, Sammlung und alter Collection-Alias sowie Zurück-zur-Darstellung geprüft.
- Desktop-/Mobil-Screenshots visuell geprüft; die Kategorieanimation wird für Screenshots im Test abgeschlossen, nicht in der Website verändert.
- Syntaxprüfung und `git diff --check` bestanden. Cache-Versionen nur der geänderten Produktdateien in `index.html` aktualisiert.

Nachweise: [gezielter Test](../tests/b07-profile.cjs), [42 Prüfungen und Geometriemessungen](B07_PROFILE_RESULTS.json). Screenshots liegen lokal im ignorierten `test-results/b07-profile/` und enthalten ausschließlich Testidentität.

## Umfang und bewusst offen

Produktänderungen ausschließlich `routes-full.js`, `settings-page.css` und die zugehörigen zwei Cache-Versionen in `index.html`. Kein Admin-Editor-, Supabase-, Karten-, Daten-, Assets- oder Migrationsumbau. Bestehende Supabase-Redirect-Korrektur und frühere Fixes bleiben erhalten; `main` unverändert.

B-13, Mutanten-Finish und Fly-by nicht begonnen. Kein neues Design und keine weitere Architekturentscheidung notwendig. Safari/echte Mobilgeräte und sämtliche Kombinationen beliebig langer Profiltexte sind durch diese gezielten Chromium-Prüfungen nicht vollständig abgedeckt.

STOPP nach B-07.
