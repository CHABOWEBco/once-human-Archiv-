(()=>{'use strict';
const GAME_ID=23930,FEATURES=['gep_internal','game_info','match_info'],SCENES=new Set(['lobby','ingame','death']);
const keys={port:'jma_bridge_port',token:'jma_bridge_token',map:'jma_map_url',status:'jma_provider_status'};
let gameRunning=false,scene='unknown',featuresReady=false,lastEvents=[],posting=false;
const setting=(key,fallback)=>localStorage.getItem(key)||fallback;
const setStatus=(text,extra={})=>localStorage.setItem(keys.status,JSON.stringify({text,gameRunning,scene,featuresReady,updatedAt:Date.now(),...extra}));
function bridgePort(){const n=Number(setting(keys.port,'8787'));return Number.isInteger(n)&&n>=1024&&n<=65535?n:8787}
function token(){return setting(keys.token,'').trim()}
function postBridge(){
 if(posting)return;const secret=token();if(!secret){setStatus('Bridge-Token fehlt. Einstellungen öffnen.');return}
 posting=true;const url='http://127.0.0.1:'+bridgePort()+'/provider',body=JSON.stringify({provider:'overwolf-gep',gameRunning,scene,events:lastEvents.splice(0,10)}),method=overwolf.web.enums?.HttpRequestMethods?.POST||'POST',headers=[{key:'Content-Type',value:'application/json'},{key:'Authorization',value:'Bearer '+secret}];
 overwolf.web.sendHttpRequest(url,method,headers,body,result=>{posting=false;setStatus(result?.success&&Number(result.statusCode)>=200&&Number(result.statusCode)<300?'Bridge verbunden':'Bridge nicht erreichbar',{bridgeStatus:Number(result?.statusCode)||0,error:result?.error||null})});
}
function sceneFromInfo(info){
 if(!info||typeof info!=='object')return null;
 if(info.feature==='game_info'&&info.category==='game_info'&&info.key==='scene')return info.data??info.value??null;
 return info.info?.game_info?.scene??null;
}
function onInfo(info){const value=sceneFromInfo(info);if(typeof value==='string'&&SCENES.has(value)){scene=value;postBridge()}}
function onEvents(payload){for(const event of payload?.events||[])if(['knockout','level_up','match_start','match_end','death'].includes(event?.name))lastEvents.push(event.name);postBridge()}
function setFeatures(){
 if(featuresReady||!gameRunning)return;
 overwolf.games.events.setRequiredFeatures(FEATURES,result=>{featuresReady=Boolean(result?.success);setStatus(featuresReady?'GEP aktiv':'GEP Features nicht verfügbar',{supportedFeatures:result?.supportedFeatures||[],error:result?.error||null});postBridge()});
}
function refreshGame(){
 overwolf.games.getRunningGameInfo2(result=>{const info=result?.gameInfo,was=gameRunning;gameRunning=Boolean(info?.isRunning&&Number(info.classId)===GAME_ID);if(!gameRunning){scene='unknown';featuresReady=false}else setFeatures();if(was!==gameRunning)postBridge();setStatus(gameRunning?'Once Human erkannt':'Warte auf Once Human')});
}
function showSettings(){overwolf.windows.obtainDeclaredWindow('settings',result=>{if(result?.success&&result.window)overwolf.windows.restore(result.window.id)})}
function toggleOverlay(){
 if(!gameRunning){setStatus('Overlay nur während Once Human verfügbar.');showSettings();return}
 overwolf.windows.obtainDeclaredWindow('overlay',result=>{if(!result?.success||!result.window){setStatus('Overlay konnte nicht erstellt werden.');return}const id=result.window.id;overwolf.windows.getWindowState(id,state=>{if(state?.window_state_ex==='normal'||state?.window_state_ex==='maximized')overwolf.windows.hide(id);else overwolf.windows.restore(id)})});
}
overflowGuard();
function overflowGuard(){
 overwolf.games.events.onInfoUpdates2.addListener(onInfo);overwolf.games.events.onNewEvents.addListener(onEvents);overwolf.games.events.onError.addListener(error=>setStatus('GEP Fehler',{error:error?.error||error?.message||String(error)}));
 overwolf.games.onGameInfoUpdated.addListener(refreshGame);overwolf.settings.hotkeys.onPressed.addListener(e=>{if(e?.name==='jma_toggle_map')toggleOverlay()});
 overwolf.extensions.onAppLaunchTriggered.addListener(()=>showSettings());refreshGame();setInterval(()=>{refreshGame();postBridge()},2000);if(!token())setTimeout(showSettings,250);
}
window.JMA_COMPANION=Object.freeze({refreshGame,postBridge,toggleOverlay,showSettings,getState:()=>({gameRunning,scene,featuresReady,bridgePort:bridgePort(),hasToken:Boolean(token())})});
})();
