// _test_turnos.mjs — a liga joga o número de turnos que ela joga de verdade.
//
// O motor montava sempre turno e returno. Com isso a húngara jogava 22 rodadas em
// vez de 33 e a irlandesa 18 em vez de 36 — as duas ligas se enfrentam mais de duas
// vezes justamente porque têm poucos clubes. O split também passou a aceitar um
// número de jogos por grupo: na Sérvia o grupo de 6 joga 5 rodadas e o de 8 joga 7.
import fs from 'fs';
import { hydrateDataset } from '../src/career/database.js';
import { CareerManager } from '../src/career/careerManager.js';

const ds = hydrateDataset(JSON.parse(fs.readFileSync('./public/players.json', 'utf8')));
let falhas = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : '  XX  ') + m); if (!c) falhas++; };

console.log('=== rodadas da fase regular ===');
// pais, rodadas esperadas, por quê
for (const [pais, esperado, motivo] of [
  ['Hungria',       33, '12 clubes, tres turnos'],
  ['Escócia',       33, '12 clubes, tres turnos'],
  ['Suíça',         33, '12 clubes, tres turnos'],
  ['Coreia do Sul', 33, '12 clubes, tres turnos'],
  ['Irlanda',       36, '10 clubes, quatro turnos'],
  ['Croácia',       36, '10 clubes, quatro turnos'],
  ['Brasil',        38, '20 clubes, turno e returno'],
  ['Sérvia',        26, '14 clubes, turno e returno'],
  ['Bulgária',      26, '14 clubes, turno e returno'],
]) {
  const comp = ds.competitions.find((c) => c.country === pais && c.tier === 1);
  if (!comp) { ok(false, `${pais}: liga nao existe no jogo`); continue; }
  const cm = new CareerManager(ds);
  cm.selectClub(comp.clubIds[0]);
  ok(cm.totalRounds() === esperado, `${pais}: ${cm.totalRounds()} rodadas (${motivo})`);
}

console.log('\n=== ninguem joga a mais nem a menos ===');
for (const pais of ['Hungria', 'Irlanda', 'Croácia']) {
  const comp = ds.competitions.find((c) => c.country === pais && c.tier === 1);
  const cm = new CareerManager(ds);
  cm.selectClub(comp.clubIds[0]);
  const jogos = new Map(comp.clubIds.map((id) => [id, 0]));
  cm.fixtures.forEach((rod) => rod.forEach(([h, a]) => {
    jogos.set(h, (jogos.get(h) || 0) + 1);
    jogos.set(a, (jogos.get(a) || 0) + 1);
  }));
  const vals = [...jogos.values()];
  ok(new Set(vals).size === 1 && vals[0] === cm.totalRounds(),
    `${pais}: todo clube joga ${vals[0]} partidas`);
  // mando parelho: ninguem pode jogar tudo em casa num campeonato de 3 turnos
  const casa = new Map(comp.clubIds.map((id) => [id, 0]));
  cm.fixtures.forEach((rod) => rod.forEach(([h]) => casa.set(h, (casa.get(h) || 0) + 1)));
  const cs = [...casa.values()];
  ok(Math.max(...cs) - Math.min(...cs) <= 1,
    `${pais}: mando parelho (entre ${Math.min(...cs)} e ${Math.max(...cs)} em casa)`);
}

console.log('\n=== split com numero de jogos por grupo ===');
// A Serbia divide em 6 e 8; o grupo de 6 joga 5 rodadas e o de 8 joga 7 — cada um
// enfrenta os do proprio grupo uma vez. A Bulgaria divide em TRES: 4, 4 e 6.
for (const [pais, gruposEsperados, totalEsperado] of [
  ['Sérvia',   [6, 8],    33],
  ['Bulgária', [4, 4, 6], 32],
]) {
  const comp = ds.competitions.find((c) => c.country === pais && c.tier === 1);
  const m = new CareerManager(ds);
  m.selectClub(comp.clubIds[0]);
  const s0 = m.season;
  let guard = 0;
  while (guard++ < 200 && m.season === s0) {
    if (m.isSeasonOver()) break;
    if (m.cupFinalPending) { m.simulateCupFinal(m.cupFinalPending); continue; }
    m.simulateUserResult();
  }
  m._iniciarFaseFinal();
  const tam = (m.gruposFase2 || []).map((g) => g.length);
  ok(JSON.stringify(tam) === JSON.stringify(gruposEsperados),
    `${pais}: grupos de ${tam.join(' + ')} (esperado ${gruposEsperados.join(' + ')})`);
  ok(m.totalRounds() === totalEsperado,
    `${pais}: ${m.totalRounds()} rodadas na temporada toda (esperado ${totalEsperado})`);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
