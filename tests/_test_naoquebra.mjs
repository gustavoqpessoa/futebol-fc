// _test_naoquebra.mjs — a tela não pode quebrar por falta de um dado.
//
// Um pop-up de resultado sem adversário derrubava a interface inteira e o jogo
// parava de responder a QUALQUER clique — o Gustavo ia achar que travou. O teste
// varre as telas do modo treinador com o jogo em vários momentos e cobra que
// nenhuma delas exploda.
import fs from 'fs';
import { hydrateDataset } from '../src/career/database.js';
import { CareerManager } from '../src/career/careerManager.js';
import { CareerUI } from '../src/career/careerUI.js';
import { crest } from '../src/career/crest.js';

// A tela de final cria um elemento de verdade; aqui um DOM de mentira basta para
// o teste rodar fora do navegador.
const nada = { className: '', innerHTML: '', style: {}, appendChild() {}, remove() {},
  querySelector: () => nada, querySelectorAll: () => [], addEventListener() {} };
globalThis.document = { createElement: () => nada, body: nada,
  querySelector: () => nada, querySelectorAll: () => [] };

const ds = hydrateDataset(JSON.parse(fs.readFileSync('./public/players.json', 'utf8')));
let falhas = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : '  XX  ') + m); if (!c) falhas++; };

ok(typeof crest(null, 16) === 'string' && typeof crest({}, 16) === 'string',
  'crest() aguenta clube nulo ou sem nome');

const TELAS = ['_renderDash', '_renderTactics', '_renderTransfers', '_renderStandings',
  '_renderStats', '_renderCalendar', '_renderCopa', '_renderHistory', '_renderOlheiro',
  '_renderLigas', '_renderBase'];

for (const nome of ['Bromley', 'Corinthians']) {
  const m = new CareerManager(ds);
  m.selectClub(ds.clubs.find((c) => c.name === nome).id);
  const ui = Object.create(CareerUI.prototype);
  ui.career = m;
  ui.body = { querySelectorAll: () => [], querySelector: () => null };
  for (const momento of [0, 5, 30]) {
    while (m.round < momento && !m._seasonJustEnded) m.simulateUserResult();
    for (const t of TELAS) {
      try {
        const html = ui[t]();
        if (typeof html !== 'string' || !html.length) throw new Error('tela vazia');
      } catch (e) {
        ok(false, `${nome}, rodada ${m.round}, ${t}: ${e.message}`);
      }
    }
  }
  ok(true, `${nome}: as ${TELAS.length} telas desenharam em três momentos da temporada`);
}

// DEMITIDO NUNCA FICA SEM MUNDO. Numa carreira de teste, três demissões seguidas
// em divisões cada vez piores derrubaram o teto abaixo do clube mais fraco do jogo:
// nenhum time aceitava o técnico e a carreira não tinha como seguir.
{
  const m = new CareerManager(ds);
  m.selectClub(ds.clubs.find((c) => c.name === 'Bromley').id);
  let semSaida = 0;
  for (const meu of ['Bromley', 'Barrow', 'Worthing']) {
    m.selectClub(ds.clubs.find((c) => c.name === meu).id);
    m.tetoTreinador = null;
    m.userClub().squad.forEach((p) => { p.forca = 40; });   // pior clube possível
    m.pendingBoard = { fired: true };
    const fracos = ds.clubs.map((c) => c.id).filter((id) => m.podeAssumir(id));
    if (!fracos.length) semSaida++;
  }
  ok(semSaida === 0, 'sempre sobra clube para assumir depois de uma demissão');
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
