// _test_posicoes.mjs — todo clube consegue escalar sem improviso, e o mercado
// sabe achar um lateral-esquerdo.
//
// O Gustavo pegou o Bolton na League One: "todos os jogadores se colocou como
// lateral direito... não tem lateral esquerdo, ou não tem ponta esquerda, só tem
// ponta direita". Era verdade: 60% do mundo não tinha posição fina no dado e o jogo
// deduzia pelo pé, que é 'R' em 97% dos casos.
import fs from 'fs';
import { hydrateDataset } from '../src/career/database.js';
import { CareerManager } from '../src/career/careerManager.js';

const ds = hydrateDataset(JSON.parse(fs.readFileSync('./public/players.json', 'utf8')));
let falhas = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : '  XX  ') + m); if (!c) falhas++; };

console.log('=== o mundo tem os dois lados ===');
{
  const todos = ds.clubs.flatMap((c) => c.squad);
  const conta = {};
  todos.forEach((p) => { const s = p.sub || p.posicao; conta[s] = (conta[s] || 0) + 1; });
  ok(!todos.some((p) => !p.sub), 'nenhum jogador sem posição detalhada');
  ok(conta.LE > conta.LD * 0.6, `${conta.LE} laterais-esquerdos para ${conta.LD} direitos`);
  ok(conta.PE > conta.PD * 0.6, `${conta.PE} pontas-esquerdas para ${conta.PD} direitas`);
  ok(conta.VOL > 1000 && conta.MEI > 1000, `${conta.VOL} volantes e ${conta.MEI} meias-atacantes`);
}

console.log('\n=== todo clube fecha um time ===');
{
  const preciso = { GOL: 2, ZAG: 4, LE: 1, LD: 1, VOL: 1, MC: 1, ATA: 1 };
  let curtos = 0, faltando = 0;
  for (const c of ds.clubs) {
    if (c.squad.length < 20) curtos++;
    const tem = {};
    c.squad.forEach((p) => { const s = p.sub || p.posicao; tem[s] = (tem[s] || 0) + 1; });
    if (Object.entries(preciso).some(([s, n]) => (tem[s] || 0) < n)) faltando++;
  }
  ok(curtos === 0, `${curtos} clubes com menos de 20 jogadores`);
  ok(faltando === 0, `${faltando} clubes sem gente para alguma posição básica`);
}

console.log('\n=== o Bolton do Gustavo ===');
{
  const m = new CareerManager(ds);
  const bolton = ds.clubs.find((c) => c.name === 'Bolton Wanderers');
  m.selectClub(bolton.id);
  const fora = m.foraDePosicao();
  const tem = {};
  m.userClub().squad.forEach((p) => { const s = p.sub || p.posicao; tem[s] = (tem[s] || 0) + 1; });
  console.log('      elenco:', Object.entries(tem).map(([k, v]) => `${k} ${v}`).join(', '));
  ok(m.userClub().squad.length >= 22, `${m.userClub().squad.length} jogadores no elenco`);
  ok((tem.LE || 0) >= 1 && (tem.LD || 0) >= 1, 'tem lateral dos dois lados');
  ok(fora.length === 0, `${fora.length} jogador(es) fora de posição na escalação automática`
    + (fora.length ? ': ' + fora.map((x) => `${x.nome} (${x.natural} na ${x.vaga})`).join(', ') : ''));
}

console.log('\n=== o mercado acha um lateral-esquerdo ===');
{
  const m = new CareerManager(ds);
  m.selectClub(ds.clubs.find((c) => c.name === 'Bolton Wanderers').id);
  const naLiga = m.activeClubs().flatMap((c) => c.squad).filter((p) => (p.sub || p.posicao) === 'LE');
  const noMundo = ds.clubs.flatMap((c) => c.squad).filter((p) => (p.sub || p.posicao) === 'LE');
  ok(naLiga.length >= 20, `${naLiga.length} laterais-esquerdos na própria liga`);
  ok(noMundo.length >= 500, `${noMundo.length} laterais-esquerdos no mundo`);
  const bons = noMundo.filter((p) => p.forca >= 70);
  ok(bons.length >= 100, `${bons.length} deles com overall 70 ou mais`);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
