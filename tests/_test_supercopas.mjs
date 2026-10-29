// _test_supercopas.mjs — supercopas, Recopa e os DOIS mundiais de clubes.
//
// Nada disso existia no jogo. Foi pedido do Gustavo: "falta você ver os formatos dos
// dois mundiais de clubes, supercopa do brasil, supercopa da uefa, recopa, e as do
// mesmo sentido de outros países".
//
// O que cada uma é, de verdade:
//   - supercopa nacional: campeão da liga x campeão da copa, jogo único (a da Espanha
//     tem QUATRO clubes, com semifinais);
//   - Supercopa da UEFA: campeão da Champions x campeão da Liga Europa, jogo único;
//   - Recopa Sul-Americana: campeão da Libertadores x da Sul-Americana, IDA E VOLTA;
//   - Mundial de Clubes: 32 clubes, 8 grupos de 4, DE QUATRO EM QUATRO ANOS;
//   - Copa Intercontinental: todo ano, 6 campeões continentais numa escada, e o
//     campeão da Champions entra DIRETO NA FINAL.
import fs from 'fs';
import { hydrateDataset } from '../src/career/database.js';
import { CareerManager } from '../src/career/careerManager.js';
import { supercopaDoPais, supercopaDoContinente, mundiais } from '../src/career/copas.js';

const ds = hydrateDataset(JSON.parse(fs.readFileSync('./public/players.json', 'utf8')));
let falhas = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : '  XX  ') + m); if (!c) falhas++; };

const carreira = (pais, season) => {
  const comp = ds.competitions.find((c) => c.country === pais && c.tier === 1);
  const m = new CareerManager(ds);
  m.selectClub(comp.clubIds[0]);
  if (season && season !== m.season) { m.season = season; m._startCups(); }
  return m;
};

console.log('=== supercopa nacional ===');
for (const [pais, nome, clubes] of [
  ['Brasil', 'Supercopa Rei', 2],
  ['Alemanha', 'DFL-Supercup', 2],
  ['Inglaterra', 'Community Shield', 2],
  ['Itália', 'Supercoppa Italiana', 2],
  ['Espanha', 'Supercopa de España', 4],   // a única com quatro clubes
]) {
  const esperada = supercopaDoPais(pais);
  ok(esperada && esperada.nome === nome, `${pais}: a supercopa e "${esperada && esperada.nome}"`);
  const m = carreira(pais);
  const s = m.cups.find((c) => c.name === nome);
  ok(!!s, `${pais}: ${nome} esta na temporada`);
  if (!s) continue;
  ok(s.totalClubes === clubes, `${nome}: ${s.totalClubes} clubes (esperado ${clubes})`);
  ok(s.stages[s.stages.length - 1] === 'Final', `${nome}: termina na Final (${s.stages.join(' > ')})`);
  if (clubes === 4) ok(s.stages[0] === 'Semifinal', `${nome}: comeca na Semifinal`);
}

console.log('\n=== supercopa continental ===');
{
  const m = carreira('Alemanha');
  const su = m.cups.find((c) => c.name === 'Supercopa da UEFA');
  ok(!!su, 'Supercopa da UEFA esta na temporada');
  ok(su && su.totalClubes === 2, `Supercopa da UEFA: ${su && su.totalClubes} clubes`);
  ok(su && !su.idaVolta[0], 'Supercopa da UEFA e jogo unico');

  const b = carreira('Brasil');
  const re = b.cups.find((c) => c.name === 'Recopa Sul-Americana');
  ok(!!re, 'Recopa Sul-Americana esta na temporada');
  ok(re && re.totalClubes === 2, `Recopa: ${re && re.totalClubes} clubes`);
  ok(re && re.idaVolta[0] === true, 'Recopa e IDA E VOLTA, nao jogo unico');
  ok(supercopaDoContinente('CONMEBOL').nome === 'Recopa Sul-Americana', 'a da CONMEBOL e a Recopa');
}

console.log('\n=== os dois mundiais ===');
{
  const nomes = mundiais().map((x) => x.nome);
  ok(nomes.length === 2, `sao dois mundiais: ${nomes.join(' e ')}`);

  // A Intercontinental e TODO ANO
  const m1 = carreira('Brasil');
  const ic = m1.cups.find((c) => c.name === 'Copa Intercontinental');
  ok(!!ic, 'Copa Intercontinental acontece na temporada 1');
  ok(ic && ic.stages[ic.stages.length - 1] === 'Final',
    `Intercontinental: ${ic && ic.stages.join(' > ')}`);
  ok(ic && ic.stages.length >= 3, `Intercontinental tem ${ic && ic.stages.length} fases (a escada inteira)`);
  // e o Mundial de 32 NAO acontece todo ano
  ok(!m1.cups.find((c) => c.name === 'Mundial de Clubes'),
    'o Mundial de 32 clubes nao acontece na temporada 1');

  // De quatro em quatro anos ele aparece
  const m4 = carreira('Brasil', 4);
  const mc = m4.cups.find((c) => c.name === 'Mundial de Clubes');
  ok(!!mc, 'o Mundial de 32 clubes acontece na temporada 4');
  ok(mc && mc.totalClubes === 32, `Mundial: ${mc && mc.totalClubes} clubes (esperado 32)`);
  ok(mc && mc.stages[0] === 'Fase de grupos', `Mundial comeca na fase de grupos`);
  ok(mc && mc.stages.length === 5, `Mundial: ${mc && mc.stages.join(' > ')}`);
}

console.log('\n=== tudo isso chega ao fim e sai campeao ===');
{
  const m = carreira('Brasil');
  const extras = m.cups.filter((c) => c.ehSupercopa || c.kind === 'mundial');
  const nomes = extras.map((c) => c.name);
  const s0 = m.season;
  let g = 0;
  while (g++ < 400 && m.season === s0) {
    if (m.isSeasonOver()) break;
    if (m.cupFinalPending) { m.simulateCupFinal(m.cupFinalPending); continue; }
    m.simulateUserResult();
  }
  for (const c of extras) {
    ok(!!c.winner, `${c.name}: campeao ${c.winner ? (m.clubById(c.winner) || {}).name : 'NENHUM'}`);
    const finais = (c.results || []).filter((r) => /^final$/i.test(r.stage || '')).length;
    ok(finais <= 1, `${c.name}: ${finais} final(is), nao pode ser mais de uma`);
  }
  console.log(`  na temporada do Brasil: ${nomes.join(', ')}`);
}

console.log('\n=== a supercopa usa os campeoes da temporada ANTERIOR ===');
// A supercopa e entre quem ganhou a liga e a copa no ano passado. Confiro seis
// temporadas seguidas: quem entra na supercopa tem de ser exatamente quem foi
// campeao na temporada que acabou de terminar.
{
  const comp = ds.competitions.find((c) => c.country === 'Alemanha' && c.tier === 1);
  const m = new CareerManager(ds);
  m.selectClub(comp.clubIds[0]);
  const N = (id) => (m.clubById(id) || {}).name || '?';
  let esperado = null, conferidas = 0;
  for (let t = 0; t < 5; t++) {
    const sup = (m.cups || []).find((c) => c.name === 'DFL-Supercup');
    const viu = sup ? sup.alive.map(N).sort().join(' x ') : 'NAO EXISTE';
    if (esperado) { ok(viu === esperado, `T${m.season}: supercopa = ${viu} (esperado ${esperado})`); conferidas++; }
    const s0 = m.season;
    let g = 0;
    while (g++ < 600 && m.season === s0) {
      if (m.isSeasonOver()) { if (m._talvezFaseFinal) m._talvezFaseFinal(); if (m.isSeasonOver()) break; }
      if (m.cupFinalPending) { m.simulateCupFinal(m.cupFinalPending); continue; }
      m.simulateUserResult();
    }
    // Na DOBRADINHA (mesmo clube ganhou a liga e a copa) quem entra e o campeao mais
    // o VICE da liga — nao o campeao duas vezes.
    const cl = m.campeoes['liga:Alemanha'], cp = m.campeoes['DFB-Pokal'];
    const outro = (cp && cp !== cl) ? cp : m.campeoes['vice:Alemanha'];
    esperado = [N(cl), N(outro)].sort().join(' x ');
    if (m.season === s0) { if (m.advanceSeason) m.advanceSeason(); else m._endSeason(); }
  }
  console.log(`  ${conferidas} temporadas seguidas com a supercopa certa`);

  // DOBRADINHA: o mesmo clube ganhou a liga e a copa. Entra o VICE da liga — antes a
  // supercopa simplesmente nao acontecia naquele ano.
  const m2 = new CareerManager(ds);
  m2.selectClub(comp.clubIds[0]);
  const dono = comp.clubIds[0];
  // O vice tem de ser OUTRO clube: se a classificacao simulada puser o proprio dono
  // em segundo, o "vice" seria o campeao e a supercopa nao teria dois participantes.
  const tab = m2._classificacaoAnterior(comp);
  const vice = (tab.find((r) => r.id !== dono) || {}).id;
  m2.campeoes = { 'liga:Alemanha': dono, 'DFB-Pokal': dono, 'vice:Alemanha': vice };
  m2._startCups();
  const s2 = m2.cups.find((c) => c.name === 'DFL-Supercup');
  ok(!!s2, 'na dobradinha a supercopa continua acontecendo');
  ok(s2 && s2.alive.length === 2 && s2.alive.includes(dono) && s2.alive.includes(vice),
    `dobradinha: ${s2 ? s2.alive.map((i) => (m2.clubById(i) || {}).name).join(' x ') : '—'} (campeao x vice da liga)`);
}

console.log('\n=== torneios de selecao na carreira de jogador ===');
// Eurocopa e Copa America sao de SELECAO, nao de clube: elas vivem na carreira de
// jogador. Antes o jogo so sorteava "chegou a final, sim ou nao" — se voce caisse
// antes, o torneio nem era mencionado. Agora a campanha e jogada fase a fase.
{
  const { torneioDeSelecao, torneiosDeSelecao } = await import('../src/career/copas.js');
  const esperado = {
    'Copa do Mundo': { entram: 48, grupos: 12, fases: 6 },
    'Eurocopa': { entram: 24, grupos: 6, fases: 5 },
    'Copa América': { entram: 16, grupos: 4, fases: 4 },
  };
  ok(torneiosDeSelecao().length === 3, `${torneiosDeSelecao().length} torneios de selecao`);
  for (const [nome, e] of Object.entries(esperado)) {
    const t = torneioDeSelecao(nome);
    ok(!!t, `${nome} existe`);
    if (!t) continue;
    ok(t.entram === e.entram, `${nome}: ${t.entram} selecoes (esperado ${e.entram})`);
    ok(t.fases[0].grupos === e.grupos, `${nome}: ${t.fases[0].grupos} grupos de ${t.fases[0].por_grupo}`);
    ok(t.fases.length === e.fases, `${nome}: ${t.fases.map((f) => f.nome).join(' > ')}`);
    ok(t.fases[t.fases.length - 1].nome === 'Final', `${nome}: termina na Final`);
  }

  // e a campanha acontece de verdade, no ano certo
  const { PlayerCareer } = await import('../src/career/playerCareer.js');
  const pc = new PlayerCareer(ds, { nome: 'Teste da Silva', pos: 'ATA', pais: 'Brasil' });
  const vistos = {};
  for (let i = 0; i < 20 && !pc.aposentado; i++) {
    const r = pc.simularTemporada();
    if (!r) break;
    const c = r.selecao && r.selecao.campanha;
    if (c) {
      vistos[c.torneio] = (vistos[c.torneio] || 0) + 1;
      ok(c.fases.length >= 1 && c.fases[0].nome === 'Fase de grupos',
        `${r.ano} ${c.torneio}: campanha comeca na fase de grupos e para em ${c.ateOnde}`);
      // Copa do Mundo em ano par de 4 em 4; continental nos outros pares
      const ehMundo = c.torneio === 'Copa do Mundo';
      ok(ehMundo ? r.ano % 4 === 2 : r.ano % 4 === 0,
        `${r.ano}: ${c.torneio} no ano certo`);
    }
    if (pc.avancarTemporada) pc.avancarTemporada();
  }
  // Depende de o jogador ser convocado, e isso varia: exijo pelo menos um torneio
  // com campanha completa, nao os dois.
  ok(Object.keys(vistos).length >= 1, `apareceram: ${Object.keys(vistos).join(', ') || 'nenhum'}`);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
