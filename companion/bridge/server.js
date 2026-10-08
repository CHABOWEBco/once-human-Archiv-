#!/usr/bin/env node
'use strict';

const http=require('node:http');
const crypto=require('node:crypto');
const {URL}=require('node:url');

const HOST='127.0.0.1';
const DEFAULT_PORT=8787;
const PROVIDER_TTL_MS=5000;
const BROADCAST_MS=2000;
const MAX_BODY=16*1024;
const MAX_FRAME=16*1024;
const SCENES=new Set(['unknown','lobby','ingame','death']);

function intPort(value){const n=Number(value);if(!Number.isInteger(n)||n<1024||n>65535)throw Error('JMA_BRIDGE_PORT muss 1024–65535 sein.');return n}
function list(value){return String(value||'').split(',').map(v=>v.trim()).filter(Boolean)}
const PORT=intPort(process.env.JMA_BRIDGE_PORT||DEFAULT_PORT);
const TOKEN=String(process.env.JMA_BRIDGE_TOKEN||crypto.randomBytes(24).toString('hex'));
const BROWSER_ORIGINS=new Set(list(process.env.JMA_BROWSER_ORIGINS||'http://127.0.0.1:5500,http://localhost:5500'));

let provider=null,lastTimestamp=0;
const clients=new Set();

function loopback(address){return ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address)}
function secureEqual(a,b){const A=Buffer.from(String(a||'')),B=Buffer.from(String(b||''));return A.length===B.length&&crypto.timingSafeEqual(A,B)}
function nowTimestamp(){const n=Date.now();lastTimestamp=Math.max(n,lastTimestamp+1);return lastTimestamp}
function json(res,status,value){const body=JSON.stringify(value);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store'});res.end(body)}
function readBody(req){return new Promise((resolve,reject)=>{let size=0,chunks=[];req.on('data',chunk=>{size+=chunk.length;if(size>MAX_BODY){reject(Error('payload_too_large'));req.destroy();return}chunks.push(chunk)});req.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));req.on('error',reject)})}
function normalizeProvider(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||value.provider!=='overwolf-gep'||typeof value.gameRunning!=='boolean')return null;
 const scene=SCENES.has(value.scene)?value.scene:'unknown';
 const events=Array.isArray(value.events)?value.events.filter(v=>['knockout','level_up','match_start','match_end','death'].includes(v)).slice(-10):[];
 return {provider:'overwolf-gep',gameRunning:value.gameRunning,scene,events,receivedAt:Date.now()};
}
function telemetry(){
 const fresh=provider&&Date.now()-provider.receivedAt<=PROVIDER_TTL_MS;
 return {version:1,type:'telemetry',data:{connected:Boolean(fresh),source:'local-companion',gameRunning:Boolean(fresh&&provider.gameRunning),scene:fresh?provider.scene:'unknown',scenario:null,x:null,y:null,z:null,heading:null,timestamp:nowTimestamp(),accuracy:'unknown'}};
}
function health(){const fresh=provider&&Date.now()-provider.receivedAt<=PROVIDER_TTL_MS;return {ok:true,host:HOST,port:PORT,browserClients:clients.size,provider:fresh?provider.provider:null,gameRunning:Boolean(fresh&&provider.gameRunning),scene:fresh?provider.scene:'unknown',poseAvailable:false,positionAvailable:false,headingAvailable:false}}

function wsFrame(text,opcode=1){
 const payload=Buffer.isBuffer(text)?text:Buffer.from(text);if(payload.length>MAX_FRAME)throw Error('frame_too_large');
 let header;if(payload.length<126){header=Buffer.from([0x80|opcode,payload.length])}else{header=Buffer.alloc(4);header[0]=0x80|opcode;header[1]=126;header.writeUInt16BE(payload.length,2)}
 return Buffer.concat([header,payload]);
}
function send(socket,value){if(socket.destroyed)return;try{socket.write(wsFrame(typeof value==='string'?value:JSON.stringify(value)))}catch{socket.destroy()}}
function closeSocket(socket,code=1000,reason=''){if(socket.destroyed)return;const r=Buffer.from(reason).subarray(0,120),payload=Buffer.alloc(2+r.length);payload.writeUInt16BE(code,0);r.copy(payload,2);try{socket.write(wsFrame(payload,8))}catch{}socket.end()}
function broadcast(){const frame=telemetry();for(const client of clients)send(client.socket,frame)}

function consumeFrames(client,chunk){
 client.buffer=Buffer.concat([client.buffer,chunk]);
 while(client.buffer.length>=2){
  const b=client.buffer,fin=Boolean(b[0]&0x80),opcode=b[0]&0x0f,masked=Boolean(b[1]&0x80);let len=b[1]&0x7f,off=2;
  if(!fin||!masked){closeSocket(client.socket,1002,'invalid_frame');return}
  if(len===126){if(b.length<4)return;len=b.readUInt16BE(2);off=4}else if(len===127){closeSocket(client.socket,1009,'frame_too_large');return}
  if(len>MAX_FRAME){closeSocket(client.socket,1009,'frame_too_large');return}
  if(b.length<off+4+len)return;
  const mask=b.subarray(off,off+4);off+=4;const payload=Buffer.from(b.subarray(off,off+len));for(let i=0;i<payload.length;i++)payload[i]^=mask[i%4];client.buffer=b.subarray(off+len);
  if(opcode===8){client.socket.end();return}
  if(opcode===9){try{client.socket.write(wsFrame(payload,10))}catch{}continue}
  if(opcode!==1)continue;
  let msg;try{msg=JSON.parse(payload.toString('utf8'))}catch{continue}
  if(msg?.version===1&&msg?.type==='ping'&&Number.isSafeInteger(msg.timestamp))send(client.socket,{version:1,type:'pong',timestamp:msg.timestamp});
 }
}

const server=http.createServer(async(req,res)=>{
 if(!loopback(req.socket.remoteAddress))return json(res,403,{ok:false,error:'loopback_only'});
 const url=new URL(req.url,'http://127.0.0.1');
 if(req.method==='GET'&&url.pathname==='/health')return json(res,200,health());
 if(req.method==='POST'&&url.pathname==='/provider'){
  const auth=String(req.headers.authorization||'');if(!auth.startsWith('Bearer ')||!secureEqual(auth.slice(7),TOKEN))return json(res,401,{ok:false,error:'unauthorized'});
  try{const value=normalizeProvider(JSON.parse(await readBody(req)));if(!value)return json(res,400,{ok:false,error:'invalid_provider_payload'});provider=value;broadcast();return json(res,200,{ok:true,accepted:'overwolf-gep',poseAccepted:false})}catch(error){if(!res.headersSent)return json(res,error.message==='payload_too_large'?413:400,{ok:false,error:error.message==='payload_too_large'?'payload_too_large':'invalid_json'})}
 }
 return json(res,404,{ok:false,error:'not_found'});
});

server.on('upgrade',(req,socket)=>{
 if(!loopback(req.socket.remoteAddress)){socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');return}
 let url;try{url=new URL(req.url,'http://127.0.0.1')}catch{socket.destroy();return}
 if(!['/','/telemetry'].includes(url.pathname)){socket.end('HTTP/1.1 404 Not Found\r\n\r\n');return}
 const origin=String(req.headers.origin||'');if(!BROWSER_ORIGINS.has(origin)){socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');return}
 const key=String(req.headers['sec-websocket-key']||'');if(!/^[A-Za-z0-9+/]{22}==$/.test(key)){socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');return}
 const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
 socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
 const client={socket,buffer:Buffer.alloc(0)};clients.add(client);socket.on('data',chunk=>consumeFrames(client,chunk));socket.on('close',()=>clients.delete(client));socket.on('error',()=>clients.delete(client));send(socket,telemetry());
});

const timer=setInterval(broadcast,BROADCAST_MS);timer.unref();
server.listen(PORT,HOST,()=>{
 console.log('[Once Human Archiv Bridge] '+`http://${HOST}:${PORT}`);
 console.log('[Once Human Archiv Bridge] Browser WS: '+`ws://${HOST}:${PORT}`+' (auch /telemetry)');
 console.log('[Once Human Archiv Bridge] Provider token: '+TOKEN);
 console.log('[Once Human Archiv Bridge] Browser origins: '+[...BROWSER_ORIGINS].join(', '));
 console.log('[Once Human Archiv Bridge] Position/heading provider: NOT AVAILABLE via public Once Human GEP');
});
function shutdown(){clearInterval(timer);for(const c of clients)c.socket.destroy();server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),1500).unref()}
process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);
