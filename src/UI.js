// UI.js — HUD overlay: placar, força, legenda e radar 2D. Nomes/cores vêm dos times escolhidos.
import { FIELD } from './Constants.js';

export class UI {
  constructor(root) {
    root = root || document.body;
    const el = document.createElement('div');
    el.innerHTML = `
      <style>
        .hud-score{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:5;display:flex;gap:14px;align-items:center;
          background:rgba(12,18,32,.82);border:1px solid #22304d;border-radius:14px;padding:8px 18px;backdrop-filter:blur(6px);font:800 15px 'Segoe UI',sans-serif;color:#fff;}
        .hud-score .b{width:20px;height:20px;border-radius:5px;display:inline-block;border:1px solid rgba(255,255,255,.35);}
        .hud-score .s{font-size:24px;min-width:22px;text-align:center;font-variant-numeric:tabular-nums;}
        .hud-score .clk{color:#9fb2cf;font-size:13px;margin-left:6px;font-variant-numeric:tabular-nums;}
        .hud-msg{position:fixed;top:26%;left:50%;transform:translate(-50%,-50%);z-index:6;font:900 44px 'Segoe UI',sans-serif;
          text-shadow:0 4px 22px rgba(0,0,0,.7);opacity:0;transition:opacity .2s;pointer-events:none;text-align:center;}
        .hud-legend{position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:5;display:flex;gap:7px;flex-wrap:wrap;justify-content:center;font:600 12px 'Segoe UI',sans-serif;color:#cdd9ee;}
        .hud-legend div{background:rgba(12,18,32,.8);border:1px solid #22304d;border-radius:9px;padding:5px 10px;}
        .hud-legend b{color:#fff;}
        .hud-force{position:fixed;bottom:52px;left:50%;transform:translateX(-50%);z-index:5;width:180px;height:9px;border-radius:6px;background:rgba(255,255,255,.14);overflow:hidden;border:1px solid #2a3854;opacity:0;transition:opacity .12s;}
        .hud-force i{display:block;height:100%;width:0;}
        .hud-radar{position:fixed;left:14px;bottom:14px;z-index:5;border:1px solid #22304d;border-radius:10px;background:rgba(8,14,26,.7);}
      </style>
      <div class="hud-score" style="display:none">
        <span class="b" id="uiBH"></span><span id="uiNH">—</span>
        <span class="s" id="uiSH">0</span><span style="color:#3a4b6a">×</span><span class="s" id="uiSA">0</span>
        <span id="uiNA">—</span><span class="b" id="uiBA"></span><span class="clk" id="uiClk">4:00</span>
      </div>
      <div class="hud-msg" id="uiMsg"></div>
      <div class="hud-force" style="display:none"><i id="uiForceFill"></i></div>
      <div class="hud-legend" id="uiLegend" style="display:none">
        <div><b>WASD</b>/analógico mover</div><div><b>Espaço</b>/X chutar (segure)</div>
        <div><b>K/J</b>/A passe</div><div><b>B</b>/B desarme</div><div><b>Q</b>/LB trocar</div><div><b>Shift</b>/RT correr</div>
      </div>
      <canvas class="hud-radar" id="uiRadar" width="180" height="120" style="display:none"></canvas>`;
    root.appendChild(el);
    this.$ = (id) => el.querySelector('#' + id);
    this.radar = this.$('uiRadar').getContext('2d');
    this.hc = '#f5c518'; this.ac = '#ffffff';
  }

  showHud() { this.$('uiBH').parentElement.style.display = 'flex'; this.$('uiForceFill').parentElement.style.display = 'block'; this.$('uiLegend').style.display = 'flex'; this.$('uiRadar').style.display = 'block'; }

  setTeams(home, away) {
    const hex = (n) => '#' + n.toString(16).padStart(6, '0');
    this.$('uiNH').textContent = home.name; this.$('uiNA').textContent = away.name;
    this.hc = hex(home.primary); this.ac = hex(away.primary);
    // reflete uniforme reserva branco quando cores batem
    const clash = Math.abs(((home.primary >> 16) & 255) - ((away.primary >> 16) & 255)) < 40 && Math.abs((home.primary & 255) - (away.primary & 255)) < 40;
    if (clash) this.ac = '#f2f2f2';
    this.$('uiBH').style.background = this.hc; this.$('uiBA').style.background = this.ac;
  }

  setScore(h, a) { this.$('uiSH').textContent = h; this.$('uiSA').textContent = a; }
  setClock(minute) { this.$('uiClk').textContent = Math.min(90, Math.floor(minute)) + "'"; } // minutos de jogo
  message(text, color = '#fff') { const m = this.$('uiMsg'); m.textContent = text; m.style.color = color; m.style.opacity = 1; clearTimeout(this._t); this._t = setTimeout(() => (m.style.opacity = 0), 1600); }
  setForce(v) { this.$('uiForceFill').style.width = (v * 100) + '%'; this.$('uiForceFill').parentElement.style.opacity = v > 0.02 ? 1 : 0; this.$('uiForceFill').style.background = v < 0.5 ? '#39d353' : v < 0.8 ? '#e8c53a' : '#e0483f'; }

  drawRadar(players, ball, controlled) {
    const g = this.radar, W = 180, H = 120, pad = 6;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(20,120,50,.55)'; g.fillRect(pad, pad, W - pad * 2, H - pad * 2);
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.strokeRect(pad, pad, W - pad * 2, H - pad * 2);
    g.beginPath(); g.moveTo(W / 2, pad); g.lineTo(W / 2, H - pad); g.stroke();
    const toX = (x) => pad + ((x + FIELD.HALF_L) / (FIELD.HALF_L * 2)) * (W - pad * 2);
    const toY = (z) => pad + ((z + FIELD.HALF_W) / (FIELD.HALF_W * 2)) * (H - pad * 2);
    for (const p of players) {
      g.fillStyle = p.team === 'home' ? this.hc : this.ac;
      g.beginPath(); g.arc(toX(p.body.position.x), toY(p.body.position.z), p === controlled ? 4 : 2.6, 0, 7); g.fill();
      if (p === controlled) { g.strokeStyle = '#5effa0'; g.lineWidth = 1.5; g.stroke(); }
    }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(toX(ball.position.x), toY(ball.position.z), 2.2, 0, 7); g.fill();
  }
}
