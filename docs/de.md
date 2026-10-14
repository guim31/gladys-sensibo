# Sensibo

Steuere über Gladys die Klimaanlagen und Luft-Luft-Wärmepumpen, die ein
[Sensibo](https://sensibo.com) (Sky, Air, Air Pro) bedient, über die offizielle
Cloud-API von Sensibo: Ein/Aus, Modus, Solltemperatur, Lüfterstufe und Lamellen,
Climate React sowie die Raumtemperatur, Luftfeuchtigkeit und Luftqualität, die
das Sensibo misst. Das Sensibo Pure (Luftreiniger) und das Elements
(Luftqualitätsmesser) werden ebenfalls unterstützt. Ein Dashboard-Widget zeigt
alle Klimaanlagen mit den Tasten Ein und Aus, und Szenen reagieren, wenn ein
Sensibo offline geht oder ein Filter gereinigt werden muss.

> **Ohne die Hardware entwickelt: Rückmeldungen willkommen.** Diese Integration
> wurde mit einer simulierten Sensibo-Cloud gebaut und getestet, gespeist mit
> echten Geräten aus den Testdaten von pysensibo und Home Assistant, nicht mit
> einem echten Sensibo-Konto. Wenn etwas nicht wie beschrieben funktioniert,
> sag es im [Gladys-Forum](https://community.gladysassistant.com) oder in den
> [Issues](https://github.com/guim31/gladys-sensibo/issues).

## Voraussetzungen

- Gladys Assistant 5.1.0 oder neuer.
- Ein **Sensibo-Konto**, mit deinen Geräten bereits in der Sensibo-App
  eingerichtet (Fernbedienung der Klimaanlage erkannt).
- Ein Sensibo-**API-Schlüssel**: Melde dich auf
  [home.sensibo.com/me/api](https://home.sensibo.com/me/api) an und erstelle
  einen.
- Eine Internetverbindung: Die Integration spricht mit der Sensibo-Cloud.

## Erste Schritte

1. Installiere die Integration aus dem Gladys-Katalog.
2. Füge in der **Konfiguration** den **API-Schlüssel** ein und speichere.
3. Klicke auf **Verbindung testen**: Die Meldung unter der Taste listet die
   Geräte des Kontos auf.
4. Öffne den Tab **Erkennung**: ein Gerät pro Sensibo, benannt nach seinem Raum
   in der Sensibo-App. Klicke auf **Hinzufügen**, wähle einen Raum, speichere.

Optionen:

- **Aktualisierungsintervall**: wie oft die Sensibo-Cloud gelesen wird, von 1
  bis 10 Minuten (standardmäßig 2 Minuten). Eine Anfrage liest alle Geräte. Eine
  Änderung über Gladys erscheint sofort; eine Änderung mit der Fernbedienung
  oder der Sensibo-App erscheint beim nächsten Lesen.
- **Sprache der Namen**: Englisch, Französisch, Deutsch oder Spanisch
  (standardmäßig Französisch), für die Funktionsnamen (beim Hinzufügen eines
  Geräts vergeben) und die Meldungen der Integration.

## Das Gerät jedes Sensibo

| Funktion             | Was es ist                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| Ein/Aus              | Schaltet die Klimaanlage (oder das Pure) ein und aus                                              |
| Modus                | Automatisch, Kühlen, Heizen, Entfeuchten, Lüften: nur die Modi, die die Fernbedienung bietet      |
| Solltemperatur       | Begrenzt auf die Sollwerte der Fernbedienung, in der in der Sensibo-App gewählten Einheit         |
| Lüfterstufe          | Auto, niedrig bis hoch, leise, Turbo: die Stufen, die die Fernbedienung im aktuellen Modus bietet |
| Vertikale Lamellen   | Aus, Schwenken oder eine von fünf festen Stellungen                                               |
| Horizontale Lamellen | Aus, Schwenken oder eine von fünf festen Stellungen                                               |
| Climate React        | Schaltet die Automatik Climate React ein oder aus, eingerichtet in der Sensibo-App                |
| Raumtemperatur       | Vom Sensibo gemessen, nur lesbar                                                                  |
| Luftfeuchtigkeit     | Vom Sensibo gemessen, nur lesbar                                                                  |
| CO2                  | Air Pro und Elements, nur lesbar                                                                  |
| TVOC                 | Flüchtige organische Verbindungen, Air Pro und Elements, nur lesbar                               |
| PM2.5                | Feinstaub, Elements, nur lesbar                                                                   |
| Filterlebensdauer    | Verbleibender Anteil des Reinigungsintervalls: 0 % heißt, den Filter reinigen                     |

Eine Funktion erscheint nur, wenn das Gerät sie bietet: Das Pure hat Ein/Aus und
die Filterlebensdauer, das Elements nur seine Messwerte. Das Abzeichen des
Geräts zeigt **Cloud**, solange das Sensibo verbunden ist, und **Nicht
erreichbar**, wenn es offline ist.

**Sicherheit.** Ein Befehl verlässt nie, was die Fernbedienung deiner
Klimaanlage senden kann: Ein fehlender Modus wird abgelehnt, eine Solltemperatur
wird in ihre Werte gebracht (17 °C auf einer Fernbedienung, die ab 18 °C kühlt,
ergeben 18 °C), und eine Lüfterstufe oder Lamellenstellung, die im aktuellen
Modus fehlt, wird mit einer Meldung abgelehnt. Es sind die Klimafunktionen, die
Gladys auch seinen anderen Klimaanlagen gibt.

## Dashboard

Füge das Widget **Sensibo-Klimaanlagen** einem Dashboard hinzu. Standardmäßig
listet es alle Klimaanlagen auf: Aus, oder Modus und Solltemperatur, wenn sie
läuft, dann die Raumtemperatur. Wähle in seinen Einstellungen eine aus, um nur
sie zu zeigen. Seine beiden Tasten wirken auf das, was das Widget zeigt:

- **Ein**: schaltet mit dem letzten Modus und der letzten Solltemperatur ein,
  wie die Ein-Taste der Fernbedienung;
- **Aus**: schaltet aus.

Die Taste des aktuellen Zustands trägt ein Häkchen, wenn alle gezeigten
Klimaanlagen in diesem Zustand sind. Modus, Solltemperatur und Lüfterstufe sind
am Gerät.

## Szenen

### Auslöser

- **Sensibo offline**: Ein Sensibo hat die Verbindung zur Sensibo-Cloud
  verloren (WLAN, Stromausfall). Filter: das Gerät. Variablen: Name und Gerät.
- **Sensibo wieder online**: Das Sensibo ist wieder verbunden. Filter: das
  Gerät.
- **Filter reinigen**: Sensibo meldet, dass der Filter gereinigt werden muss,
  nach der in der Sensibo-App eingestellten Laufzeit. Filter: das Gerät.

Für eine Temperatur oder Luftfeuchtigkeit außerhalb eines Bereichs nimm den
Geräte-Auslöser von Gladys auf der Funktion _Raumtemperatur_ oder
_Luftfeuchtigkeit_ (zum Beispiel „über 28 °C“): Er löst bereits beim
Überschreiten aus.

### Aktionen

- **Sensibo-Klimaanlagen einschalten**: eine Klimaanlage, oder alle, wenn das
  Feld leer ist, in einem Modus (Kühlen, Heizen, Automatisch, Entfeuchten,
  Lüften), mit einer Temperatur, in einem einzigen Befehl. Die Temperatur wird
  in die Sollwerte jeder Fernbedienung für diesen Modus gebracht; leer bleibt
  die aktuelle. Ausgaben: die Anzahl der eingeschalteten Klimaanlagen und die
  angewendete Temperatur.
- **Sensibo-Klimaanlagen ausschalten**: eine Klimaanlage, oder alle, wenn das
  Feld leer ist. Die Offline-Geräte werden übersprungen. Ausgabe: die Anzahl
  der ausgeschalteten.

Für eine einzelne Funktion eines Geräts funktioniert auch die Gladys-Aktion
_Gerät steuern_.

### Szenen-Ideen

- **Haus verlassen** (Alarm aktiviert): _Sensibo-Klimaanlagen ausschalten_,
  Feld leer: alle Klimaanlagen aus.
- **Hitzewelle**: wenn die _Raumtemperatur_ des Schlafzimmers zwischen 14 und
  20 Uhr über 27 °C steigt: _Sensibo-Klimaanlagen einschalten_, Schlafzimmer,
  Kühlen, 25.
- **Filter-Erinnerung**: _Filter reinigen_ → eine Nachricht senden: „Reinige
  den Filter von {{triggerEvent.data.name}}“.

## Fehlerbehebung

- **„Sensibo lehnt den API-Schlüssel ab“**: Prüfe den Schlüssel auf
  [home.sensibo.com/me/api](https://home.sensibo.com/me/api) oder erstelle einen
  neuen. Nach diesem Fehler hört die Integration auf zu lesen, bis du die
  Konfiguration speicherst oder auf **Verbindung testen** klickst.
- **„Zu viele Anfragen“**: Die Sensibo-Cloud begrenzt die Anfragen eines
  Schlüssels; die Integration wartet zehn Minuten. Wähle ein längeres
  Intervall, wenn es wiederkommt.
- **Ein Modus oder eine Lüfterstufe wird abgelehnt**: Die Fernbedienung deiner
  Klimaanlage bietet sie in diesem Modus nicht. Die Sensibo-App zeigt, was sie
  bietet.
- **Die Klimaanlage reagiert nicht**: Ein Sensibo sendet Infrarot: Prüfe, dass
  es das Innengerät sieht und dass die in der Sensibo-App eingerichtete
  Fernbedienung die richtige ist.
- **Mehr Details**: die Protokolle der Integration (Einstellungen →
  Integrationen → Sensibo). Der API-Schlüssel steht nie darin.

## Grenzen

- Nur Cloud: Ohne Internet, oder wenn die Sensibo-Cloud ausfällt, lässt sich
  nichts über Gladys steuern.
- Höchstens ein Lesevorgang pro Minute, um die Grenzen der Sensibo-API
  einzuhalten. Änderungen mit der Fernbedienung werden beim nächsten Lesen
  gesehen.
- Infrarot hat keine Rückmeldung: Der angezeigte Zustand ist der zuletzt von
  Sensibo gesendete, kein aus der Klimaanlage gelesener.
- Climate React, Zeitpläne, Timer, Pure Boost und die Sensibo-Bewegungsmelder
  werden in der Sensibo-App eingerichtet; Gladys schaltet Climate React nur ein
  und aus. Die Lüfterstufe des Pure wird nicht angeboten.
- Auf einem Dashboard kann Gladys den Climate-React-Schalter mit seinem
  allgemeinen Namen „Schalter“ anzeigen.
- Ohne die Hardware entwickelt: Rückmeldungen willkommen.
- Keine Verbindung zu Sensibo.
