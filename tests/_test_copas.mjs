// As copas tem de seguir o formato REAL, e um clube nao pode jogar duas
// competicoes continentais na mesma temporada.
import { readFileSync } from 'fs';
global.window = {};
const ds = JSON.parse(readFileSync('./public/players.json','utf8'));
const { hydrateDataset } = await import('../src/career/database.js');
const { CareerManager } = await import('../src/career/careerManager.js');

let falhas = 0;
const ok = (c,m)=>{ console.log((c?'  OK  ':'  XX  ')+m); if(!c) falhas++; };
function carreira(nome){
  const d = hydrateDataset(JSON.parse(JSON.stringify(ds)));
  const c = d.clubs.find(x => x.name === nome);
  const m = new CareerManager(d); m.selectClub(c.id);
  return { d, c, m, copas: m.cupsList() };
}
const joga = (cp, id) => cp.entradas ? cp.entradas.some(f => f.includes(id)) : cp.alive.includes(id);

console.log('=== Copa do Brasil: campeonato grande, nao chaveado de 16 ===');
{
  const { c, copas } = carreira('Corinthians');
  const cb = copas.find(x => x.name === 'Copa do Brasil');
  ok(!!cb, 'a Copa do Brasil existe');
  ok(cb.stages.length >= 6, `tem ${cb.stages.length} fases (a de verdade tem 7)`);
  ok(cb.totalClubes >= 100, `${cb.totalClubes} clubes brasileiros disputam`);
  ok(cb.stages[0] !== 'Oitavas', `comeca na "${cb.stages[0]}", nao nas oitavas`);
  ok(cb.entraDoUsuario > 0, `o Corinthians entra na fase ${cb.entraDoUsuario + 1}, nao na primeira`);
  const { c: c2, copas: co2 } = carreira('Remo');
  const cb2 = co2.find(x => x.name === 'Copa do Brasil');
  ok(cb2.entraDoUsuario === 0, 'um clube pequeno entra na PRIMEIRA fase');
  // A chave nunca cresce, mas PODE repetir o tamanho: na Copa do Brasil os 16 que
  // sobrevivem da 2a fase encontram 16 que entram na 3a, e as duas fases tem 32.
  ok(cb.chave.every((v,i,a) => i===0 || v <= a[i-1]), 'a chave nunca cresce');
  ok(cb.chave[cb.chave.length-1] === 2, 'a final e de dois clubes');
  // Cada fase tem de ser exatamente os sobreviventes da anterior mais quem entra.
  // Numa fase com bye (a preliminar) nem todo mundo joga: quem sobrevive e quem
  // passou direto mais quem ganhou.
  const entram = cb.entradas.map(e => e.length);
  const sobrev = (i) => { const b = (cb.byes||[])[i] || 0; return b + (cb.chave[i]-b)/2; };
  ok(cb.chave.every((v,i) => i===0 || v === sobrev(i-1) + entram[i]),
     `a chave fecha: ${JSON.stringify(cb.chave)} com entradas ${JSON.stringify(entram)} e byes ${JSON.stringify(cb.byes)}`);
  // e TODO clube do pais entra em alguma fase — nenhum fica de fora
  ok(entram.reduce((a,b)=>a+b,0) === cb.totalClubes,
     `os ${cb.totalClubes} clubes brasileiros entram todos (${entram.reduce((a,b)=>a+b,0)})`);
  ok(cb.chave.every(v => v % 2 === 0), 'nenhuma fase com numero impar de clubes');
}
console.log('\n=== ninguem joga duas continentais ===');
for (const nome of ['Corinthians','Palmeiras','Manchester City','Arsenal','SL Benfica']) {
  const { c, copas } = carreira(nome);
  const cont = copas.filter(x => (x.kind === 'cont' || x.kind === 'cont2') && joga(x, c.id));
  ok(cont.length <= 1, `${nome}: ${cont.length} competicao continental (${cont.map(x=>x.name).join(', ')||'nenhuma'})`);
}
console.log('\n=== a Inglaterra tem as DUAS copas ===');
{
  const { c, copas } = carreira('Manchester City');
  const nac = copas.filter(x => x.kind === 'nac' || x.kind === 'nac2');
  ok(nac.length === 2, `${nac.length} copas nacionais: ${nac.map(x=>x.name).join(' e ')}`);
  const liga = nac.find(x => /Liga Inglesa/.test(x.name));
  ok(liga && liga.entraDoUsuario > 0, 'quem joga a Europa entra tarde na Copa da Liga');
}
console.log('\n=== uma temporada inteira, ate sair campeao ===');
{
  const { d, c, m } = carreira('Corinthians');
  // Guardo a REFERENCIA das copas antes de simular. Lendo m.cupsList() dentro do loop
  // eu pegava, na ultima volta, as copas da temporada SEGUINTE — recriadas do zero na
  // virada — e todas apareciam com stage 0 e sem campeao.
  const refs = m.cupsList().slice();
  const s0 = m.season; let g = 0;
  while (g++ < 400 && m.season === s0) {
    m._talvezFaseFinal(); if (m.isSeasonOver()) break;
    if (m.cupFinalPending) { m.simulateCupFinal(m.cupFinalPending); continue; }
    m.simulateUserResult();
  }
  for (const cp of refs) ok(!!cp.winner, `${cp.name} chegou ao fim (fase ${cp.stage}/${cp.stages.length})`);
}

console.log('\n=== Champions: fase de LIGA, nao mata-mata ===');
{
  const { d, c, m, copas } = carreira('Manchester City');
  const ch = copas.find(x => /Champions/.test(x.name));
  ok(ch.formatoFase && ch.formatoFase.tipo === 'liga', 'a Champions comeca por fase de liga');
  ok(ch.totalClubes === 36, `${ch.totalClubes} clubes (a de verdade tem 36)`);
  ok(ch.stages[ch.stages.length-1] === 'Final', `termina na Final (${ch.stages.join(' > ')})`);
  // a fase de liga agora joga UMA rodada por dia: roda até ela terminar
  for (let k = 0; k < 20 && ch.stage === 0; k++) m._jogarFaseDeGrupos(ch);
  const t = ch.results[0].tabela;
  ok(!!t && t.length === 36, 'tabela unica com os 36');
  ok(t.every(r => r.j === 8), 'todo clube joga exatamente 8 partidas');
  // Clube nao enfrenta conterraneo na fase de liga da Champions.
  const paisDe = (id) => (d.clubs.find((x) => x.id === id) || {}).country;
  const meus = ch.results[0].meusJogos || [];
  ok(meus.every((j) => paisDe(j.adv) !== c.country),
     `nenhum dos ${meus.length} adversarios e do mesmo pais que voce`);
  // 24 passam da fase de liga: do 1o ao 8o vao direto as oitavas e do 9o ao 24o
  // jogam o playoff. Antes o jogo mandava 16 direto e o playoff nao existia.
  ok(ch.alive.length === 24, `${ch.alive.length} passam da fase de liga (8 direto + 16 no playoff)`);
  ok(ch.byesNoPlayoff === 8, `${ch.byesNoPlayoff} vao direto as oitavas`);
  ok(ch.stages[1] === 'Playoff das oitavas', `a 2a fase e "${ch.stages[1]}"`);
}
console.log('\n=== Libertadores: fase de GRUPOS ===');
{
  const { c, m, copas } = carreira('Palmeiras');
  const lib = copas.find(x => /Libertadores/.test(x.name));
  // A Libertadores NAO comeca na fase de grupos: 6 clubes jogam a primeira fase, 13
  // entram na segunda e 28 entram direto nos grupos — e é assim que ela tem 47
  // participantes. Antes o jogo pulava as preliminares e começava com 28 nos grupos.
  ok(lib.totalClubes === 47, `${lib.totalClubes} clubes disputam (a de verdade tem 47)`);
  ok(lib.stages[0] === 'Primeira fase', `comeca na "${lib.stages[0]}"`);
  ok(lib.iGrupos === 3, `a fase de grupos e a ${lib.iGrupos + 1}a fase`);
  const entram = lib.entradas.map(e => e.length);
  ok(JSON.stringify(entram.slice(0,4)) === '[6,13,0,28]',
     `entram 6 na primeira, 13 na segunda e 28 nos grupos: ${JSON.stringify(entram)}`);
  // anda ate a fase de grupos
  while (lib.stage < lib.iGrupos) m._cupPlayStage(lib, false);
  // uma rodada de grupo por dia: joga até a fase inteira terminar
  for (let k = 0; k < 20 && lib.stage === lib.iGrupos; k++) m._cupPlayStage(lib, false);
  const g = lib.results[lib.iGrupos].grupos;
  ok(!!g && g.length === 8 && g.every(x => x.length === 4), `${g ? g.length : 0} grupos de 4`);
  ok(lib.alive.length === 16, `${lib.alive.length} vao as oitavas`);
  const meus = lib.results[lib.iGrupos].meusJogos;
  ok(!meus.length || meus.length === 6, `quem esta no grupo joga 6 partidas (ida e volta): ${meus.length}`);
  ok(lib.stages.every(n => !/Fase de (3|5|7|11|14)$/.test(n)), `sem fase de tamanho impar (${lib.stages.join(' > ')})`);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas?1:0);
