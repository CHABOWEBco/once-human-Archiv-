(()=>{'use strict';
const $=id=>document.getElementById(id),keys={port:'jma_bridge_port',token:'jma_bridge_token',map:'jma_map_url',status:'jma_provider_status'};
$('port').value=localStorage.getItem(keys.port)||'8787';$('token').value=localStorage.getItem(keys.token)||'';$('mapUrl').value=localStorage.getItem(keys.map)||'http://127.0.0.1:5500/index.html#/map';
$('settings').addEventListener('submit',e=>{e.preventDefault();const port=Number($('port').value),token=$('token').value.trim(),url=$('mapUrl').value.trim();if(!Number.isInteger(port)||port<1024||port>65535||!token||!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(url)){alert('Nur lokaler Kartenserver, gültiger Port und Bridge-Token erlaubt.');return}localStorage.setItem(keys.port,String(port));localStorage.setItem(keys.token,token);localStorage.setItem(keys.map,url);const main=overwolf.windows.getMainWindow();main?.JMA_COMPANION?.postBridge();alert('Gespeichert.');});
$('openOverlay').addEventListener('click',()=>overwolf.windows.getMainWindow()?.JMA_COMPANION?.toggleOverlay());
function render(){let value;try{value=JSON.parse(localStorage.getItem(keys.status)||'{}')}catch{value={}};$('status').textContent=[value.text||'Noch kein Status','Spiel läuft: '+(value.gameRunning?'JA':'NEIN'),'Szene: '+(value.scene||'unknown'),'GEP aktiv: '+(value.featuresReady?'JA':'NEIN'),value.error?'Fehler: '+value.error:''].filter(Boolean).join('\n')}
render();setInterval(render,1000);
})();
