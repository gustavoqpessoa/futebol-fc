// main.js — inicialização, telas (Partida Rápida / Modo Carreira) e loop principal.
import * as THREE from 'three';
import { Physics } from './Physics.js';
import { buildStadium } from './Stadium.js';
import { TVCamera } from './Camera.js';
import { PostProcess } from './PostProcess.js';
import { Controls } from './Controls.js';
import { UI } from './UI.js';
import { Menu } from './Menu.js';
import { Game } from './Game.js';
import { PlayerFactory } from './PlayerLoader.js';
import { BALL, teamByKey } from './Constants.js';
import { loadDataset } from './career/database.js';
import { CareerManager, STATE } from './career/careerManager.js';
import { CareerUI } from './career/careerUI.js';
import { buildMatchConfigs } from './career/matchBridge.js';
import { LANDING_CSS, ESCOLHA_CSS } from './theme.js';
import { PlayerCareerUI, SAVE_JOGADOR } from './career/playerCareerUI.js';

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const stadium = buildStadium(scene);
const tv = new TVCamera(innerWidth / innerHeight);
const physics = new Physics();

const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL.R, 24, 18), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
ballMesh.castShadow = true; scene.add(ballMesh);
const ballShadow = new THREE.Mesh(new THREE.CircleGeometry(BALL.R * 1.6, 14), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.3 }));
ballShadow.rotation.x = -Math.PI / 2; ballShadow.position.y = 0.02; scene.add(ballShadow);

const ui = new UI();
const controls = new Controls();
const post = new PostProcess(renderer, scene, tv.cam, { ssao: true, dof: false });
const factory = new PlayerFactory();
factory.tryLoad('models/player.glb');

let game = null, state = 'landing', paused = false, career = null, careerUI = null, afterMatch = null;

// ---------- Tela inicial ----------
const landing = document.createElement('div');
landing.innerHTML = `<style>${LANDING_CSS}${ESCOLHA_CSS}</style>
<div id="landing">
  <div class="lgrama"></div>
  <div class="lescudos" id="lescudos"></div>
  <div class="cx">
    <div class="mark">Company<br><span class="mark2">Football</span></div>
    <div class="modos">
      <button id="btnCareer" class="modo"><span class="mtxt"><b>Carreira de Treinador</b></span></button>
      <button id="btnPlayer" class="modo"><span class="mtxt"><b>Carreira de Jogador</b></span></button>
    </div>
    <div class="continuar"><button id="btnContinue" class="ghost">Continuar</button><span id="saveInfo" class="muted"></span></div>
  </div>
</div>`;
document.body.appendChild(landing);

// A ESTEIRA DE ESCUDOS da tela inicial. Os escudos reais do jogo passando
// devagar no fundo — é o que faz a tela parecer um jogo de futebol e não um
// menu qualquer. Só aparece depois que os escudos carregam; sem eles a tela
// continua inteira, só sem a esteira.
function esteiraDeEscudos(logos) {
  const alvo = landing.querySelector('#lescudos');
  if (!alvo || !logos) return;
  const todos = Object.values(logos);
  if (todos.length < 12) return;
  // sorteia SEM repetir: dois escudos iguais lado a lado entregam o truque
  const baralho = todos.slice();
  for (let i = baralho.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [baralho[i], baralho[j]] = [baralho[j], baralho[i]];
  }
  const sorteio = baralho.slice(0, 26);
  const faixa = (lista, cls) => `<div class="lfaixa ${cls}">${
    [...lista, ...lista].map((src) => `<img src="${src}" alt="">`).join('')}</div>`;
  alvo.innerHTML = faixa(sorteio.slice(0, 13), 'a') + faixa(sorteio.slice(13), 'b');
}

// os escudos já estão em memória no arquivo de 1 clique; no projeto, vêm por fetch.
// Ou de um jeito ou de outro, sem travar a tela: se não vier, a tela fica sem a
// esteira e pronto.
(function ligarEsteira() {
  if (typeof window !== 'undefined' && window.__LOGOS) { esteiraDeEscudos(window.__LOGOS); return; }
  if (typeof fetch !== 'function') return;
  fetch('logos.json').then((r) => (r.ok ? r.json() : null))
    .then((l) => l && esteiraDeEscudos(l)).catch(() => {});
})();
// a escolha de carreira aparece por cima de tudo, então o estilo dela vive no <head>
{ const st = document.createElement('style'); st.textContent = ESCOLHA_CSS; document.head.appendChild(st); }
const hideLanding = () => (landing.querySelector('#landing').style.display = 'none');
// Sempre que a tela inicial volta, ela relê os saves. Sem isso o botão Continuar
// só era decidido no carregamento da página: você salvava a carreira, voltava ao
// menu e o botão simplesmente não estava lá — o save existia, o menu é que não
// olhava de novo.
const showLanding = () => {
  landing.querySelector('#landing').style.display = 'flex';
  pintarContinuar();
};

// ---------- Partida Rápida ----------
const menu = new Menu((homeKey, awayKey, homeTac, awayTac) => {
  startMatch({ ...teamByKey(homeKey), tactic: homeTac }, { ...teamByKey(awayKey), tactic: awayTac }, null);
});
menu.hide();
// A Partida Rápida saiu do menu: ela era o jogo em 3D, e o 3D está fora por
// enquanto — o Gustavo: "tira o modo de jogar em 3D, porque está muito feio, não
// está dando. Depois posso tentar melhorar, mas tiramos por agora".
// O código do menu continua aqui, desligado, para voltar quando o 3D melhorar.

// ---------- Modo Carreira ----------
/** Pergunta se continua a carreira aberta ou começa outra. Devolve
 *  'continuar' | 'nova' | 'voltar'. */
function perguntarNovaCarreira(c) {
  return new Promise((resolve) => {
    let nome = 'a carreira atual';
    try { nome = c.userClub().name; } catch (e) { /* carreira sem clube ainda */ }
    const cx = document.createElement('div');
    cx.className = 'escolhacarreira';
    cx.innerHTML = `<div class="cxcaixa">
      <b>Você já está dirigindo o ${nome}</b>
      <i>Começar outra carreira abandona essa. O jogo salvo em disco não é apagado.</i>
      <div class="cxbs">
        <button data-r="continuar">Continuar no ${nome}</button>
        <button data-r="nova" class="alt">Começar outra carreira</button>
      </div>
      <button data-r="voltar" class="cxvoltar">Voltar</button></div>`;
    cx.onclick = (ev) => {
      const r = ev.target.closest('[data-r]');
      if (!r && ev.target !== cx) return;
      cx.remove(); resolve(r ? r.dataset.r : 'voltar');
    };
    document.body.appendChild(cx);
  });
}

landing.querySelector('#btnCareer').onclick = async () => {
  const btn = landing.querySelector('#btnCareer');
  // JÁ EXISTE UMA CARREIRA NESTA SESSÃO.
  //
  // Antes o botão só reabria a mesma carreira, e não havia como começar outra sem
  // recarregar a página — o Gustavo: "criei uma carreira e não consigo criar outra".
  // Agora ele escolhe.
  if (career) {
    const quer = await perguntarNovaCarreira(career);
    if (quer === 'voltar') return;
    if (quer === 'continuar') { hideLanding(); careerUI.show(); return; }
    // começar outra: joga fora a carreira atual desta sessão
    try { careerUI.hide(); } catch (e) { /* ainda não desenhou */ }
    career = null; careerUI = null; window.__career = null;
  }
  btn.textContent = 'Carregando jogadores...'; btn.disabled = true;
  let dataset;
  try { dataset = await loadDataset(); }
  catch (e) { btn.textContent = 'Erro ao carregar dados'; alert('Não consegui carregar players.json: ' + e.message); return; }
  btn.textContent = 'Carreira de Treinador'; btn.disabled = false;
  hideLanding();
  career = new CareerManager(dataset);
  window.__career = career;   // só para conferir o jogo pelo console
  careerUI = new CareerUI(career, {
    onHome: () => { careerUI.hide(); showLanding(); },
    onPlay: () => {
      const { homeCfg, awayCfg } = buildMatchConfigs(career);
      careerUI.hide();
      startMatch(homeCfg, awayCfg, (gh, ga) => {
        career.finishUserMatch(gh, ga);
        career.state = STATE.DASHBOARD;
        careerUI.show();
      });
    },
    onPlayCup: () => {
      const rival = career.cupOpponentInFinal(); if (!rival) return;
      const { homeCfg, awayCfg } = buildMatchConfigs(career, rival);
      careerUI.hide();
      startMatch(homeCfg, awayCfg, (gh, ga) => {
        career.finishCupFinal(career.cupFinalPending, gh, ga);
        career.state = STATE.DASHBOARD;
        careerUI.show();
      });
    },
  });
};


// ---------- Carreira de Jogador ----------
let playerUI = null;

function abrirTreinador(dataset, anoAtual) {
  career = new CareerManager(dataset);
  // O mundo JÁ foi envelhecido ano a ano pela Carreira de Jogador (cada temporada
  // chama advanceWorld), então aqui não se envelhece de novo — só se acerta o
  // calendário, para o Treinador começar no ano em que o jogador se aposentou.
  if (anoAtual) career.startYear = anoAtual;
  careerUI = new CareerUI(career, {
    onHome: () => { careerUI.hide(); showLanding(); },
    onPlay: () => {
      const { homeCfg, awayCfg } = buildMatchConfigs(career);
      careerUI.hide();
      startMatch(homeCfg, awayCfg, (gh, ga) => { career.finishUserMatch(gh, ga); career.state = STATE.DASHBOARD; careerUI.show(); });
    },
    onPlayCup: () => {
      const rival = career.cupOpponentInFinal(); if (!rival) return;
      const { homeCfg, awayCfg } = buildMatchConfigs(career, rival);
      careerUI.hide();
      startMatch(homeCfg, awayCfg, (gh, ga) => { career.finishCupFinal(career.cupFinalPending, gh, ga); career.state = STATE.DASHBOARD; careerUI.show(); });
    },
  });
}

landing.querySelector('#btnPlayer').onclick = async () => {
  const btn = landing.querySelector('#btnPlayer');
  if (playerUI) { hideLanding(); playerUI.show(); return; }
  btn.textContent = 'Carregando jogadores...'; btn.disabled = true;
  let dataset;
  try { dataset = await loadDataset(); }
  catch (e) { btn.textContent = 'Erro ao carregar dados'; alert('Não consegui carregar players.json: ' + e.message); return; }
  btn.textContent = 'Carreira de Jogador'; btn.disabled = false;
  hideLanding();
  playerUI = new PlayerCareerUI(dataset, {
    onVirarTreinador: (anos, ano) => abrirTreinador(dataset, ano),
    onSair: () => showLanding(),
  });
};

// ---------- Continuar carreira salva ----------
const lerSave = (chave) => { try { return localStorage.getItem(chave); } catch (e) { return null; } };

/** O que existe salvo, para o menu poder dizer em vez de só oferecer "Continuar". */
function resumoDosSaves() {
  const linhas = [];
  try {
    const t = JSON.parse(lerSave('futebolfc_save') || 'null');
    if (t) linhas.push(`treinador · temporada ${t.season || 1}, rodada ${(t.round || 0) + 1}`);
  } catch (e) { /* save velho ou corrompido: só não aparece */ }
  try {
    const j = JSON.parse(lerSave(SAVE_JOGADOR) || 'null');
    // O save do jogador guarda tudo dentro de `jogador`, não na raiz: lendo j.nome
    // direto, o menu dizia "jogador · sem nome, 16 anos".
    const p = (j && (j.jogador || j)) || null;
    if (p) linhas.push(`jogador · ${p.nome || 'sem nome'}, ${p.idade || 16} anos`
      + (p.clubeNome ? ` (${p.clubeNome})` : ''));
  } catch (e) { /* idem */ }
  return linhas;
}

/** Atualiza a linha do Continuar. Sem save, o botão nem aparece. */
function pintarContinuar() {
  const btn = landing.querySelector('#btnContinue');
  const info = landing.querySelector('#saveInfo');
  if (!btn || !info) return;
  const linhas = resumoDosSaves();
  if (!linhas.length) { btn.style.display = 'none'; info.textContent = ''; return; }
  btn.style.display = '';
  info.textContent = linhas.join('  ·  ');
}

async function abrirTreinadorSalvo(raw) {
  hideLanding();
  // O save guarda só a diferença, para não estourar a cota do navegador. O mundo é
  // remontado do players.json — que é o mesmo arquivo e gera os mesmos ids — e o save
  // é aplicado por cima.
  let base = null;
  try { base = await loadDataset(); }
  catch (e) { alert('Não consegui carregar os jogadores: ' + e.message); showLanding(); return; }
  career = CareerManager.fromSnapshot(raw, base);
  careerUI = new CareerUI(career, {
    onHome: () => { careerUI.hide(); showLanding(); },
    onPlay: () => {
      const { homeCfg, awayCfg } = buildMatchConfigs(career);
      careerUI.hide();
      startMatch(homeCfg, awayCfg, (gh, ga) => { career.finishUserMatch(gh, ga); career.state = STATE.DASHBOARD; careerUI.show(); });
    },
    onPlayCup: () => {
      const rival = career.cupOpponentInFinal(); if (!rival) return;
      const { homeCfg, awayCfg } = buildMatchConfigs(career, rival);
      careerUI.hide();
      startMatch(homeCfg, awayCfg, (gh, ga) => { career.finishCupFinal(career.cupFinalPending, gh, ga); career.state = STATE.DASHBOARD; careerUI.show(); });
    },
  });
}

async function abrirJogadorSalvo(raw, btn) {
  if (btn) { btn.textContent = 'Retomando a carreira...'; btn.disabled = true; }
  const dataset = await loadDataset();
  hideLanding();
  playerUI = new PlayerCareerUI(dataset, {
    onVirarTreinador: (anos, ano) => abrirTreinador(dataset, ano),
    onSair: () => showLanding(),
  });
  playerUI.retomar(raw);          // reenvelhece o mundo até o ano em que você parou
  if (btn) { btn.textContent = 'Continuar'; btn.disabled = false; }
}

// Escolha entre as duas carreiras, quando existem as duas salvas.
function escolherCarreira(opcoes) {
  return new Promise((resolve) => {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:90;background:rgba(4,7,15,.9);display:flex;'
      + 'align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(4px)';
    ov.innerHTML = `<div style="background:#111b2e;border:1px solid rgba(120,190,255,.32);border-radius:18px;
      padding:26px;max-width:460px;width:100%;text-align:center;color:#e8f0fb;
      font-family:'Segoe UI',system-ui,sans-serif;box-shadow:0 30px 80px -30px #000"> <h3 style="font-family:'Avenir Next Condensed','Arial Narrow',sans-serif;text-transform:uppercase;
        letter-spacing:.08em;font-size:19px;margin:6px 0 4px">Continuar carreira</h3> <p style="color:#8ea6c9;font-size:13px;margin-bottom:18px">Você tem duas carreiras salvas.</p> <div style="display:flex;flex-direction:column;gap:9px"> ${opcoes.map((o, i) => `<button data-i="${i}" style="font-family:'Avenir Next Condensed','Arial Narrow',sans-serif;
          text-transform:uppercase;letter-spacing:.07em;font-weight:800;font-size:15px;padding:14px;border:none;
          border-radius:11px;cursor:pointer;color:#06210f;
          background:linear-gradient(180deg,#5cf5a2,#2be07a 55%,#12a556);box-shadow:0 4px 0 #0a6b39">${o.txt}</button>`).join('')}
        <button data-i="-1" style="font-family:'Avenir Next Condensed','Arial Narrow',sans-serif;text-transform:uppercase;
          letter-spacing:.07em;font-weight:800;font-size:14px;padding:12px;border:none;border-radius:11px;cursor:pointer;
          color:#cfe1ff;background:linear-gradient(180deg,#2b3d5c,#1b2842);box-shadow:0 4px 0 #0e1729">Cancelar</button></div></div>`;
    document.body.appendChild(ov);
    ov.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => { ov.remove(); resolve(+b.dataset.i); }));
  });
}

async function continueCareer() {
  const btn = landing.querySelector('#btnContinue');
  const saveTreinador = lerSave('futebolfc_save');
  const saveJogador = lerSave(SAVE_JOGADOR);

  if (!saveTreinador && !saveJogador) { alert('Nenhuma carreira salva encontrada.'); return; }
  if (saveTreinador && !saveJogador) return abrirTreinadorSalvo(saveTreinador);
  if (saveJogador && !saveTreinador) return abrirJogadorSalvo(saveJogador, btn);

  const i = await escolherCarreira([
    { txt: 'Carreira de Jogador' },
    { txt: 'Carreira de Treinador' },
  ]);
  if (i === 0) return abrirJogadorSalvo(saveJogador, btn);
  if (i === 1) return abrirTreinadorSalvo(saveTreinador);
}

landing.querySelector('#btnContinue').onclick = continueCareer;
pintarContinuar();

// ---------- Início de partida (comum às duas telas) ----------
function startMatch(homeCfg, awayCfg, onEnd) {
  if (game) game.dispose();
  game = new Game(physics, scene, factory, homeCfg, awayCfg);
  game.onScore = (h, a) => ui.setScore(h, a);
  game.onMessage = (t, c) => ui.message(t, c);
  game.onEnd = (h, a) => {
    ui.message('FIM DE JOGO ' + h + ' x ' + a, '#fff');
    state = 'ended';
    setTimeout(() => { if (onEnd) onEnd(h, a); }, 1500);
  };
  controls.onSwitch = () => game && game.switchPlayer();
  controls.onPass = () => game && game.pass();
  controls.onTackle = () => game && game.tackle();
  controls.onShootDown = () => game && game.shootDown();
  controls.onShootUp = () => game && game.shootUp();
  controls.onPause = () => { paused = !paused; };
  ui.setTeams(homeCfg, awayCfg); ui.setScore(0, 0); ui.showHud();
  window.__game = game; state = 'playing';
}

addEventListener('keydown', (e) => {
  const t = e.target, tag = (t && t.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;   // quem digita manda
  if (e.key.toLowerCase() === 'h' && post.composer) { post.enabled = !post.enabled; ui.message(post.enabled ? 'Gráficos: Alto' : 'Gráficos: Performance', '#9fe0ff'); }
});

let last = performance.now();
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now(); let dt = (now - last) / 1000; last = now;
  if (!isFinite(dt) || dt > 0.05) dt = 0.016;
  // fora de partida (menus/carreira): não renderiza o 3D — economiza CPU/GPU e não trava a simulação 2D
  if (state !== 'playing' && state !== 'ended') return;
  controls.pollGamepad();
  if (stadium && stadium.updateCrowd) stadium.updateCrowd(now / 1000);
  if (state === 'playing' && game && !paused) { physics.step(dt); game.update(dt, controls, tv.cam); }
  const bp = physics.ball.position;
  ballMesh.position.set(bp.x, bp.y, bp.z);
  ballMesh.quaternion.set(physics.ball.quaternion.x, physics.ball.quaternion.y, physics.ball.quaternion.z, physics.ball.quaternion.w);
  ballShadow.position.set(bp.x, 0.02, bp.z);
  const cpos = game && game.controlled ? game.controlled.body.position : { x: 0, z: 0 };
  tv.update(cpos, bp, dt);
  if (game && (state === 'playing' || state === 'ended')) { ui.setClock(90 * (1 - game.time / 240)); ui.setForce(game.charge); ui.drawRadar(game.players, physics.ball, game.controlled); }
  post.render();
}
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); tv.resize(innerWidth / innerHeight); post.setSize(innerWidth, innerHeight); });
loop();
