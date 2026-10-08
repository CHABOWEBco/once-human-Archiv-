'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
let checks=0;const ok=(v,n)=>{assert.ok(v,n);checks++;console.log('PASS OVERWOLF',checks,n)};
const listeners={info:[],events:[],errors:[],game:[],hotkey:[],launch:[]},requests=[],storage=new Map([['jma_bridge_token','secret'],['jma_bridge_port','8787']]);
let required=null,intervalFn=null,restored=[];
const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))};
const overwolf={
  web:{
    enums:{HttpRequestMethods:{POST:'POST'}},
    sendHttpRequest:(url,method,headers,data,cb)=>{requests.push({url,method,headers,data:JSON.parse(data)});cb({success:true,statusCode:200})}
  },
  games:{
    getRunningGameInfo2:cb=>cb({gameInfo:{isRunning:true,classId:23930,title:'Once Human'}}),
    onGameInfoUpdated:{addListener:fn=>listeners.game.push(fn)},
    events:{
      setRequiredFeatures:(features,cb)=>{required=features;cb({success:true,supportedFeatures:features})},
      onInfoUpdates2:{addListener:fn=>listeners.info.push(fn)},
      onNewEvents:{addListener:fn=>listeners.events.push(fn)},
      onError:{addListener:fn=>listeners.errors.push(fn)}
    }
  },
  settings:{hotkeys:{onPressed:{addListener:fn=>listeners.hotkey.push(fn)}}},
  extensions:{onAppLaunchTriggered:{addListener:fn=>listeners.launch.push(fn)}},
  windows:{
    obtainDeclaredWindow:(name,cb)=>cb({success:true,window:{id:name}}),
    restore:id=>restored.push(id),
    getWindowState:(id,cb)=>cb({window_state_ex:'hidden'}),
    hide:()=>{}
  }
};
const context={window:{},localStorage,overwolf,setInterval:fn=>{intervalFn=fn;return 1},setTimeout:fn=>{fn();return 1},console};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../companion/overwolf/background.js'),'utf8'),context);
ok(JSON.stringify(required)===JSON.stringify(['gep_internal','game_info','match_info']),'Registers only documented Once Human GEP feature families');
ok(requests.some(r=>r.url==='http://127.0.0.1:8787/provider'&&r.method==='POST'),'Posts only to fixed loopback bridge endpoint');
let last=requests.at(-1).data;
ok(last.provider==='overwolf-gep'&&last.gameRunning===true&&last.scene==='unknown','Initial provider payload identifies official adapter without pose');
ok(!('x'in last)&&!('heading'in last),'Provider does not invent position or heading fields');
listeners.info[0]({feature:'game_info',category:'game_info',key:'scene',data:'ingame'});last=requests.at(-1).data;
ok(last.scene==='ingame','Documented scene update is forwarded');
listeners.events[0]({events:[{name:'match_start',data:null},{name:'made_up',data:null}]});last=requests.at(-1).data;
ok(last.events.length===1&&last.events[0]==='match_start','Only documented match events forwarded');
listeners.info[0]({feature:'game_info',category:'game_info',key:'scene',data:'unlisted'});
ok(requests.at(-1).data.scene==='ingame','Unknown scene cannot replace documented state');
intervalFn();ok(requests.at(-1).headers.some(h=>h.key==='Authorization'&&h.value==='Bearer secret'),'Bridge token sent only as local provider authorization header');
listeners.hotkey[0]({name:'jma_toggle_map'});ok(restored.includes('overlay'),'Configured hotkey restores declared in-game overlay');
console.log(JSON.stringify({checks,position:false,heading:false,gameId:23930}));
