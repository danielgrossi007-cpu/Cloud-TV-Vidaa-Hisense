// Daniel Home 1.1 sulla TV. Uso (dalla cartella tv-update, con il server acceso e la pagina aperta sulla TV):
//   node tv11.cjs apri          -> rimette la pagina di collegamento e avvia il server sulla porta 8766 (lascia aperta la finestra)
//   node tv11.cjs diagnosi      -> SOLO LETTURA: versione, tasti ricevuti, tasti del menu, volume reale, suoni, eventi, tempi
//   node tv11.cjs codici        -> dopo aver premuto Vol+ x3, Vol- x3, Muto x1: ricava i codici veri e li salva
//   node tv11.cjs installa      -> backup della Home attuale + installazione 1.1 + guardiano (ripristino automatico in 15 min)
//   node tv11.cjs attiva        -> ricarica l'interfaccia, controlla la 1.1 e conferma (ferma il guardiano)
//   node tv11.cjs verifica      -> SOLO LETTURA dopo le tue prove: volume, tasto Home, suoni, tempi per tasto
//   node tv11.cjs suoni         -> se l'altoparlante nativo non risponde, lo riavvia (se i file sono ancora sulla TV)
//   node tv11.cjs ripristina    -> rimette la 1.0 dal backup fatto da "installa"
//   node tv11.cjs chiudi        -> disattiva la pagina di collegamento
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const L = require('./lib11.cjs');
const cfg = L.config, here = __dirname;
const SRC = 'C:/path/to/Cloud-TV-Vidaa-Hisense/native-home.js';
const TARGET = '/APPS/pkgs/tv.vidaa.app.operationui/CHB/apps/launcher/js/app.js';
const HASH_10 = '17b99087dab8992b2821609007afab3862fab19ee79c1835913b7d219c1d6980';   // 1.0 installata (verificata il 15/11)
const STOCK_HASH = '5c9e0aeaa2eb5653cc8fda0fab7690ed0bacefd2f3801c8f61be9e99c41720d3';
const AUDIO_TOKEN = 'REPLACE_WITH_YOUR_AUDIO_TOKEN';
const out = (name, data) => { fs.writeFileSync(path.join(here, name), JSON.stringify(data, null, 2)); console.log('Salvato: ' + name); };

const READ_STATE = `var c=self.__CODEX_NATIVE_HOME__,v=c&&c.vm,o={};
function safe(f){try{var r=f();return r===undefined?null:JSON.parse(JSON.stringify(r));}catch(e){return 'errore: '+(e&&e.message||e);}}
o.version=c&&c.version;o.errors=c&&c.errors;o.route=safe(function(){return self._V_SDK_.router.router.currentRoute.path;});
o.size=[innerWidth,innerHeight];o.scale=v&&v.scale;
o.prefs=v&&safe(function(){var p=v.prefs;return {menuKeys:p.menuKeys,sounds:p.sounds,soundVolume:p.soundVolume,volHud:p.volHud,bootIntro:p.bootIntro,homeFx:p.homeFx,appMenu:p.appMenu};});
o.keyLog=safe(function(){return c.keyLog||[];});o.events=safe(function(){return c.events||[];});o.perf=safe(function(){return c.perf;});
o.volumeApi=safe(function(){var b=self._V_SDK_.biz.volume;return {main:b.getMainVolumeState(),mute:b.getMainMuteState(),dev:b.getMainVolumeDev?b.getMainVolumeDev():null};});
o.volumeHome=safe(function(){return c.tvVol&&c.tvVol.get?{get:c.tvVol.get(),mute:c.tvVol.getMute()}:null;});
o.volKeysConfig=safe(function(){var k=c.config.KEYS;return {up:k.VOL_UP,down:k.VOL_DOWN,mute:k.VOL_MUTE,home:k.HOME,sidebar:k.SIDEBAR};});
o.sound=safe(function(){return c.soundInfo();});o.introPlayed=c&&c.introPlayed;
o.vol=v&&safe(function(){return v.vol;});o.overlay=v&&v.overlay;o.intro=v&&v.intro;o.homeFx=v&&v.homeFx;
return o;`;

async function readTv(label) {
  const body = L.tvHelpers + `
result.tv=await js(${JSON.stringify(READ_STATE)});
result.audioHelper=await local('/${AUDIO_TOKEN}/status');
for(const p of ['/APPS/daniel-native-audio-20261112/audio','/APPS/daniel-native-audio-20261112/token','/var/local/otaTest.sh']){try{fs.accessSync(p);result[p]='presente';}catch(e){result[p]=e.code;}}
`;
  return await L.wait(L.publish(label + '-' + Date.now(), body));
}
function summary(r) {
  const t = r.tv || {}, perf = t.perf || {};
  const keys = (t.keyLog || []).slice(-15).map(k => k.t + ' codice ' + k.code + (k.key ? ' (' + k.key + ')' : '') + ' ' + (k.route || ''));
  console.log('\n=== Daniel Home sulla TV ===');
  console.log('Versione: ' + t.version + ' | rotta ' + t.route + ' | ' + (t.size || []).join('x') + ' scala ' + t.scale + ' | errori: ' + JSON.stringify(t.errors));
  console.log('Tasti che aprono il menu (prefs.menuKeys): ' + JSON.stringify(t.prefs && t.prefs.menuKeys));
  console.log('Codici volume configurati: ' + JSON.stringify(t.volKeysConfig));
  console.log('Volume reale della TV (biz.volume): ' + JSON.stringify(t.volumeApi) + ' | letto dalla Home: ' + JSON.stringify(t.volumeHome));
  console.log('Altoparlante nativo (127.0.0.1:8772): ' + JSON.stringify(r.audioHelper) + ' | file: ' + r['/APPS/daniel-native-audio-20261112/audio'] + ' | avvio automatico: ' + r['/var/local/otaTest.sh']);
  console.log('Suoni della Home: ' + JSON.stringify(t.sound));
  console.log('Tempo per tasto: ' + (perf.n ? (perf.sum / perf.n).toFixed(1) + ' ms medi su ' + perf.n + ' tasti, massimo ' + perf.max + ' ms' : 'nessun dato') + (perf.fps ? ' | fluidità ' + perf.fps + ' fps, ' + perf.slow + ' scatti' : ''));
  console.log('Ultimi tasti ricevuti:\n  ' + keys.join('\n  '));
  console.log('Ultimi eventi:\n  ' + (t.events || []).slice(-20).map(e => e.t + ' ' + e.ev + (e.info ? ' · ' + e.info : '')).join('\n  '));
}

const cmd = process.argv[2];
(async () => {
  if (cmd === 'apri') {
    fs.writeFileSync(path.join(cfg.previous, 'index.html'), fs.readFileSync(path.join(here, 'index-1.0-poll.html'), 'utf8').replace('Installazione di Daniel Home 1.0', 'Manutenzione di Daniel Home 1.1'));
    fs.writeFileSync(path.join(cfg.previous, 'probe.js'), "window.vidaaProbeVersion='attesa-" + Date.now() + "';\n");
    console.log('Pagina pronta. Sulla TV apri http://192.168.1.100:8766/ e lasciala aperta. Ctrl+C qui per spegnere il server.');
    require(path.join(cfg.previous, 'server.cjs'));
    return;
  }
  if (cmd === 'chiudi') {
    fs.writeFileSync(path.join(cfg.previous, 'index.html'), '<!doctype html><meta charset="utf-8"><title>Daniel Home</title><h1>Collegamento di manutenzione inattivo</h1>');
    fs.writeFileSync(path.join(cfg.previous, 'probe.js'), '/* Collegamento inattivo. */');
    return console.log('Collegamento disattivato (ora puoi chiudere il server con Ctrl+C).');
  }
  if (cmd === 'diagnosi' || cmd === 'verifica') {
    const r = await readTv(cmd); out(cmd + '-' + Date.now() + '.json', r); summary(r); return;
  }
  if (cmd === 'codici') {
    const r = await readTv('codici'); const log = (r.tv.keyLog || []).map(k => k.code);
    // ultime pressioni: 3 uguali (Vol+), 3 uguali (Vol-), 1 (Muto)
    const runs = []; log.forEach(c => { if (runs.length && runs[runs.length - 1].c === c) runs[runs.length - 1].n++; else runs.push({ c, n: 1 }); });
    const last = runs.slice(-3);
    if (last.length < 3 || last[0].n < 3 || last[1].n < 3) { console.log('Sequenza non trovata. Ultimi codici: ' + log.slice(-12).join(', ')); process.exitCode = 1; return; }
    const codes = { up: [last[0].c], down: [last[1].c], mute: [last[2].c], keyNames: (r.tv.keyLog || []).slice(-7).map(k => k.key) };
    out('codici-volume.json', codes); console.log(JSON.stringify(codes)); return;
  }
  if (cmd === 'installa') {
    const assets = JSON.parse(fs.readFileSync(path.join(here, 'asset-location-1.0.json'), 'utf8'));
    const original = fs.readFileSync(path.join(cfg.previous, 'stock-operationui/apps/launcher/js/app.js'));
    if (L.sha(original) !== STOCK_HASH) throw Error('Home originale di riferimento diversa dal previsto');
    let source = fs.readFileSync(SRC, 'utf8');
    if (!source.includes("var VERSION = 'daniel-home-1.1';")) throw Error('native-home.js non è la 1.1');
    const codesFile = path.join(here, 'codici-volume.json');
    if (fs.existsSync(codesFile)) {   // codici veri del telecomando, aggiunti a quelli standard
      const c = JSON.parse(fs.readFileSync(codesFile, 'utf8'));
      source = source.replace(/VOL_UP: \[([^\]]*)\], VOL_DOWN: \[([^\]]*)\], VOL_MUTE: \[([^\]]*)\]/, (m, a, b, d) => {
        const merge = (s, extra) => JSON.stringify([...new Set(s.split(',').map(Number).concat(extra || []))].sort((x, y) => x - y)).replace(/,/g, ', ');
        return 'VOL_UP: ' + merge(a, c.up) + ', VOL_DOWN: ' + merge(b, c.down) + ', VOL_MUTE: ' + merge(d, c.mute);
      });
      source = source.replace('VOL_VERIFIED: false,', 'VOL_VERIFIED: true,');
      console.log('Codici volume del telecomando inclusi: ' + JSON.stringify(c));
    }
    const adapter = Buffer.from(source.replaceAll('APPS/daniel-home-assets/', assets.url));
    const candidate = Buffer.concat([original, Buffer.from('\n;\n'), adapter, Buffer.from('\n')]);
    new vm.Script(candidate.toString());
    const m = { version: 'daniel-home-1.1', target: TARGET, base: '/APPS/codex-' + cfg.run + '-home11', stage: '/tmp/' + cfg.run + '-home11-candidate.js', ack: '/tmp/' + cfg.run + '-home11-ack', guard: '/tmp/' + cfg.run + '-home11-watchdog.json', previousHash: HASH_10, candidateHash: L.sha(candidate), candidateBytes: candidate.length, nonce: crypto.randomBytes(24).toString('hex'), assets: assets.destination };
    fs.writeFileSync(path.join(here, 'install-manifest-1.1.json'), JSON.stringify(m, null, 2));
    fs.writeFileSync(path.join(here, 'candidate-1.1.js'), candidate);
    const restore = `const fs=require('fs'),crypto=require('crypto');
const m=${JSON.stringify(m)};
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
module.exports=function(){
 const current=hash(m.target);if(current===m.previousHash)return 'già 1.0';
 if(current!==m.candidateHash)throw Error('Target changed since this update');
 const backup=m.base+'/previous-app.js';if(hash(backup)!==m.previousHash)throw Error('Backup hash mismatch');
 const meta=JSON.parse(fs.readFileSync(m.base+'/previous-stat.json','utf8'));
 const temp=m.target+'.'+${JSON.stringify(cfg.run)}+'.restore';
 fs.copyFileSync(backup,temp,fs.constants.COPYFILE_EXCL);fs.chmodSync(temp,meta.mode&4095);fs.chownSync(temp,meta.uid,meta.gid);
 const fd=fs.openSync(temp,'r');fs.fsyncSync(fd);fs.closeSync(fd);fs.renameSync(temp,m.target);
 if(hash(m.target)!==m.previousHash)throw Error('Restoration verification failed');return 'ripristinata 1.0';
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
    fs.writeFileSync(path.join(here, 'restore-1.1.cjs'), restore); fs.writeFileSync(path.join(here, 'watchdog-1.1.cjs'), watchdog);
    const rootScript = `
const m=${JSON.stringify(m)};
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const st=fs.lstatSync(m.target);if(!st.isFile()||st.isSymbolicLink())throw Error('Unexpected target');
if(hash(m.target)!==m.previousHash)throw Error('Sulla TV non c\\'è la 1.0 attesa: nessuna modifica fatta');
if(hash(m.stage)!==m.candidateHash)throw Error('Update hash precondition failed');
if(!fs.existsSync(m.assets))throw Error('Risorse della Home mancanti');
if(fs.existsSync(m.base)||fs.existsSync(m.ack)||fs.existsSync(m.guard))throw Error('Update paths already exist');
const cp=require('child_process');
const beforeContext=cp.execFileSync('/bin/ls',['-Z',m.target],{encoding:'utf8'}).trim().split(/\\s+/)[0];
fs.mkdirSync(m.base,{mode:0o700});
fs.copyFileSync(m.target,m.base+'/previous-app.js',fs.constants.COPYFILE_EXCL);
fs.writeFileSync(m.base+'/previous-stat.json',JSON.stringify({uid:st.uid,gid:st.gid,mode:st.mode,context:beforeContext}),{flag:'wx',mode:0o600});
fs.writeFileSync(m.base+'/restore.cjs',${JSON.stringify(restore)},{flag:'wx',mode:0o600});
fs.writeFileSync(m.base+'/watchdog.cjs',${JSON.stringify(watchdog)},{flag:'wx',mode:0o600});
fs.writeFileSync(m.base+'/manifest.json',JSON.stringify(m),{flag:'wx',mode:0o600});
if(hash(m.base+'/previous-app.js')!==m.previousHash)throw Error('Backup non verificato');
const temp=m.target+'.${cfg.run}.new';
fs.copyFileSync(m.stage,temp,fs.constants.COPYFILE_EXCL);fs.chownSync(temp,st.uid,st.gid);fs.chmodSync(temp,st.mode&4095);
if(cp.execFileSync('/bin/ls',['-Z',temp],{encoding:'utf8'}).trim().split(/\\s+/)[0]!==beforeContext)throw Error('File security context differs');
const fd=fs.openSync(temp,'r');fs.fsyncSync(fd);fs.closeSync(fd);
const child=cp.spawn(process.execPath,[m.base+'/watchdog.cjs'],{detached:true,stdio:'ignore'});child.unref();
fs.renameSync(temp,m.target);
try{if(hash(m.target)!==m.candidateHash)throw Error('Installed file hash mismatch');}catch(e){require(m.base+'/restore.cjs')();throw e;}
out.installed={hash:hash(m.target),bytes:fs.statSync(m.target).size,backup:m.base,backupHash:hash(m.base+'/previous-app.js'),watchdogPid:child.pid,uid:st.uid,gid:st.gid,mode:st.mode,context:beforeContext};
`;
    const parts = [];
    for (let offset = 0, index = 0; offset < candidate.length; offset += 300000, index++) {
      const data = candidate.subarray(offset, offset + 300000), dest = m.stage + '.part' + index, expected = L.sha(data); parts.push(dest);
      const body = `const crypto=require('crypto');const dest=${JSON.stringify(dest)},expected=${JSON.stringify(expected)},data=Buffer.from(${JSON.stringify(data.toString('base64'))},'base64');if(fs.existsSync(dest)){if(crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex')!==expected)throw Error('Existing chunk differs');}else fs.writeFileSync(dest,data,{flag:'wx',mode:0o600});result.hash=crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex');`;
      const r = await L.wait(L.publish('home11-chunk-' + index + '-' + Date.now(), body)); if (r.hash !== expected) throw Error('Blocco ' + index + ' arrivato diverso'); console.log('Blocco ' + index + ' verificato (SHA-256)');
    }
    await L.wait(L.publish('assemble-home11-' + Date.now(), `const crypto=require('crypto');const data=Buffer.concat(${JSON.stringify(parts)}.map(p=>fs.readFileSync(p)));if(crypto.createHash('sha256').update(data).digest('hex')!==${JSON.stringify(m.candidateHash)})throw Error('Assembly differs');fs.writeFileSync(${JSON.stringify(m.stage)},data,{flag:'wx',mode:0o600});for(const p of ${JSON.stringify(parts)})fs.unlinkSync(p);result.bytes=data.length;`));
    const r = await L.wait(L.rootJob('install-home11-' + Date.now(), rootScript));
    if (!r.proof || !r.proof.installed) throw Error('Installazione non completata ' + JSON.stringify(r).slice(0, 800));
    console.log('Installata (guardiano attivo 15 minuti): ' + JSON.stringify(r.proof.installed)); console.log('Ora esegui: node tv11.cjs attiva'); return;
  }
  if (cmd === 'attiva') {
    const m = JSON.parse(fs.readFileSync(path.join(here, 'install-manifest-1.1.json'), 'utf8'));
    const check = `const m=${JSON.stringify(m)};const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');if(hash(m.target)!==m.candidateHash||hash(m.base+'/previous-app.js')!==m.previousHash||!fs.existsSync(m.assets))throw Error('Installed file, backup or assets mismatch');out.verified=true;`;
    const after = L.tvHelpers + `
const m=${JSON.stringify(m)};
const proof=JSON.parse(result.rootProof);if(proof.error||!proof.verified)throw Error('File verification failed');
try{
await js('setTimeout(function(){location.reload();},500);return true;');
await new Promise(r=>setTimeout(r,6000));
result.native=await js("var c=self.__CODEX_NATIVE_HOME__;if(!c||c.version!=='daniel-home-1.1')throw Error('Versione 1.1 non attiva');if(!c.component)self._V_M_.launcher();return {version:c.version,errors:c.errors,component:!!c.component,mounted:!!c.vm,route:self._V_SDK_.router.router.currentRoute.path,scale:c.vm&&c.vm.scale,size:[innerWidth,innerHeight],wallBase:c.config.WALL_BASE,volume:c.tvVol.get(),volKeys:c.config.KEYS.VOL_UP,events:c.events.slice(-8)};");
if(result.native.errors.length||!result.native.component||result.native.wallBase.indexOf(m.assets)<0)throw Error('Interfaccia non valida: '+JSON.stringify(result.native));
result.sound=await js("return self.__CODEX_NATIVE_HOME__.soundInfo();");
fs.writeFileSync(m.ack,m.nonce,{flag:'wx',mode:0o600});await new Promise(r=>setTimeout(r,1500));result.guard=JSON.parse(fs.readFileSync(m.guard,'utf8'));
}catch(e){result.validationError=e.message;}
`;
    const r = await L.wait(L.rootJob('activate-home11-' + Date.now(), check, after), 150000);
    out('attivazione-1.1-' + Date.now() + '.json', r);
    if (r.validationError) { console.log('ATTENZIONE: controllo non superato, il guardiano rimetterà la 1.0 entro 15 minuti: ' + r.validationError); process.exitCode = 1; return; }
    console.log('1.1 attiva e confermata: ' + JSON.stringify(r.native) + '\nSuoni: ' + JSON.stringify(r.sound) + '\nGuardiano: ' + JSON.stringify(r.guard)); return;
  }
  if (cmd === 'suoni') {
    // root: controlla i file dell'altoparlante nativo e, se il programma non gira, lo avvia (scende da solo a utente 314)
    const script = `const cp=require('child_process');const base='/APPS/daniel-native-audio-20261112';
out.files=fs.existsSync(base+'/audio')&&fs.existsSync(base+'/token');out.bootHook=fs.existsSync('/var/local/otaTest.sh')?fs.readFileSync('/var/local/otaTest.sh','utf8').slice(0,300):null;
out.running=fs.readdirSync('/proc').filter(p=>/^[0-9]+$/.test(p)).filter(p=>{try{return fs.readFileSync('/proc/'+p+'/cmdline','utf8').indexOf(base+'/audio')===0;}catch(e){return false;}});
if(out.files&&!out.running.length){const fd=fs.openSync(base+'/service.log','a');const c=cp.spawn(base+'/audio',[],{detached:true,stdio:['ignore',fd,fd]});fs.closeSync(fd);c.unref();out.started=c.pid;}`;
    const after = L.tvHelpers + `await new Promise(r=>setTimeout(r,1500));result.status=await local('/${AUDIO_TOKEN}/status');`;
    const r = await L.wait(L.rootJob('audio11-' + Date.now(), script, after));
    out('suoni-' + Date.now() + '.json', r); console.log(JSON.stringify({ proof: r.proof, status: r.status })); return;
  }
  if (cmd === 'ripristina') {
    const m = JSON.parse(fs.readFileSync(path.join(here, 'install-manifest-1.1.json'), 'utf8'));
    const after = L.tvHelpers + `const proof=JSON.parse(result.rootProof);if(!proof.error){await js('setTimeout(function(){location.reload();},500);return true;');await new Promise(r=>setTimeout(r,6000));result.native=await js("var c=self.__CODEX_NATIVE_HOME__;return {version:c&&c.version,errors:c&&c.errors};");}`;
    const r = await L.wait(L.rootJob('restore-home11-' + Date.now(), `out.result=require(${JSON.stringify(m.base + '/restore.cjs')})();`, after), 150000);
    out('ripristino-' + Date.now() + '.json', r); console.log(JSON.stringify({ proof: r.proof, native: r.native })); return;
  }
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(0, 11).join('\n'));
})().catch(e => { console.error('ERRORE: ' + e.message); process.exitCode = 1; });
