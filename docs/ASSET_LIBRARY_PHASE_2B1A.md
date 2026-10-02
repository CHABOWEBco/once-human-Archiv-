# Phase 2B.1A — SHA-Repräsentanten und echter Cosmetic-Dry-Run

Stand: 02.10.2026. Branch ausschließlich `admin-editor-preview`. Lokaler und tatsächlicher Remote-Ausgangsstand: `68958546a459ca672b689c90852e3f7e195d15cb`, Worktree sauber. `main` bleibt bei `94ab9f8fa408fc1ed3bd1721961321c0cec2eb45`.

## Korrigiertes Verhalten

Die alte Standardauswahl schloss sämtliche Mitglieder exakter SHA-Gruppen aus. Der bestehende Importer verwendet jetzt eine gemeinsame `selectRepresentatives()`-Auswahl nach der Klassifizierung sowie nach lokalen Admin-Entscheidungen. Kein zweiter Asset-, Storage- oder Importcontroller.

- Ein sicher bekannter SHA aus den geladenen Asset-Metadaten deckt alle Gruppenmitglieder ab: standardmäßig kein neuer Kandidat, Status `BEREITS VORHANDEN`. Unterschiede in den vorgeschlagenen Verwendungen ändern diesen Byte-Nachweis nicht und typisieren bestehende Assets nicht um.
- Eine neue Gruppe mit mindestens einem vollständigen, eindeutig klassifizierten Mitglied erhält genau einen Standardrepräsentanten. Eindeutige Manifestklassifizierung hat Vorrang; danach entscheidet der unveränderte vollständige `source_path` in stabiler Zeichenreihenfolge. Review-Mitglieder sind keine Kandidaten für diese Auswahl.
- Die weiteren Mitglieder tragen `DUPLIKAT – DURCH REPRÄSENTANT ABGEDECKT` und nennen den Repräsentantenpfad. Ihre ursprüngliche Review-Zuordnung wird durch die Byte-Abdeckung nicht automatisch bestätigt.
- Vollständig ungeklärte Gruppen bleiben `DUPLIKATGRUPPE IN REVIEW` ohne automatische Vormerkung.

Teil-Reihenfolge, zufällige technische IDs und erneutes Einlesen ändern die endgültige Auswahl nicht. Kommt später ein höher priorisiertes Mitglied hinzu, übernimmt es die Repräsentation; bestehende IDs bleiben erhalten.

Manuelle Vormerken-/Überspringen-Entscheidungen bleiben erhalten. Eine bewusst vorgemerkte andere Quelle übernimmt die Repräsentation statt eines zusätzlichen automatischen Kandidaten. Wird der Repräsentant übersprungen, übernimmt die nächste geeignete ungesperrte Quelle. Werden alle geeigneten Mitglieder übersprungen, nennt der Bericht diesen Grund. Bewusst mehrfach vorgemerkte identische Quellen bleiben möglich und werden als `duplicate_groups_multiple_selected` zusätzlich gezählt; die Zahl eindeutiger Bildinhalte steigt dadurch nicht. Der Produktionsimport bleibt gesperrt.

## Herkunft und vorhandene Validierung

Der spätere Kandidat erhält im vorhandenen `metadata` ein `duplicate_sources`-Array mit **allen** identischen Originalquellen, mindestens `source_path` und `original_name`, zusätzlich der vorbereiteten ursprünglichen Kategorie, falls vorhanden. Auch Review-Mitglieder gehören zur vollständigen Herkunft des ausgewählten Bildes.

Der JSON-Export enthält jede Gruppe einmal als `duplicate_groups`, einschließlich Quellen, Repräsentant und Entscheidungsgrund. Dadurch bleibt auch die Herkunft ungeklärter oder ausdrücklich übersprungener Gruppen erhalten. Nur tatsächlich vorgemerkte und valide Dateien bekommen einen vorbereiteten `candidate`; sämtliche Dateieinträge bleiben im Bericht.

Die bestehende `ASSET_LIBRARY_MODEL.validate()`-Validierung und deren 32-KB-Metadatenlimit bleiben unverändert. Falls eine außergewöhnlich große Quellenliste dieses Limit verletzt, wird sie nicht abgeschnitten: Die Gruppe bleibt mit Validierungsfehler und dokumentiertem Grund ohne Kandidaten. Originalquellen bleiben vollständig im lokalen Gruppenexport. Im echten Cosmetic-Pilot trat kein solcher Fehler auf (maximal 24 Mitglieder je SHA-Gruppe).

`ASSET_LIBRARY_MODEL.inspectUpload()`, Originalbytes, bestehende Profilvorschau, Rollen, `JMA_ASSET_STORE`, Storage und RLS bleiben erhalten. Keine neue Dependency, Tabelle, Migration oder Backendoperation.

## Echte Pilotdateien und Ergebnis

Gemeinsames `source_package`: `OnceHuman_CMS_v2_01_Profile_Cosmetics_Shop.zip`.

Über die native Dateiauswahl des bestehenden Admin-Importers in Chromium eingelesen:

- `OnceHuman_CMS_v2_01_Profile_Cosmetics_Shop_Part01.zip`
- `OnceHuman_CMS_v2_01_Profile_Cosmetics_Shop_Part02.zip`
- `OnceHuman_CMS_v2_01_Profile_Cosmetics_Shop_Part03.zip`
- `OnceHuman_CMS_v2_Manifest.csv`
- `OnceHuman_CMS_v2_Review_Queue.csv`

| Kennzahl | Echter gemeinsamer Dry Run |
|---|---:|
| Gesamtdateien | 1.665: 1.663 Bilder und 2 CSVs |
| Gültige / ungültige Bilder | 1.663 / 0 |
| Formate | PNG 1.663; JPEG / WebP jeweils 0 |
| Automatisch klassifiziert | 1.530, vollständig über Manifest |
| Ordner / SHA-Klassifizierung / Dateinamenregel / manuell | jeweils 0 |
| Weiterhin ZUORDNUNG PRÜFEN / Quelle unresolved | 133 |
| Namensduplikate | 0 |
| Dateien in exakten SHA-Gruppen | 700 |
| Exakte Duplikatgruppen gesamt | 234 |
| Gruppen mit neuem Repräsentanten | **225** |
| Gruppen durch vorhandenen gespeicherten Asset-SHA abgedeckt | 0 |
| Gruppen vollständig in Review | **9** |
| Eindeutig klassifizierte neue Gruppen ohne Repräsentanten | **0** |
| Tatsächlich übersprungene redundante Kopien | **447** |
| Vorgemerkte eindeutige Bildinhalte / Kandidaten, final | **1.083 / 1.083** |
| Übersprungene Kandidaten, final | **580** |
| Manuell mehrfach vorgemerkte SHA-Gruppen | 0 |
| Unabhängig bestätigte vorhandene Alt-Avatare | 2, beide lokal übersprungen |
| Belegte frühere Importe mit gleichem Paket + Pfad + SHA | 0 |

Damit steigt die finale Vormerkung gegenüber dem vorherigen Dry Run von 858 auf **1.083**, genau um die 225 neuen Repräsentanten. Keine eindeutig klassifizierte neue SHA-Gruppe geht mehr ausschließlich aufgrund mehrerer identischer Quelldateien verloren.

Die 580 übersprungenen Dateien bestehen aus 445 eindeutig klassifizierten redundanten Kopien, 133 Review-Fällen und zwei bereits vorhandenen Alt-Avataren. Die Kennzahl 447 redundante Kopien umfasst außerdem zwei Review-Dateien, deren identische Bildbytes von einem eindeutigen Repräsentanten abgedeckt sind; diese zwei gehören zugleich zu den 133 Review-Fällen. Zählmengen werden deshalb nicht blind addiert. Die neun reinen Review-Gruppen enthalten zusammen 28 Dateien.

| Asset-Typ | Alle Bilddateien | Final vorgemerkt |
|---|---:|---:|
| image | 1.347 | 965 |
| trophy | 178 | 115 |
| avatar | 5 | 3 |
| Offen | 133 | 0 |

Kategorien: `profile` 1.530, offen 133; alle 1.083 vorgemerkten Kandidaten gehören zu `profile`. `image` wird nicht automatisch zum Avatar umgewandelt. Die Review Queue bleibt vollständig erhalten: 124 vorbereitete Pfade aus `Shop/Packs_Gifts`, 9 aus `Shop/Passes`. Keine erfundene visuelle Klassifizierung.

## Bestandsabgleich und Grenze

Ein frischer öffentlicher, ausschließlich lesender Live-GET bestätigte 128 aktive Asset-Zeilen; eine enthält einen gespeicherten SHA. Kein Pilotbild trifft diesen gespeicherten Hash. Die Repräsentantenentscheidung benutzt weiterhin diese bestehende Hash-Metadatenquelle.

Zusätzlich wurden die zwei aus dem vorherigen Dry Run bekannten Treffer erneut gegen unveränderte Repository-Bytes und die aktuellen aktiven Live-Zeilen bestätigt:

- `profile:avatar:aberrant-progeny` → `Profile/Avatars/Avatar_ Aberrant Progeny.png`
- `profile:avatar:ace-investigator` → `Profile/Avatars/Avatar_ Ace Investigator.png`

Beide sind im Pilot **Einzeldateien**, keine Mitglieder der 234 Duplikatgruppen. Sie besitzen noch keinen gespeicherten SHA und wurden über die vorhandene lokale Überspringen-Aktion ausgeschlossen. Die native Vormerkung vor dieser zusätzlichen Prüfung beträgt 1.085; final 1.083. `known_images` im unveränderten Metadatenabgleich ist deshalb 0; der ergänzende Byte-Nachweis nennt zwei Treffer. Es wurden keine Live-Metadaten ergänzt.

Ohne authentifizierten privaten Live-Lesezugriff können draft-/inactive-/archived-Assets nicht vollständig abgeglichen werden. Die Aussage über bereits vorhandene Assets gilt für den verfügbaren Hashbestand plus die ausdrücklich verifizierten statischen Treffer; sie ist kein vollständiger privater Produktionsbestandsnachweis. Alte statische Assets ohne gespeicherten SHA werden vom Importer weiterhin nicht automatisch heruntergeladen oder nachsigniert.

## Tests und Abnahme

**162 isolierte Chromium-Prüfungen bestanden:** 87 Batchprüfungen (vorher 64, zusätzlich 23) und 75 bestehende Asset-Editor-/Storage-Regressionen. Desktop 1920 und Mobil 390 einschließlich Touchzielen und vorhandener Profilpreview bestanden; Screenshots visuell geprüft.

Zusätzliche Fälle: Manifest vor Ordner trotz lexikalisch späterem Pfad, bekannte Hashgruppe mit verschiedenen vorgeschlagenen Nutzungen, alle Mitglieder Review, gemischte eindeutige/Review-Gruppe, vollständige Herkunft im Kandidaten, Reportpartitionen, neue IDs ohne Auswahländerung, umgekehrte Teilreihenfolge, später hinzukommender früherer Pfad, manuelle Übernahme/Fallback/kompletter Skip/mehrfache Auswahl, bestehendes Metadatenlimit ohne Quellenverlust sowie UI-Rollenfilter und sofortige Neuberechnung nach Entscheidungen. Ein früher UI-Test erwartete irrtümlich einen gespeicherten Hash in der ungehashten Legacy-Fixture; korrigiert wurde die Testannahme, nicht der Bestandsnachweis.

Die vorhandenen Testharness verwenden einen festen Port. Parallel gestartete Suiten kollidierten mit dem echten Pilot-Harness; die abschließenden vollständigen Suiten liefen erfolgreich nacheinander.

Reproduktion:

```bash
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs --batch-import
ASSET_TEST_PGLITE=/tmp/asset-library-sql-test/node_modules/@electric-sql/pglite node tests/asset-library.cjs
```

Der echte Pilot wurde zusätzlich vollständig über native Files eingelesen und exportiert, nicht nur als synthetischer Test. Part03 wurde tatsächlich erneut ausgewählt: 338 Wiederholungen nicht doppelt gezählt, IDs stabil. Für **jede der 1.197 eindeutigen SHA-Inhalte** wurde die finale Auswahl unabhängig geprüft: neue eindeutig klassifizierte Inhalte genau einmal, ungeklärte Inhalte keinmal, die zwei sicher bekannten Bilder ausgeschlossen. Für sämtliche 225 neuen Gruppenrepräsentanten stimmt `duplicate_sources` exakt mit allen Mitgliedern der jeweiligen Gruppe überein. Jeder Bildhash, jede Dimension und Größe stimmt mit der unabhängigen ZIP-/Bildprüfung überein.

Im echten Pilot und gesamten Batchtest: **0 API-Schreibaufrufe, 0 Storageuploads, lokaler Test-DB-Bestand unverändert, keine Browserexception**. Die normale Einzelupload-Regressionssuite schreibt ausschließlich in ihre isolierte PGlite-/Storage-Fixture, niemals in Produktion. Alle Kandidaten `draft`, keine Storage-/Bildpointer, Importbutton deaktiviert. Keine Veröffentlichung, Migration oder Phase 2B.2.

## Dateien und Artefakte

Repositoryänderungen: `asset-library-import.js`, `tests/asset-library-import.cjs`, historischer Verweis in `docs/ASSET_LIBRARY_PHASE_2B1.md`, dieser Auditbericht. Keine Änderungen an Asset-Modell, Einzelupload, Admin-Popup, Supabase, RLS, Storage oder anderen Websitebereichen.

Die Original-ZIPs und umfangreichen JSON-/CSV-/Bildartefakte liegen außerhalb des Checkouts unter `/workspace/cosmetic-pilot-2b1a-reports/`:

- `COSMETIC_DRY_RUN_FINAL.json`: nativer gemeinsamer Bericht, sämtliche Dateien, Gruppen und vorgemerkte Kandidaten.
- `COSMETIC_SHA_COVERAGE.csv`: Nachweis pro SHA-Inhalt, Repräsentant oder dokumentierter Ausschlussgrund.
- `COSMETIC_DUPLICATE_GROUPS.csv`: alle 234 Gruppen und 700 Originalquellen.
- `COSMETIC_REVIEW_QUEUE.csv`: die 133 offenen Dateien.
- `COSMETIC_COVERAGE_CHECK.json`, `COSMETIC_BROWSER_CHECKS.json`, `COSMETIC_LOCAL_SELECTION_NOTES.json`, `COSMETIC_KNOWN_ASSET_COMPARISON.json`, `COSMETIC_INDEPENDENT_VERIFICATION.json`: maschinenlesbare unabhängige Belege.

Preview nach GitHub-Sync: finale Commit-URL `index.html#/admin` → bestehende berechtigte Anmeldung → Asset-Bibliothek → ZIP / ORDNER IMPORTIEREN. Der immutable finale HEAD wird im Abschluss genannt. Der externe Raw-Githack-Abruf ist durch die Cloud-Netzwerkpolicy nicht freigegeben; die Abnahme lief lokal in echtem Chromium.

**STOPP. Keine Phase 2B.2 ohne separates GO.**
