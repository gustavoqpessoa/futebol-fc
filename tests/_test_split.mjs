// A pesquisa das ligas so vale se ela MUDAR o jogo. Aqui: uma temporada inteira
// na Belgica (split com pontos pela metade) e na Escocia (split sem dividir).
import { readFileSync } from 'fs';
global.window = {};
const ds = JSON.parse(readFileSync('./public/players.json','utf8'));
const { hydrateDataset } = await import('../src/career/database.js');
const { CareerManager } = await import('../src/career/careerManager.js');
const { splitDaLiga } = await import('../src/career/formatos.js');

let falhas = 0;
function ok(c,m){ console.log((c?'  OK  ':'  XX  ')+m); if(!c) falhas++; }

for (const [pais, esperaMetade] of [['Bélgica',true],['Escócia',false],['Brasil',null]]) {
  const d = hydrateDataset(JSON.parse(JSON.stringify(ds)));
  const comp = d.competitions.find(c => c.country===pais && c.tier===1);
  if (!comp) { console.log(`(sem liga de ${pais})`); continue; }
  const clube = d.clubs.filter(c=>c.comp===comp.id)[3];
  const m = new CareerManager(d); m.selectClub(clube.id);
  const sp = splitDaLiga(pais, 1);
  console.log(`\n=== ${pais} — ${clube.name} (${sp?'com fase final':'pontos corridos'}) ===`);
  const rodadasFase1 = m.totalRounds();
  // Para na virada da temporada: _endSeason ja comeca a seguinte sozinho, e sem
  // esse freio o teste rodava dez temporadas e olhava a tabela errada.
  // _endSeason ja zera a tabela e comeca a proxima temporada dentro da propria
  // rodada, entao guardo o retrato do fim ANTES de cada jogada.
  const s0 = m.season; let guard = 0, faseFinal = false, fim = null;
  while (guard++ < 200 && m.season === s0) {
    if (m.fase === 2) faseFinal = true;
    fim = { rodadas: m.totalRounds(), grupos: m.gruposFase2, fixtures: m.fixtures,
            tabela: m.standingsSorted().map((r) => ({ ...r })) };
    if (m.isSeasonOver()) break;
    if (m.cupFinalPending) { m.simulateCupFinal(m.cupFinalPending); continue; }
    m.simulateUserResult();
  }
  if (!sp) { ok(!faseFinal, 'liga sem split nao cria fase final'); continue; }
  ok(!!faseFinal, 'a fase final aconteceu');
  ok(fim.rodadas > rodadasFase1, `a temporada cresceu na fase final (${rodadasFase1} -> ${fim.rodadas} rodadas)`);
  ok(Array.isArray(fim.grupos) && fim.grupos.length===sp.grupos.length,
     `dividiu em ${sp.grupos.length} grupos (${(fim.grupos||[]).map(g=>g.length).join('+')})`);
  // ninguem joga contra quem esta em outro grupo na fase final
  const grupoDe = new Map(); (fim.grupos||[]).forEach((g,i)=>g.forEach(id=>grupoDe.set(id,i)));
  let cruzou = 0;
  for (let r = rodadasFase1; r < fim.fixtures.length; r++)
    for (const [h,a] of fim.fixtures[r]) if (grupoDe.get(h)!==grupoDe.get(a)) cruzou++;
  ok(cruzou===0, `nenhum jogo cruzando grupos na fase final (${cruzou})`);
  const tab = fim.tabela;
  console.log(`  campeao: ${m.clubById(tab[0].id).name} (${tab[0].pts} pts em ${tab[0].j} jogos)`);
  ok(tab[0].pts < tab[0].j * 3, 'pontuacao coerente com o numero de jogos');
}
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas?1:0);
