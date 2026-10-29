// _test_estaduais.mjs — os 26 estaduais brasileiros.
//
// Antes existiam quatro (Paulista, Carioca, Mineiro, Gaucho) e 56 dos 124 clubes
// brasileiros estavam SEM ESTADO: Fortaleza, Cuiaba, Criciuma, Nautico e Santa Cruz
// caiam num "Campeonato Estadual (??)" generico. Agora todo clube tem estado e todo
// estado tem o seu campeonato.
import fs from 'fs';
import { hydrateDataset } from '../src/career/database.js';
import { CareerManager } from '../src/career/careerManager.js';
import { estadoDe, nomeDoEstadual, NOME_ESTADUAL } from '../src/career/estados.js';
import { copaEstadual } from '../src/career/copas.js';

const ds = hydrateDataset(JSON.parse(fs.readFileSync('./public/players.json', 'utf8')));
let falhas = 0;
const ok = (c, m) => { if (!c) { console.log('  XX  ' + m); falhas++; } };

console.log('=== todo clube brasileiro tem estado ===');
{
  const sem = [];
  for (const c of ds.clubs) {
    const comp = ds.competitions.find((x) => x.id === c.comp);
    if (!comp || comp.country !== 'Brasil') continue;
    if (!estadoDe(c.name)) sem.push(c.name);
  }
  ok(sem.length === 0, `${sem.length} clube(s) sem estado: ${sem.slice(0, 8).join(', ')}`);
  console.log(`  nenhum dos clubes brasileiros ficou sem estado`);
}

console.log('\n=== os 26 estados tem campeonato, e nenhum com nome generico ===');
{
  ok(Object.keys(NOME_ESTADUAL).length === 26, `${Object.keys(NOME_ESTADUAL).length} estados nomeados`);
  const semFormato = [];
  for (const uf of Object.keys(NOME_ESTADUAL)) {
    const nome = nomeDoEstadual(uf);
    ok(!/Estadual \(/.test(nome), `${uf}: nome generico "${nome}"`);
    if (!copaEstadual(nome)) semFormato.push(uf);
  }
  ok(semFormato.length === 0, `${semFormato.length} estado(s) sem formato: ${semFormato.join(', ')}`);
  console.log(`  26 estaduais com nome e formato`);
}

console.log('\n=== cada estadual roda e sai campeao ===');
{
  const porUF = {};
  for (const c of ds.clubs) {
    const comp = ds.competitions.find((x) => x.id === c.comp);
    if (!comp || comp.country !== 'Brasil') continue;
    const uf = estadoDe(c.name);
    if (uf && !porUF[uf]) porUF[uf] = c;
  }
  let rodaram = 0;
  for (const [uf, c] of Object.entries(porUF)) {
    const m = new CareerManager(ds);
    m.selectClub(c.id);
    const e = m.cups.find((x) => x.kind === 'estadual');
    ok(!!e, `${uf}: sem estadual para o ${c.name}`);
    if (!e) continue;
    ok(e.name === nomeDoEstadual(uf), `${uf}: montou "${e.name}"`);
    ok(typeof e.totalClubes === 'number', `${uf}: nao sabe quantos clubes disputam`);
    ok(e.stages[e.stages.length - 1] === 'Final', `${uf}: termina em "${e.stages[e.stages.length - 1]}"`);
    const s0 = m.season;
    let g = 0;
    while (g++ < 400 && m.season === s0) {
      if (m.isSeasonOver()) break;
      if (m.cupFinalPending) { m.simulateCupFinal(m.cupFinalPending); continue; }
      m.simulateUserResult();
    }
    ok(!!e.winner, `${uf}/${e.name}: acabou sem campeao`);
    rodaram++;
  }
  console.log(`  ${rodaram} estaduais rodaram uma temporada inteira`);
}

console.log('\n=== a chave do estadual fecha, ninguem avanca sem jogar ===');
// O Paulista tem 3 grupos de 4 e passam 2 de cada: 6 classificados numa chave de 8.
// Sobravam duas vagas e alguem avancava de graca — o EC Jau chegou a FINAL sem ter
// disputado a semifinal. Agora os melhores terceiros completam a chave.
{
  const comp = ds.competitions.find((c) => c.country === 'Brasil' && c.tier === 1);
  const m = new CareerManager(ds);
  m.selectClub(comp.clubIds[0]);
  const e = m.cups.find((c) => c.kind === 'estadual');
  ok(!!e, 'o Paulista existe para um clube de Sao Paulo');
  if (e) {
    const s0 = m.season;
    let g = 0;
    while (g++ < 600 && m.season === s0) {
      if (m.isSeasonOver()) break;
      if (m.cupFinalPending) { m.simulateCupFinal(m.cupFinalPending); continue; }
      m.simulateUserResult();
    }
    // cada fase de mata-mata tem de ter metade dos confrontos da anterior
    const mata = (e.results || []).filter((r) => (r.pairs || []).length);
    for (let i = 1; i < mata.length; i++) {
      const antes = mata[i - 1].pairs.length, agora = mata[i].pairs.length;
      ok(agora === Math.floor(antes / 2) || antes === agora * 2,
        `${e.name}: ${mata[i - 1].stage} teve ${antes} confrontos e ${mata[i].stage} teve ${agora}`);
    }
    ok(mata.length >= 2, `${e.name}: ${mata.length} fases de mata-mata`);
    ok(!!e.winner, `${e.name}: campeao ${e.winner ? (m.clubById(e.winner) || {}).name : 'NENHUM'}`);
    console.log('  ' + mata.map((r) => `${r.stage}: ${r.pairs.length}`).join(' | '));
  }
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
