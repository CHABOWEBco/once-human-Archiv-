(()=>{'use strict';
const url=localStorage.getItem('jma_map_url')||'http://127.0.0.1:5500/index.html#/map';const frame=document.getElementById('map');
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(url)){document.body.dataset.error='invalid-map-url';frame.src='about:blank'}else frame.src=url;
document.getElementById('close').addEventListener('click',()=>overwolf.windows.getCurrentWindow(result=>{if(result?.window)overwolf.windows.hide(result.window.id)}));
})();
