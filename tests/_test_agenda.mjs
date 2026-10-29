// _test_agenda.mjs — cada jogo no seu dia.
//
// O Gustavo: "a agenda ainda esta bugando. Voce esta me mostrando somente os jogos do
// campeonato brasileiro. So que eu vou jogar a Libertadores, eu joguei o campeonato
// paulista pelo Corinthians, voce nao me mostrou nada. Como e que vou jogar os dois
// jogos no mesmo dia? Eu preciso que tenha datas especificas e de pra mim simular
// tambem esses outros campeonatos."
//
// Antes a temporada era so as 38 rodadas da liga, e as fases de copa aconteciam POR
// DENTRO delas: ao simular a rodada 5 do Brasileirao o jogo resolvia junto a fase do
// Paulista que calhava ali. Voce nunca jogava a copa — ela acontecia com voce.
import fs from 'fs';
import { hydrateDataset } from '../src/career/database.js';
import { CareerManager } from '../src/career/careerManager.js';

const ds = hydrateDataset(JSON.parse(fs.readFileSync('./public/players.json', 'utf8')));
let falhas = 0;
const ok = (c, m) => { if (!c) { console.log('  XX  ' + m); falhas++; } };

const clube = (nome) => {
  const c = ds.clubs.find((x) => x.name === nome);
  const m = new CareerManager(ds);
  m.selectClub(c.id);
  return m;
};

console.log('=== a temporada tem mais dias que rodadas ===');
for (const nome of ['Corinthians', 'Remo', 'Palmeiras']) {
  const m = clube(nome);
  const ag = m.agenda || [];
  const liga = ag.filter((d) => d.tipo === 'liga').length;
  const copa = ag.filter((d) => d.tipo === 'copa').length;
  ok(ag.length > m.fixtures.length, `${nome}: ${ag.length} compromissos contra ${m.fixtures.length} rodadas de liga`);
  ok(copa >= 5, `${nome}: so ${copa} dias de copa`);
  ok(liga === m.fixtures.length, `${nome}: ${liga} dias de liga para ${m.fixtures.length} rodadas`);
  console.log(`  ${nome}: ${ag.length} compromissos (${liga} de liga + ${copa} de copa)`);
}

console.log('\n=== o estadual abre o ano, em bloco ===');
{
  const m = clube('Corinthians');
  const ag = m.agenda;
  const iEst = m.cups.findIndex((c) => c.kind === 'estadual');
  // a fase de grupos ocupa VÁRIOS dias (uma rodada por dia), então o bloco do
  // estadual é maior do que o número de fases
  const diasDoEstadual = m.cups[iEst].stages
    .reduce((t, _, f) => t + m.diasDaFase(m.cups[iEst], f), 0);
  const primeiros = ag.slice(0, diasDoEstadual);
  ok(primeiros.every((d) => d.tipo === 'copa' && d.cup === iEst),
    'os primeiros dias do ano sao todos do estadual');
  const depois = ag.slice(primeiros.length);
  ok(!depois.some((d) => d.tipo === 'copa' && d.cup === iEst),
    'nenhuma fase do estadual sobra para depois do bloco');
  console.log(`  ${primeiros.length} dias de ${m.cups[iEst].name} antes da 1a rodada do Brasileirao`);
}

console.log('\n=== o estadual nao gasta rodada da liga ===');
{
  // Este era o erro: o dia de copa avancava a rodada do Brasileirao junto, e a liga
  // comecava na rodada 5 depois do estadual.
  const m = clube('Corinthians');
  const antes = m.round;
  const est = m.cups.findIndex((c) => c.kind === 'estadual');
  let dias = 0;
  while (m.compromissoDeHoje() && m.compromissoDeHoje().tipo === 'copa'
         && m.compromissoDeHoje().cup === est) { m.simulateUserResult(); dias++; }
  ok(m.round === antes, `depois de ${dias} dias de estadual a liga ainda esta na rodada ${m.round + 1}`);
  const d = m.compromissoDeHoje();
  ok(d && d.tipo === 'liga' && d.rodada === 0, `o proximo compromisso e a rodada ${d ? d.rodada + 1 : '?'} da liga`);
}

console.log('\n=== a agenda e do SEU clube ===');
{
  // Uma fase em que voce nao entra nao e compromisso seu: a primeira fase da
  // Libertadores acontece enquanto o Palmeiras espera nos grupos.
  const m = clube('Palmeiras');
  const lib = m.cups.find((c) => c.name === 'Copa Libertadores');
  const iLib = m.cups.indexOf(lib);
  const meus = (m.agenda || []).filter((d) => d.tipo === 'copa' && d.cup === iLib);
  ok(lib.entraDoUsuario > 0, `o Palmeiras entra na fase ${lib.entraDoUsuario + 1} da Libertadores`);
  ok(meus.every((d) => d.fase >= lib.entraDoUsuario),
    'nenhuma fase anterior a sua estreia entra na agenda');
  console.log(`  Libertadores: ${meus.length} dias na agenda, a partir de "${lib.stages[lib.entraDoUsuario]}"`);
}

console.log('\n=== a temporada inteira roda pela agenda ===');
{
  const m = clube('Corinthians');
  const refs = m.cups.slice();
  const total = m.agenda.length;
  let liga = 0, copa = 0, g = 0;
  const s0 = m.season;
  while (g++ < 400 && m.season === s0) {
    if (m.isSeasonOver()) break;
    if (m.cupFinalPending) { m.simulateCupFinal(m.cupFinalPending); continue; }
    const d = m.compromissoDeHoje();
    if (!d) break;
    m.simulateUserResult();
    if (d.tipo === 'liga') liga++; else copa++;
  }
  ok(liga + copa === total, `jogou ${liga + copa} dos ${total} compromissos`);
  ok(liga === m.fixtures.length || liga >= 38, `${liga} rodadas de liga jogadas`);
  for (const c of refs) ok(!!c.winner, `${c.name} terminou sem campeao (fase ${c.stage}/${c.stages.length})`);
  console.log(`  ${liga} jogos de liga + ${copa} de copa = ${liga + copa} na temporada`);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
