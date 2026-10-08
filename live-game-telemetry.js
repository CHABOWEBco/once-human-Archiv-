/* Normalized, memory-only telemetry foundation. No game reader or trusted game source. */
(()=>{'use strict';
const sources=new Set(['none','simulator','local-companion','overwolf']),scenes=new Set(['unknown','lobby','ingame','death']);
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e9;
const blank=(source='none',timestamp=Date.now())=>Object.freeze({connected:false,source,gameRunning:false,scene:'unknown',scenario:null,x:null,y:null,z:null,heading:null,timestamp,accuracy:'unknown'});
function normalize(value,{now=Date.now(),lastTimestamp=-Infinity,source=null}={}){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const v=value;if(v.source==='none'&&(v.connected||v.gameRunning||v.scene!=='unknown'||['x','y','z','heading'].some(k=>v[k]!==null)))return null;if(typeof v.connected!=='boolean'||typeof v.gameRunning!=='boolean'||!sources.has(v.source)||source&&v.source!==source||!scenes.has(v.scene)||!['unknown','exact','estimated'].includes(v.accuracy))return null;
 if(typeof v.timestamp!=='number'||!Number.isSafeInteger(v.timestamp)||now-v.timestamp>5000||v.timestamp-now>2000||v.timestamp<=lastTimestamp)return null;
 if(v.scenario!==null&&(typeof v.scenario!=='string'||!v.scenario.trim()||v.scenario.length>80))return null;
 for(const k of ['x','y','z','heading'])if(v[k]!==null&&!finite(v[k]))return null;
 if((v.x===null)!==(v.y===null)||v.heading!==null&&(v.heading<0||v.heading>=360))return null;
 // A stopped game/lobby never carries a usable player pose.
 const pose=v.connected&&v.gameRunning&&v.scene==='ingame';
 return Object.freeze({connected:v.connected,source:v.source,gameRunning:v.gameRunning,scene:v.scene,scenario:v.scenario,x:pose?v.x:null,y:pose?v.y:null,z:pose?v.z:null,heading:pose?v.heading:null,timestamp:v.timestamp,accuracy:pose?v.accuracy:'unknown'});
}
function create({now=()=>Date.now(),Socket=globalThis.WebSocket,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let state=blank(),info={transport:'offline',verifiedSource:false,reason:'Keine echte Telemetriequelle implementiert.'},listeners=new Set(),generation=0,socket=null,retry=0,heartbeat=0,watchdog=0,attempt=0,lastTimestamp=-Infinity,lastReceived=0,lastPose=0;
 const emit=()=>{for(const fn of listeners)fn(state,{...info})};
 const publish=(v)=>{state=Object.freeze(v);emit()};
 function clear(){clearTimer(retry);clearTimer(heartbeat);clearTimer(watchdog);retry=heartbeat=watchdog=0;const old=socket;socket=null;if(old){old.onopen=old.onclose=old.onerror=old.onmessage=null;old.close()}}
 function disconnect(){generation++;clear();attempt=0;lastTimestamp=-Infinity;info={transport:'offline',verifiedSource:false,reason:'Keine echte Telemetriequelle implementiert.'};publish(blank('none',now()))}
 function simulator(v){if(!['localhost','127.0.0.1','[::1]'].includes(globalThis.location?.hostname))throw Error('Simulator ausschließlich auf lokalem DEV-/Test-Origin.');if(state.source!=='simulator'){disconnect();info={transport:'simulation',verifiedSource:false,reason:'DEV-Simulation; keine Spieldaten.'}}const next=normalize({...v,source:'simulator'},{now:now(),lastTimestamp,source:'simulator'});if(!next)return false;lastTimestamp=next.timestamp;publish(next);clearTimer(watchdog);if(next.connected)watchdog=setTimer(()=>{info.transport='lost';publish(blank('simulator',now()))},Math.max(0,next.timestamp+5000-now()));return true}
 function connect(port){
  if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Loopback-Port 1024–65535 erforderlich.');
  disconnect();const ticket=++generation,url='ws://127.0.0.1:'+port;
  function lose(reason){if(ticket!==generation)return;clear();info={transport:'lost',verifiedSource:false,reason};publish(blank('local-companion',now()));retry=setTimer(open,Math.min(10000,500*2**Math.min(attempt++,5)))}
  function open(){if(ticket!==generation)return;info={transport:attempt?'reconnecting':'connecting',verifiedSource:false,reason:'Loopback-Bridge; Game Reader NICHT VERIFIZIERT.'};publish(blank('local-companion',now()));lastTimestamp=-Infinity;lastReceived=lastPose=now();
   try{socket=new Socket(url)}catch{lose('Loopback-Verbindung fehlgeschlagen.');return}
   const current=socket;
   function heartbeatTick(){if(ticket!==generation||socket!==current)return;if(now()-lastReceived>=5000||now()-lastPose>=5000||state.connected&&now()-state.timestamp>=5000){lose('Heartbeat oder Telemetrie veraltet.');return}try{current.send(JSON.stringify({version:1,type:'ping',timestamp:now()}))}catch{lose('Heartbeat konnte nicht gesendet werden.');return}heartbeat=setTimer(heartbeatTick,1500)}
   current.onopen=()=>{if(ticket!==generation||socket!==current)return;info.transport=attempt?'reconnecting':'waiting';clearTimer(watchdog);watchdog=setTimer(()=>lose('Keine frische Telemetrie von der Bridge.'),5000);emit();heartbeat=setTimer(heartbeatTick,1500)};
   current.onmessage=e=>{if(ticket!==generation||socket!==current||typeof e.data!=='string'||e.data.length>16384)return;let message;try{message=JSON.parse(e.data)}catch{return}if(!message||message.version!==1)return;
    if(message.type==='pong'&&Number.isSafeInteger(message.timestamp)&&Math.abs(now()-message.timestamp)<=5000){lastReceived=now();return}
    if(message.type!=='telemetry')return;const next=normalize(message.data,{now:now(),lastTimestamp,source:'local-companion'});if(!next)return;
    lastTimestamp=next.timestamp;lastReceived=lastPose=now();clearTimer(watchdog);watchdog=setTimer(()=>lose('Telemetrie-Zeitstempel veraltet.'),Math.max(0,next.timestamp+5000-now()));attempt=0;info.transport=next.connected?'connected':'waiting';publish(next);
   };
   current.onclose=()=>lose('Loopback-Verbindung verloren.');current.onerror=()=>lose('Loopback-Verbindung fehlgeschlagen.');
   // Opening handshake is bounded too; a socket that never opens cannot wait forever.
   watchdog=setTimer(()=>{if(ticket===generation&&socket===current&&current.readyState!==1)lose('Loopback-Handshake abgelaufen.')},5000);
  }open();
 }
 return Object.freeze({getState:()=>state,getInfo:()=>({...info}),subscribe(fn){listeners.add(fn);fn(state,{...info});return()=>listeners.delete(fn)},connect,disconnect,simulator,destroy(){disconnect();listeners.clear()}});
}
// Affine least squares in centered/scaled game coordinates; no invented world bounds.
function calibrate(points){
 if(!Array.isArray(points)||points.length<4||points.length>50)throw Error('4–50 bestätigte Referenzpunkte erforderlich.');
 if(points.some(p=>!p||!['gameX','gameY','mapX','mapY'].every(k=>finite(p[k]))||p.mapX<0||p.mapX>100||p.mapY<0||p.mapY>100))throw Error('Endliche Spielwerte und Kartenpositionen 0–100 % erforderlich.');
 const n=points.length,cx=points.reduce((s,p)=>s+p.gameX,0)/n,cy=points.reduce((s,p)=>s+p.gameY,0)/n,scale=Math.max(...points.map(p=>Math.hypot(p.gameX-cx,p.gameY-cy)));
 if(!scale)throw Error('Referenzpunkte sind identisch.');
 const rows=points.map(p=>[(p.gameX-cx)/scale,(p.gameY-cy)/scale,1]);
 const matrix=Array.from({length:3},(_,i)=>Array.from({length:3},(_,j)=>rows.reduce((s,r)=>s+r[i]*r[j],0)));
 function solve(key){const m=matrix.map((r,i)=>[...r,rows.reduce((s,r,j)=>s+r[i]*points[j][key],0)]);for(let i=0;i<3;i++){let pivot=i;for(let j=i+1;j<3;j++)if(Math.abs(m[j][i])>Math.abs(m[pivot][i]))pivot=j;if(Math.abs(m[pivot][i])<1e-8)throw Error('Referenzpunkte kollinear oder numerisch ungeeignet.');[m[i],m[pivot]]=[m[pivot],m[i]];const div=m[i][i];for(let k=i;k<4;k++)m[i][k]/=div;for(let j=0;j<3;j++)if(j!==i){const f=m[j][i];for(let k=i;k<4;k++)m[j][k]-=f*m[i][k]}}return m.map(r=>r[3])}
 const transform={cx,cy,scale,u:solve('mapX'),v:solve('mapY')};
 const determinant=transform.u[0]*transform.v[1]-transform.u[1]*transform.v[0];if(Math.abs(determinant)<1e-8)throw Error('Kartenreferenzen ergeben keine umkehrbare Fläche.');
 const errors=points.map(p=>{const m=project(transform,p.gameX,p.gameY);return Math.hypot(m.x-p.mapX,m.y-p.mapY)});
 return {...transform,points:points.map(p=>({...p})),rmse:Math.sqrt(errors.reduce((s,e)=>s+e*e,0)/n),maxError:Math.max(...errors),verification:'user-confirmed'};
}
function project(t,x,y){if(!t||!finite(x)||!finite(y))return null;const a=(x-t.cx)/t.scale,b=(y-t.cy)/t.scale;return {x:t.u[0]*a+t.u[1]*b+t.u[2],y:t.v[0]*a+t.v[1]*b+t.v[2]}}
function heading(t,degrees,aspect=1){if(!t||!finite(degrees))return null;const a=Math.sin(degrees*Math.PI/180),b=Math.cos(degrees*Math.PI/180),dx=t.u[0]*a+t.u[1]*b,dy=t.v[0]*a+t.v[1]*b;return (Math.atan2(dx*aspect,-dy)*180/Math.PI+360)%360}
function gamePoint(m){if(!m||['gameX','gameY'].some(k=>m[k]===null||m[k]===undefined||m[k]===''||typeof m[k]==='string'&&!m[k].trim()||typeof m[k]==='boolean'))return null;const x=Number(m.gameX),y=Number(m.gameY);return finite(x)&&finite(y)?{x,y}:null}
function distance(snapshot,marker,info){const p=gamePoint(marker);return snapshot.connected&&snapshot.gameRunning&&snapshot.scene==='ingame'&&snapshot.source==='local-companion'&&info?.verifiedSource===true&&snapshot.accuracy==='exact'&&marker?.gameCoordinatesVerified===true&&snapshot.scenario===marker.scenario&&finite(snapshot.x)&&finite(snapshot.y)&&p?Math.hypot(snapshot.x-p.x,snapshot.y-p.y):null}
const service=create();
globalThis.JMA_TELEMETRY=Object.freeze({...service,create,normalize,calibrate,project,heading,gamePoint,distance});
window.addEventListener('pagehide',()=>service.disconnect());
})();
