# ioBroker.xs1

![Logo](admin/xs1.png)

[![NPM version](http://img.shields.io/npm/v/iobroker.xs1.svg)](https://www.npmjs.com/package/iobroker.xs1)
[![Downloads](https://img.shields.io/npm/dm/iobroker.xs1.svg)](https://www.npmjs.com/package/iobroker.xs1)
**Tests:** Linux/Mac/Windows: [![Travis-CI](http://img.shields.io/travis/frankjoke/ioBroker.xs1/master.svg)](https://travis-ci.org/frankjoke/ioBroker.xs1)

[![NPM](https://nodei.co/npm/iobroker.xs1.png?downloads=true)](https://nodei.co/npm/iobroker.xs1/)

## ioBroker adapter zu EZcontrol XS1

The adapter communicates via the XS1's RestAPI and also listens
to the XS1 o immediately forward all changes to the ioBroker.
Commands from ioBroker are sent first with ack=false and when something comes from the listener
then this happens with ack=true. You then at least know that XS1 sent the command.

The adapter scans and uses all available sensors (read-only) and actuators (read/write).
It uses the names assigned at the XS1.

Currently no special information such as battery level are supported as those are not provided by the listener
to be passed on.

The link is the entire link with which you can otherwise access the XS1 in the home network.
At the moment no password access has been implemented and therefore no password can be set on the XS1!

For sensors that display a 'Battery low' message in the state, a .LOWBAT state is generated.

The copylist allows direct synchronization between listeners and actors.
This allows you to connect actuators together without having to write scripts in the ioBroker.
So if actuator A of XS1 switches to on, actuator B (and C..) will also be switched to on.
This makes sense if actuators use different systems (actuator A = FS20, B = AB400, C = HMS) and
should be connected together (a radio transmitter from FS20 can then also directly switch an AB400 radio socket).

The syntax to use is {"from_a":"on_b(,on_c, ...)", "from_b":"on_c", ....}.0
The round brackets show that several destinations can be specified separated by a comma.
Example: {"UWPumpeT2":"UWPumpe","UWPumpe":"UWPumpeT2","Switch1":"Light1,Light2"}
This switches the button (UWPumpeT2) to the same level as the UWPump in both directions
and one only need to use one actuator in ioBroker.
'Switch1' would switch 'Light1' and 'Light2' at the same time. 
  
For the watchdog function, a virtual actuator called 'Watchdog' should be created in the XS1.
This is switched every minute and if this switching process is not reported back after 4 minutes, the adapter will be restarted.

## Important!

* Adapter requires node >=16! 
* Create a blind (but not virtual) actuator called 'Watchdog'.

## Changelog
<!--
    Placeholder for the next version (at the beginning of the line):
    ### **WORK IN PROGRESS**
-->
### **WORK IN PROGRESS**
* (mcm1957) ...

### 1.1.2 (2023-10-09)
* (mcm1957) Adapter requires node 16 or newer now
* (mcm1957) Dependencies have been updated
* (mcm1957) README.md has been translated to english. See README_de.md for (old) german version.

### 1.1.1 (2023-10-09)

* (mcm1957) A crash due to incorrect bindings has been fixed. [#1]
* (mcm1957) Standard testennvironment has been added
* (mcm1957) Dependencies have been updated

### 1.1.0

* Added Admin3 capabities and support for new js-controller
* Adapter runs only with node>=8.16

### 1.0.2

* Added more sensors. All unknown types will use 'value' role. This can lead to problems if actual type is a boolean, but should work otherwise. As a result all sensors should be listed now.

### 1.0.0

* Update accepted device list and test for node v 8
* Tarvis updated to test right repository

## License
The MIT License (MIT)

Copyright (c) 2023-2024 iobroker-community-adapters
Copyright (c) 2016 Frank Joke

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
