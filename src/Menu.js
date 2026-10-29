// Menu.js — tela inicial (STATE_MENU) com seleção de times e de táticas.
import { TEAM_LIST } from './Constants.js';
import { TACTICS } from './Tactics.js';

export class Menu {
  constructor(onStart) {
    this.homeKey = TEAM_LIST[0].key;
    this.awayKey = TEAM_LIST[1].key;
    this.homeTac = 'guardiola';
    this.awayTac = 'vertical';
    this.onStart = onStart;
    const hex = (n) => '#' + n.toString(16).padStart(6, '0');
    const el = document.createElement('div');
    el.innerHTML = `
      <style> .menu{position:fixed;inset:0;z-index:30;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;
          background:radial-gradient(circle at 50% 28%,#13243f,#05070d 72%);color:#fff;font-family:'Segoe UI',sans-serif;padding:24px;overflow:auto;}
        .menu h1{font-size:38px;font-weight:900;letter-spacing:1px;background:linear-gradient(90deg,#54a8ff,#22c55e);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
        .menu .sub{color:#a9b9d4;font-size:14px;max-width:520px;text-align:center;line-height:1.5;}
        .cols{display:flex;gap:26px;flex-wrap:wrap;justify-content:center;}
        .col{background:rgba(20,30,52,.6);border:1px solid #22304d;border-radius:14px;padding:14px 16px;min-width:250px;}
        .col h3{font-size:13px;letter-spacing:1px;color:#89a;text-transform:uppercase;margin-bottom:10px;}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
        .card{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:9px;cursor:pointer;border:2px solid transparent;background:rgba(255,255,255,.04);}
        .card:hover{background:rgba(255,255,255,.09);}
        .card.sel{border-color:#22c55e;background:rgba(34,197,94,.14);}
        .card .sw{width:26px;height:26px;border-radius:7px;flex:none;position:relative;overflow:hidden;}
        .card .sw i{position:absolute;right:0;top:0;width:45%;height:100%;}
        .card .lbl b{font-size:13px;} .card .lbl span{font-size:10.5px;color:#8ea3c4;display:block;}
        .menu button{background:#22c55e;color:#06210f;font-weight:800;padding:12px 34px;border:none;border-radius:10px;cursor:pointer;font-size:16px;}
      </style> <div class="menu" id="menuRoot"> <h1>FUTEBOL FC <span style="font-size:14px;color:#5effa0;-webkit-text-fill-color:#5effa0">v23</span></h1> <div class="sub">Física real, câmera de transmissão e comandos estilo EA FC. Escolha os times, o modelo de jogo de cada um e clique em Jogar.</div> <div class="cols"> <div class="col"><h3>Seu time</h3><div class="grid" id="homeGrid"></div> <div style="margin-top:10px"><span style="font-size:11px;color:#89a;text-transform:uppercase">Tática</span><br> <select id="homeTac" style="width:100%;margin-top:4px;padding:7px;background:#0b1220;color:#fff;border:1px solid #22304d;border-radius:8px"></select></div></div> <div class="col"><h3>Adversário</h3><div class="grid" id="awayGrid"></div> <div style="margin-top:10px"><span style="font-size:11px;color:#89a;text-transform:uppercase">Tática</span><br> <select id="awayTac" style="width:100%;margin-top:4px;padding:7px;background:#0b1220;color:#fff;border:1px solid #22304d;border-radius:8px"></select></div></div></div> <button id="startBtn">Jogar</button></div>`;
    document.body.appendChild(el);
    this.el = el;
    const mkGrid = (grid, which) => {
      grid.innerHTML = '';
      TEAM_LIST.forEach((t) => {
        const div = document.createElement('div'); div.className = 'card';
        div.innerHTML = `<div class="sw" style="background:${hex(t.primary)}"><i style="background:${hex(t.secondary)}"></i></div><div class="lbl"><b>${t.name}</b><span>${t.country}</span></div>`;
        if (t.key === (which === 'home' ? this.homeKey : this.awayKey)) div.classList.add('sel');
        div.onclick = () => {
          if (which === 'home') { this.homeKey = t.key; if (this.awayKey === t.key) this.awayKey = TEAM_LIST.find((x) => x.key !== t.key).key; }
          else { this.awayKey = t.key; if (this.homeKey === t.key) this.homeKey = TEAM_LIST.find((x) => x.key !== t.key).key; }
          render();
        };
        grid.appendChild(div);
      });
    };
    const render = () => { mkGrid(el.querySelector('#homeGrid'), 'home'); mkGrid(el.querySelector('#awayGrid'), 'away'); };
    render();
    const fillTac = (id, cur) => { const s = el.querySelector(id); s.innerHTML = TACTICS.map((t) => `<option value="${t.key}" ${t.key === cur ? 'selected' : ''}>${t.name}</option>`).join(''); return s; };
    fillTac('#homeTac', this.homeTac).onchange = (e) => (this.homeTac = e.target.value);
    fillTac('#awayTac', this.awayTac).onchange = (e) => (this.awayTac = e.target.value);
    el.querySelector('#startBtn').onclick = () => { this.hide(); this.onStart(this.homeKey, this.awayKey, this.homeTac, this.awayTac); };
  }
  hide() { this.el.querySelector('#menuRoot').style.display = 'none'; }
  show() { this.el.querySelector('#menuRoot').style.display = 'flex'; }
}
