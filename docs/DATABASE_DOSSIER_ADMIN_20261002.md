# Datenbank – Dossier und direkter Admin-Bearbeitungsmodus

Stand: 02.10.2026. Ausgangspunkt ist der vor Änderungen per `git ls-remote` bestätigte GitHub-HEAD `b2fd85c86c0a6d18961bbdc0ef8fcd2bcecb058c` auf `admin-editor-preview`. Worktree zu Beginn sauber. `main` bleibt bei `94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.

## Datenbankansicht

Die bestehende `#/database` verwendet jetzt Filter / Katalog / permanentes Dossier. Bei 1920 px bleiben drei größere Bildkarten pro Reihe in der dominanten Mitte; schmalere Desktops verwenden zwei Karten. Unter 1200 px steht das Dossier unter der Katalogfläche, unter 900 px werden auch die Filter einklappbar über dem Hauptinhalt angeordnet. Bei 390 und 360 px steht der Katalog einspaltig. Hero, vorhandene Kategorien und Inhalte bleiben erhalten.

Die Auswahl ist an der mittleren Karte markiert und erscheint im Dossier mit Originalbild, Name, Kategorie, Typ, Beschreibung, Fundweg, Prüfstatus, Tags, Prüfdatum und den drei Sammlungsaktionen. Der vorhandene zentrale Bildresolver liefert weiterhin aktive, exakt per `catalog_id` passende Assets; Signed URLs werden nicht in Katalogfeldern gespeichert. Ohne nutzbares Bild bleiben bestehender Legacy-Pfad und ruhiger Archiv-Fallback. Asynchrone Bilder behalten reservierte Bildflächen und die vorhandenen Schutzprüfungen gegen verspätete Antworten.

Das frühere Detail-Dialogsystem bleibt als Fallback erhalten. Dialog und Dossier nutzen denselben Detail-Markup-Renderer. Dialogtitel besitzen eine separate ID. Dossierauswahl und Scrollposition bleiben bei Sammlungsaktionen für denselben Eintrag erhalten.

## Ein gemeinsamer Katalogeditor

Moderator, Admin und Owner sehen den Modusschalter „DATENBANK BEARBEITEN“. Erst im aktiven Modus erscheinen Bearbeiten/Archivieren an Karten, Hinzufügen sowie Bearbeiten/Asset-Verwaltung im Dossier. Normale Benutzer erhalten diese Bedienelemente nicht; auch ein direkter Aufruf der Editorfunktion wird verweigert. Die bestehenden serverseitigen Schreibrechte bleiben unverändert.

Der vorhandene Formular-Renderer und Binder wurden innerhalb von `admin-panel.js` zur gemeinsamen Nutzung extrahiert. Inhaltseditor und Datenbank-Modal verwenden **denselben** Formularcode, Validierung, Duplicate-Prüfung, stabile ID-Erzeugung und `JMA_CATALOG.create/update` samt Revision. Das bestehende Prüfdatum kann im gemeinsamen Formular ebenfalls bearbeitet werden; zusätzliche bestehende JSON-Felder wie Quellen und Statistiken bleiben beim Speichern erhalten. Native Dialogfunktion sorgt für Tastaturfokus und Escape; ungespeicherte Änderungen behalten die vorhandene Verwerfensabfrage. Ein gewöhnlicher Website-Re-Render ersetzt das geöffnete Modal und seinen Entwurf nicht. Erfolgreiche Neuanlagen erscheinen unmittelbar ausgewählt in Katalog und Dossier.

Es gibt keinen zweiten Bild-Upload. Bei bestehender Verbindung öffnet „Bild / Asset verwalten“ die vorhandene Asset-Bibliothek mit genau der zugehörigen Asset-ID und aktueller Revision. Bei einem gespeicherten Katalogeintrag ohne Asset wird die vorhandene Neuanlagefunktion der Bibliothek mit stabiler Katalog-ID, Name, Kategorie und passendem Asset-Typ vorbefüllt. Der Entwurf wird erst durch eine ausdrückliche Benutzeraktion gespeichert. Ein neuer Katalogeintrag muss vor seiner Asset-Verwaltung zunächst gespeichert werden. Bestehende Legacy-Bildpfade werden nicht automatisch ersetzt.

## Reversible Entfernung ohne Migration

**Keine neue SQL-Migration erforderlich.** `catalog_entries.entry` ist bereits ein erweiterbares JSON-Objekt. Das optionale boolesche Feld `entry.archived` wird validiert und ausschließlich über den bestehenden revisionsgeschützten `JMA_CATALOG.update`-Weg gespeichert. Es gibt keinen DELETE-Aufruf, keine neue Tabelle und keinen lokalen Ersatz für Datenbankpersistenz.

Der Sicherheitsdialog zeigt den gewählten Eintrag, sein verfügbares Bild, den Legacy-Verweis und alle für den Verwalter lesbaren zentralen Asset-Verknüpfungen mit ihrem Status. Solange deren Prüfung nicht erfolgreich ist, bleibt die Bestätigung gesperrt. Abbrechen schreibt nichts. Eine veraltete Revision wird vom bestehenden Save-Weg zurückgewiesen.

Archivierte Einträge werden in der normalen `#/database` ausgeblendet. Im Admin-Bearbeitungsmodus können sie über „Archivierte Einträge“ geladen und wiederhergestellt werden, auch nach Reload. Der Datensatz, seine ID, Katalogfelder, Asset-Fremdschlüssel, Storage-Objekte und Assetstatus bleiben erhalten. Die vorhandene öffentliche SELECT-Policy bleibt unverändert: Archivierung ist eine reversible Ausblendung dieser Ansicht, keine Einschränkung bestehender API-Leserechte. Andere Seiten und deren Funktionen wurden nicht umgebaut.

## CSS-Bereinigung

Bestehende Datenbankregeln wurden in ihrem bisherigen CSS-Abschnitt direkt angepasst. Es gibt keine neue Override-Schicht am Dateiende, keine zweite Datenbankkomponente und kein neues `!important`. Detailtypografie und -felder sind zwischen Dossier und erhaltenem Dialog geteilt. Die bisherigen drei nachträglichen Detailbild-Overrides wurden in die bestehenden Basis-/Responsive-Regeln integriert und am Dateiende entfernt. Auch die wiederholten Media-Control-Regeln des gemeinsamen Inhaltseditors sind in ihrer ursprünglichen Definition konsolidiert.

Die statische Prüfung des Datenbankabschnitts bestätigt 280 Regeln ohne wiederholten vollständigen Selektor innerhalb desselben Media-Kontexts und ohne `!important`. Die gemeinsamen Editor-Media-Selektoren besitzen je eine Definition. Responsive-Regeln bleiben gezielt bestehen.

## Prüfungen

212 bestandene Browser-/Integrationsprüfungen auf isolierten lokalen Daten, keine produktiven Schreibtests:

- `node tests/database.cjs`: 43 Prüfungen. Drei Bereiche und drei Karten pro Reihe bei großem Desktop, markierte Auswahl, permanentes Dossier, Suche, Kategorie-/Prüfstatus-/Favoritenfilter, Sortierung, Pagination, Favorit/Jagdliste/Gefunden, Listenansicht, Reload, Desktop 1920/1280 und Mobil 390/360, keine horizontalen Überläufe oder Browserexceptions.
- `node tests/catalog-storage.cjs`: 13 bestehende Inhaltseditor-Prüfungen. Bearbeiten, Anlegen, Reload, Pflichtfelder, Duplicate-Prüfung, Revisionskonflikt, Rollen und bestehender Editor auf Desktop/Mobil.
- `ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --catalog-link`: 34 bestehende zentrale Bildprüfungen plus 47 direkte Datenbankprüfungen. Bestehende echte PostgreSQL-RLS über den vorhandenen Testadapter, aktiver Storage-Pfad für die tatsächliche Fuchs-ID, gemeinsame Modalfunktionen für alle drei Schreibrollen, Benutzerablehnung auch auf DB-Ebene, stabiler Entwurf nach Re-Render, Neuanlage, Duplicate-/Revisionsschutz, bestätigte Archivierung, Reload, Wiederherstellung und unveränderte Asset-Verbindung/-Revision. Direkte Asset-Weiterleitung sowie vorbefüllter Bibliotheksentwurf ohne zweite Uploadkontrolle. Desktop/390/360, Tastaturfokus und echtes Touch-Öffnen/Bearbeiten/Speichern bei 390 × 844 px.
- `ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs`: 75 vorhandene Asset-Bibliotheks-/Storage-Browserprüfungen. Unter anderem generische Asset-Neuanlage, Rollen, Status, Revisionen, Originaldateien, Uploadfehler, Konflikte, Signed URLs und mobile Bedienung.

Screenshots der Datenbank, des Dossiers und gemeinsamen Modals wurden visuell geprüft. Die isolierten Bildtests verwenden das vorhandene Branding-PNG unverändert als technische Fixture; sie erzeugen keine Produktionsbilder. Ergebnisse liegen im ignorierten `test-results/`.

Zusätzlich live ausschließlich lesend bestätigt: `catalog:cat-tier-fuchs` ist `active`, behält `catalog_id = cat-tier-fuchs` und verwendet den privaten Bucket `archive-assets`. Die vorhandene Signed-URL-Auflösung und der tatsächliche PNG-Download/Decode funktionieren; Upload-Metadaten nennen `Fox.png`, das Bild hat 304 × 304 px und 44.753 Byte. Keine Live-Owner-Sitzung und kein administrativer SQL-Zugang wurden verwendet. Es wurden keine Produktionsdatensätze, Assets oder Storage-Objekte angelegt oder geändert. Der vorherige vom Benutzer bestätigte End-to-End-Nachweis bleibt dokumentiert.

## Umfang und Preview

Geänderte Dateien: `app.js`, `styles.css`, `admin-panel.js`, `admin-panel.css`, `asset-library.js`, `supabase-client.js`, `index.html`, `tests/database.cjs`, `tests/catalog-assets.cjs`, `tests/database-admin.cjs` und dieser Bericht.

Keine Änderungen an Karten, Mutanten, Profil, Techwerkbank, Tutorial, Originalassets, bestehenden Migrationen, Storage-Architektur oder Rollen/RLS. Kein ZIP-/Massenimport, keine Phase 2B und keine produktiven Massenänderungen.

Preview: https://raw.githack.com/CHABOWEBco/once-human-Archiv-/admin-editor-preview/index.html#/database
