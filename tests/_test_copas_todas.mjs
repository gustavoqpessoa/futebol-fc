// _test_copas_todas.mjs — auditoria: TODA copa do jogo tem de rodar e sair campeão.
//
// O _test_copas.mjs prova a fundo cinco copas. Este passa raso em TODAS: simula uma
// temporada em cada país e confere que a copa nacional existe, chega numa final e
// tem campeão.
//
// Sobre o NÚMERO DE FASES: a copa do jogo quase sempre tem menos fases que a de
// verdade, e isso está certo. A Copa da Finlândia tem 9 fases porque entram
// centenas de clubes amadores; o jogo tem 12 clubes finlandeses, o que dá 4 fases.
// O que NÃO pode acontecer é o contrário: a copa ter menos fases do que os clubes
// daquele país permitiriam. Isso sim seria bug, e é o que este teste cobra.
import fs from 'fs';
import { hydrateDataset } from '../src/career/database.js';
import { CareerManager } from '../src/career/careerManager.js';
import { COPAS, copaNacional, segundaCopa } from '../src/career/copas.js';

const ds = hydrateDataset(JSON.parse(fs.readFileSync('./public/players.json', 'utf8')));
let falhas = 0;
const ok = (c, m) => { if (!c) { console.log('  XX  ' + m); falhas++; } };

const clubesDoPais = {};
for (const c of ds.clubs) {
  const comp = ds.competitions.find((x) => x.id === c.comp);
  if (comp) clubesDoPais[comp.country] = (clubesDoPais[comp.country] || 0) + 1;
}

const semCopa = [];
let rodaram = 0, comCampeao = 0;

console.log('=== copas nacionais, uma temporada em cada país ===');
for (const pais of [...new Set(ds.competitions.map((c) => c.country))]) {
  const comp = ds.competitions.find((c) => c.country === pais && c.tier === 1);
  if (!comp || !comp.clubIds || !ds.clubs.find((c) => c.id === comp.clubIds[0])) continue;
  const nac = copaNacional(pais);
  if (!nac) { semCopa.push(pais); continue; }

  const m = new CareerManager(ds);
  m.selectClub(comp.clubIds[0]);
  // Guardo a REFERENCIA antes de simular: na virada da temporada o m.cups e
  // recriado do zero, e ler dali depois devolvia sempre uma copa sem campeao.
  const dela = (m.cups || []).find((c) => c.name === nac.nome || c.name === nac.apelido);
  const s0 = m.season;
  let guard = 0;
  while (guard++ < 400 && m.season === s0) {
    if (m.isSeasonOver()) break;
    if (m.cupFinalPending) { m.simulateCupFinal(m.cupFinalPending); continue; }
    m.simulateUserResult();
  }

  ok(!!dela, `${pais}: a copa "${nac.nome}" nao aparece na temporada`);
  if (!dela) continue;
  rodaram++;
  ok(!!dela.winner, `${pais}/${nac.nome}: acabou a temporada sem campeao`);

  const fases = (dela.stages || []).length;
  const reais = (nac.fases || []).length;
  ok(fases >= 3, `${pais}/${nac.nome}: so ${fases} fase(s)`);
  // Pode ter uma fase a MAIS que a de verdade: e a fase preliminar, que existe
  // quando o pais tem mais clubes do que a copa real comporta. A DFB-Pokal e de 64
  // e a Alemanha aqui tem 66, entao 4 clubes jogam uma preliminar.
  ok(fases <= reais + 2, `${pais}/${nac.nome}: ${fases} fases, a de verdade tem ${reais}`);

  // O QUE MAIS IMPORTA: nenhum clube do pais pode ficar de fora da copa. Antes a
  // Coppa Italia usava 56 dos 100 clubes italianos e a Copa do Brasil 80 dos 124.
  const entram = (dela.entradas || []).reduce((a, e) => a + e.length, 0);
  ok(entram === clubesDoPais[pais],
    `${pais}/${nac.nome}: so ${entram} dos ${clubesDoPais[pais]} clubes do pais entram`);
  ok(/final/i.test(dela.stages[fases - 1] || ''),
    `${pais}/${nac.nome}: termina em "${dela.stages[fases - 1]}", nao numa final`);

  // O corte de fases só se justifica por falta de clube. Com N clubes no país dá
  // para montar log2(N) fases; se a copa tem MENOS que isso e menos que o real,
  // alguma coisa cortou fase à toa.
  const cabem = Math.floor(Math.log2(clubesDoPais[pais] || 2));
  ok(fases >= Math.min(reais, cabem),
    `${pais}/${nac.nome}: ${fases} fases com ${clubesDoPais[pais]} clubes no pais (cabiam ${Math.min(reais, cabem)})`);

  if (dela.winner) comCampeao++;

  const seg = segundaCopa(pais);
  if (seg) ok(true, `${pais}: segunda copa "${seg.nome}"`);
}
console.log(`  ${rodaram} copas nacionais rodaram, ${comCampeao} sairam com campeao`);
console.log(`  ${semCopa.length} pais(es) sem copa: ${semCopa.join(', ')} (esses nao tem copa nacional de verdade)`);

console.log('\n=== a chave de toda copa tem de fechar ===');
// A chave era montada do comeco para o fim e arredondada para par, o que inventava
// vaga que ninguem ocupava: a DFB-Pokal saia 66 > 34 > 18 > 10 > 6 > 2 e o que
// rodava era 66 > 33 > 17 > 9 > 5 > 3. Sobrava um clube passando de graca em toda
// fase e a FINAL era jogada com TRES times — o campeao tinha de ganhar duas finais,
// a segunda contra alguem ja eliminado. Agora a chave e montada a partir da final.
{
  let chaves = 0, finaisRepetidas = 0, semCampeao = 0;
  for (const pais of [...new Set(ds.competitions.map((c) => c.country))]) {
    const comp = ds.competitions.find((c) => c.country === pais && c.tier === 1);
    if (!comp || !ds.clubs.find((c) => c.id === comp.clubIds[0])) continue;
    const m = new CareerManager(ds);
    m.selectClub(comp.clubIds[0]);
    const refs = (m.cups || []).slice();
    for (const c of refs) {
      if (!c.chave) continue;
      chaves++;
      ok(!c.chave.some((v, i) => i > 0 && v > c.chave[i - 1]),
        `${pais}/${c.name}: a chave cresce — ${JSON.stringify(c.chave)}`);
      ok(c.entradas.every((e, i) => e.length <= c.chave[i]),
        `${pais}/${c.name}: entra mais clube do que cabe — ${JSON.stringify(c.entradas.map((e) => e.length))} em ${JSON.stringify(c.chave)}`);
      ok(c.chave[c.chave.length - 1] === 2, `${pais}/${c.name}: a final nao e de dois`);
      const ent = c.entradas.map((e) => e.length);
      const sobrev = (i) => { const b = (c.byes || [])[i] || 0; return b + (c.chave[i] - b) / 2; };
      ok(c.chave.every((v, i) => i === 0 ? v === ent[0] : v === sobrev(i - 1) + ent[i]),
        `${pais}/${c.name}: a chave nao fecha — ${JSON.stringify(c.chave)}, entram ${JSON.stringify(ent)}, byes ${JSON.stringify(c.byes)}`);
    }
    const s0 = m.season;
    let g = 0;
    while (g++ < 400 && m.season === s0) {
      if (m.isSeasonOver()) break;
      if (m.cupFinalPending) { m.simulateCupFinal(m.cupFinalPending); continue; }
      m.simulateUserResult();
    }
    for (const c of refs) {
      const finais = (c.results || []).filter((r) => /^final$/i.test(r.stage || '')).length;
      if (finais > 1 || c.stage > c.stages.length) {
        finaisRepetidas++;
        ok(false, `${pais}/${c.name}: ${finais} finais, stage ${c.stage} de ${c.stages.length}`);
      }
      if (!c.winner) { semCampeao++; ok(false, `${pais}/${c.name}: acabou sem campeao`); }
    }
  }
  console.log(`  ${chaves} chaves conferidas, ${finaisRepetidas} finais repetidas, ${semCampeao} sem campeao`);
}

console.log('\n=== copas continentais ===');
for (const [nome, c] of Object.entries(COPAS)) {
  // a supercopa continental (Supercopa da UEFA, Recopa) e jogo unico: nao tem fases
  if (!c.continente || c.supercopa) continue;
  const fases = (c.fases || []).length;
  const ultima = (c.fases || [])[fases - 1] || {};
  ok(fases >= 4, `${nome}: so ${fases} fases`);
  ok(!!c.entram, `${nome}: nao diz quantos clubes entram`);
  ok(/final/i.test(ultima.nome || ''), `${nome}: termina em "${ultima.nome}", nao numa final`);
  console.log(`  ${nome} (${c.continente}): ${c.entram} clubes, ${fases} fases`);
}

console.log('\n=== cada continental com o formato de verdade ===');
// A Libertadores tem 47 clubes e TRES preliminares antes dos grupos; o jogo comecava
// direto na fase de grupos com 28. A Concacaf e mata-mata puro e caia num chaveado
// generico de 16. Aqui cada uma e cobrada pelo numero de clubes e pelas fases.
{
  const ondeMora = { CONMEBOL: 'Brasil', UEFA: 'Alemanha', AFC: 'Japão',
                     CAF: 'África do Sul', CONCACAF: 'Estados Unidos' };
  const esperado = {
    'Copa Libertadores': { clubes: 47, fases: 8, comeca: 'Primeira fase', entram: [6, 13, 0, 28] },
    // A Sul-Americana varia de 52 a 56: 12 das vagas dela sao de clubes que caem da
    // Libertadores, e quem sobra depende de quem se classificou para a principal.
    'Copa Sul-Americana': { clubes: [52, 56], fases: 7, comeca: 'Primeira fase' },
    'Champions League': { clubes: 36, fases: 6, comeca: 'Fase de liga' },
    'Liga Europa': { clubes: 36, fases: 6, comeca: 'Fase de liga' },
    'AFC Champions League Elite': { clubes: 32, fases: 5, comeca: 'Fase de liga' },
    'Concacaf Champions Cup': { clubes: 27, fases: 5, comeca: 'Primeira fase' },
    'CAF Champions League': { clubes: 48, fases: 6, comeca: 'Preliminar' },
    // A UEFA tem TRES competicoes e o jogo so tinha duas. A Conference e como a Liga
    // Europa, mas cada clube joga SEIS partidas na fase de liga em vez de oito.
    'Conference League': { clubes: 36, fases: 6, comeca: 'Fase de liga', jogos: 6 },
  };
  for (const [cont, pais] of Object.entries(ondeMora)) {
    const comp = ds.competitions.find((c) => c.country === pais && c.tier === 1);
    if (!comp || !ds.clubs.find((c) => c.id === comp.clubIds[0])) continue;
    const m = new CareerManager(ds);
    m.selectClub(comp.clubIds[0]);
    for (const c of m.cups) {
      if (!/^cont/.test(c.kind)) continue;
      const e = esperado[c.name];
      if (!e) continue;
      ok(Array.isArray(e.clubes)
        ? (c.totalClubes >= e.clubes[0] && c.totalClubes <= e.clubes[1])
        : c.totalClubes === e.clubes,
        `${c.name}: ${c.totalClubes} clubes (esperado ${Array.isArray(e.clubes) ? e.clubes.join('-') : e.clubes})`);
      ok(c.stages.length === e.fases, `${c.name}: ${c.stages.length} fases (esperado ${e.fases}) — ${c.stages.join(' > ')}`);
      ok(c.stages[0] === e.comeca, `${c.name}: comeca em "${c.stages[0]}" (esperado "${e.comeca}")`);
      if (e.entram) {
        const ent = (c.entradas || []).map((x) => x.length).slice(0, e.entram.length);
        ok(JSON.stringify(ent) === JSON.stringify(e.entram),
          `${c.name}: entram ${JSON.stringify(ent)} (esperado ${JSON.stringify(e.entram)})`);
      }
      if (e.jogos) ok(c.formatoFase && c.formatoFase.jogos === e.jogos,
        `${c.name}: ${c.formatoFase && c.formatoFase.jogos} jogos na fase de liga (esperado ${e.jogos})`);
      console.log(`  ${c.name}: ${c.totalClubes} clubes — ${c.stages.join(' > ')}`);
    }
  }
}

console.log('\n=== o 3o da Libertadores cai para a Sul-Americana ===');
// Na de verdade, quem termina em terceiro no grupo da Libertadores nao vai para casa:
// cai para o playoff das oitavas da Sul-Americana. O jogo preenchia essas oito vagas
// com "os melhores que sobraram", e o Corinthians terminou em 3o sem ir a lugar
// nenhum. O playoff dela tambem acontecia ANTES dos grupos da Libertadores, entao os
// terceiros nem existiam ainda na hora de montar o confronto.
{
  const comp = ds.competitions.find((c) => c.country === 'Brasil' && c.tier === 1);
  const m = new CareerManager(ds);
  m.selectClub(comp.clubIds[0]);
  const lib = m.cups.find((c) => c.name === 'Copa Libertadores');
  const sa = m.cups.find((c) => c.name === 'Copa Sul-Americana');
  ok(!!lib && !!sa, 'as duas competicoes da CONMEBOL existem');
  if (lib && sa) {
    const iPlay = sa.stages.findIndex((n) => /playoff/i.test(n));
    ok(sa.sched[iPlay] > lib.sched[lib.iGrupos || 0],
      `o playoff da Sul-Americana (rodada ${sa.sched[iPlay]}) vem depois dos grupos da Libertadores (rodada ${lib.sched[lib.iGrupos || 0]})`);
    const s0 = m.season;
    let g = 0;
    while (g++ < 600 && m.season === s0) {
      if (m.isSeasonOver()) break;
      if (m.cupFinalPending) { m.simulateCupFinal(m.cupFinalPending); continue; }
      m.simulateUserResult();
    }
    ok((lib.terceiros || []).length === 8, `${(lib.terceiros || []).length} terceiros de grupo na Libertadores`);
    ok((sa.vieramDaPrincipal || []).length > 0, 'alguem caiu da Libertadores para a Sul-Americana');
    ok(JSON.stringify((lib.terceiros || []).slice(0, (sa.vieramDaPrincipal || []).length))
       === JSON.stringify(sa.vieramDaPrincipal || []),
      'os que entram no playoff sao exatamente os terceiros dos grupos');
    console.log(`  ${(sa.vieramDaPrincipal || []).length} clubes cairam da Libertadores para o playoff da Sul-Americana`);
  }
}

console.log('\n=== ninguem joga duas continentais ===');
{
  for (const pais of ['Alemanha', 'Brasil', 'Japão', 'Estados Unidos']) {
    const comp = ds.competitions.find((c) => c.country === pais && c.tier === 1);
    if (!comp || !ds.clubs.find((c) => c.id === comp.clubIds[0])) continue;
    const m = new CareerManager(ds);
    m.selectClub(comp.clubIds[0]);
    const onde = new Map();
    let dup = 0, exemplo = '';
    for (const c of m.cups.filter((x) => /cont/.test(x.kind))) {
      for (const id of (c.entradas ? c.entradas.flat() : c.alive)) {
        if (onde.has(id)) { dup++; if (!exemplo) exemplo = `${(m.clubById(id) || {}).name} em ${onde.get(id)} e ${c.name}`; }
        else onde.set(id, c.name);
      }
    }
    ok(dup === 0, `${pais}: ${dup} clube(s) em duas continentais (${exemplo})`);
  }
  console.log('  conferido em 4 continentes');
}

console.log('\n=== a Champions tem o playoff das oitavas ===');
// Do 9º ao 24º da fase de liga jogam um playoff; do 1º ao 8º vao direto. O jogo
// mandava 16 direto da tabela para as oitavas e essa fase nao existia.
{
  const comp = ds.competitions.find((c) => c.country === 'Alemanha' && c.tier === 1);
  const m = new CareerManager(ds);
  m.selectClub(comp.clubIds[0]);
  for (const nome of ['Champions League', 'Liga Europa']) {
    const ch = (m.cups || []).find((c) => c.name === nome);
    ok(!!ch, `${nome}: nao existe`);
    if (!ch) continue;
    ok(ch.stages.length === 6, `${nome}: ${ch.stages.length} fases (${ch.stages.join(' > ')})`);
    ok(/playoff/i.test(ch.stages[1] || ''), `${nome}: a 2a fase e "${ch.stages[1]}", nao o playoff`);
    ok(ch.byesNoPlayoff === 8, `${nome}: ${ch.byesNoPlayoff} passam direto (esperado 8)`);
  }
  // e a chave tem de fechar: 8 confrontos no playoff, 8 nas oitavas, 4, 2, 1
  const ch = (m.cups || []).find((c) => c.name === 'Champions League');
  const s0 = m.season;
  let guard = 0;
  while (guard++ < 400 && m.season === s0) {
    if (m.isSeasonOver()) break;
    if (m.cupFinalPending) { m.simulateCupFinal(m.cupFinalPending); continue; }
    m.simulateUserResult();
  }
  const conf = (ch.results || []).map((r) => (r.pairs || []).length);
  const esperado = [0, 8, 8, 4, 2, 1];
  ok(JSON.stringify(conf) === JSON.stringify(esperado),
    `Champions: confrontos por fase ${JSON.stringify(conf)} (esperado ${JSON.stringify(esperado)})`);
  ok(!!ch.winner, 'Champions: ninguem foi campeao');
  console.log(`  Champions: ${ch.stages.join(' > ')}`);
  console.log(`  confrontos por fase: ${conf.join(', ')}`);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
