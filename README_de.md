# ioBroker.xs1

![Logo](admin/xs1.png)

[![NPM version](http://img.shields.io/npm/v/iobroker.xs1.svg)](https://www.npmjs.com/package/iobroker.xs1)
[![Downloads](https://img.shields.io/npm/dm/iobroker.xs1.svg)](https://www.npmjs.com/package/iobroker.xs1)
**Tests:** Linux/Mac/Windows: [![Travis-CI](http://img.shields.io/travis/frankjoke/ioBroker.xs1/master.svg)](https://travis-ci.org/frankjoke/ioBroker.xs1)

[![NPM](https://nodei.co/npm/iobroker.xs1.png?downloads=true)](https://nodei.co/npm/iobroker.xs1/)

## ioBroker adapter zu EZcontrol XS1

  Der Adapter kommuniziert über die RestAPI des XS1 und hängt sich auch 
  an das XS1 als listener um alle Änderungen sofort an den ioBroker weiterzuleiten.
  Befehle vom ioBroker werden zuerst mit ack=false gesendet und wenn etwas vom Listener kommt
  dann passiert das mit ack=true. Man weiß dann zumindest dass XS1 den Befehl gesendet hat.

  Der Adapter scannt alle verfügbaren Sensoren (read-only) und Aktoren (read/write) und verwendet
  die am XS1 vergebenen Namen.

  Momentan werden keine Spezialinformationen wie Batterielevel unterstützt da diese dem Listener 
  leider nicht weitergegeben werden. 

  Der link ist die gesamte link mit dem man sonst im Heimnetz auf das XS1 zugreifen kann.
  Momentan ist noch kein Passwort-Zugriff implementiert und damit darf auf dem XS1 kein Passwort gesetzt sein!

  Für Sensoren welche im state eine 'Battery low'-Meldung anzeigen wird ein .LOWBAT-State erzeugt. 

  Die Copylist erlaubt direktes Gleichschalten zwischen Listener und Aktoren.
  Damit kann man Aktoren zusammenschalten welche ohne im ioBroker scrips schreiben zu müssen.
  Also wenn Aktor A von XS! auf ein geht wird auch Aktor B (und C..) auf ein geschaltet.
  Das ist sinnvoll wenn Aktoren verschiedene Systeme benutzen (Aktor A = FS20, B= AB400, C=HMS) und
  zusammen geschaltet werden sollen (Ein funksender von FS20 kann dann direkt auch einen AB400 Funkstekdose schalten).

  Die Syntax ist {"von_a":"auf_b(,auf_c, ...)", "von_b":"auf_c", ....}
  Die runden klammern zeigen dass mehrere Destinationen mit comma getrennt angegeben werden können.
  Ein Beispiel von mir: {"UWPumpeT2":"UWPumpe","UWPumpe":"UWPumpeT2","Schalter1":"Licht1,Licht2"}
  Damit wird der Taster (UWPumpeT2) mit der UWPumpe in beide Richtungen gleichgeschalten 
  und man braucht im ioBroker nur noch einen Aktor verwenden. 
  'Schalter1' würde 'Licht1' und 'Licht2' gleichzeitig mitschalten. 
  
  Für die neu hinzugefügte Watchdog-Funktion sollte im XS1 ein virtueller Aktuator namens 'Watchdog' kreiert werden.
  Dieser wird jede Minute umgeschaltet und falls 4 Minuten lan dieser Umschaltvorgang nicht zurückgemeldet wird wird der Adapter neu gestartet.

## Wichtig!-

* Der Adapter benötigt Node >=v16.*! 
* Einen blinden (aber nicht virtuellen) Aktuator mit dem Namen 'Watchdog' erstellen. 

