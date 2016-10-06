![Logo](admin/EZcontrol.png)
# ioBroker.xs1
=================
## ioBroker adapter zu EZcontrol XS1 
  Der Adapter kommuniziert über die RestAPI des XS1 und hängt sich auch 
  an das XS1 als listener um alle Änderungen sofort an den ioBroker weiterzuleiten.
  Befehle vom ioBroker werden zuerst mit ack=false gesendet und wenn etwas vom Listener kommt
  dann passiert das mit ack=true. Man weiß dann zumindest dass XS1 den Befehl gesendet hat.

  Der Adapter scannt alle verfügbaren Sensoren (read-only) und Aktoren (read/write) und verwendet
  die am XS1 vergebenen Namen.

  Momentan werden keine Spezialinformationen wie Batterielevel unterstützt da diese dem Listener 
  leider nicht weitergegeben werden. Werde später einen poll-mechanismus dazubauen um diese 
  Info's alle x Minuten abzufragen und den STATE zu ändern.

  Der link ist die gesamte link mit dem man sonst im Heimnetz auf das XS1 zugreifen kann.
  Momentan ist noch kein Passwort-Zugriff implementiert und damit darf auf dem XS1 kein Passwort gesetzt sein!

  Die Copylist erlaubt direktes Gleichschalten zwischen Listener und Aktoren.
  Damit kann man Aktoren zusammenschalten welche ohne im ioBroker scrips schreiben zu müssen.
  Also wenn Aktor A von XS! auf ein geht wird auch Aktor B (und C..) auf ein geschaltet.
  Das ist sinnvoll wenn Aktoren verschiedene Systeme benutzen (Aktor A = FS20, B= AB400, C=HMS) und
  zusammen geschaltet werden sollen (Ein funksender von FS20 kann dann direkt auch einen AB400 Funkstekdose schalten).

  Die Syntax ist {"von_a":"auf_b(,auf_c, ...)", "von_b":"auf_c", ....}
  Die runden klammern zeigen dass mehrere Destinationen mit comma getrennt angegeben werden können.
  Ein Beispiel von mir: {"UWPumpeT2":"UWPumpe","UWPumpe":"UWPumpeT2"}
  Damit wird der Taster (UWPumpeT2) mit der UWPumpe in beide Richtungen gleichgeschalten 
  und man braucht im ioBroker nur noch einen Aktor verwenden.
 
  Der Adapter benötigt das async package welches bei Installation automatisch von npm geladen wird.

## Changelog

### 0.4.0
  Erster öffentliche Version, kann lesen und Aktuatoren schreiben (Befehle absetzten).
  TODO: Dokumentieren und Batteriestatus polling implementieren.

### 0.1.0
  Erster Test, Kann nur lesen und mithören

## License
The MIT License (MIT)

Copyright (c) 2016 Frank Joke<frankjoke@hotmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
