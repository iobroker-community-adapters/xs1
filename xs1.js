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

function _o(obj,level) {    return  util.inspect(obj, false, level || 2, false).replace(/\n/g,' ');}

function _J(str) { try { return JSON.parse(str); } catch (e) { return {'error':'JSON Parse Error of:'+str}}} 

function wait(time,arg) { return new Promise((res,rej) => setTimeout(res,time,arg))}

function pSeries(obj,fun) { // fun gets(key,obj,resolve,reject)
    let newValues = [];
    let promise = Promise.resolve(null);

    for(let key in obj) {
//        adapter.log.debug(key);
        promise = promise.then(() => {
            return new Promise((resolve,reject) => setTimeout(fun,10,key, obj, resolve, reject));
        }).then(newValue => newValues.push(newValue));
    }
    
    return promise.then(() => newValues);
}

function pRetryP(nretry, fn, arg) {
    return fn(arg).catch(err => { 
//            logs(`retry: ${retry}, ${_o(err)}`);
        if (nretry <= 0) {
            throw err;
        }
        return pRetryP(nretry - 1, fn,arg); 
    });
}
/* not required 
function pRetry(nretry, fn, arg) {
    return (new Promise((resolve,reject) => fn(arg,resolve,reject))).catch(err => { 
//            logs(`retry: ${retry}, ${_o(err)}`);
        if (nretry <= 0) {
            throw err;
        }
        return pRetry(nretry - 1, fn,arg); 
    });
}

function c2pA(f) {
    let context = this;
    return function () {
        let fArgs = Array.prototype.slice.call(arguments);
        let paramLength = f.length;
        let args = [];

        for (var i = 0; i < paramLength -1; i++) {
            if(i < fArgs.length){
                args.push(fArgs[i])
            }else{
                args.push(undefined);
            }
        }

        return new Promise((res, rej) => {
            args.push(function (err, result) {
                if (err) setTimeout(rej,0,err);
                else setTimeout(res,0,result);
            });

            f.apply(context, args);
        });
    }
}
*/

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
        "sensor":               ["door","dooropen","motion","waterdetector","window"],
        "value.temperature":    ["temperature","number"],
        "value.brightness":     ["light"],
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

    function getRole(vtype) {
        return findItem(roles,vtype);
    }

    that.getType = function(vtype) {
        const role = findItem(roles,vtype);
        let type = 'number';
        if (role) {
            var typ = findItem(types,role);
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
            adapter.log.debug(`pGet: ${url}`);
            http.get(url, (res) => {
            let statusCode = res.statusCode;
            let contentType = res.headers['content-type'];
            adapter.log.debug(`res: ${statusCode}, ${contentType}`);
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

    function pGet2(command) { return pRetryP(2,pGet,command)}


    function sendXS1(command) {
        return new Promise((res,rej) => {
//        var link = that.url+"control?callback=cb&x=" + Date.now() + "&cmd="+command;
        pGet2(command)
            .then(obj => {
                if (obj.error >"") {
                    that.emit('error',"sendXS1 returned ERROR: " + obj.error + ", "+ link);
                    return rej(obj.error);
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
                res(obj);
            })
            .catch(err => {
                that.emit('error',err);
                data = [];
//                that.emit('xs1response',data);
                rej(err);0 
            });
        });
    }


     that.setState = function(name,value) {
         return new Promise((res,rej) => {

        if (!that.names.has(name)) {
            that.emit("error","MyXS1.setState Name not found: "+name);
            return rej("MyXS1.setState Name not found: "+name);
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

         return sendXS1("set_state_"+styp+"&number="+id+"&value="+val);
         });
    };

    that.startXS1 = function(url) { 
        return new Promise((res,rej) => {
            if (!url || !url.startsWith("http"))
                return that.emit('error', 'not a valid URL for XS1:'+url);

            if (url.substr(-1,1) !== '/')
                url =  url + '/'; 
            if (that.connected) {
                that.emit("error","XS1 connect called on already connected device!");
                return rej("XS1 already connected");
            }

            that.url = url;
            that.names = new Map();
            let temp = [];

            sendXS1("get_list_actuators")
                .then(actuators => { temp = actuators; return sendXS1("get_list_sensors")})
                .then(obj => wait(200,obj))
                .then(obj => {
    //                adapter.log.info(`actuators: ${_o(obj)}`);
                    for (let i of obj.concat(temp))
                        that.names.set(i.name,i);

                    adapter.log.info(`Added totally ${that.names.size} actuators or sensors`);
                        
                    const url = that.url + "control?callback=cb&cmd=subscribe&format=txt&x="+Date.now();
                    try {
                        that.creq = http.get(url,function(response) {
                            that.resp = response;
                            if (response.statusCode!=200) {
                                that.emit('error',response.statusCode);
                                return rej("Bad status code for connection:"+response.statusCode,msg);
                            }
                            response.setEncoding('utf8');
                            
                //            that.emit('msg','response',response.statusCode);
                            
                            response.on('data',buf => {
                                const b = buf.trim().split(' ');
    //                            adapter.log.info(`${_o(b)}`);
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
    //                            adapter.log.info(`${_o(data)}`);
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
                            setTimeout(res,0,null);
                        });
                    
                        that.creq.on('aborted',function() {
                            if (that.connected)
                                that.emit('disconnected'); 
                            that.connected = false;
                            that.creq = null;
                            that.resp = null;
                        });    
                        
                        that.creq.on('error', err => that.emit('error',err,'error creq in XS1')); 
                        
                    } catch(e) {
                        if (that.creq)
                            that.creq.abort();
                        that.connected = false;
                        that.resp = null;
                        that.creq = null;
                        that.emit('error',e);
                        setTimeout(rej,0,e);
                    }
                })
                .catch(e => rej(e));

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

//adapter.log.info('Adapter SW loading');

const myXS1 =     new MyXS1();
var copylist =  {};

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('cleaned everything up...');
//        myXS1.disconnect();
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', (id, obj) =>  adapter.log.info(`objectChange ${id} ${_o(obj)}`));

// is called if a subscribed state changes
adapter.on('stateChange', (id, state) => {
    // Warning, state can be null if it was deleted
    adapter.log.info('stateChange ' + id + ' to ' + state.val);

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        var idn = id.split('.');
        var name = idn[idn.length-1];
        var obj = myXS1.names.get(name);
        var typ = idn[idn.length-2];
        if (typ!=="Actuators") {
            adapter.log.warn("XS1 cannot set state of Sensor "+name+" to "+ _o(state) );
        } else {
//            adapter.log.info(util.inspect(obj) + ' set to '+ _o(state));
            myXS1.setState(name,state.val);
        }
    }
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', obj => {
    if (typeof obj == 'object' && obj.message) {
        if (obj.command == 'send') {
            // e.g. send email or pushover or whatever
            console.log('send command');

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        }
    }
});

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', () => main());

var mtimeout = null;
var watchdog = null;
var wToggle = false;

function watchUpdate(update) {
    if (update) { // was this an update ?
        adapter.log.debug("watchUpdate(true)");
        if (watchdog)
            clearTimeout(watchdog);
        watchdog = setTimeout(watchUpdate,4*60*1000);
        return;
    }
    // No update, 4 minutes without data!
    adapter.log.warn("watchdog will stop XS1 Adapter!");
    adapter.stop();
}

function makeWatchDog() {
    adapter.log.info("makeWatchDog");
    myXS1.setState("Watchdog",wToggle);
    wToggle = ! wToggle;
}

function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    if (mtimeout) clearTimeout(mtimeout);
    myXS1.resetXS1();
    adapter.log.info('config XS1 Addresse: ' + adapter.config.adresse);

    copylist = _J(adapter.config.copylist);
//    adapter.log.info(`CopyList = ${_o(copylist)}`);
    if (!copylist || copylist.error)
        copylist = {};
// my personal one is
// '{"UWPumpeT2":"UWPumpe","UWPumpe":"UWPumpeT2","UWLicht":"UWLichtT3","UWLichtT3":"UWLicht","GartenLichtT1":"GartenLicht","GartenLicht":"GartenLichtT1"}'
    adapter.log.info(`CopyList = ${_o(copylist)}`);

    myXS1.on("error",msg => adapter.log.warn('Error message from XS1:'+ _o(msg)));

    myXS1.on("disconnected",msg => {
        adapter.log.error('Got disconnected from XS1, will restart in 5 sec!'+ _o(msg));
        myXS1.disconnect();
        myXS1.resetXS1();
        if (mtimeout) clearTimeout(mtimeout);
        mtimeout = setTimeout(main,5000); 
    });

    myXS1.startXS1(adapter.config.adresse)
        .then(obj => pSeries(myXS1.names, (n,obj,res,rej) => {
//        async.forEachOfSeries(myXS1.names,function(o,n,callb)  {
            const o =     obj[n];
//            adapter.log.debug(`Want t add ${n} with ${_o(o)}`);
//            var val =   o.value;
            const t =     o.type;
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

            const r = myXS1.getRole(t);
            if (r) {
                c.common.role =r;
                c.common.type = myXS1.getType(t);
                if (c.common.type === 'boolean') {
                    o.val = (o.val === false || o.val === 0) ? false : !!o.val;
                    c.common.unit = "";
                }
                o.common = c.common;
                c.native.init = o;
                adapter.setObject(c.common.name,c,err => {
                    adapter.log.info(c.common.name+" "+ _o(c));
                    adapter.setState(c.common.name, { 
                        val:c.native.init.val, 
                        ack:true, 
                        ts:c.native.init.utime*1000
                    }, err => res(n));
                });
            } else {
                adapter.log.warn("Undefined type "+t + ' for ' + c.common.name);
                res(n);
            }
        }))
        .then(obj => {
            adapter.log.info("finished states creation");
            adapter.subscribeStates('*'); // subscribe to states only now
            watchUpdate(true); // start watchdog
            setInterval(makeWatchDog,60*1000); // setze Watchdog virtual var !
        }).catch(err => adapter.log.warn(`Error in initialization: ${_o(err)}`));


    myXS1.on('data',msg => {
        watchUpdate(true);
//        adapter.log.info("Data received "+_o(msg) );
        if(msg && msg.lname) {
            msg.ack = true;
            msg.q = 0;
            adapter.setState(msg.lname+"."+msg.name,msg);
            const o = myXS1.names.get(msg.name);
            if (o) {
                o.oldValue = o.value;
                o.newValue = o.value = msg.val;
                var cl = copylist[msg.name];
                if (cl)
                    cl = cl.split(',');
                pSeries(cl, (i,cl,res,rej) => {
                    const cn = cl[i];
                    let co = myXS1.names.get(cn).value;
                    if (typeof o.newValue === 'boolean'  && typeof co === 'number')
                        co = co != 0;
                    adapter.log.info(cn + "old " + co + " is new " +o.newValue);
                    if (co != o.newValue)
                        return myXS1.setState(cn,o.newValue);
                    res();
                })
            }
        }

    });

}
