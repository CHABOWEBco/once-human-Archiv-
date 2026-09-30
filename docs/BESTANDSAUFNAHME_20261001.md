# Aktuelle Bestandsaufnahme – Once Human Archiv

Stand: 01.10.2026 (Europe/Berlin). Neuer Ausgangspunkt nach B-03. Ausschließlich Prüfung und Dokumentation; keine weiteren Produkt-, Design-, Asset- oder Architekturänderungen.

## Git und technische Quelle der Wahrheit

| Merkmal | Geprüfter Stand vor diesem Dokumentationscommit |
|---|---|
| Repository | CHABOWEBco/once-human-Archiv- |
| Branch | admin-editor-preview |
| Lokaler HEAD | 78d0a1006e03e91c30091af8d2ccd74aff5ec97f |
| Lokaler Tree | 03dd1fbf19fcea5f4b2a89bdbb77a141c46ec3a9 |
| GitHub-HEAD | 8ecc12024889c0e2872c190e122a7889a46d8733 |
| Worktree | sauber |
| Synchronisierung | lokal 6 Commits voraus; alle Produktdateien identisch mit GitHub |
| Unterschied im Tree | nur 24 lokale Audit-Dokumentations-/Nachweisdateien aus dem ursprünglichen Block-B-Bericht |
| main | unverändert: 94ab9f8fa408fc1ed3bd1721961321c0cec2eb45 |

Die zusätzlichen lokalen Commits bestehen aus dem alten Auditbericht, Merge-Commits und einem lokalen, inhaltlich bereits remote gesicherten PNG-Commit. Daher ist die Historie nicht vollständig synchron, obwohl der Website-Code und die Produktassets identisch sind. Keine Git-Bereinigung, kein Rücksetzen und kein Nachpublizieren alter Auditdateien in dieser Bestandsaufnahme. Dieser neue Bericht und sein JSON-Nachweis werden als reine Dokumentation auf admin-editor-preview gesichert; ihr Commit ist über git log ermittelbar.

Seit dem geprüften Produktstand 55ac107 wurden außerhalb von docs nur supabase-client.js, routes-full.js, live-map.js, admin-panel.js und die neue Original-PNG verändert. Sämtliche CSS-Dateien sind gegenüber diesem Stand unverändert.

## Prüfung dieses Durchgangs

- Aktueller Checkout: 153 versionierte Dateien vor dieser Dokumentation, darunter 88 Produktassets.
- Aktuelle Browser-Bestandsaufnahme: alle 30 Routen bei 1920 und 390 px, zusammen 60 Renderzustände; zusätzlich 25 Unteransichten einschließlich zehn Profilkategorien und acht Adminansichten sowie vier Rollen.
- Kein fehlender Renderer, keine doppelten DOM-IDs, keine Browser-JavaScript-Ausnahme und kein defektes sichtbares Bild in diesen Zuständen.
- Die elf weiterhin fehlenden Katalogbildpfade erzeugen abgefangene 404-Anfragen im Editor; der vorhandene Fallback wird korrekt dargestellt. Assetbestand und funktionierender Bildfallback sind unterschiedliche Sachverhalte.
- Alle 19 vorhandenen JS/MJS/CJS-Dateien bestehen node --check; git diff --check bestanden.
- 88 Produkt-Bilddateien geprüft: 87 decodierbar, eine alte ungenutzte WebP beschädigt. Shattered-Maiden-PNG erneut byteidentisch mit dem bereitgestellten Original verifiziert.

Die Browserprüfung verwendet die vorhandene Auth-Testfixture mit simulierten Rollen. Keine echten Accounts, E-Mails, Passwörter oder Backenddaten verändert. Diese Bestandsaufnahme wiederholt keine vollständige CRUD-/Import-/Touch-Testmatrix; die gezielten Reparaturprüfungen bleiben in den jeweiligen Blockberichten dokumentiert. Nicht bestätigt: aktuelle Supabase-Allowlist, tatsächlich angewendete Live-RLS, echter Recovery-End-to-End-Ablauf, Safari/Firefox, echte Mobilgeräte oder Aktualität externer Spielwerte. Lokale Browserzustände belegen nicht den aktuellen raw.githack-Cache.

## Vollständiges Routeninventar

27 reguläre ROUTES-Einträge und drei zusätzliche Renderer: 30 renderbare Routen. Die Gruppierung dient hier nur dem Inventar.

| Bereich | Vorhandene Routen |
|---|---|
| Einstieg und Überblick | home, dashboard |
| Wissen | news, guides, patchwatch, secrets |
| Datenbank und Fachseiten | database, weapon-blueprints, armor-blueprints, armor-materials, deviations, mods, compare-weapons, compare-armors, memetics, vehicles, creatures |
| Werkzeuge | builds, tech-workbench |
| Karten | map, live-map, routes |
| Persönliche Planung | hunt, planner |
| Community | community, submissions, exchange |
| Account | profile, settings |
| Administration | admin |

collection ist ein Weiterleitungsalias auf den Sammlung-Reiter des Profils, keine zusätzliche renderbare Seite. settings/profile, settings/notifications und settings/security sind vorhandene Einstellungsunterbereiche. Die Hauptnavigation bietet Start, Datenbank, Karte, Builds, Techwerkbank, Community und Guides. Account-/Einstellungswege ergänzen Profil, Live-Karte und Administration; die globale Routensuche erfasst die 27 regulären Einträge.

## Profil, Sammlung und Einstellungen

Profil: Übersicht/Sammlung, Banner/Avatar/Name/Status, Fortschrittszahlen, Galerie, persönliche Verweise, lokaler Export und Werkzeugdaten-Löschung. Sammlung nutzt den vorhandenen Katalog mit Favoriten/Gefunden; sie ist bereits integriert. Der Katalog besitzt 21 Einträge in 14 Kategorien. Keine zusätzliche Sammlungsseite erforderlich.

Bearbeiten öffnet settings/profile. Zehn vorhandene Kategorien: Allgemein, Profilbild, Banner, Farben, Über mich, Highlights, Widgets, Rahmen, Ringe & Kränze, Trophäen. Gemeinsamer Entwurf und zusammengesetzte Livevorschau. B-02 bindet den bisherigen Namen-Speichervorgang auch im eingebetteten Editor; andere Kategorien nutzen denselben vorhandenen Profiladapter.

Aktuelle Vorschau liegt oberhalb der Bearbeitungsflächen. Bei 1920 px: Höhe 167 px, beim Banner 187 px; Position und Breite bleiben gleich. Der bestätigte 20-px-Höhenwechsel ist weiter offen. Der alte versteckte Drawer bleibt auf der Profilroute einschließlich Auswahlbuttons/Bindern bestehen; er wurde nicht entfernt.

Einstellungen: Darstellung, Profil, Benachrichtigungen, Sicherheit. Bestehende Theme-/Akzent-/Dichte-/Radius-/Schrift-/Bewegungsoptionen, Welcome-Hinweis und Passwortformular. Darstellungsoptionen beziehen sich auf Admin, Live-Karte und Profil; kein automatisch vereinheitlichtes Styling aller Routen. Freie Farben und vollständiges Abschalten des Glows bleiben nicht freigegebene Erweiterungen. Die Profil-Routenbeschreibung erwähnt Sicherheit/2FA, aber es existiert keine echte 2FA-/Geräteverwaltungsfunktion.

## Beide Karten

| Merkmal | map | live-map |
|---|---|---|
| Implementierung | routes-full.js | live-map.js |
| Einstieg | Hauptnavigation/Startseite | Einstellungs-/Accountumfeld |
| Bild | vorhandene Weltkarte 1536 × 1024 | dieselbe Weltkarte |
| Funktionen | Szenario, Filter, Suche, Marker, Route, Pan/Zoom/Reset | dieselben Kernfunktionen, eigenes Bedienlayout und Speichern |
| Zoomgrenze | 1–2,4 | 1–2,6 |
| Shared State | jma_map_* und vorhandene Marker/Routen | dieselben Keys |
| Wesen | keine entsprechenden Dekorationen | Original Shattered Maiden und vorhandener Butterfly Emissary |

Sechs auswählbare Szenarios, vier vorhandene Winter-Basismarker. Keine sechs eigenständigen Kartenassets oder nachgewiesene Live-Spieltelemetrie. Unbekannte Spielkoordinaten bleiben leer. Gemeinsame Filter-/View-Keys koppeln beide Routen; unterschiedliche Zoomobergrenzen bleiben bestehende Struktur.

B-06 hält Fokus und Cursor beim Live-Suchfilter. B-03 verwendet jetzt assets/live-map/shattered-maiden.png: unverändertes Nutzeroriginal, PNG 304 × 304 RGBA; SHA-256 f3ce113d68f9cfaad5855d173be1319a143e2f916e1ef0ceb02e4fef359adf01. Animation 3,6 s, Desktopbild 66 × 66 px, mobil 55 × 55 px, Navigator-Z-Index 8. Butterfly: vorhandenes WebP, 7 s, Z-Index 7. Animation, Position, Größe und Layering wurden beim Fix nicht geändert; Reduced Motion bleibt erhalten.

## Admin, Moderator und Owner

Acht bestehende Ansichten: Übersicht, Inhalte & Seiten, Inhaltseditor, Karte & Marker, Moderation, Nutzer & Rollen, Audit & Aktivität, System & Sicherheit.

| Rolle | Aktuell sichtbarer Zugriff in der Fixture |
|---|---|
| user | kein Adminzugang |
| moderator | Übersicht, Inhalte, Editor, Karte, Moderation; Nutzer/Audit/System gesperrt |
| admin | alle acht Ansichten |
| owner | alle acht Ansichten |

Editor hat Suche/Filter, Auswahl, stabilen Drawer und lokale Textvorschau. Bestehender Logo-Fallback verhindert jetzt kaputte Bilder auf allen 21 Karten plus ausgewählter Vorschau. Katalogdaten werden dadurch nicht verändert. Editor-Schreiben, globale Rollenmutation, Moderations-RPC und Server-Audit sind ausdrücklich nicht angebunden. Lokale Moderations-/Aktivitätsansichten sind kein globales Backend. Sichere Preview-Beschränkungen bleiben bestehen.

## Auth, Supabase und Daten

Bestehender zentraler Supabase-Client mit Projektverbindung und öffentlichem Publishable-Key. Login, Registrierung, Logout, Session-Restore, Recovery, Profil-/Rollenbezug und Profil-Update vorhanden. B-01 korrigiert Recovery auf admin-editor-preview. B-02 verwendet den bestehenden updateProfile-/Appearance-Speicherpfad; kein zweites Auth- oder Profilmodell.

Migration: profiles und user_roles; Rollen user/moderator/admin/owner; Profil-/Standardrollen-Trigger, Backfill und private Rollenhelfer. RLS im Repository enabled/forced; authenticated liest eigenes Profil/eigene Rolle und aktualisiert nur display_name/avatar_url. Keine Client-Rollenmutation. Kein Service-Role-Key im Frontend erkannt. Tatsächlicher Datenbankzustand ist weiterhin nicht live verifiziert.

Werkzeugdaten werden überwiegend über JMA_STORE kontogetrennt lokal gespeichert. Eigene Medienbytes liegen in IndexedDB; Account-Metadaten allein synchronisieren diese Bytes nicht auf ein zweites Gerät. Beiträge/Einreichungen/Werkstattdaten sind lokale Browserstände. Export und Werkzeugdaten-Löschung verwenden Teillisten, nicht alle persönlichen Schlüssel/Medien.

Funktionsbestand: Datenbanksuche/-filter/-sortierung, Pagination und Detaildialog; Favoriten/Jagd/Gefunden; Jagdpriorität; gespeicherte Farmrouten; Einsatzpläne; Guides/Kapitel; Prüf-/Geheimnisnotizen; Buildslots und JSON-Import/Export; Fachkataloge und Vergleiche; Tech-Analyse/Materialmix/Rezeptrechner; lokale Community/Einreichungen/Werkstatt; Profilgestaltung/Galerie; Einstellungen und sichere Adminvorschau. Fachbestände bleiben kuratiert und teilweise unvollständig; keine erfundenen Ergänzungen.

## Assets und technische Altlasten

- 88 Produktassets: 68 gültige PNG, 19 gültige WebP, eine beschädigte WebP. Insgesamt etwa 8,43 MB.
- Beschädigt, derzeit unreferenziert: assets/live-map/shattered-maiden.webp. Nicht gelöscht; die gültige PNG wird benutzt.
- 26 verschiedene fehlende wörtliche Bildpfade in den Produktionsdaten. Davon elf aktuelle Katalogpfade; die übrigen sind überwiegend historische archive-data.js-Referenzen. Die vollständige Liste und Quellzuordnung stehen im JSON-Nachweis. Keine davon still ersetzt oder entfernt.
- Hauptdatenbank zeigt den bestehenden ehrlichen Bildfallback; Admin nutzt den dort schon definierten Logo-Fallback. Fehlende Original-Itembilder bleiben eine Daten-/Assetaltlast.
- Das sechs PNG umfassende Mutanten-ZIP wurde nicht integriert. Shattered Maiden kam aus der separat bereitgestellten Originaldatei.
- Statische Pfadscan-Ergebnisse dürfen dynamische asset()-Aufrufe nicht als „ungenutzt“ einstufen: feature-guides.webp wird zum Beispiel auf home tatsächlich verwendet.
- Alter Profil-Drawer/Bindercode, ungenutzte mapPreviewCategories/mapResourcePreview und norm sowie Binder für nicht gerenderte Build-Steuerungen bleiben Bereinigungskandidaten.
- Global geladene live-map.css-Regeln für .cyan-btn/.dialog-close können andere Bereiche beeinflussen; wiederholte Settings-/Profil-/Admin-CSS-Regeln erschweren Änderungen. Wiederholung ist nicht automatisch ein Fehler oder eine Löschfreigabe.
- Supabase-CDN ist auf @2 statt auf eine exakte Version bezogen. Alle lokalen Scripts/Styles werden global geladen; große versteckte Profil-Auswahl bleibt aufgebaut. Keine neue Performanceoptimierung.
- index.html enthält weiterhin ältere Versionsquerys an Script-/Stylesheetpfaden. Aktualität eines externen CDN-/Browsercaches muss bei künftiger Liveprüfung berücksichtigt werden; hier keine Cache-Reparatur.
- Historische Tests verwenden externe Laufzeitpfade, alte Quellvergleiche und teils den früheren Drawer-Ablauf. Vor erneuter Verwendung ihre Aussagekraft prüfen; keine Testdatei aktualisiert.

## Erledigt / offen aus Block B

| Punkt | Status | Aktueller Befund / nächster Bedarf |
|---|---|---|
| B-01 Recovery-Redirect | erledigt | Zielbranch korrekt; echter E-Mail-/Allowlist-Nachweis bleibt ein Live-Prüfpunkt |
| B-02 Allgemein speichern | erledigt | vorhandener gemeinsamer Profil-Speichervorgang gebunden; Fehlerfall/Reload/Enter geprüft |
| B-03 Bilder | erledigt | Original-PNG byteidentisch; Admin-Fallback wirksam; fehlende Itemoriginale und ungenutzte defekte WebP bleiben dokumentierte Altlasten |
| B-04 Mobile Anschnitte | offen, P1 | home/submissions kleine Überstände; secrets Karten/Buttons; armor-materials und beide Vergleichstitel deutlich abgeschnitten |
| B-05 Footer-Logo | offen, P1 | auf 23 Routen übergroß/überlagernd; Footer-/Größen-CSS korrigieren |
| B-06 Live-Suchfokus | erledigt | Fokus/Cursor erhalten; nach Routenwechsel kein ausstehender Refokus |
| B-07 Profilstruktur/Vorschau | offen, P2 | Banner-Vorschau 20 px höher; alter Drawer aufgebaut; Struktur-/Entfernungs-GO erforderlich |
| B-08 Prüfdatum | erledigt | aktueller Kalendertag; Uhrzeit-/Zeitzonenoffsets für Tagesdifferenz normalisiert |
| B-09 Semantik/Labels | offen, P2 | verschachtelte main in acht Routen; falsches aria-labelledby in Profilsettings; fehlende Formularlabels |
| B-10 Leermeldungen | offen, P2 | mehrere Fachsuchseiten zeigen keinen klaren Nulltrefferhinweis |
| B-11 Lokaler Datenumfang | offen, P2 | Export/Löschung nur Teillisten; Medien/Gerätesynchronisierung und gewünschter Umfang klären |
| B-12 Backendvollständigkeit | offen, P2 | sichere globale Moderation/Rollenverwaltung/Server-Audit fehlt; Live-RLS/Redirectkonfiguration verifizieren |
| B-13 CSS-/Codealtlasten | offen, P3 | globale Kartenregeln, wiederholte Regeln, alte Binder; gezielt prüfen, nichts pauschal entfernen |
| B-14 Historische Texte/Zähler | offen, P3 | Admin zählt fest 28 statt 30; alte Brandingtexte und begrenzte Routensuche |

Damit fünf erledigte und neun offene Auditpunkte. „Erledigt“ bezieht sich auf den konkret bestätigten Fehler, nicht auf einen vollständigen Ausbau aller zugehörigen Systeme.

## Aktueller Design-/Layoutstand

Bestehendes dunkles Archiv-/HUD-Design mit Cyan-/Rotakzenten und vorhandener Bildsprache. Start, Techwerkbank, beide Karten, Profil und Admin bleiben in ihren bestehenden Strukturen. Kein neuer Designstil und keine neue CSS-Schicht seit Auditbeginn.

Aktuell erneut reproduziert bei 390 px: home bis x=395, submissions bis x=394, secrets Titel/Karten/Buttons bis x=459–461, armor-materials Titel bis x=568, compare-weapons bis x=464 und compare-armors bis x=521. Dokumentweite Overflowmessung kann diese Anschnitte wegen overflow-x:hidden übersehen. Offscreen-Kartenmarker sind eine beabsichtigte Viewportbegrenzung; die mobile Adminleiste ist bewusst horizontal scrollbar und wird nicht als derselbe Fehler behandelt.

Footer-Überlagerung aus B-05 bleibt offen; keine betroffene Style- oder Footerdatei verändert. Profilvorschauhöhe wurde im aktuellen Durchlauf erneut gemessen. Namensfarbwirkung, Buttons und gewünschte Preview-Anordnung sind gestalterische Freigabepunkte und wurden nicht eigenmächtig angepasst.

## Dokumentationsstand

| Dokument | Einordnung |
|---|---|
| Dieser Bericht + JSON-Nachweis | aktuelle technische Bestandsaufnahme nach B-03; Ausgangspunkt für nächste Arbeiten |
| B03_IMAGES_COMPLETE_20261001.md | zutreffender B-03-Abschluss mit separat gefundenem Original |
| B03_IMAGES_PARTIAL_20261001.md | historischer Teilstand; Original-Blocker inzwischen erledigt |
| B02_B06_B08_20261001.md | weiterhin zutreffende Reparatur-/Prüfnachweise |
| B01_RECOVERY_20261001.md | zutreffende Redirectkorrektur; damaliges STOPP durch spätere GO ersetzt |
| BLOCK_A_20261001.md | historische Ausgangssicherung; damaliger HEAD nicht heutiger HEAD |
| BLOCK_B_20261001.md | ursprünglicher Audit, lokal mit Screenshots/Logs; fünf Befunde inzwischen behoben, als heutige offene Liste überholt |
| WORK_STATUS.md | historisch, 28.09.; alter Branch-/Deploymentstand und ältere Bestände |
| FUNCTIONAL_TRANSFER.md | historische Funktionsübernahme; alter Branch und früherer Drawer-Ablauf |
| CATALOG_IMPORT.md | Importregeln weiterhin passend; keine zugesagte vollständige Itembildsammlung vorhanden |
| supabase/README.md | Verbindungsstatus überholt: behauptet noch fehlende Frontendanbindung; Schema-/Rechtebeschreibung bleibt relevant |
| README.md | nur Repositorytitel; keine ausreichende aktuelle Betriebs-/Projektbeschreibung |

Keine historische Dokumentation überschrieben oder gelöscht. Bei Abweichungen ist zuerst der tatsächliche Repositorybestand zu prüfen; diese neue Bestandsaufnahme ergänzt die historischen Berichte. Fachliche Produktentscheidungen und weitere GO-Grenzen bleiben beim Nutzer.

## Nächster sinnvoller Block und STOPP

B-04: nur die bestätigten mobilen Titel-/Grid-Überstände korrigieren; vorhandene Typografie und Funktionen erhalten, auf den betroffenen Routen gezielt responsive prüfen. Dafür muss Umbruch-/Grid-/Responsive-CSS sichtbar geändert werden. Erst nach ausdrücklichem GO. B-05 und spätere Punkte werden nicht automatisch mitgezogen.

Preview: https://raw.githack.com/CHABOWEBco/once-human-Archiv-/admin-editor-preview/index.html

Nachweis: [BESTANDSAUFNAHME_20261001.json](BESTANDSAUFNAHME_20261001.json). Er enthält den aktuellen Routen-/Rollen-/Assetbefund, mobile Elementgrenzen und Profilvorschau-Abmessungen.

STOPP. Diese Bestandsaufnahme hat keine neue Reparatur begonnen.
