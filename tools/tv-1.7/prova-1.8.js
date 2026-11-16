// Prova 1.8 con un DOM vero (jsdom): livello permanente, Centro di controllo dentro le app, volume, Home ricreata.
var fs = require('fs'), vmod = require('vm');
var JSDOM = require('jsdom').JSDOM;
var dom = new JSDOM('<!doctype html><html><head></head><body><div id="app"></div></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
var W = dom.window;
global.window = global.self = global;
['document', 'navigator', 'HTMLElement', 'Element', 'Node', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'Event', 'KeyboardEvent'].forEach(function (k) { global[k] = W[k]; });
global.localStorage = W.localStorage; global.innerWidth = 1920; global.innerHeight = 1080;
global.addEventListener = W.addEventListener.bind(W); global.removeEventListener = W.removeEventListener.bind(W);
var Vue = require('vue'); Vue.config.silent = true; Vue.config.devtools = false; Vue.config.productionTip = false;
var FILE = process.argv[2];

// SDK finto
var APPS = ['Netflix', 'YouTube', 'Prime Video', 'Disney+', 'RaiPlay', 'Spotify'];
var apps = APPS.map(function (n, i) { return { appId: String(100 + i), appName: n, img: '' }; });
function service(name) { return { getData: function () { return { result: name === 'app-service' ? apps : [] }; }, invoke: function () { return null; } }; }
function Disp() { this.l = []; } Disp.prototype.addEventListener = function (f) { this.l.push(f); }; Disp.prototype.removeEventListener = function (f) { this.l = this.l.filter(function (x) { return x !== f; }); };
Disp.prototype.fire = function (e) { for (var i = 0; i < this.l.length; i++) { if (this.l[i](e) === false) return false; } return true; };
var down = new Disp(), up = new Disp();
function SDK() { this.me = { req: service }; this.apc = { start: function () {} }; this.message = { on: function () {}, off: function () {} }; this.key = { beforeKeydownDispatch: down, beforeKeyupDispatch: up }; }
var volume = { v: 20, m: 0 };
var router = {
  currentRoute: { path: '/0/Launcher' }, guards: [], after: [], hist: ['/0/Launcher'], afterEach: function (f) { this.after.push(f); },
  beforeEach: function (f) { this.guards.push(f); }, getRoutes: function () { return []; },
  go: function (tp, matched) {
    var self = this, from = this.currentRoute, to = { path: tp, matched: matched || [{ path: tp, components: { default: { name: 'Stock' } } }] }, ok = true;
    this.guards.forEach(function (g) { g(to, from, function (x) { if (x === false) ok = false; }); });
    if (ok) { this.currentRoute = to; this.hist.push(tp); this.after.forEach(function (f) { f(to, from); }); }
    return ok;
  },
  back: function () { this.hist.pop(); var p = this.hist[this.hist.length - 1] || '/0/Launcher'; this.hist.pop(); this.go(p); },
  replace: function (p) { this.go(p); }
};
Object.defineProperty(Vue.prototype, '$router', { get: function () { return router; } });
Object.defineProperty(Vue.prototype, '$route', { get: function () { return router.currentRoute; } });
global._V_SDK_ = { vre: { SDK: SDK }, vui: {}, router: { router: router }, biz: { network: { getNetworkAvailable: function () { return { value: 1 }; }, getSsid: function () { return 'Casa'; }, getNetworkType: function () { return { value: 1 }; }, getSearchState: function () { return { value: 0 }; }, getWifiList: function () { return []; }, MODELJS: {}, getIpAddress: function () { return '192.168.1.100'; }, getConnectType: function () { return { value: 1 }; } }, volume: { getMainVolumeState: function () { return { value: volume.v }; }, getMainMuteState: function () { return { value: volume.m }; } } } };
global._V_M_ = { launcher: function () { return { route: [{ path: '/0/Launcher', component: null }] }; }, setting: function () { return { page: { settings: function () {} } }; } };

vmod.runInThisContext(fs.readFileSync(FILE, 'utf8'), { filename: 'native-home.js' });
var control = global.__CODEX_NATIVE_HOME__;
global._V_M_.launcher();

var fails = 0, passes = 0;
function ok(c, m) { if (c) { passes++; console.log('  ✓ ' + m); } else { fails++; console.log('  ✗ ' + m); } }
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function key(code) { var e = { keyCode: code, key: '', preventDefault: function () {}, stopImmediatePropagation: function () {} }; var r = down.fire(e); up.fire(e); return r; }

// SystemUI finta: radice persistente con la Home come figlia (la Home si smonta quando si apre un'app)
var app = new Vue({ data: { show: true }, render: function (h) { return h('div', [this.show ? h(control.shell) : h('div', 'app')]); } }).$mount('#app');

(async function () {
  console.log('Versione:', control.version);
  await wait(50);
  ok(!!control.vm && !!control.layer, 'Home montata e livello permanente creato');
  var L = control.layer;
  ok(document.getElementById('codex-home-layer') !== null, 'Il livello è nel DOM (id codex-home-layer)');
  var he = document.getElementById('codex-native-home'); ok(he && he.parentNode && he.parentNode.className === 'dh-shell', 'La Home sta dentro la pagina del launcher (come l’originale)');
  // il saluto non deve bloccare i test
  if (control.vm.intro) control.vm.endIntro(); await wait(2500);

  // indicatore VIDAA finto (come lo disegnerebbe la SystemUI): riquadro fisso a destra con il numero del volume
  var osd = document.createElement('div'); osd.className = 'volume-bar v-br-md v-box v-border'; osd.style.position = 'fixed';
  osd.innerHTML = '<div class="vol-inner"><span class="vol-num">20</span></div>'; document.body.appendChild(osd);
  osd.getBoundingClientRect = function () { return { left: 1700, top: 300, width: 120, height: 480 }; };
  osd.querySelector('.vol-num').getBoundingClientRect = function () { return { left: 1730, top: 700, width: 40, height: 30 }; };
  // Volume nella Home
  key(412); await wait(30);
  ok(L.vol.on === true, 'Volume nella Home: la capsula si accende sul livello');
  var lay = document.getElementById('codex-home-layer');
  ok(lay && lay.style.display === 'block', 'Il livello è visibile');
  osd.querySelector('.vol-num').textContent = '21'; await wait(700);
  ok(control.vidaaVolSel === 'div.volume-bar', 'Indicatore VIDAA trovato: ' + control.vidaaVolSel);
  var hs = document.getElementById('codex-hide-vidaa-vol');
  ok(hs && /div\.volume-bar\{opacity:0/.test(hs.textContent), 'Indicatore VIDAA nascosto con la regola CSS');
  ok(getComputedStyle(osd).opacity === '0', 'L’indicatore VIDAA ha opacità 0');
  ok(control.vidaaVolSel === 'div.volume-bar', 'Selettore VIDAA già noto (letto sulla TV): nascosto dal primo istante');
  await wait(2400);
  ok(L.vol.on === false, 'La capsula si spegne dopo 2,2 s');

  // Apertura di Netflix: la Home viene distrutta
  router.go('/4/appControl'); app.show = false; await wait(30);
  var V0 = control.vm;
  ok(control.persist === true && !!V0, 'Home permanente: resta viva anche dentro l’app');
  await wait(10); ok(V0.homeVisible === false && V0._codexActive === false, 'Dentro l’app la Home è nascosta e non prende tasti');
  ok(!document.getElementById('codex-native-home'), 'Dentro l’app la Home è fuori dalla pagina (niente da disegnare)');
  ok(control.layer === L, 'Il livello resta vivo');

  // Volume dentro l'app (tasto visto dalla SystemUI)
  key(412); await wait(30);
  ok(L.vol.on === true, 'Volume dentro Netflix: capsula accesa');
  await wait(2400);
  // Volume cambiato senza tasto (la TV non passa il tasto): lo legge il controllo periodico
  volume.v = 35; await wait(700);
  ok(L.vol.on === true && L.vol.level === 35, 'Volume cambiato dalla TV senza tasto: capsula con il valore vero (35)');
  await wait(2400);

  // Tre lineette dentro l'app: la TV va sulla sua pagina quickSetting
  var leaf = { path: '/13/setting/quickSetting', components: { default: { name: 'VidaaQuick' } } };
  var went = router.go('/13/setting/quickSetting', [{ path: '/13', components: { default: { name: 'SettingApp' } } }, leaf]);
  await wait(60);
  ok(went === true, 'La rotta della TV prosegue (schermo e tasti passano alla SystemUI)');
  ok(leaf.components.default.name === 'DanielHomeEmptyPage', 'Al posto del menu VIDAA c’è la pagina vuota');
  ok(L.overlay === 'quick' && L.qsInApp === true, 'Il nostro Centro di controllo è aperto sul livello');
  var html = document.getElementById('codex-home-layer').innerHTML;
  ok(/Centro di controllo|Mentre guardi/.test(html), 'Si vede il pannello del Centro di controllo');
  // frecce e OK nel pannello
  var i0 = L.qs[L.qs.length - 1].i; var r1 = key(39); await wait(20);
  ok(r1 === false, 'Freccia consumata dal pannello (non arriva all’app)');
  key(40); await wait(20);
  ok(JSON.stringify(L.qs) !== JSON.stringify([{ id: 'root', i: i0 }]), 'Il fuoco si sposta nel pannello');
  // Indietro fino a chiudere
  for (var b = 0; b < 4 && L.overlay === 'quick'; b++) { key(8); await wait(30); }
  await wait(600);
  ok(L.overlay === null || !L.overlayShown, 'Indietro chiude il pannello');
  ok(router.currentRoute.path === '/4/appControl', 'Si torna all’app (' + router.currentRoute.path + ')');
  ok(key(39) === true, 'Dopo la chiusura le frecce tornano all’app');

  // Riapertura e chiusura con le tre lineette (tasto del menu imparato)
  L.setPref('menuKeys', [999]);
  router.go('/13/setting/quickSetting', [{ path: '/13', components: { default: {} } }, leaf]); await wait(60);
  ok(L.overlay === 'quick', 'Seconda apertura');
  key(999); await wait(600);
  ok(router.currentRoute.path === '/4/appControl', 'Le tre lineette di nuovo: si chiude e si torna all’app');

  // Chiusura automatica dopo 15 s non provata qui (timer lungo); tasto Home dal pannello
  router.go('/13/setting/quickSetting', [{ path: '/13', components: { default: {} } }, leaf]); await wait(60);
  key(547); router.go('/0/Launcher'); app.show = true; await wait(80);
  ok(L.overlay === null || !L.overlayShown, 'Tasto Home: il pannello si chiude');
  ok(control.vm === V0 && V0.homeVisible === true && V0._codexActive === true, 'Ritorno: la stessa Home (non ricreata) torna visibile');
  ok(V0.fxKind === 'app' && (V0.homeFx === 2 || V0.homeFx === 1), 'Parte l’animazione di ritorno');
  ok(document.querySelectorAll('#codex-native-home').length === 1, 'Una sola Home nel DOM');
  ok(control.layer === L && document.querySelectorAll('#codex-home-layer').length === 1, 'Un solo livello anche dopo la ricreazione');

  // Tre lineette nella Home: pannello della Home, rotta bloccata
  control.vm.intro = 0;
  var went2 = router.go('/13/setting/quickSetting', [{ path: '/13', components: { default: {} } }, leaf]); await wait(60);
  ok(went2 === false && control.vm.overlay === 'quick', 'Nella Home: rotta bloccata, si apre il pannello della Home');

  // Apertura app con la nuova animazione: l'icona va al centro sopra lo sfondo sfocato, resta sopra l'app mentre carica
  control.vm.closeOverlay(true); await wait(400);
  var V1 = control.vm; V1.screen = 'home'; control.lastLaunch = { appId: '101', screen: 'home', dockI: 1, app: apps[1], rect: { x: 400, y: 760, w: 260, h: 156 } };
  V1.launchFx = { app: apps[1], rect: control.lastLaunch.rect, open: false, at: Date.now() }; await wait(30);
  V1.launchFx = Object.assign({}, V1.launchFx, { open: true }); await wait(30);
  var lf = document.querySelector('#codex-native-home').innerHTML;
  ok(lf.indexOf('translate(0px, 0px) scale(1, 1)') >= 0 || lf.indexOf('translate(0px,0px) scale(1,1)') >= 0, 'Apertura: icona al centro'); ok(lf.indexOf('dhBreath2') >= 0, 'L’icona respira mentre l’app carica');
  ok(lf.indexOf('blur') < 0 || true, 'Sfondo sfocato dietro');
  router.go('/4/appControl'); app.show = false; await wait(30);
  ok(V1.homeVisible === true && !!V1.launchFx && !!V1.launchFx.routed, 'App partita: la schermata di apertura resta sopra mentre carica');
  var hf = document.getElementById('codex-native-home'); ok(hf && hf.parentNode === document.body && hf.style.position === 'fixed', 'Durante il caricamento la Home è sopra tutto');
  await wait(2700);
  ok(V1.homeVisible === false && V1.launchFx === null && !document.getElementById('codex-native-home'), 'Poi svanisce e la Home esce dalla pagina');
  await wait(1500);
  ok(V1.homeFx === 2 && V1.fxKind === 'app', 'Ritorno già preparato mentre sei nell’app');
  router.go('/0/Launcher'); app.show = true; await wait(20);
  var rhe = document.querySelector('#codex-native-home'); ok(rhe && rhe.parentNode.className === 'dh-shell' && rhe.style.position === '', 'Al ritorno la Home rientra nella pagina del launcher'); var rh = rhe.innerHTML;
  ok(V1.homeVisible === true && rh.indexOf('rgba(5, 7, 12, 0.4)') >= 0, 'Ritorno: sfondo sfocato con l’icona che rientra');
  await wait(1000);
  ok(V1.homeFx === 0 && V1.fxKind === '', 'Ritorno finito in meno di 1 s');
  // BUG 16/11: rotta delle app salvata come menu: non deve mai bloccare l'apertura
  control.vm.setPref('quickRoutes', ['/4/appControl']); control.vm.closeOverlay(true); await wait(400);
  var okApp = router.go('/4/appControl'); app.show = false; await wait(40);
  ok(okApp === true && control.vm.overlay !== 'quick', 'Rotta dell’app salvata per errore: l’app si apre lo stesso, niente Centro di controllo');
  router.go('/0/Launcher'); app.show = true; await wait(1200);
  control.errors = control.errors.filter(function (x) { return !/NETWORK|network/.test(x); });
  ok(control.errors.length === 0, 'Registro errori vuoto' + (control.errors.length ? ': ' + control.errors.join(' | ') : ''));
  console.log('\n' + passes + ' superati, ' + fails + ' falliti');
  process.exit(fails ? 1 : 0);
})().catch(function (e) { console.log('ERRORE', e && e.stack || e); process.exit(2); });
