/* Transizione del tasto Home (ritorno da un'app) — estratto da native-home.js 0.9, solo da leggere.
 * Il file da installare resta native-home.js.
 *
 * 0 ms: nero della TV. 0-450 ms il nero diventa vetro scuro sfocato (sfondo sfocato 48 px, zoom 1.1).
 * 0-1500 ms la sfocatura si scioglie piano; 0-1800 ms lo sfondo si assesta (curva morbida 0.22,1,0.36,1).
 * 350-1450 ms la Home emerge da sfocata (18 px) e trasparente a nitida, con un leggero zoom 1.04 -> 1. Fine a 2 s, suono 'home'.
 */

/* ===== Stati e tempi ===== */
        // Ritorno alla Home con il tasto Home da un'app (Netflix ecc.), stile Liquid Glass:
        // 1 (armato già quando l'app si apre) schermo nero, sfondo ingrandito e sfocato, interfaccia trasparente;
        // 2 una lente di vetro si apre dal punto dell'app e scioglie il nero; 3 lo sfondo si rimpicciolisce
        // e si mette a fuoco con una molla morbida; 4 l'interfaccia arriva dallo stesso punto, poi i riflessi si spengono.
        // Così il primo fotogramma visibile è già nero/sfocato e non si vede lo stacco della TV.
        armAppReturn: function () {
          if (!this.prefs.homeFx || this.prefs.reducedMotion || this.intro) return;
          clearTimeout(this._fxTimer); this.fxKind = 'app'; this.fxSlow = false; this.homeFx = 2;
        },
        playAppReturn: function () {
          if (!this.prefs.homeFx || this.prefs.reducedMotion || this.intro) { this.fxKind = ''; this.homeFx = 0; return; }
          var self = this; clearTimeout(this._fxTimer);
          this.fxKind = 'app'; this.fxSlow = false; this.homeFx = 2;
          // due fotogrammi nello stato iniziale, poi parte la transizione (evita che il motore salti l'animazione)
          this.$nextTick(function () {
            self._fxTimer = setTimeout(function () {
              self.homeFx = 1; self.sfx('home');
              self._fxTimer = setTimeout(function () { self.homeFx = 0; self.fxKind = ''; }, 2000);
            }, 60);
          });
        },

/* ===== Quando scatta (non all'accensione) ===== */
      // (all'accensione dallo standby parte invece il saluto: niente animazione di ritorno)
      activated: function () {
        this._codexActive = true; control.vm = this; control.mounted = true; this._lastInput = Date.now(); this.refresh(); this.restartSlideshow();
        if (this.intro || Date.now() - (this._bootAt || 0) < 4000) { if (this.fxKind === 'app') { this.fxKind = ''; if (!this.intro) this.homeFx = 0; } }
        else this.playAppReturn();
      },
      deactivated: function () { this._codexActive = false; clearInterval(this._slideTimer); this._slideTimer = null; this.peek = false; this.armAppReturn(); },

/* ===== Disegno: vetro sfocato che si scioglie ===== */
        // Ritorno da un'app (stile Apple): si parte da un vetro smerigliato scuro (sfondo molto sfocato, niente nero pieno);
        // la sfocatura si scioglie lentamente, lo sfondo si assesta e la Home emerge anche lei da sfocata a nitida.
        var appFx = this.fxKind === 'app' && fx, EASE = 'cubic-bezier(0.25, 0.1, 0.25, 1)', SOFT_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
        if (appFx) {
          var on = fx === 1;
          layerTr = on ? 'opacity 900ms ' + EASE + ' 350ms, transform 1400ms ' + SOFT_OUT + ' 300ms' + (supportsFilter ? ', filter 1100ms ' + EASE + ' 350ms' : '') : 'none';
        }
        var layerSt = { zIndex: 10, opacity: this.enter || fx === 2 ? 0 : 1, transform: fx === 2 ? (appFx ? 'scale(1.04)' : 'scale(1.06)') : (moving ? 'translateY(14px)' : 'none'), transformOrigin: '50% 50%', transition: layerTr };
        if (appFx && supportsFilter) layerSt.filter = fx === 2 ? 'blur(18px)' : 'blur(0px)';
        var layer = h('div', { key: 'screen-' + this.screen, style: assign(abs(0, 0, CONFIG.W, CONFIG.H), layerSt) }, [scr]);
        var wallStyle = assign(abs(0, 0, CONFIG.W, CONFIG.H), { transform: fx === 2 ? (appFx ? 'scale(1.1)' : 'scale(1.14)') : 'scale(1)', transition: fx === 2 ? 'none' : 'transform ' + (appFx ? 1800 : dW) + 'ms ' + (appFx ? SOFT_OUT : FXE) });
        if (supportsFilter) { wallStyle.filter = fx === 2 ? (appFx ? 'blur(48px)' : (sl ? 'blur(20px)' : 'blur(24px)')) : 'blur(0px)'; wallStyle.transition = fx === 2 ? 'none' : 'transform ' + (appFx ? 1800 : dW) + 'ms ' + (appFx ? SOFT_OUT : FXE) + ', filter ' + (appFx ? 1500 : dB) + 'ms ' + (appFx ? EASE : FXE); }
        // velo: dal nero della TV a un vetro scuro in pochi istanti, poi si dissolve del tutto
        var fxLayer = null;
        if (appFx) {
          var op = fx === 1;
          fxLayer = h('div', { key: 'appfx', style: assign(abs(0, 0, CONFIG.W, CONFIG.H), { zIndex: 35 }) }, [
            h('div', { style: assign(abs(0, 0, CONFIG.W, CONFIG.H), { backgroundColor: '#000', opacity: op ? 0 : 1, transition: op ? 'opacity 450ms ' + EASE : 'none' }) }),
            h('div', { style: assign(abs(0, 0, CONFIG.W, CONFIG.H), { backgroundImage: 'radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.10) 0%, rgba(10,12,18,0.35) 60%, rgba(0,0,0,0.55) 100%)', opacity: op ? 0 : 1, transition: op ? 'opacity 1300ms ' + EASE + ' 200ms' : 'none' }) })
          ]);
        }

