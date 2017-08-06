/**
 *
 * EZcontrol XS1 Adapter
 * v0.4.5 with Promises and requires ES6
 */
/* eslint-env node,es6 */
/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

//var request =       require('request');
const util =          require('util');
const http =          require('http');

const EventEmitter =  require('events').EventEmitter;

function _O(obj,level) {    return  util.inspect(obj, false, level || 2, false).replace(/\n/g,' ');} // Stringify an object until level
function _J(str) { try { return JSON.parse(str); } catch (e) { return {'error':'JSON Parse Error of:'+e}}} // Safe JSON parse
const _N = (a,b,c,d,e) => setTimeout(a,0,b,c,d,e); // Execute after next tick
function _D(l,v) { adapter.log.debug(l); return v === undefined ? l : v; } // Debug
//function _DD(l,v) { return v === undefined ? l : v; } // Debug off
function _I(l,v) { adapter.log.info(l); return v === undefined ? l : v; } // Info
function _W(l,v) { adapter.log.warn(l); return v === undefined ? l : v; } // Warning
//function _Co(o) { return _J(JSON.stringify(o));} // create a deep copy of te object o

function wait(time,arg) { return new Promise((res,rej) => setTimeout(res,time,arg))}

function pRetryP(nretry, fn, arg) {
    return fn(arg).catch(err => { 
//            logs(`retry: ${retry}, ${_O(err)}`);
        if (nretry <= 0) {
            throw err;
        }
        return pRetryP(nretry - 1, fn,arg); 
    });
}

function c2pP(f) {
//    _D(`c2pP: ${_O(f)}`);
    return function () {
        const args = Array.prototype.slice.call(arguments);
        return new Promise((res, rej) => {
            args.push((err, result) => (err && _N(rej,err)) || _N(res,result));
            f.apply(this, args);
        });
    };
}

function pSeriesP(obj,promfn,delay) { // fun gets(item) and returns a promise
    delay = delay || 0;
    var p = Promise.resolve();
    const   nv = [],
            f = (k) => p = p.then(() => promfn(k).then(res => wait(delay,nv.push(res))));
    for(var item of obj) 
        f(item);
    return p.then(() => nv);
}


function MyXS1() {
    if (!(this instanceof MyXS1)) return new MyXS1();
    EventEmitter.call(this);

    this.url = null;
    this.names = new Map();
    this.creq = null;
    this.resp = null;
    this.connected = false;

    var that = this;
    
    var roles = {    
        "switch":               ["switch","timerswitch","sound","remotecontrol"],
        "sensor":               ["door","doorbell","dooropen","motion","waterdetector","window"],
        "value.temperature":    ["temperature","number"],
        "value.brightness":     ["light","dimmer"],
        "value.humidity":       ["hygrometer"],
        "value":                ["counter","rainintensity"],
        "direction":            ["winddirection"],
        "value.speed":          ["windspeed"],
        "level.blind":          ["shutter"],
    };


    var types = { "boolean": ["switch", "sensor"] };

    that.resetXS1 = () => {
        that.url = null;
        that.names = new Map();
        that.creq = null;
        that.resp = null;
        that.connected = false;
        this.removeAllListeners();
    };

    function findItem(l,i) {
        for(var s in l)
            if (l[s].indexOf(i)>=0)
                return s;
        return null;
    }

    that.getRole = function(vtype) {
        return findItem(roles,vtype);
    }

    that.getType = function(vtype) {
        const role = findItem(roles,vtype);
        let type = 'number';
        if (role) {
            let typ = findItem(types,role);
            if (typ) 
                type = typ;
        }
        return type;
    };

    that.disconnect = function() {
        if(!that.connected) {
            that.emit("error","XS1 disconnect called on not connected device!");
            return;
        }
        if (that.creq)
            that.creq.abort();
        that.connected = false;
        that.resp = null;
        that.creq = null;
        that.emit('disconnected');
    };

    function pGet(command) {
        let url = that.url+"control?callback=cb&x=" + Date.now() % 1000000 + "&cmd="+command
        return new Promise((resolve,reject)=> {
            _D(`pGet: ${url}`);
            http.get(url, (res) => {
            let statusCode = res.statusCode;
            let contentType = res.headers['content-type'];
            _D(`res: ${statusCode}, ${contentType}`);
            let error = null;
            if (statusCode !== 200) {
                error = new Error(`Request Failed. Status Code: ${statusCode}`);
    //              } else if (!/^application\/json/.test(contentType)) {
    //                error = new Error(`Invalid content-type. Expected application/json but received ${contentType}`);
            }
            if (error) {
                res.resume();                 // consume response data to free up memory
                return reject(error);
            }
            
            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => rawData += chunk);
            res.on('end', () => {
                if (/^text\/javascript/.test(contentType)) { // XS1 !!!
                    try {
                        let data = rawData.trim();
                        data = data.slice(data.indexOf('(')+1,-1);
                        rawData = _J(data);
                    } catch (e) {
                        rawData =_J('x');
                    }
                } 
                setTimeout(resolve,0,rawData);
            });
            }).on('error', (e) => setTimeout(reject,0,e));
        });
    }

    that.sendXS1 = function(command) {
        return pRetryP(2,pGet,command)
            .then(obj => {
                if (obj.error >"") {
                    that.emit('error',"sendXS1 returned ERROR: " + obj.error + ", "+ link);
                    return Promise.reject(obj.error);
                } 
                let t =null;
                if (/actuator/.test(command))
                    t = "actuator";
                else if (/sensor/.test(command))
                    t = "sensor";
                else {
                    that.emit('error',command + "= unknown object result from XS1");
                    obj = [];
                } 
                if (t && obj[t])
                    obj = obj[t];    
                            
                if (Array.isArray(obj)) {
                    const na =[];
                    for (var key=0;key < obj.length;++key) {
                        if (obj[key].type != "disabled") {
                            obj[key].styp = t;
                            obj[key].lname = (t==='sensor'? 'Sensors.':'Actuators.')+obj[key].name;
                            obj[key].number = key+1;
                            na.push(obj[key]);
                        }
                    }
                    obj = na;
                }
                return Promise.resolve(obj);
            })
            .catch(err => {
                that.emit('error',err);
                throw err;
            });
  //      });
    }


     that.setState = function(name,value) {
        if (!that.names.has(name)) {
            let err = `MyXS1.setState Name not found: ${name}`;
            that.emit("error",err);
            return Promise.reject(err);
        }
        const id = that.names.get(name).number || 0;
        const styp = that.names.get(name).styp;
        let val = parseFloat(value);
        
        if (styp==="actuator") {
            if (typeof value === "boolean") {
                val = value ? 100 : 0;
            } else if (typeof value === "number") {
                val = value>100 ? 100 : (value<=0 ? 0 : parseInt(value));
            } else val = parseInt(value);
        }

        return that.sendXS1(`set_state_${styp}&number=${id}&value=${val}`);
    };

    that.startXS1 = function(url) { 
        if (!url || !url.startsWith("http"))
            return Promise.reject(that.emit('error', 'not a valid URL for XS1:'+url));

        if (url.substr(-1,1) !== '/')
            url =  url + '/'; 
        if (that.connected) {
            that.emit("error","XS1 connect called on already connected device!");
            return Promise.reject("XS1 already connected");
        }

        that.url = url;
        that.names = new Map();

        return wait(10)
            .then(obj => {
                const url = that.url + "control?callback=cb&cmd=subscribe&format=txt&x="+Date.now();
                try {
                    that.creq = http.get(url,function(response) {
                        that.resp = response;
                        if (response.statusCode!=200) {
                            that.emit('error',response.statusCode);
                            return Promise.reject("Bad status code for connection:"+response.statusCode,msg);
                        }
                        response.setEncoding('utf8');
                        
                        response.on('data',buf => {
                            const b = buf.trim().split(' ');
                            if (b.length<14) 
                                return that.emit("error", {err:"Invalid response from XS1 data",value:buf},"warn");
                            let data = {};
                            const st = {'A':"Actuators",'S':"Sensors"};
                            try {
                                data.ts = parseInt(b[0]) * 1000;
                                data.lname = st[b[9]];
                                data.number = b[10];
                                data.name = b[11];
                                data.vtype = b[12];
                                data.val = parseFloat(b[13]);
                                if (myXS1.getType(data.vtype)==="boolean")
                                    data.val = (data.val === 0 || data.val === false) ? false : !!data.val ;
                            } catch(e) {
                                return that.emit("error", {err:"Cannot read response from XS1 data",value:buf,arrcode:e},"warn");
                            }
                            that.emit('data',data); 
                        });    
                        response.on('error', err => that.emit('error',err,'error resp in XS1'));
                        response.on('end', () => {
                            that.creq = null;
                            that.resp = null;
                            that.connected = false;
                            that.emit('disconnected'); 
                        });    
                        that.connected = true;
                        that.emit('connected',response.statusCode);
                        return Promise.resolve();
                    }).on('aborted',function() {
                        if (that.connected)
                            that.emit('disconnected'); 
                        that.connected = false;
                        that.creq = null;
                        that.resp = null;
                    }).on('error', err => that.emit('error',err,'error creq in XS1')); 
                    
                } catch(e) {
                    if (that.creq)
                        that.creq.abort();
                    that.connected = false;
                    that.resp = null;
                    that.creq = null;
                    that.emit('error',e);
                    throw e;
                }
            })          
    };

}

util.inherits(MyXS1, EventEmitter);
// you have to require the utils module and call adapter function
const utils =    require(__dirname + '/lib/utils'); // Get common adapter utils

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.template.0
const adapter = utils.adapter('xs1');

//_I('Adapter SW loading');

const myXS1 =     new MyXS1();
var copylist =  {};

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        _I('cleaned everything up...');
//        myXS1.disconnect();
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', (id, obj) =>  _D(`objectChange ${id} ${_O(obj)}`));

// is called if a subscribed state changes
adapter.on('stateChange', (id, state) => {
    // Warning, state can be null if it was deleted
    _D('stateChange ' + id + ' to ' + state.val);

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        const idn = id.split('.');
        const name = idn[idn.length-1];
        const obj = myXS1.names.get(name);
        if (idn[idn.length-2]!=="Actuators") 
            _W("XS1 cannot set state of Sensor "+name+" to "+ _O(state) );
        else 
            myXS1.setState(name,state.val);
    }
});

function processMessage(obj) {
    if (obj && obj.command) {
        _D(`process Message ${_O(obj)}`);
        switch (obj.command) {
            case 'ping': 
                // Try to connect to mqtt broker
                if (obj.callback && obj.message) {
                    ping.probe(obj.message, {log: adapter.log.debug}, function (err, result) {
                        adapter.sendTo(obj.from, obj.command, res, obj.callback);
                    });
                }
                break;
            case 'send': 
                // e.g. send email or pushover or whatever
                _I('KM200 send command from message');
                // Send response in callback if required
                if (obj.callback) 
                    adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
                break;
        }
    }
    adapter.getMessage(function (err, obj) {
        if (obj) {
            processMessage(obj);
        }
    });    
}

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', obj => processMessage(obj));

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', () => main());

const Watchdog = {

    _timeoutTime: 4*60*1000, // 4 Minutes default timeout
    _triggerTime: 60*1000,
    _watchdog: null,
    _toggle: false,
    _trigger: null,
    _triggerFun: null,

    update() {
        _D(`Watchdog updated`);
        if (this._watchdog) 
            clearTimeout(this._watchdog);
        this._watchdog = setTimeout(this.stop, this._timeoutTime,_D('Set Timeout'));
    },

    stop() {
        // No update, _timeoutTime without data!
        adapter.log.error("watchdog will stop XS1 Adapter in 2 sec!");
        myXS1.disconnect();
        setTimeout(process.exit,2000,55);
    },
    
    start(trigger,triggertime,timeout) {
        if (timeout)
            this._timeoutTime = parseInt(timeout);
        if (triggertime)
            this._triggerTime = parseInt(triggertime);
        if (typeof trigger === 'function') { 
            this._triggerFun = () => {
                this._toggle = !this._toggle;
                trigger(this._toggle);                
            }
            this._trigger = setInterval(this._triggerFun,this._triggerTime);
        }
        this.update();
    }
}

const objects = new Map();

function pSetState(id,val) {
    _D(`pSetState: ${id} = ${typeof val === 'object' && val.hasOwnProperty('val') ? val.val : val}`);
    return c2pP(adapter.setState)(id,val, true);
}

function changeState(id,value,always) {
//    _I(`changeState: ${id} = ${value} a=${always}`);
    return c2pP(adapter.getState)(id)
        .then(st => !always && st.val == value ? Promise.resolve() : pSetState(id,value), 
            () => pSetState(id,value))

}

function makeState(id,value,st, always) {  // creates an object and/or set the state value
    _D(`${id} = ${value} ${always ? ' always' : ''} from ${_O(st)}`);
    if (objects.has(id))
        return changeState(id,value,always);
    _D(`Make State ${id} = ${_O(value)} with ${_O(st)}`) ///TC
    return  c2pP(adapter.extendObject)(id,st)
        .then(x => {
            objects.set(id,x);
           return changeState(id,value, always);
        })
        .catch(err => _D(`MS ${_O(err)}:=extend`,id));
}


function updateStates(always) {
    const tmap = new Set();
    const ain =  adapter.name + '.' + adapter.instance + '.';
    let   temp = [];
    _D(`Will update states fropm XS1 and delete unused or create low battery warnings`);
    return myXS1.sendXS1("get_list_actuators")
        .then(res => wait(100,temp = res))
        .then(actuators => myXS1.sendXS1("get_list_sensors"))
        .then(sensors => pSeriesP(temp.concat(sensors),o => {
            tmap.add(o.lname);
            myXS1.names.set(o.name,o);
            const t = o.type;
            const c = {
                type: 'state',
                common: {
                    name:   o.lname,
                    type:   'boolean',
                    unit:   o.unit,
                    read:   true,
                    write:  true,
                    role:   'switch'
                },
                native : {
                    desc:       JSON.stringify(o),
                    isSensor:   (o["state"] !==undefined),
                    xs1Id:      o.id
                }
            };
            if (c.native.isSensor)
                c.common.write = false;
            const r = myXS1.getRole(t);
            if (!r) {
                _W("Undefined type "+t + ' for ' + c.common.name);
                return Promise.resolve(n);
            }
            c.common.role =r;
            c.common.type = myXS1.getType(t);
            if (c.common.type === 'boolean') {
                o.val = (o.value === undefined || o.value === false || o.value === 0) ? false : !!o.value;
                c.common.unit = "";
            }
            o.common = c.common;
            if (o.val === undefined)
                o.val = o.value;
            c.native.init = o;
            return makeState(c.common.name,o.val, c, always)
                .then(obj => {
                    if (o.state && Array.isArray(o.state) && o.state.length>0) {
        //                _D(`Item has a state: '${o.state[0]}'`);
                        let val = false;
                        const n = o.lname + '.LOWBAT';
                        tmap.add(n);
                        myXS1.names.set(o.name+'.LOWBAT',o);
                        const c = {
                            type: 'state',
                            common: {
                                name:   n,
                                type:   'boolean',
                                unit:   undefined,
                                read:   true,
                                write:  false,
                                role:   'indicator.battery'
                            },
                            native : {
                                desc:       JSON.stringify(o),
                                isSensor:   true,
                                xs1Id:      o.id,
                                src:        o
                            }
                        };
                        for (let st of o.state)
                            val = val || /low/i.test(st);
                        return makeState(n,val,c,always);
                    }
                    return Promise.resolve();
                });
        },5)).then(res => c2pP(adapter.objects.getObjectList)({startkey: ain, endkey: ain + '\u9999'})
        ).then(res => pSeriesP(res.rows, item => {  // clean all states which are not part of the list
            if (tmap.has(item.id.slice(ain.length))) 
                return Promise.resolve();
            return c2pP(adapter.deleteState)(item.id)
                .then(x => _D(`Del State: ${item.id}`), err => _D(`Del State err: ${_O(err)}`)) ///TC
                .then(y => c2pP(adapter.delObject)(item.id))
                .then(x => _D(`Del Object: ${item.id}`), err => _D(`Del Object err: ${_O(err)}`)) ///TC
            },10))
        .catch(err => _I(`Update Error: ${_O(err)}`));
   
}

function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    myXS1.resetXS1();
    _I('config XS1 Addresse: ' + adapter.config.adresse);

    copylist = _J(adapter.config.copylist);
//    _I(`CopyList = ${_O(copylist)}`);
    if (!copylist || copylist.error)
        copylist = {};
// my personal one is
// '{"UWPumpeT2":"UWPumpe","UWPumpe":"UWPumpeT2","UWLicht":"UWLichtT3","UWLichtT3":"UWLicht","GartenLichtT1":"GartenLicht","GartenLicht":"GartenLichtT1"}'
    _I(`CopyList = ${_O(copylist)}`);

    myXS1.on("error",msg => _W('Error message from XS1:'+ _O(msg)));

    myXS1.on("disconnected",msg => {
        adapter.log.error('Got disconnected from XS1, will restart in 5 sec!'+ _O(msg));
        setTimeout(process.exit,2000,56);
    });

    myXS1.on('data',msg => {
//        _I("Data received "+_O(msg) );
        if(msg && msg.lname) {
            const n = msg.lname+"."+msg.name;
            msg.ack = true;
            msg.q = 0;
            if (msg.name == 'Watchdog') 
                Watchdog.update();
//            _I(`XS1 set ${n} to ${msg.val}`);
//            adapter.setState(n,msg);
            pSetState(n,msg);
            const o = myXS1.names.get(msg.name);
            if (o) {
                o.oldValue = o.value;
                o.newValue = o.value = msg.val;
                let cl = copylist[msg.name];
                if (cl) {
                    cl = cl.split(',');
                    pSeriesP(cl, cn => {
                        let co = myXS1.names.get(cn.trim()).value;
                        if (typeof o.newValue === 'boolean'  && typeof co === 'number')
                            co = co != 0;
                        _I(cn + " old " + co + " is new " +o.newValue);
                        if (co != o.newValue)
                            return myXS1.setState(cn,o.newValue);
                        return Promise.resolve();
                    }).catch(err => _I(`CopyList Err=${_O(err)}`));
                }
            }
        }

    });

    myXS1.startXS1(adapter.config.adresse)
        .then(obj => updateStates(true)) // Set states on first run
        .then(obj => {
            _I(`Finished state creation. Added totally ${myXS1.names.size} actuators or sensors`);        
            adapter.subscribeStates('*'); // subscribe to states only now
            Watchdog.start(wToggle => myXS1.setState("Watchdog",wToggle));
            setInterval(updateStates,60*60*1000); // update states every hour TODO
        }).catch(err => {
            _W(`Error in initialization: ${_O(err)}, will stop adapter`);
            setTimeout(process.exit,2000,57);
        });

}
