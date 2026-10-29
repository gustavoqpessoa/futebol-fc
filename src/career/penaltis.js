// penaltis.js — a disputa de pênaltis, jogável.
//
// Quando a final empata, o jogo não decide sozinho: você escolhe o canto, o goleiro
// escolhe o dele, e a bola vai. É o momento em que o jogo para de ser planilha.
//
// Serve aos dois modos — o Treinador cobra pelo clube, o Jogador cobra ele mesmo.

const CANTOS = [
  { id: 0, nome: 'Canto superior esquerdo', x: 18, y: 22, dificuldade: 0.16 },
  { id: 1, nome: 'Canto superior direito', x: 82, y: 22, dificuldade: 0.16 },
  { id: 2, nome: 'Meio alto', x: 50, y: 20, dificuldade: 0.22 },
  { id: 3, nome: 'Canto inferior esquerdo', x: 18, y: 66, dificuldade: 0.10 },
  { id: 4, nome: 'Canto inferior direito', x: 82, y: 66, dificuldade: 0.10 },
  { id: 5, nome: 'Meio rasteiro', x: 50, y: 68, dificuldade: 0.14 },
];

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

export const CSS_PENALTIS = `
  .pen{position:fixed;inset:0;z-index:88;display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:12px;padding:18px;color:#f0f1f3;font-family:'Segoe UI',system-ui,sans-serif;
    background:radial-gradient(800px 460px at 50% 25%,rgba(255,255,255,.06),transparent 62%),
      linear-gradient(170deg,#0f1013,#08090b 78%);overflow:auto}
  .pen .tit{font-family:'Avenir Next Condensed','Arial Narrow',sans-serif;letter-spacing:.3em;
    text-transform:uppercase;font-size:11.5px;color:#9b9ea6}
  .pen .placar{font-family:'Avenir Next Condensed','Arial Narrow',sans-serif;font-size:44px;
    font-weight:800;letter-spacing:.02em;font-variant-numeric:tabular-nums}
  .pen .placar span{color:#6b6e76;margin:0 12px}
  .pen .series{display:flex;flex-direction:column;gap:6px;width:min(430px,92vw)}
  .pen .serie{display:flex;align-items:center;gap:8px;font-size:12.5px}
  .pen .serie b{flex:1;font-family:'Avenir Next Condensed','Arial Narrow',sans-serif;letter-spacing:.05em}
  .pen .bolinha{width:15px;height:15px;border-radius:50%;border:1.5px solid rgba(255,255,255,.22);
    display:inline-block;transition:.2s}
  .pen .bolinha.gol{background:#e6e8ec;border-color:#e6e8ec}
  .pen .bolinha.erro{background:#c9707a;border-color:#c9707a}
  .pen .gol-area{position:relative;width:min(430px,92vw);aspect-ratio:1.55;border-radius:10px;
    background:linear-gradient(#1a1c20,#131519);border:2px solid rgba(255,255,255,.5);
    border-bottom:6px solid rgba(255,255,255,.15);overflow:hidden;cursor:crosshair}
  .pen .rede{position:absolute;inset:0;opacity:.16;
    background-image:linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),
      linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px);
    background-size:17px 17px}
  .pen .alvo{position:absolute;width:38px;height:38px;margin:-19px 0 0 -19px;border-radius:50%;
    border:1.5px dashed rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;
    transition:.15s;cursor:pointer}
  .pen .alvo:hover{border-color:#e6e8ec;background:rgba(255,255,255,.10);transform:scale(1.12)}
  .pen .alvo i{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.5)}
  .pen .goleiro{position:absolute;left:50%;top:52%;width:46px;height:60px;margin:-30px 0 0 -23px;
    transition:transform .32s cubic-bezier(.3,1.4,.5,1);font-size:40px;line-height:1;text-align:center}
  .pen .bola{position:absolute;width:17px;height:17px;margin:-8px 0 0 -8px;border-radius:50%;
    background:#fff;box-shadow:0 0 0 1.5px #111;left:50%;top:96%;opacity:0;transition:all .34s ease-out}
  .pen .msg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    font-family:'Avenir Next Condensed','Arial Narrow',sans-serif;font-size:40px;font-weight:800;
    letter-spacing:.08em;text-shadow:0 3px 14px #000;opacity:0;transition:.2s;pointer-events:none}
  .pen .msg.on{opacity:1}
  .pen .grama{position:absolute;left:0;right:0;bottom:0;height:15%;
    background:linear-gradient(#1d2a20,#16211a);border-top:1px solid rgba(255,255,255,.10)}
  .pen .aviso{color:#9b9ea6;font-size:13px;text-align:center;min-height:20px}
  .pen .btn2{font-family:'Avenir Next Condensed','Arial Narrow',sans-serif;text-transform:uppercase;
    letter-spacing:.07em;font-weight:800;font-size:15px;padding:13px 30px;border:none;border-radius:11px;
    cursor:pointer;color:#101114;background:linear-gradient(180deg,#fff,#dcdee3 60%,#b9bcc4);
    box-shadow:0 4px 0 #6f727a}`;

/**
 * Disputa de pênaltis jogável.
 * @param {object} cfg
 *   nomeA, nomeB      — os dois lados
 *   escudoA, escudoB  — HTML do escudo (opcional)
 *   forcaA, forcaB    — para calibrar quem converte mais
 *   subtitulo         — "Final da Copa do Brasil"
 *   cobrador          — nome de quem bate a SUA cobrança (modo Jogador)
 * @returns {Promise<{golsA, golsB, venceuA, serieA, serieB}>}
 */
export function disputaDePenaltis(cfg) {
  const {
    nomeA, nomeB, escudoA = '', escudoB = '',
    forcaA = 75, forcaB = 75, subtitulo = 'Disputa de pênaltis', cobrador = null,
  } = cfg;

  return new Promise((resolve) => {
    const ov = document.createElement('div');
    ov.className = 'pen';
    ov.innerHTML = `
      <div class="tit">${subtitulo}</div> <div class="placar"><b id="pA">0</b><span>—</span><b id="pB">0</b></div> <div class="series"> <div class="serie">${escudoA}<b>${nomeA}</b><span id="sA"></span></div> <div class="serie">${escudoB}<b>${nomeB}</b><span id="sB"></span></div></div> <div class="gol-area" id="gol"> <div class="rede"></div> ${CANTOS.map((c) => `<div class="alvo" data-c="${c.id}" style="left:${c.x}%;top:${c.y}%"><i></i></div>`).join('')}
        <div class="goleiro" id="gk"></div> <div class="grama"></div> <div class="bola" id="bola"></div> <div class="msg" id="msg"></div></div> <div class="aviso" id="aviso">Escolha o canto da sua cobrança.</div>`;
    document.body.appendChild(ov);

    const $ = (id) => ov.querySelector('#' + id);
    const serieA = [], serieB = [];
    let golsA = 0, golsB = 0, rodada = 0;

    const pintar = () => {
      $('pA').textContent = golsA;
      $('pB').textContent = golsB;
      const bolas = (s) => s.map((ok) => `<i class="bolinha ${ok ? 'gol' : 'erro'}"></i>`).join(' ');
      $('sA').innerHTML = bolas(serieA);
      $('sB').innerHTML = bolas(serieB);
    };

    const animar = async (canto, defendeu) => {
      const gk = $('gk'), bola = $('bola'), msg = $('msg');
      // o goleiro pula para um lado (o certo, se defendeu)
      const ladoGk = defendeu ? canto : CANTOS[(canto.id + 2 + Math.floor(Math.random() * 3)) % CANTOS.length];
      gk.style.transform = `translate(${(ladoGk.x - 50) * 3.2}px, ${(ladoGk.y - 52) * 0.9}px) rotate(${ladoGk.x < 50 ? -25 : 25}deg)`;
      bola.style.opacity = '1';
      await espera(30);
      bola.style.left = `${canto.x}%`;
      bola.style.top = `${defendeu ? canto.y + 4 : canto.y}%`;
      await espera(360);
      msg.textContent = defendeu ? 'DEFENDEU!' : 'GOL!';
      msg.style.color = defendeu ? '#c9707a' : '#8fe3a8';
      msg.classList.add('on');
      await espera(760);
      msg.classList.remove('on');
      bola.style.transition = 'none';
      bola.style.opacity = '0'; bola.style.left = '50%'; bola.style.top = '96%';
      gk.style.transform = '';
      await espera(40);
      bola.style.transition = '';
    };

    // chance de converter: o canto difícil é mais fácil de errar, mas mais difícil de defender
    const bate = async (canto, forcaCobrador, ehVoce) => {
      const gkAdivinhou = Math.random() < 0.34;
      const chanceErrar = canto.dificuldade * (1.25 - forcaCobrador / 200);
      const errouSozinho = Math.random() < chanceErrar;
      const defendeu = errouSozinho || (gkAdivinhou && Math.random() < 0.55 - canto.dificuldade);
      await animar(canto, defendeu);
      return !defendeu;
    };

    const escolherCanto = () => new Promise((res) => {
      $('aviso').textContent = cobrador
        ? `${cobrador} vai bater — escolha o canto.`
        : 'Escolha o canto da sua cobrança.';
      ov.querySelectorAll('[data-c]').forEach((n) => {
        n.style.pointerEvents = 'auto';
        n.onclick = () => {
          ov.querySelectorAll('[data-c]').forEach((x) => (x.style.pointerEvents = 'none'));
          res(CANTOS[+n.dataset.c]);
        };
      });
    });

    const fim = () => {
      const venceuA = golsA > golsB;
      $('aviso').innerHTML = `<div style="font-family:'Avenir Next Condensed',sans-serif;font-size:22px;
        font-weight:800;letter-spacing:.06em;margin-bottom:10px"> ${venceuA ? nomeA : nomeB} venceu nos pênaltis</div> <button class="btn2" id="penOk">Continuar</button>`;
      ov.querySelector('#penOk').onclick = () => {
        ov.remove();
        resolve({ golsA, golsB, venceuA, serieA, serieB });
      };
    };

    // decide se a disputa já acabou (5 cobranças, ou morte súbita depois)
    const acabou = () => {
      const restamA = Math.max(0, 5 - serieA.length), restamB = Math.max(0, 5 - serieB.length);
      if (serieA.length <= 5 || serieB.length <= 5) {
        if (golsA > golsB + restamB) return true;
        if (golsB > golsA + restamA) return true;
      }
      if (serieA.length >= 5 && serieB.length >= 5 && serieA.length === serieB.length && golsA !== golsB) return true;
      return false;
    };

    (async () => {
      pintar();
      while (true) {
        rodada++;
        // sua cobrança
        $('aviso').textContent = `${rodada}ª cobrança — ${nomeA}`;
        const canto = await escolherCanto();
        const fez = await bate(canto, forcaA, true);
        serieA.push(fez); if (fez) golsA++;
        pintar();
        if (acabou()) break;

        // cobrança do adversário (a máquina bate)
        $('aviso').textContent = `${rodada}ª cobrança — ${nomeB}`;
        await espera(420);
        const cantoB = CANTOS[Math.floor(Math.random() * CANTOS.length)];
        const fezB = await bate(cantoB, forcaB, false);
        serieB.push(fezB); if (fezB) golsB++;
        pintar();
        if (acabou()) break;

        if (rodada > 14) break;   // trava de segurança
      }
      fim();
    })();
  });
}
