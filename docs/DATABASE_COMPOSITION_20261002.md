# Datenbank: finale Komposition, Klick-Dossier und persönliche Profilfarben

Stand: 02.10.2026. Ausgangspunkt und vor der ersten Änderung bestätigter Remote-HEAD:
`6bd60c6ca4680b803b80fa59f60d9699233617ff`, Branch `admin-editor-preview`, sauberer Worktree.
Referenz für das unveränderte `main`: `94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.
Dieser Bericht ersetzt für die Datenbankkomposition die frühere Vorgabe eines permanenten Dossiers.

## Vorher und Ergebnis

Das permanente rechte Dossier belegte Katalogbreite. Der Banner hatte andere Außenabstände als das Profil, die Metriken waren Teil des Heroes, und der Admin-Modusschalter stand außerhalb. Karten besaßen nur einen kleinen Hover-Lift. Die Profilfarbe wurde gespeichert und in der Vorschau als Variable gesetzt, aber der Vorschau-Name blieb grau, Cyan ließ den Hauptnamen weiß, die Bannerfarbe hing zusätzlich von der Bannerwahl ab und der Fortschritt blieb fest cyan.

Jetzt folgt die Datenbank dem aktuellen Profilraster: Navbar → 310-px-Archivbanner auf großem Desktop → vier echte Statusmodule → Filter und breiter Katalog mit drei Karten pro Reihe. Der vorhandene Bannerinhalt und das Bild bleiben erhalten. Bearbeitungsmodus befindet sich im Banner; die kompakte Leiste mit Archivfilter und Hinzufügen erscheint ausschließlich im aktiven Bearbeitungsmodus.

Seitenkante, Banneroberkante, Höhe, wirksamer Radius und Schatten wurden bei 1920, 1840, 1280, 768 und 390 px direkt mit dem Profil verglichen. Der Basisradius ist 20 px; die bestehende UI-Radiusvorliebe wird auch im Datenbankbanner berücksichtigt. Auf kleinen Breiten übernimmt die Datenbank die tatsächlich wirksamen bestehenden Profil-Außenabstände einschließlich des mobilen oberen Abstands. Keine Profilgeometrie wurde geändert.

## Wiederverwendung und Bereinigung

- `catalogDialog` und `catalogDetailMarkup()` bilden den einzigen Detailpfad. Das permanente `catalogDossier`, `renderCatalogDossier()` und zugehörige CSS wurden entfernt. Der frühere Modal-/Permanent-Schalter im Renderer entfällt.
- Details öffnen ausschließlich durch Klick/Tap auf Karte, Bild, Name oder Dossierbutton. Der native Dialog ist auf Desktop 960 px breit und zentriert. Links steht das große Originalasset; rechts Name, Kategorie, Typ, Tags, Beschreibung, Fundweg, Status und Prüfdatum; unten Sammlung und berechtigte Adminaktionen.
- X, Escape und eine vollständige Backdrop-Klickgeste schließen das Dossier. Filter, Pagination und vorherige Scrollposition bleiben erhalten. Sammlungstoggles halten dieselbe Dialoginstanz offen.
- `editorDrawer()`, `bindCatalogEditor()`, `openCatalogEditor()` und `JMA_CATALOG` bleiben die gemeinsame Form und Speicherlogik. Ansehen → Bearbeiten schließt zunächst das Dossier. Hinzufügen verwendet denselben Editor im bestehenden Create-Modus. Revisionen, Entwürfe, Archivieren/Wiederherstellen und Weiterleitung zur Asset-Bibliothek bleiben erhalten.
- Der vorhandene `bindLiquidCards()`-Helper in `admin-panel.js` akzeptiert Root und Selektor. Ein `WeakSet` verhindert doppelte Pointer-Bindung. Die ursprünglichen Pointerpositionen, Winkel, Perspektive, Shine-/Brechungsflächen und Glow werden gemeinsam für Admin-Systemkarten, Datenbankkarten und gekennzeichnete Aktionen verwendet. Die identische bisherige Profil-Tab-Routine wurde entfernt und ruft denselben Helper auf. Sidebar-Navigation bleibt unverändert.
- Die bestehenden Liquid-CSS-Regeln in `admin-panel.css` wurden auf gemeinsame Oberflächen erweitert. Kein zweiter Effektcode und keine neue Effektdatei. Pointerleave/-cancel setzen Tilt und Glow zurück; Touch und Reduced Motion unterdrücken Tilt/Lift.
- Bestehende Datenbank-CSS direkt am ursprünglichen Ort geändert. Keine doppelte Datenbankregel im gleichen Media-Kontext, keine Override-Schicht am Dateiende und kein Datenbank-`!important`. CSS außerhalb des Datenbankabschnitts in `styles.css` unverändert.

## Profilfarben und Datenweg

Die vorhandenen Presets `cyan`, `red`, `gold`, `violet`, `appearance()`, `profileDraft`, `bindProfileAppearance()`, `updateProfileSettingsLivePreview()` und `saveProfileAppearance()` bleiben erhalten. Die Hauptprofilseite leitet die vorhandene persönliche `--accent`-Variable immer aus demselben Preset ab; die Vorschau verwendet weiterhin ihre bestehende, daraus abgeleitete `--profile-live-accent`-Variable.

Name, persönliche Bannerlinie, Fortschritt und Avatar-Akzent reagieren konsistent. Die Vorschau zeigt dieselbe Namensfarbe. Bannerwahl und Farbwahl sind unabhängig. Die festen Website-Tokens werden nicht überschrieben. Speichern verwendet unverändert `JMA_AUTH.updateProfile()`: Profilname/Avatar in `profiles`, Gestaltung in Supabase Auth `archive_appearance`, Wiederherstellung aus der Sitzung; der bestehende lokale Fallback bleibt erhalten. Keine zweite Farbkonfiguration und keine Änderung am Supabase-Transport.

## Prüfung

| Prüfung | Erfolgreiche Checks |
| --- | ---: |
| `tests/database.cjs`: Suche, Kategorien, Status, Sortierung, Pagination, Sammlung, Listenansicht, Desktop/Mobil | 43 |
| `tests/database-composition.cjs`: Profilgeometrie, vier Module, Klick-Modal, Zentrierung, Scroll-/Filtererhalt, gleicher Helper, Farb-Roundtrips, Reduced Motion, Touch | 66 |
| `tests/catalog-assets.cjs` über `tests/asset-library.cjs --catalog-link`: vorhandener Resolver, Originalbytes, Signierung/Cache, Statusausschluss, IDs, Reload, Async-Fehler | 34 |
| `tests/database-admin.cjs` im selben vorhandenen Fixture: Rollen, gemeinsame Form, Revision, stabile Entwürfe, Create, Archiv/Restore, Assetverknüpfung, 1920/390/360, Touch/Tastatur | 47 |
| `tests/database-security.cjs`: unveränderte SQL-Grants/RLS gegen Anon/User/Moderator/Admin/Owner, keine Hard-Deletes, Auditidentität, stale Revision | 20 |
| `tests/b07-profile.cjs`: erhaltene Hauptprofilgeometrie außerhalb der beabsichtigten Akzentänderung, alle 10 Kategorien/95 Choices, Vorschau, Speichern/Reload, Avatar/Galerie | 42 |
| **Gesamt** | **252** |

Browserprüfungen verwenden isolierte Auth-/Speicherfixtures. Sicherheits- und Katalog/Storage-Prüfungen verwenden die unveränderten Produktionsmigrationen in isoliertem PostgreSQL/PGlite. Keine Produktionsschreibzugriffe. Die Profilfarb-Roundtrips prüfen den vorhandenen Supabase-Clientvertrag inklusive Auth-Metadaten; es steht keine authentifizierte Produktionssitzung für einen zusätzlichen echten Live-Speichertest zur Verfügung.

Desktop 1920 und Mobil 390 wurden visuell mit normalen und berechtigten Testrollen geprüft, einschließlich Dossier und gemeinsamem Editor. Für die visuellen Aufnahmen wurden ein nur gelesener Live-Katalogsnapshot und die echten unveränderten Fox.png-Bytes verwendet; die Auth-Sitzungen sind lokale Testfixtures. Kein Overflow, Dialoge innerhalb des Viewports, geprüfte Aktions-/Savebuttons mindestens 44 px hoch.

Zusätzlicher Live-Lesenachweis: `catalog:cat-tier-fuchs`, `catalog_id=cat-tier-fuchs`, Status `active`, privater Bucket `archive-assets`, Originalname `Fox.png`, PNG 304×304, 44753 Bytes; signierter Download und Bilddekodierung erfolgreich. Signierte URLs und Zugangsdaten werden nicht dokumentiert oder committed.

## Schutz und Abschlussaudit

Keine Migration nötig. Keine Änderung an RLS, Supabase-Client/Auth, Storage, `catalog_entries`, `asset_library`, Asset-Bibliothek oder deren Daten. Karten-/Fly-by-/Techwerkbankdateien unverändert. Keine neuen Produktionsdaten, Phase 2B oder ZIP-Import.

Geänderte Laufzeitdateien: `app.js`, `styles.css`, `admin-panel.js`, `admin-panel.css`, `routes-full.js`, `routes-full.css`, `settings-page.css`, `index.html` (Cache-Versionen).
Geänderte/ergänzte Prüfungen: die sechs oben genannten Testdateien. Dieser Bericht ist die einzige zusätzliche Dokumentation.

Preview über den abschließend im Chat genannten Commit:
`https://raw.githack.com/CHABOWEBco/once-human-Archiv-/<HEAD>/index.html#/database`.
Die externe Preview-Domain ist in dieser Cloud-Umgebung durch die Netzwerkpolicy blockiert; die visuelle Prüfung erfolgt mit Chromium lokal auf den finalen Dateien.
