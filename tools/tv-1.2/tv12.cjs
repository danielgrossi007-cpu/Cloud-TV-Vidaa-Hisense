// Daniel Home 1.2 sulla TV. Dalla cartella tv-update, con il server acceso (node tv11.cjs apri) e la pagina aperta sulla TV.
//   node tv12.cjs stato        -> SOLO LETTURA: versione installata, altoparlante nativo, tasti e rotte (tre lineette)
//   node tv12.cjs suoni        -> altoparlante nativo 1.2 + suoni lo-fi (backup dei vecchi file, ripristino automatico se non parte)
//   node tv12.cjs installa     -> backup della Home attuale (1.0 o 1.1) + installazione 1.2 + guardiano (15 min)
//   node tv12.cjs conferma     -> controlla e conferma SENZA ricaricare (ferma il guardiano), la Home nuova parte alla riaccensione
//   node tv12.cjs attiva       -> ricarica l'interfaccia, controlla la 1.2 e conferma (ferma il guardiano)
//   node tv12.cjs ripristina   -> rimette la Home precedente dal backup fatto da "installa"
//   node tv12.cjs suoni-indietro -> rimette l'altoparlante e i suoni di prima
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const L = require('./lib11.cjs');
const cfg = L.config, here = __dirname;
const SRC = 'C:/path/to/Cloud-TV-Vidaa-Hisense/native-home.js';
const SND = 'C:/path/to/Cloud-TV-Vidaa-Hisense/suoni/1.2';
const TARGET = '/APPS/pkgs/tv.vidaa.app.operationui/CHB/apps/launcher/js/app.js';
const ALLOWED = { '17b99087dab8992b2821609007afab3862fab19ee79c1835913b7d219c1d6980': '1.0', '5956a1065fc17ce9ff8e96f8b6d8069787d7938500a163bc367647be49b2a8b7': '1.1', '3123b7ba47d31232907a5392f7309837c2bae1e8829d6b90a045170ad6fb3dd6': '1.2', 'f00b89a55c741cd3bfe3b74b467769594dd909af2f4e0b01355fe61d561354d1': '1.3', '48e3a5ff2f43d10247b3cd9f53f620fd3899258f3081fb7860e323a6ead7ef5e': '1.4' };
const VER = ((/var VERSION = '([^']+)'/.exec(fs.readFileSync(SRC, 'utf8')) || [])[1]) || '?';
const STOCK_HASH = '5c9e0aeaa2eb5653cc8fda0fab7690ed0bacefd2f3801c8f61be9e99c41720d3';
const AUDIO_TOKEN = 'REPLACE_WITH_YOUR_AUDIO_TOKEN';
const ABASE = '/APPS/daniel-native-audio-20261112';
const NAMES = ['move', 'select', 'back', 'home', 'saverIn', 'saverOut', 'intro'];
const out = (name, data) => { fs.writeFileSync(path.join(here, name), JSON.stringify(data, null, 2)); console.log('Salvato: ' + name); };
const M12 = path.join(here, 'install-manifest-1.2.json');
// riavvio dell'altoparlante (root, deve finire in meno di 2 secondi): ferma il vecchio processo e riparte dal file di avvio
const RESTART = `const pids=fs.readdirSync('/proc').filter(p=>/^[0-9]+$/.test(p)).filter(p=>{try{return fs.readFileSync('/proc/'+p+'/cmdline','utf8').indexOf(${JSON.stringify(ABASE)}+'/audio')===0;}catch(e){return false;}});
for(const p of pids){try{process.kill(+p,'SIGKILL');}catch(e){}}out.killed=pids;cp.execFileSync('/bin/sleep',['0.3']);
cp.spawn('/bin/sh',['/var/local/otaTest.sh'],{detached:true,stdio:'ignore'}).unref();`;
const BACK = `const cp=require('child_process');const base=${JSON.stringify(ABASE)};const bk=fs.readFileSync(base+'/ultimo-backup.txt','utf8').trim();if(bk.indexOf(base+'/prima-della-1.2-')!==0)throw Error('Backup non valido');
const ref=fs.statSync(base+'/audio');for(const n of fs.readdirSync(bk)){const t=base+'/'+n+'.next';try{fs.unlinkSync(t);}catch(e){}fs.copyFileSync(bk+'/'+n,t);fs.chownSync(t,ref.uid,ref.gid);fs.chmodSync(t,n==='audio'?0o755:0o644);fs.renameSync(t,base+'/'+n);}
${'${RESTART}'}out.restored=bk;`.replace('${RESTART}', RESTART);
// dopo il lavoro root (utente 314): aspetta che l'altoparlante risponda
const WAIT12 = `for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,500));const s=await local('/${AUDIO_TOKEN}/status');if(s.status===200&&s.body.indexOf('"version":"1.2"')>=0){result.ready=true;result.status=JSON.parse(s.body);break;}result.status=s;}
if(result.ready){result.play=await local('/${AUDIO_TOKEN}/play/select/60');}`;
const WAIT_ANY = `for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,500));const s=await local('/${AUDIO_TOKEN}/status');result.status=s;if(s.status===200)break;}`;

// invia un file alla TV a blocchi da 300 KB (utente 314, /tmp), ognuno controllato con SHA-256; ritorna il percorso finale
async function send(buf, dest, label) {
  const parts = [];
  for (let off = 0, i = 0; off < buf.length; off += 300000, i++) {
    const data = buf.subarray(off, off + 300000), p = dest + '.part' + i, h = L.sha(data); parts.push(p);
    const body = `const crypto=require('crypto');const dest=${JSON.stringify(p)},expected=${JSON.stringify(h)},data=Buffer.from(${JSON.stringify(data.toString('base64'))},'base64');if(fs.existsSync(dest)){if(crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex')!==expected)throw Error('Existing chunk differs');}else fs.writeFileSync(dest,data,{flag:'wx',mode:0o644});result.hash=crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex');`;
    const r = await L.wait(L.publish(label + '-c' + i + '-' + Date.now(), body)); if (r.hash !== h) throw Error('Blocco ' + i + ' di ' + label + ' arrivato diverso');
  }
  await L.wait(L.publish(label + '-join-' + Date.now(), `const crypto=require('crypto');const data=Buffer.concat(${JSON.stringify(parts)}.map(p=>fs.readFileSync(p)));if(crypto.createHash('sha256').update(data).digest('hex')!==${JSON.stringify(L.sha(buf))})throw Error('Assembly differs');try{fs.unlinkSync(${JSON.stringify(dest)});}catch(e){}fs.writeFileSync(${JSON.stringify(dest)},data,{flag:'wx',mode:0o644});for(const p of ${JSON.stringify(parts)})fs.unlinkSync(p);result.bytes=data.length;`));
  console.log(label + ' inviato e verificato (' + buf.length + ' byte)');
  return dest;
}

const STATE = `var c=self.__CODEX_NATIVE_HOME__,v=c&&c.vm;function s(f){try{var r=f();return r===undefined?null:JSON.parse(JSON.stringify(r));}catch(e){return 'errore: '+(e&&e.message||e);}}
return {version:c&&c.version,errors:c&&c.errors,route:s(function(){return self._V_SDK_.router.router.currentRoute.path;}),prefs:v&&s(function(){var p=v.prefs;return {menuKeys:p.menuKeys,volKeys:p.volKeys,quickRoutes:p.quickRoutes,volHud:p.volHud,sounds:p.sounds,soundVolume:p.soundVolume,homeFx:p.homeFx};}),keyLog:s(function(){return (c.keyLog||[]).slice(-25);}),events:s(function(){return (c.events||[]).slice(-40);}),perf:s(function(){return c.perf;}),sound:s(function(){return c.soundInfo();})};`;

const cmd = process.argv[2];
(async () => {
  if (cmd === 'stato') {
    const body = L.tvHelpers + `result.tv=await js(${JSON.stringify(STATE)});result.audio=await local('/${AUDIO_TOKEN}/status');try{result.target=crypto.createHash('sha256').update(fs.readFileSync(${JSON.stringify(TARGET)})).digest('hex');}catch(e){result.target='non leggibile senza root';}`;
    const r = await L.wait(L.publish('stato12-' + Date.now(), body));
    out('stato-1.2-' + Date.now() + '.json', r);
    const t = r.tv || {}, perf = t.perf || {};
    console.log('Home installata: ' + (ALLOWED[r.target] || r.target) + ' | in memoria: ' + t.version + ' | rotta ' + t.route + ' | errori ' + JSON.stringify(t.errors));
    console.log('Altoparlante: ' + JSON.stringify(r.audio));
    console.log('Preferenze: ' + JSON.stringify(t.prefs));
    console.log('Tempo per tasto: ' + (perf.n ? (perf.sum / perf.n).toFixed(1) + ' ms medi su ' + perf.n + ', massimo ' + perf.max : '-'));
    console.log('Tasti:\n  ' + (t.keyLog || []).map(k => k.t + ' ' + k.code + ' ' + (k.key || '') + ' ' + (k.route || '')).join('\n  '));
    console.log('Eventi:\n  ' + (t.events || []).map(e => e.t + ' ' + e.ev + (e.info ? ' · ' + e.info : '')).join('\n  '));
    return;
  }
  if (cmd === 'suoni') {
    const bin = fs.readFileSync(path.join(here, 'native-home-audio-12'));
    const files = { audio: { buf: bin, mode: 0o755 } };
    for (const n of NAMES) files[n + '.pcm'] = { buf: fs.readFileSync(path.join(SND, n + '.pcm')), mode: 0o644 };
    const stage = '/tmp/' + cfg.run + '-audio12-' + Date.now(), list = {};
    for (const [n, f] of Object.entries(files)) list[n] = { tmp: await send(f.buf, stage + '-' + n, 'audio12-' + n.replace(/\W/g, '').toLowerCase()), hash: L.sha(f.buf), mode: f.mode };
    const script = `const cp=require('child_process');const base=${JSON.stringify(ABASE)},list=${JSON.stringify(list)},bk=base+'/prima-della-1.2-'+Date.now();
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const n in list)if(hash(list[n].tmp)!==list[n].hash)throw Error('File '+n+' diverso');
if(!fs.existsSync(base+'/audio')||!fs.existsSync(base+'/token'))throw Error('Altoparlante non installato');
const ref=fs.statSync(base+'/audio');
fs.mkdirSync(bk,{mode:0o700});for(const n in list)if(fs.existsSync(base+'/'+n))fs.copyFileSync(base+'/'+n,bk+'/'+n,fs.constants.COPYFILE_EXCL);
for(const n in list){const t=base+'/'+n+'.next';try{fs.unlinkSync(t);}catch(e){}fs.copyFileSync(list[n].tmp,t);fs.chownSync(t,ref.uid,ref.gid);fs.chmodSync(t,list[n].mode);fs.renameSync(t,base+'/'+n);}
${RESTART}
fs.writeFileSync(base+'/ultimo-backup.txt',bk,{mode:0o644});out.backup=bk;for(const n in list)try{fs.unlinkSync(list[n].tmp);}catch(e){}`;
    const r = await L.wait(L.rootJob('audio12-' + Date.now(), script.replace('${RESTART}', RESTART), L.tvHelpers + WAIT12), 150000);
    out('suoni-1.2-' + Date.now() + '.json', r);
    if (!r.ready) {
      console.log('Altoparlante 1.2 non risponde: rimetto quello di prima...');
      const b = await L.wait(L.rootJob('audio12-back-' + Date.now(), BACK, L.tvHelpers + WAIT_ANY), 150000);
      out('suoni-indietro-' + Date.now() + '.json', b); console.log('Ripristinato: ' + JSON.stringify(b.status)); process.exitCode = 1; return;
    }
    console.log('Altoparlante 1.2 attivo: ' + JSON.stringify(r.status) + ' | prova suono: ' + JSON.stringify(r.play)); return;
  }
  if (cmd === 'installa') {
    const assets = JSON.parse(fs.readFileSync(path.join(here, 'asset-location-1.0.json'), 'utf8'));
    const original = fs.readFileSync(path.join(cfg.previous, 'stock-operationui/apps/launcher/js/app.js'));
    if (L.sha(original) !== STOCK_HASH) throw Error('Home originale di riferimento diversa dal previsto');
    let source = fs.readFileSync(SRC, 'utf8');
    if (!/^daniel-home-1\.[2-9]$/.test(VER)) throw Error('native-home.js non è una versione prevista: ' + VER);
    const codesFile = path.join(here, 'codici-volume.json');
    if (fs.existsSync(codesFile)) {
      const c = JSON.parse(fs.readFileSync(codesFile, 'utf8'));
      source = source.replace(/VOL_UP: \[([^\]]*)\], VOL_DOWN: \[([^\]]*)\], VOL_MUTE: \[([^\]]*)\]/, (m, a, b, d) => {
        const merge = (s, extra) => JSON.stringify([...new Set(s.split(',').map(Number).concat(extra || []))].sort((x, y) => x - y)).replace(/,/g, ', ');
        return 'VOL_UP: ' + merge(a, c.up) + ', VOL_DOWN: ' + merge(b, c.down) + ', VOL_MUTE: ' + merge(d, c.mute);
      });
      source = source.replace('VOL_VERIFIED: false,', 'VOL_VERIFIED: true,');
    }
    const adapter = Buffer.from(source.replaceAll('APPS/daniel-home-assets/', assets.url));
    const candidate = Buffer.concat([original, Buffer.from('\n;\n'), adapter, Buffer.from('\n')]);
    new vm.Script(candidate.toString());
    const tag = Date.now();
    const m = { version: VER, target: TARGET, base: '/APPS/codex-' + cfg.run + '-home12-' + tag, stage: '/tmp/' + cfg.run + '-home12-' + tag + '-candidate.js', ack: '/tmp/' + cfg.run + '-home12-' + tag + '-ack', guard: '/tmp/' + cfg.run + '-home12-' + tag + '-watchdog.json', allowed: Object.keys(ALLOWED), candidateHash: L.sha(candidate), candidateBytes: candidate.length, nonce: crypto.randomBytes(24).toString('hex'), assets: assets.destination };
    fs.writeFileSync(M12, JSON.stringify(m, null, 2));
    fs.writeFileSync(path.join(here, 'candidate-1.2.js'), candidate);
    const restore = `const fs=require('fs'),crypto=require('crypto');
const m=${JSON.stringify(m)};
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
module.exports=function(){
 const backup=m.base+'/previous-app.js',prev=hash(backup);if(m.allowed.indexOf(prev)<0)throw Error('Backup hash mismatch');
 const current=hash(m.target);if(current===prev)return 'già la versione precedente';
 if(current!==m.candidateHash)throw Error('Target changed since this update');
 const meta=JSON.parse(fs.readFileSync(m.base+'/previous-stat.json','utf8'));
 const temp=m.target+'.home12.restore';try{fs.unlinkSync(temp);}catch(e){}
 fs.copyFileSync(backup,temp,fs.constants.COPYFILE_EXCL);fs.chmodSync(temp,meta.mode&4095);fs.chownSync(temp,meta.uid,meta.gid);
 const fd=fs.openSync(temp,'r');fs.fsyncSync(fd);fs.closeSync(fd);fs.renameSync(temp,m.target);
 if(hash(m.target)!==prev)throw Error('Restoration verification failed');return 'ripristinata la versione precedente';
};
if(require.main===module)module.exports();
`;
    const watchdog = `const fs=require('fs'),http=require('http');
const m=${JSON.stringify(m)},deadline=Date.now()+15*60*1000;
function report(state,error){fs.writeFileSync(m.guard,JSON.stringify({state,error,deadline,pid:process.pid}),{mode:0o600});fs.chownSync(m.guard,314,314);}
report('armed');
const timer=setInterval(function(){
 try{
  if(fs.existsSync(m.ack)&&fs.readFileSync(m.ack,'utf8')===m.nonce){report('committed');clearInterval(timer);return;}
  if(Date.now()<deadline)return;
  require(m.base+'/restore.cjs')();report('rolled-back');clearInterval(timer);
  try{const s=JSON.parse(fs.readFileSync(${JSON.stringify('/tmp/vidaa-codex-webdriver-session-' + cfg.run + '.json')},'utf8')).session;const q=http.request({host:'::1',port:4445,path:'/session/'+s+'/refresh',method:'POST',headers:{'Content-Type':'application/json'}},r=>r.resume());q.on('error',()=>{});q.setTimeout(5000,()=>q.destroy());q.end('{}');}catch(e){}
 }catch(e){report('rollback-error',e.message);clearInterval(timer);}
},1000);
`;
    new vm.Script(restore); new vm.Script(watchdog);
    fs.writeFileSync(path.join(here, 'restore-1.2.cjs'), restore); fs.writeFileSync(path.join(here, 'watchdog-1.2.cjs'), watchdog);
    const rootScript = `
const m=${JSON.stringify(m)};
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const st=fs.lstatSync(m.target);if(!st.isFile()||st.isSymbolicLink())throw Error('Unexpected target');
const prev=hash(m.target);if(m.allowed.indexOf(prev)<0)throw Error('Sulla TV non c\\'è né la 1.0 né la 1.1: nessuna modifica fatta ('+prev+')');
if(hash(m.stage)!==m.candidateHash)throw Error('Update hash precondition failed');
if(!fs.existsSync(m.assets))throw Error('Risorse della Home mancanti');
if(fs.existsSync(m.base)||fs.existsSync(m.ack)||fs.existsSync(m.guard))throw Error('Update paths already exist');
const cp=require('child_process');
const beforeContext=cp.execFileSync('/bin/ls',['-Z',m.target],{encoding:'utf8'}).trim().split(/\\s+/)[0];
fs.mkdirSync(m.base,{mode:0o700});
fs.copyFileSync(m.target,m.base+'/previous-app.js',fs.constants.COPYFILE_EXCL);
fs.writeFileSync(m.base+'/previous-stat.json',JSON.stringify({uid:st.uid,gid:st.gid,mode:st.mode,context:beforeContext,hash:prev}),{flag:'wx',mode:0o600});
fs.writeFileSync(m.base+'/restore.cjs',${JSON.stringify(restore)},{flag:'wx',mode:0o600});
fs.writeFileSync(m.base+'/watchdog.cjs',${JSON.stringify(watchdog)},{flag:'wx',mode:0o600});
fs.writeFileSync(m.base+'/manifest.json',JSON.stringify(m),{flag:'wx',mode:0o600});
if(hash(m.base+'/previous-app.js')!==prev)throw Error('Backup non verificato');
const temp=m.target+'.home12.new';try{fs.unlinkSync(temp);}catch(e){}
fs.copyFileSync(m.stage,temp,fs.constants.COPYFILE_EXCL);fs.chownSync(temp,st.uid,st.gid);fs.chmodSync(temp,st.mode&4095);
if(cp.execFileSync('/bin/ls',['-Z',temp],{encoding:'utf8'}).trim().split(/\\s+/)[0]!==beforeContext)throw Error('File security context differs');
const fd=fs.openSync(temp,'r');fs.fsyncSync(fd);fs.closeSync(fd);
const child=cp.spawn(process.execPath,[m.base+'/watchdog.cjs'],{detached:true,stdio:'ignore'});child.unref();
fs.renameSync(temp,m.target);
try{if(hash(m.target)!==m.candidateHash)throw Error('Installed file hash mismatch');}catch(e){require(m.base+'/restore.cjs')();throw e;}
out.installed={hash:hash(m.target),bytes:fs.statSync(m.target).size,previous:prev,backup:m.base,watchdogPid:child.pid,context:beforeContext};
`;
    await send(candidate, m.stage, 'home12');
    const r = await L.wait(L.rootJob('install-home12-' + tag, rootScript));
    if (!r.proof || !r.proof.installed) throw Error('Installazione non completata ' + JSON.stringify(r).slice(0, 800));
    console.log('Installata ' + VER + ' al posto della ' + ALLOWED[r.proof.installed.previous] + ' (guardiano attivo 15 minuti): ' + JSON.stringify(r.proof.installed)); console.log('Ora esegui SUBITO: node tv12.cjs attiva'); return;
  }
  if (cmd === 'conferma') {   // come attiva ma SENZA ricaricare l'interfaccia: controlla file/backup/asset e ferma il guardiano; la nuova Home parte alla prossima accensione
    const m = JSON.parse(fs.readFileSync(M12, 'utf8'));
    const check = `const m=${JSON.stringify(m)};const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');if(hash(m.target)!==m.candidateHash||m.allowed.indexOf(hash(m.base+'/previous-app.js'))<0||!fs.existsSync(m.assets))throw Error('Installed file, backup or assets mismatch');out.verified=true;`;
    const after = L.tvHelpers + `
const m=${JSON.stringify(m)};
const proof=JSON.parse(result.rootProof);if(proof.error||!proof.verified)throw Error('File verification failed');
try{
fs.writeFileSync(m.ack,m.nonce,{flag:'wx',mode:0o600});await new Promise(r=>setTimeout(r,1500));result.guard=JSON.parse(fs.readFileSync(m.guard,'utf8'));
}catch(e){result.validationError=e.message;}
`;
    const r = await L.wait(L.rootJob('confirm-home12-' + Date.now(), check, after), 150000);
    out('conferma-' + Date.now() + '.json', r);
    if (r.validationError) { console.log('ATTENZIONE: conferma non riuscita, il guardiano rimetterà la versione precedente entro 15 minuti: ' + r.validationError); process.exitCode = 1; return; }
    console.log(VER + ' installata e confermata (senza ricaricare: parte alla prossima accensione). Guardiano: ' + JSON.stringify(r.guard)); return;
  }
  if (cmd === 'attiva' || cmd === 'ripristina') {
    const m = JSON.parse(fs.readFileSync(M12, 'utf8'));
    if (cmd === 'ripristina') {
      const after = L.tvHelpers + `const proof=JSON.parse(result.rootProof);if(!proof.error){await js('setTimeout(function(){location.reload();},500);return true;');await new Promise(r=>setTimeout(r,6000));result.native=await js("var c=self.__CODEX_NATIVE_HOME__;return {version:c&&c.version,errors:c&&c.errors};");}`;
      const r = await L.wait(L.rootJob('restore-home12-' + Date.now(), `out.result=require(${JSON.stringify(m.base + '/restore.cjs')})();`, after), 150000);
      out('ripristino-1.2-' + Date.now() + '.json', r); console.log(JSON.stringify({ proof: r.proof, native: r.native })); return;
    }
    const check = `const m=${JSON.stringify(m)};const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');if(hash(m.target)!==m.candidateHash||m.allowed.indexOf(hash(m.base+'/previous-app.js'))<0||!fs.existsSync(m.assets))throw Error('Installed file, backup or assets mismatch');out.verified=true;`;
    const after = L.tvHelpers + `
const m=${JSON.stringify(m)};
const proof=JSON.parse(result.rootProof);if(proof.error||!proof.verified)throw Error('File verification failed');
try{
await js('setTimeout(function(){location.reload();},500);return true;');
await new Promise(r=>setTimeout(r,6000));
result.native=await js("var c=self.__CODEX_NATIVE_HOME__;if(!c||c.version!=='${VER}')throw Error('Versione ${VER} non attiva');if(!c.component)self._V_M_.launcher();return {version:c.version,errors:c.errors,component:!!c.component,mounted:!!c.vm,route:self._V_SDK_.router.router.currentRoute.path,wallBase:c.config.WALL_BASE,events:c.events.slice(-8)};");
if(result.native.errors.length||!result.native.component||result.native.wallBase.indexOf(m.assets)<0)throw Error('Interfaccia non valida: '+JSON.stringify(result.native));
result.sound=await js("return self.__CODEX_NATIVE_HOME__.soundInfo();");
fs.writeFileSync(m.ack,m.nonce,{flag:'wx',mode:0o600});await new Promise(r=>setTimeout(r,1500));result.guard=JSON.parse(fs.readFileSync(m.guard,'utf8'));
}catch(e){result.validationError=e.message;}
`;
    const r = await L.wait(L.rootJob('activate-home12-' + Date.now(), check, after), 150000);
    out('attivazione-1.2-' + Date.now() + '.json', r);
    if (r.validationError) { console.log('ATTENZIONE: controllo non superato, il guardiano rimetterà la versione precedente entro 15 minuti: ' + r.validationError); process.exitCode = 1; return; }
    console.log(VER + ' attiva e confermata: ' + JSON.stringify(r.native) + '\nSuoni: ' + JSON.stringify(r.sound) + '\nGuardiano: ' + JSON.stringify(r.guard)); return;
  }
  if (cmd === 'suoni-indietro') {
    const b = await L.wait(L.rootJob('audio12-back-' + Date.now(), BACK, L.tvHelpers + WAIT_ANY), 150000);
    out('suoni-indietro-' + Date.now() + '.json', b); console.log(JSON.stringify({ proof: b.proof, status: b.status })); return;
  }
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(0, 8).join('\n'));
})().catch(e => { console.error('ERRORE: ' + e.message); process.exitCode = 1; });
