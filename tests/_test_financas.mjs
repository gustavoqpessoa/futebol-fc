// O clube nao pode quebrar sozinho nem virar uma maquina de juntar dinheiro.
import { readFileSync } from 'fs';
global.window = {};
const ds = JSON.parse(readFileSync('./public/players.json','utf8'));
const { hydrateDataset } = await import('../src/career/database.js');
const { CareerManager } = await import('../src/career/careerManager.js');

let falhas = 0;
const ok = (c,m)=>{ console.log((c?'  OK  ':'  XX  ')+m); if(!c) falhas++; };

function noveAnos(nome) {
  const d = hydrateDataset(JSON.parse(JSON.stringify(ds)));
  const c = d.clubs.find(x => x.name === nome);
  const m = new CareerManager(d); m.selectClub(c.id);
  const caixas = [];
  for (let t = 0; t < 9; t++) {
    const s0 = m.season; let g = 0;
    while (g++ < 500 && m.season === s0) {
      m._talvezFaseFinal(); if (m.isSeasonOver()) break;
      if (m.cupFinalPending) { m.simulateCupFinal(m.cupFinalPending); continue; }
      m.simulateUserResult();
    }
    caixas.push(m.userClub().caixa);
  }
  return { m, c, caixas };
}

console.log('=== o clube nao quebra sozinho ===');
for (const nome of ['Corinthians', 'Remo', 'Boca Juniors']) {
  const { caixas } = noveAnos(nome);
  const fundo = Math.min(...caixas);
  ok(fundo > -12e6, `${nome}: pior caixa em 9 temporadas € ${(fundo/1e6).toFixed(0)}mi`);
}

console.log('\n=== nem vira maquina de dinheiro ===');
{
  const { caixas } = noveAnos('Corinthians');
  const cresceu = caixas[8] / Math.max(1, caixas[0]);
  ok(cresceu < 8, `o caixa cresceu ${cresceu.toFixed(1)}x em nove temporadas (nao pode explodir)`);
}

console.log('\n=== no vermelho, a diretoria vende ===');
{
  const d = hydrateDataset(JSON.parse(JSON.stringify(ds)));
  const c = d.clubs.find(x => x.name === 'Corinthians');
  const m = new CareerManager(d); m.selectClub(c.id);
  c.caixa = -30e6;
  const s0 = m.season; let g = 0;
  while (g++ < 20 && m.season === s0) {
    if (m.isSeasonOver()) break;
    if (m.cupFinalPending) { m.simulateCupFinal(m.cupFinalPending); continue; }
    m.simulateUserResult();
  }
  const vendeu = (m.news || []).some((n) => /diretoria vendeu/.test(n));
  ok(vendeu, 'a diretoria vendeu alguem para tapar o rombo');
  ok(c.caixa > -30e6, `e o caixa melhorou (€ ${(c.caixa/1e6).toFixed(0)}mi)`);
}

console.log('\n=== ninguem nasce sem posicao ===');
{
  const { m, c } = noveAnos('Corinthians');
  const semPos = c.squad.filter((p) => !p.sub);
  ok(semPos.length === 0, `${semPos.length} jogadores sem posicao no elenco depois de 9 anos`);
}
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas?1:0);
