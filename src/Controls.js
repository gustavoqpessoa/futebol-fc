// Controls.js — teclado + gamepad (Xbox padrão). Movimento relativo à câmera.
export class Controls {
  constructor() {
    this.keys = {};
    this.padIndex = null;
    this._padPrev = {};
    this.onSwitch = () => {};
    this.onShootDown = () => {};
    this.onShootUp = () => {};
    this.onPass = () => {};
    this.onTackle = () => {};
    this.onPause = () => {};

    // Se o foco está num campo de texto, o teclado é de quem está digitando.
    // Sem isto, a barra de espaço virava chute e o Gustavo não conseguia pôr
    // espaço no nome do jogador na tela de criar carreira.
    const digitando = (e) => {
      const t = e.target;
      if (!t) return false;
      const tag = (t.tagName || '').toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
    };

    addEventListener('keydown', (e) => {
      if (digitando(e)) return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (!this.keys[k]) {
        if (k === 'q' || k === 'tab' || k === 'e') this.onSwitch();
        else if (k === 'j' || k === 'k') this.onPass();
        else if (k === 'b' || k === 'l') this.onTackle();
        else if (k === 'p' || k === 'escape') this.onPause();
      }
      this.keys[k] = true;
      if (k === ' ' && !this._spaceDown) { this._spaceDown = true; this.onShootDown(); }
    });
    addEventListener('keyup', (e) => {
      if (digitando(e)) return;
      const k = e.key.toLowerCase(); this.keys[k] = false;
      if (k === ' ') { this._spaceDown = false; this.onShootUp(); }
    });
    addEventListener('gamepadconnected', (e) => { this.padIndex = e.gamepad ? e.gamepad.index : 0; });
    addEventListener('gamepaddisconnected', () => { this.padIndex = null; });
  }

  _pad() {
    if (!navigator.getGamepads) return null;
    let gp = this.padIndex != null ? navigator.getGamepads()[this.padIndex] : null;
    if (!gp) { for (const g of navigator.getGamepads()) if (g) { gp = g; this.padIndex = g.index; break; } }
    return gp;
  }

  // Deve ser chamado uma vez por frame para detectar bordas de botão do gamepad.
  pollGamepad() {
    const gp = this._pad(); if (!gp) return;
    const b = (i) => gp.buttons[i] && gp.buttons[i].pressed;
    const edge = (i) => { const now = b(i); const was = this._padPrev[i]; this._padPrev[i] = now; return now && !was; };
    if (edge(0)) this.onPass();                // A = passe
    if (edge(1)) this.onTackle();              // B = desarme/bote
    if (edge(4) || edge(5)) this.onSwitch();   // LB/RB = trocar
    if (edge(9)) this.onPause();               // Start
    const shootNow = b(2);                     // X = chute
    if (shootNow && !this._padShoot) { this._padShoot = true; this.onShootDown(); }
    if (!shootNow && this._padShoot) { this._padShoot = false; this.onShootUp(); }
  }

  // Vetor de input bruto (x = direita, y = cima) combinando teclado e gamepad.
  moveVector() {
    let x = 0, y = 0;
    if (this.keys['d'] || this.keys['arrowright']) x += 1;
    if (this.keys['a'] || this.keys['arrowleft']) x -= 1;
    if (this.keys['w'] || this.keys['arrowup']) y += 1;
    if (this.keys['s'] || this.keys['arrowdown']) y -= 1;
    const gp = this._pad();
    if (gp) {
      const dz = (v) => (Math.abs(v) < 0.2 ? 0 : v);
      x += dz(gp.axes[0] || 0) + (gp.buttons[15] && gp.buttons[15].pressed ? 1 : 0) - (gp.buttons[14] && gp.buttons[14].pressed ? 1 : 0);
      y += -dz(gp.axes[1] || 0) + (gp.buttons[12] && gp.buttons[12].pressed ? 1 : 0) - (gp.buttons[13] && gp.buttons[13].pressed ? 1 : 0);
    }
    return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
  }

  sprinting() {
    const gp = this._pad();
    return !!this.keys['shift'] || !!(gp && (gp.buttons[7] && gp.buttons[7].pressed));
  }

  padConnected() { return this.padIndex != null; }
}
