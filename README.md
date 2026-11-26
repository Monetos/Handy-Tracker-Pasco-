# Handy-Tracker

Web-App (PWA) für Android/Chrome: verbindet sich per Bluetooth mit dem kabellosen
PASCO-Magnetfeldsensor **PS-3221** und macht daraus einen „Handy-Detektor“ mit Radar,
Geigerzähler-Sound, Alarm und Fundliste.

## Installieren (einmalig)

Die App ist unter **https://monetos.github.io/Handy-Tracker-Pasco-/** veröffentlicht (Branch `gh-pages`).
In Chrome auf dem Handy öffnen → Menü ⋮ → **„App installieren“**. Danach läuft sie auch offline.

## Updates

- Die App prüft bei jedem Start, ob eine neue Version online ist, und zeigt dann oben „Neue Version verfügbar – Jetzt aktualisieren“. Manuell: *Mehr → App & Update → Nach Update suchen*.
- Einträge, Fotos und Einstellungen bleiben beim Update erhalten.
- Für Entwickler: Änderung machen, in `version.js` die Versionsnummer erhöhen, auf den Branch `gh-pages` pushen – fertig.

## Benutzen

1. PASCO-Sensor einschalten, in der App **Sensor verbinden** → „Mag Field …“ auswählen.
2. Sensor frei in die Luft halten, **Nullen** tippen.
3. Langsam an Taschen, Bänken, Jacken entlangführen. Je näher, desto schneller der Suchton; über dem Schwellenwert („Erfolgssound ab … µT“, direkt auf der Tracker-Seite einstellbar) gibt es Erfolgssound und Vibration.
4. Handy eingesammelt? **„📷 Handy eingesammelt“** öffnet sofort die Kamera; danach Name, Klasse und Notiz ergänzen – der Eintrag landet im Buch.

Die App wertet den **Betrag** des 3-Achsen-Feldes aus. Weil jede Achse einen Nullpunkt-Fehler hat, ändert sich der Betrag trotzdem beim Drehen; die **Dreh-Kalibrierung** (Mehr → Einstellungen) gleicht das aus.

Betriebsarten: **Suchen** (Sensor wird bewegt, drehunabhängig) und **Wache** (Sensor liegt still, z. B. an einer Ablage – empfindlicher).
Ohne Sensor lässt sich alles über *Einstellungen → Datenquelle → Demo* ausprobieren.

## Einzugsbuch

- **Einziehen:** Name, Klasse, Zeit, Lehrkraft, Notiz und Fotos des Geräts erfassen. Die App zeigt sofort, der wievielte Einzug im Schuljahr es ist:
  1. Einzug → Verwarnung, Verwahrung im Lehrerzimmer, Abholung nach Unterrichtsschluss durch die Schülerin / den Schüler;
  ab dem 2. Einzug → Verwahrung im Lehrerzimmer, Abholung nur durch die Eltern.
- **Buch:** Übersicht je Schuljahr (Beginn 1. August) mit Zähler pro Schüler/in, Abhol-Vermerk, CSV-Export und Backup.
- **Buchseite scannen:** Seite fotografieren, erkannte Zeilen gegen das Foto prüfen, übernehmen. Die Erkennung auf dem Gerät liest nur Druckschrift; für Handschrift gibt es unter *Mehr* eine KI-Erkennung mit eigenem Anthropic-API-Schlüssel (das Foto wird dann an Anthropic gesendet – vorher datenschutzrechtlich klären).
- Alle Daten liegen ausschließlich lokal auf dem Gerät.

## Handy-Sensor statt PASCO

Auf dem Tracker „Handy-Sensor“ wählen. Chrome gibt das Magnetometer erst frei, nachdem unter
`chrome://flags/#enable-generic-sensor-extra-classes` „Enabled“ gewählt und Chrome neu gestartet wurde.

## Grenzen

- Reichweite realistisch 5–15 cm: Magnetfelder fallen mit der dritten Potenz des Abstands ab.
- Der Sensor unterscheidet nicht zwischen Handy, Kopfhörer, Magnetverschluss und Stahl im Tischgestell.
- Das Bluetooth-Protokoll stammt aus PASCOs offener Python-Bibliothek (`pasco`); getestet wurde gegen einen simulierten Sensor, nicht gegen echte Hardware. Falls keine Messwerte kommen: *Hilfe & Diagnose* zeigt die empfangenen Rohdaten.
