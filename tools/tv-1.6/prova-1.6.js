// Prova della 1.6 in Node: disegna la Home in memoria (Vue 2.7 SSR) e controlla le animazioni nuove.
var fs = require('fs'), vmod = require('vm');
var Vue = require('vue'), renderer = require('vue-server-renderer').createRenderer();
Vue.config.silent = true;
var FILE = process.argv[2];

global.self = global; global.window = global;
var store = {};
global.localStorage = { getItem: function (k) { return store[k] || null; }, setItem: function (k, v) { store[k] = String(v); } };
global.innerWidth = 1920; global.innerHeight = 1080;
global.addEventListener = function () {}; global.removeEventListener = function () {};
global.document = { getElementById: function () { return null; }, createElement: function () { return { style: {} }; }, head: { appendChild: function () {} }, addEventListener: function () {}, removeEventListener: function () {}, hidden: false };
var APPS = ['Netflix', 'YouTube', 'Prime Video', 'Disney+', 'RaiPlay', 'Spotify', 'Mediaset Infinity', 'Paramount+', 'Apple TV', 'DAZN', 'LA7', 'TIMVISION', 'Rakuten TV', 'Crunchyroll', 'Xbox', 'Browser', 'App Store', 'TV'];
var apps = APPS.map(function (n, i) { return { appId: String(100 + i), appName: n, img: '' }; });
var inputs = [{ sourceId: 'TV', sourceType: 'physicalInput', name: 'TV', hasSignal: true }, { sourceId: 'HDMI1', sourceType: 'physicalInput', name: 'HDMI1', rename: 'PlayStation 5', hasSignal: true }];
function service(name) { return { getData: function () { return { result: name === 'app-service' ? apps : name === 'all-inputs' ? inputs : [] }; }, invoke: function () { return null; } }; }
function SDK() { this.me = { req: service }; this.apc = { start: function () {} }; this.message = { on: function () {}, off: function () {} }; }
global._V_SDK_ = { vre: { SDK: SDK }, vui: {}, router: { router: { currentRoute: { path: '/0/Launcher' }, getRoutes: function () { return []; } } } };
global._V_M_ = { launcher: function () { return { route: [{ path: '/0/Launcher', component: null }] }; }, setting: function () { return { page: { settings: function () {} } }; } };

vmod.runInThisContext(fs.readFileSync(FILE, 'utf8'), { filename: 'native-home.js' });
var control = global.__CODEX_NATIVE_HOME__;
global._V_M_.launcher();
var C = Vue.extend(control.component);
var vm = new C();
vm.refresh && vm.refresh();
control.vm = vm;

var fails = 0, passes = 0;
function ok(cond, msg) { if (cond) { passes++; console.log('  ✓ ' + msg); } else { fails++; console.log('  ✗ ' + msg); } }
function render() { return renderer.renderToString(vm); }
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function homeStyle(html) { var m = html.match(/transform-origin:0px 540px;[^"]*"/); return m ? m[0] : ''; }

(async function () {
  console.log('Versione:', control.version, '· app:', vm.apps.length);
  vm.intro = 0; vm.screen = 'home';
  var html = await render();
  ok(/translate\(0px, 0px\) scale\(1\)/.test(homeStyle(html)), 'Home a riposo: nessuna riduzione');

  // barra laterale
  vm.openSidebar(); await wait(60);
  html = await render();
  ok(/translate\(490px, 0px\) scale\(0\.75\)/.test(homeStyle(html)), 'Barra aperta: la Home si stringe a destra (0.75)');
  ok(/transform 460ms cubic-bezier\(0\.2, 0\.85, 0\.3, 1\.02\)/.test(homeStyle(html)), 'Apertura con la molla in 460 ms');
  ok(html.indexOf('Dolomiti') >= 0 || /key/.test(html), 'Il titolo dello sfondo resta (non sparisce più)');
  ok(/translateX\(0px\)[^"]*transform 460ms/.test(html), 'Il pannello entra con la stessa molla');
  vm.closeOverlay(); await wait(10);
  html = await render();
  ok(/transform 340ms/.test(homeStyle(html)), 'Chiusura: la Home torna in 340 ms');
  ok(vm.overlay === 'sidebar', 'Durante la chiusura il pannello resta montato');
  await wait(400);
  ok(vm.overlay === null, 'Dopo 360 ms il pannello è smontato');

  // Nascondi app
  vm.go('apps'); await wait(30); vm.intro = 0;
  html = await render();
  ok(/scale\(0\.3\)/.test(html), 'Fuori da Nascondi app gli occhi sono pronti ma invisibili');
  vm.startHide(); await wait(10);
  html = await render();
  var delays = (html.match(/transform 320ms cubic-bezier\(0\.2, 0\.85, 0\.3, 1\.02\) (\d+)ms/g) || []).map(function (s) { return +s.match(/(\d+)ms$/)[1]; });
  ok(delays.length >= 12 && delays[0] === 0 && delays.indexOf(15) >= 0 && delays.indexOf(165) >= 0, 'Entrata: occhi a onda (0, 15, 30… ms), trovati ' + delays.length);
  vm.toggleHidden(vm.apps[9]); vm.toggleHidden(vm.apps[13]); await wait(10);
  html = await render();
  ok((html.match(/opacity:0\.32/g) || []).length === 2, 'Le 2 app nascoste sono spente (0.32)');
  var posBefore = html.match(/translate\(\d+px, \d+px\)/g).slice();
  vm.finishHide(true); await wait(20);
  ok(vm.hideClosing === true && vm.hiding === true, 'Fine: fase 1 (escono occhi e app nascoste)');
  html = await render();
  ok(/scale\(0\.8\)/.test(html), 'Le nascoste si rimpiccioliscono (0.8) e svaniscono');
  var guard = vm.lf && vm.lf.zone; vm.handleKey(39, 'ArrowRight'); ok((vm.lf && vm.lf.zone) === guard, 'Tasti ignorati durante i 260 ms di uscita');
  await wait(300);
  ok(vm.hiding === false && vm.reflowing === true && vm.gridApps.length === 16, 'Fase 2: griglia senza le nascoste (16 app), riordino in corso');
  html = await render();
  ok(/transform 360ms cubic-bezier\(0\.2, 0\.85, 0\.3, 1\.02\)/.test(html), 'Le altre app scivolano nei posti liberi (360 ms molla)');
  var posAfter = html.match(/translate\(\d+px, \d+px\)/g);
  ok(posAfter.join() !== posBefore.join(), 'Le posizioni cambiano con una traslazione (solo transform)');
  await wait(500);
  ok(vm.reflowing === false, 'Riordino finito');
  ok(!!vm.toast && /2 app nascoste/.test(vm.toast), 'Avviso: "' + vm.toast + '"');
  html = await render();
  ok(/animation:dhToastIn 320ms/.test(html), 'L\'avviso scende dall\'alto con la molla');
  ok(control.css.indexOf('@keyframes dhToastIn') >= 0, 'Keyframe dell\'avviso presente');

  // finestra
  vm.openDialog({ title: 'Prova', buttons: [{ label: 'OK' }, { label: 'Annulla' }] });
  html = await render();
  ok(/scale\(0\.92\)/.test(html), 'Finestra: parte da 0.92');

  // saluto
  vm.closeOverlay(true); vm.intro = 3; vm.introGreet = 'evening';
  html = await render();
  var g = vm.greetImg();
  ok(g && g.w === 792 && g.h === 339, 'Saluto in vetro trasparente (stile hello, come la 1.5): ' + (g && g.w + '×' + g.h));

  // prova casuale di tasti in tutte le schermate
  vm.intro = 0; var codes = [37, 38, 39, 40, 13, 8], errs = 0;
  for (var i = 0; i < 2500; i++) {
    try { vm.handleKey(codes[Math.floor(Math.random() * codes.length)], ''); if (i % 25 === 0) { await wait(1); await render(); } }
    catch (e) { errs++; if (errs < 4) console.log('    errore:', e.message); }
  }
  ok(errs === 0, 'Prova casuale da 2500 tasti: nessuna eccezione');
  ok(control.errors.length === 0, 'Registro errori della Home vuoto' + (control.errors.length ? ': ' + control.errors.join(' | ') : ''));
  console.log('\n' + passes + ' superati, ' + fails + ' falliti');
  process.exit(fails ? 1 : 0);
})().catch(function (e) { console.log('ERRORE', e && e.stack || e); process.exit(2); });
