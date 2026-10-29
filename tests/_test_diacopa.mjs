// _test_diacopa.mjs — DIA DE COPA JOGA COPA.
//
// O erro que mais incomodou o Gustavo, e que eu já tinha dito que estava
// resolvido quando não estava: na fase de grupos do Paulista, "dirigir a
// partida" marcava um adversário do BRASILEIRÃO e o resultado entrava na tabela
// do Brasileirão. A causa: a copa não sabia dizer o adversário na fase de
// grupos, devolvia null, e com null a partida pegava o adversário da liga.
//
// Este teste olha a agenda dia a dia e cobra, em todo dia de copa:
//   1. a copa sabe dizer contra quem você joga (ou que você folga);
//   2. a partida nunca começa com o adversário da liga;
//   3. a rodada do Brasileirão NÃO anda.
import { readFileSync } from 'fs';
global.window = {};
const ds = JSON.parse(readFileSync('./public/players.json', 'utf8'));
const { hydrateDataset } = await import('../src/career/database.js');
const { CareerManager } = await import('../src/career/careerManager.js');

let falhas = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : '  XX  ') + m); if (!c) falhas++; };

const d = hydrateDataset(JSON.parse(JSON.stringify(ds)));
const cl = d.clubs.find((x) => x.name === 'Corinthians');
const m = new CareerManager(d);
m.selectClub(cl.id);
m.escalarAutomatico();

let diasDeCopa = 0, comAdversario = 0, caiuNaLiga = 0, rodadaMexeu = 0, grupos = 0;
const total = m.agenda.length;

for (let i = 0; i < total; i++) {
  const hoje = m.compromissoDeHoje();
  if (!hoje) break;
  if (hoje.tipo === 'copa') {
    diasDeCopa++;
    const rodadaAntes = m.round;
    const naCopa = m.adversarioNaCopaHoje();
    if (naCopa) {
      comAdversario++;
      if (naCopa.grupo) grupos++;
      // o adversário de hoje não pode ser o adversário da rodada da liga
      // o que importa não é o NOME do adversário — ele pode calhar de ser o mesmo
      // da liga, e isso é coincidência legítima. O que não pode é a partida nascer
      // sem o selo de copa, porque é esse selo que manda o placar para a copa.
      const est = m.iniciarPartidaAoVivo(naCopa);
      if (!est || !est.copa) {
        caiuNaLiga++;
        console.log(`     [SEM SELO DE COPA] ${naCopa.fase} contra ${naCopa.adversario.name}`);
      }
    } else {
      // sem adversário de copa, a partida ao vivo NÃO pode começar
      const est = m.iniciarPartidaAoVivo(null);
      if (est) { caiuNaLiga++; console.log(`     [CAIU NA LIGA] fase sem adversário, mas a partida começou contra ${est.opp.name}`); }
    }
    m.simulateUserResult();
    if (m.round !== rodadaAntes) rodadaMexeu++;
  } else {
    m.simulateUserResult();
  }
}

console.log(`  ${diasDeCopa} dias de copa na temporada; em ${comAdversario} deles você tinha jogo`);
console.log(`  ${grupos} desses eram de fase de grupos\n`);

ok(diasDeCopa > 0, 'a temporada tem dias de copa');
ok(grupos > 0, 'a copa sabe dizer o adversário na FASE DE GRUPOS');
ok(caiuNaLiga === 0, 'nenhum dia de copa caiu no adversário da liga');
ok(rodadaMexeu === 0, 'a rodada do Brasileirão nunca andou num dia de copa');

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
