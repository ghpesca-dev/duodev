/* DuoDev: efeitos sonoros sintetizados na hora com Web Audio (sem arquivos de áudio).
   window.DuoSound.play(nome): tap, correct, wrong, complete, perfect, streak, goal, fail.
   Preferência ligado/desligado no localStorage (chave duodev:sound), só neste aparelho.
   iPhone/Safari: o áudio só pode começar depois de um toque; o primeiro toque destrava. */
(() => {
  'use strict';
  const KEY = 'duodev:sound';
  let enabled = true;
  try { enabled = localStorage.getItem(KEY) !== 'off'; } catch (e) { /* ignora */ }

  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null;

  function ensure() {
    if (!AC) return null;
    if (!ctx) {
      try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { ctx = new AC(); } catch (e2) { return null; } }
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4;
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    return ctx;
  }

  // Destrava no primeiro gesto (iOS exige criar/retomar o contexto e tocar algo dentro do gesto).
  let unlocked = false;
  function unlock() {
    const c = ensure();
    if (!c) return;
    if (!unlocked) {
      const b = c.createBuffer(1, 1, 22050);
      const src = c.createBufferSource();
      src.buffer = b; src.connect(c.destination); src.start(0);
      unlocked = true;
    }
    if (c.state === 'running') ['pointerdown', 'touchend', 'keydown', 'click'].forEach((ev) => document.removeEventListener(ev, unlock, true));
  }
  ['pointerdown', 'touchend', 'keydown', 'click'].forEach((ev) => document.addEventListener(ev, unlock, true));
  // iOS suspende/interrompe o contexto ao trocar de app; retoma ao voltar.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  });
  // Ao voltar de segundo plano, o próximo toque também retoma.
  document.addEventListener('pointerdown', () => { if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); }, true);

  // ---------- Síntese ----------
  // Nota com envelope (ataque rápido, queda exponencial) e harmônicos opcionais.
  function note(t, freq, dur, o = {}) {
    const type = o.type || 'sine', vol = o.vol == null ? 0.3 : o.vol;
    const g = ctx.createGain();
    const atk = o.attack || 0.006;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = g;
    if (o.lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = o.lowpass; f.Q.value = 0.7;
      g.connect(f); out = f;
    }
    out.connect(master);
    const partials = o.partials || [[1, 1]];
    partials.forEach(([mult, amp]) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq * mult, t);
      if (o.glide) osc.frequency.exponentialRampToValueAtTime(o.glide * mult, t + dur * 0.8);
      if (o.detune) osc.detune.value = o.detune;
      let node = osc;
      if (amp !== 1) { const a = ctx.createGain(); a.gain.value = amp; osc.connect(a); node = a; }
      node.connect(g);
      osc.start(t); osc.stop(t + dur + 0.05);
    });
  }
  // Sino brilhante: seno + harmônicos inarmônicos leves.
  const bell = (t, f, dur, vol) => note(t, f, dur, { vol, partials: [[1, 1], [2, 0.35], [3.01, 0.12]] });
  // Chiado filtrado (para o "fogo" da ofensiva).
  function whoosh(t, dur, from, to, vol) {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur);
  }

  const N = { C4: 261.63, Eb4: 311.13, G4: 392, Ab4: 415.3, C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, A6: 1760, C7: 2093 };

  const SOUNDS = {
    // Toque ao escolher uma opção: clique curto e suave.
    tap(t) { note(t, 740, 0.06, { type: 'triangle', vol: 0.12, glide: 520 }); },
    // Acerto: dois sinos subindo, rápidos e alegres.
    correct(t) {
      bell(t, N.E6, 0.22, 0.26);
      bell(t + 0.085, N.A6, 0.45, 0.3);
      note(t + 0.085, N.A5, 0.3, { type: 'triangle', vol: 0.08 });
    },
    // Erro: dois tons graves descendo, abafados (não agressivo).
    wrong(t) {
      note(t, 233, 0.16, { type: 'square', vol: 0.11, lowpass: 900 });
      note(t + 0.13, 175, 0.32, { type: 'square', vol: 0.12, lowpass: 700, glide: 160 });
    },
    // Lição concluída: arpejo maior subindo + acorde final.
    complete(t) {
      [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => bell(t + i * 0.09, f, 0.35, 0.22));
      const end = t + 0.38;
      [N.C5, N.E5, N.G5, N.C6].forEach((f) => note(end, f, 1.1, { type: 'triangle', vol: 0.08, attack: 0.02 }));
      bell(end, N.E6, 1.0, 0.16);
    },
    // Lição perfeita: o mesmo, com brilho extra no fim.
    perfect(t) {
      SOUNDS.complete(t);
      [N.G6, N.C7, N.E6, N.G6, N.C7].forEach((f, i) => bell(t + 0.55 + i * 0.07, f, 0.3, 0.07));
    },
    // Ofensiva: chama acendendo (chiado subindo) + sino.
    streak(t) {
      whoosh(t, 0.55, 300, 2600, 0.22);
      note(t + 0.05, 220, 0.5, { type: 'sawtooth', vol: 0.05, lowpass: 1400, glide: 660 });
      bell(t + 0.45, N.G5, 0.5, 0.2);
      bell(t + 0.53, N.D6, 0.7, 0.2);
    },
    // Meta do dia: três notas curtas.
    goal(t) { [N.G5, N.B5, N.D6].forEach((f, i) => bell(t + i * 0.1, f, 0.4, 0.18)); },
    // Sem vidas: descida menor, triste.
    fail(t) {
      [N.G4, N.Eb4, N.C4].forEach((f, i) => note(t + i * 0.2, f, 0.45, { type: 'triangle', vol: 0.22, lowpass: 1800 }));
    },
  };

  function play(name, delay = 0) {
    if (!enabled || !SOUNDS[name]) return;
    const c = ensure();
    if (!c) return;
    try { SOUNDS[name](c.currentTime + 0.01 + delay); } catch (e) { /* ignora */ }
  }

  window.DuoSound = {
    play,
    get enabled() { return enabled; },
    set(on) {
      enabled = !!on;
      try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (e) { /* ignora */ }
      if (enabled) { unlock(); play('tap'); }
    },
    toggle() { this.set(!enabled); return enabled; },
  };
})();
