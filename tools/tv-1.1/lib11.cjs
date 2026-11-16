// Daniel Home 1.1 - collegamento alla TV.
// Riusa ESATTAMENTE il metodo già provato con la 1.0 (cartella tv-update):
//  pagina sul PC (porta 8766) aperta nel browser della TV -> lavoro firmato in probe.js -> risultati su report.jsonl.
// Questo file sta nella cartella tv-update accanto agli script originali (build-probe.cjs, chiavi, ecc.).
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const vm = require('node:vm');
const crypto = require('node:crypto');
const config = require('./run11.json');
const TOKEN = JSON.parse(fs.readFileSync(path.join(config.previous, 'transfer-settings.json'), 'utf8')).token;
const SESSION_FILE = '/tmp/vidaa-codex-webdriver-session-' + config.run + '.json';

function publish(label, body) {
  const version = config.run + '-' + label;
  const file = path.join(__dirname, label + '.body.js');
  fs.writeFileSync(file, body);
  cp.execFileSync(process.execPath, [path.join(__dirname, 'build-probe.cjs'), version, file, label], { stdio: 'inherit' });
  new vm.Script(fs.readFileSync(path.join(__dirname, 'probe.js'), 'utf8'));
  fs.copyFileSync(path.join(__dirname, 'probe.js'), path.join(config.previous, 'probe.js'));
  return version;
}

async function wait(version, ms) {
  const end = Date.now() + (ms || 120000);
  while (Date.now() < end) {
    let entries = [];
    try { entries = fs.readFileSync(path.join(config.previous, 'report.jsonl'), 'utf8').trim().split('\n').flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } }); } catch {}
    const test = entries.findLast(x => x.name === 'TEST' && x.text === version.slice(config.run.length + 1));
    if (test) {
      const rows = entries.filter(x => x.run === test.run);
      if (rows.some(x => x.name === 'FINE')) {
        const parts = rows.filter(x => x.name === 'FAAS_EXECUTION').sort((a, b) => a.part - b.part);
        if (!parts.length) throw Error('La TV non ha eseguito il lavoro: ' + JSON.stringify(rows.filter(x => x.name !== 'TEST').map(x => [x.name, x.text])).slice(0, 800));
        const report = JSON.parse(parts.map(x => x.text).join(''));
        fs.writeFileSync(path.join(__dirname, version + '.result.json'), JSON.stringify(report, null, 2));
        if (report.status !== 200 || !report.data || report.data.version !== version) throw Error('Lavoro fallito sulla TV: ' + JSON.stringify(report).slice(0, 800));
        const result = report.data;
        if (result.workerError) throw Error(JSON.stringify(result.workerError));
        if (result.rootProof) { result.proof = JSON.parse(result.rootProof); if (result.proof.error) throw Error(JSON.stringify(result.proof.error)); }
        return result;
      }
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  throw Error('Nessuna risposta dalla TV per ' + version + ' (la pagina http://192.168.1.100:8766/ è aperta sulla TV?)');
}

// Lavoro con privilegi di amministratore: stesso pacchetto temporaneo usato per la 1.0 (installato e rimosso subito).
function rootJob(label, script, after) {
  const suffix = config.run.replace(/[^0-9]/g, '').replace(/[0-9]/g, c => String.fromCharCode(97 + Number(c)));
  const name = 'vidaa.codex.update' + suffix, appId = 'codexupdate' + suffix;
  const proof = '/tmp/' + config.run + '-' + label + '.json';
  const program = `const fs=require('fs'),crypto=require('crypto'),path=require('path');
let out={uid:process.getuid()};
try{if(out.uid!==0)throw Error('Root required');\n${script}\n}catch(e){out.error={message:e.message,code:e.code,stack:e.stack};}
fs.writeFileSync(${JSON.stringify(proof)},JSON.stringify(out),{flag:'wx',mode:0o600});fs.chownSync(${JSON.stringify(proof)},314,314);
if(out.error)process.exitCode=1;`;
  new vm.Script(program);
  const postinst = '#!/bin/sh\nset -eu\n/APPS/pkgs/tv.vidaa.app.phoenix/CHA/bin/phoenix -e ' + "'eval(Buffer.from(\"" + Buffer.from(program).toString('base64') + '\",\"base64\").toString(\"utf8\"))' + "'\n";
  const prerm = '#!/bin/sh\n/bin/rm -f /APPS/pkgs/' + name + '/placeholder\nexit 0\n';
  const pkg = require(path.join(config.previous, 'package-builder.cjs')).build({ name, appId, postinst, prerm, description: 'Owner Home 1.1 maintenance with backup' });
  let body = fs.readFileSync(path.join(config.previous, 'root-proof.body.template.js'), 'utf8').replace('__PACKAGE_JSON__', JSON.stringify({ ...pkg, proof, placeholder: '/APPS/pkgs/' + name + '/placeholder' }));
  body = body.replace("try{const s=fs.statSync('/tmp/ipk_install_status');if(Date.now()-s.mtimeMs<60000){result.skipped='Recent package-manager activity';return result;}}catch(e){if(e.code!=='ENOENT')throw e;}", "const pendingPackages=fs.readFileSync(statusPath,'utf8').split(/\\n\\s*\\n/).filter(b=>/Status:.*(?:unpacked|half-installed|half-configured)/.test(b));if(pendingPackages.length)throw Error('Package operation pending');");
  body += '\n{\n' + (after || '') + '\n}';
  fs.writeFileSync(path.join(__dirname, label + '-root.js'), program);
  return publish(label, body);
}

// Funzioni che girano sulla TV (utente 314): sessione WebDriver della SystemUI + invio file al PC con SHA-256.
const tvHelpers = `const http=require('http'),crypto=require('crypto');
function wdRaw(method,p,value){return new Promise((resolve,reject)=>{const data=value===undefined?null:Buffer.from(JSON.stringify(value));const q=http.request({host:'::1',port:4445,path:p,method,headers:data?{'Content-Type':'application/json','Content-Length':data.length}:{}},r=>{const chunks=[];let bytes=0;r.on('data',c=>{bytes+=c.length;if(bytes>16*1024*1024)q.destroy(Error('Response too large'));else chunks.push(c);});r.on('end',()=>{try{resolve({status:r.statusCode,body:JSON.parse(Buffer.concat(chunks))});}catch(e){reject(e);}});});q.setTimeout(18000,()=>q.destroy(Error('WebDriver timeout')));q.on('error',reject);q.end(data);});}
async function session(){
 const file=${JSON.stringify(SESSION_FILE)};
 // riusa una sessione già aperta (la TV ne accetta una sola): file salvati dai lavori precedenti, poi gli id standard
 const ids=[];
 try{for(const n of fs.readdirSync('/tmp'))if(/^vidaa-codex-webdriver-session-.*\.json$/.test(n)){try{ids.push(JSON.parse(fs.readFileSync('/tmp/'+n,'utf8')).session);}catch(e){}}}catch(e){}
 try{const list=await wdRaw('GET','/sessions');(list.body&&list.body.value||[]).forEach(v=>ids.push(v.id||v.sessionId));}catch(e){}
 for(let i=0;i<4;i++)ids.push('session-'+i);
 for(const s of [...new Set(ids.filter(Boolean))]){try{const t=await wdRaw('GET','/session/'+s+'/url');if(t.status===200&&!t.body.status){try{fs.writeFileSync(file,JSON.stringify({session:s}),{mode:0o600});}catch(e){}return s;}}catch(e){}}
 const c=await wdRaw('POST','/session',{desiredCapabilities:{}});const s=c.body&&c.body.sessionId;if(!s)throw Error('Sessione WebDriver non creata: '+JSON.stringify(c).slice(0,300));
 try{fs.writeFileSync(file,JSON.stringify({session:s}),{mode:0o600});}catch(e){}
 return s;
}
let SID=null;
async function wd(endpoint,value){if(!SID)SID=await session();const r=await wdRaw(value===undefined?'GET':'POST','/session/'+SID+'/'+endpoint,value);if(r.status!==200||r.body.status)throw Error(JSON.stringify(r.body).slice(0,1000));return r.body.value;}
async function js(script){return await wd('execute',{script,args:[]});}
function local(p){return new Promise(resolve=>{const q=http.get({host:'127.0.0.1',port:8772,path:p},r=>{let t='';r.on('data',c=>t+=c);r.on('end',()=>resolve({status:r.statusCode,body:t.slice(0,600)}));});q.setTimeout(2500,()=>q.destroy(Error('timeout')));q.on('error',e=>resolve({error:e.code||e.message}));});}
async function upload(data,name){
 const hash=crypto.createHash('sha256').update(data).digest('hex');
 return await new Promise((resolve,reject)=>{
  const q=http.request({host:'192.168.1.100',port:8766,path:'/upload/'+name,method:'POST',headers:{'Content-Type':'application/octet-stream','Content-Length':data.length,'X-Vidaa-Token':${JSON.stringify(TOKEN)},'X-Content-SHA256':hash}},r=>{
   let body='';r.on('data',c=>body+=c);r.on('end',()=>{try{const receipt=JSON.parse(body);if(r.statusCode!==200||receipt.sha256!==hash||receipt.bytes!==data.length)throw Error('Upload verification failed');resolve(receipt);}catch(e){reject(e);}});
  });q.setTimeout(20000,()=>q.destroy(Error('Upload timeout')));q.on('error',reject);q.end(data);
 });
}
`;
module.exports = { config, publish, wait, rootJob, tvHelpers, sha: d => crypto.createHash('sha256').update(d).digest('hex') };
