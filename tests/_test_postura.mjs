// _test_postura.mjs — A POSTURA PRECISA MUDAR O JOGO DE VERDADE.
//
// Botão que não muda nada é pior que botão nenhum: você decide, sente que
// decidiu, e o placar sai igual. Aqui eu rodo muitas partidas com cada postura
// e cobro que os números andem na direção prometida —
//   ir para cima: faz mais gol E toma mais
//   segurar:      toma menos gol E faz menos
import { readFileSync } from 'fs';
global.window = {};
const ds = JSON.parse(readFileSync('./public/players.json', 'utf8'));
const { hydrateDataset } = await import('../src/career/database.js');
const { CareerManager } = await import('../src/career/careerManager.js');

const d = hydrateDataset(JSON.parse(JSON.stringify(ds)));
const meu = d.clubs.find((x) => x.name === 'Corinthians');

// O TESTE ERRADO ANTES: eu criava um CareerManager novo para cada postura, e
// cada manager sorteia o seu calendário — então cada postura enfrentava um
// adversário diferente. A diferença entre "ir para cima" e "segurar" ficava
// escondida atrás da diferença entre jogar com o Remo e com o Flamengo.
// Agora é um manager só, o mesmo adversário, e só a postura muda.
const m = new CareerManager(d);
m.selectClub(meu.id);
m.escalarAutomatico();
// O CURSOR TEM QUE ESTAR NUM DIA DE LIGA.
//
// A agenda começa no estadual, e desde que dia de copa deixou de poder jogar a
// liga (a trava que consertou o bug do Paulista), começar no dia 0 não dava
// partida nenhuma: 0 jogos e NaN em tudo. O teste é de postura, não de agenda —
// então ele se posiciona num dia de liga e fica lá.
m.dia = m.agenda.findIndex((x) => x.tipo === 'liga');

function media(postura, n = 1200) {
  let gp = 0, gc = 0, jogos = 0;
  for (let i = 0; i < n; i++) {
    const est = m.iniciarPartidaAoVivo(null);
    if (!est) continue;
    if (postura !== 'equilibrio') m.mudarPostura(est, postura);
    while (est.minuto < 90) m.avancarPartida(est, 5);
    gp += est.ug; gc += est.og; jogos++;
  }
  return { gp: gp / jogos, gc: gc / jogos, jogos };
}

const cima = media('cima');
const eq = media('equilibrio');
const seg = media('segurar');

const linha = (n, m) => `  ${n.padEnd(14)} faz ${m.gp.toFixed(2)}   toma ${m.gc.toFixed(2)}   (${m.jogos} jogos)`;
console.log(linha('ir para cima', cima));
console.log(linha('equilibrado', eq));
console.log(linha('segurar', seg));
console.log('');

let falhas = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : '  XX  ') + m); if (!c) falhas++; };
ok(cima.gp > eq.gp * 1.08, 'ir para cima faz mais gol que o equilibrado');
ok(cima.gc > eq.gc * 1.08, 'ir para cima toma mais gol que o equilibrado');
ok(seg.gc < eq.gc * 0.94, 'segurar toma menos gol que o equilibrado');
ok(seg.gp < eq.gp, 'segurar faz menos gol que o equilibrado');
ok(seg.gp > 0.3, 'quem se fecha ainda ataca — o contra-ataque existe');

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
