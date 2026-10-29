// _test_diretoria.mjs — A DIRETORIA PRECISA SER DURA, NÃO INJUSTA.
//
// A paciência da diretoria só vale a pena se for calibrada: demitir quem vai
// mal tem que acontecer de verdade, e quem cumpre a meta NUNCA pode ser
// mandado embora no meio do ano. Aqui eu rodo temporadas inteiras com times de
// cima e de baixo e meço o que acontece.
import { readFileSync } from 'fs';
global.window = {};
const ds = JSON.parse(readFileSync('./public/players.json', 'utf8'));
const { hydrateDataset } = await import('../src/career/database.js');
const { CareerManager } = await import('../src/career/careerManager.js');

function temporada(nomeClube) {
  const d = hydrateDataset(JSON.parse(JSON.stringify(ds)));
  const cl = d.clubs.find((x) => x.name === nomeClube);
  const m = new CareerManager(d);
  m.selectClub(cl.id);
  m.escalarAutomatico();
  let demitidoNa = null;
  // a temporada tem dias de liga e dias de copa — anda pela AGENDA, como o jogo
  const dias = m.agenda ? m.agenda.length : m.totalRounds();
  for (let r = 0; r < dias; r++) {
    m.simulateUserResult();
    if (m.pendingBoard && m.pendingBoard.fired && m.pendingBoard.noMeio) {
      demitidoNa = m.pendingBoard.rodada; break;
    }
  }
  // a posição no fim do loop é a do DIA em que parou: quem foi demitido parou no
  // meio da temporada, e misturar as duas coisas numa média só mente
  return { demitidoNa, pos: m.userPosition(), alvo: (m.objective || {}).target,
    paciencia: Math.round(m.paciencia) };
}

// a conta é cara (temporada inteira, dia a dia), então o lote é pequeno; o que
// importa aqui é a direção, não a terceira casa decimal
function lote(clube, n = 8) {
  let demitidos = 0, somaFim = 0, nFim = 0, injusto = 0, somaRodada = 0;
  for (let i = 0; i < n; i++) {
    const r = temporada(clube);
    if (r.demitidoNa) {
      demitidos++;
      somaRodada += r.demitidoNa;
      if (r.pos <= r.alvo) injusto++;   // demitido dentro da meta seria injusto
    } else { somaFim += r.pos; nFim++; }
  }
  return { demitidos, n, injusto,
    posFinal: nFim ? somaFim / nFim : null,
    rodadaMedia: demitidos ? somaRodada / demitidos : null };
}

// POR QUE ESTES TRÊS. Medi a força de cada um na própria liga: o Palmeiras é o
// 2º mais forte (meta top 4), o Bahia está no meio (meta top 7), e a Chapecoense
// é o 20º de 20, com meta de escapar do rebaixamento.
//
// A primeira versão deste teste cobrava que a Chapecoense às vezes segurasse o
// emprego. Isso é cobrar o impossível: com escalação automática e zero gestão, o
// pior time da liga termina na zona e o técnico cai — e está certo que caia. Quem
// tem que conseguir segurar é o time do meio.
const forte = lote('Palmeiras');
const medio = lote('Bahia');
const fraco = lote('Chapecoense');

const conta = (nome, r) => `  ${nome.padEnd(13)}demitido em ${r.demitidos}/${r.n}` +
  (r.rodadaMedia ? ` (na ${r.rodadaMedia.toFixed(0)}ª rodada, em média)` : '') +
  (r.posFinal ? ` · quando segura o emprego, termina em ${r.posFinal.toFixed(1)}º` : '');
console.log(conta('Palmeiras', forte));
console.log(conta('Bahia', medio));
console.log(conta('Chapecoense', fraco));
console.log('');

let falhas = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : '  XX  ') + m); if (!c) falhas++; };
ok(forte.injusto === 0 && medio.injusto === 0 && fraco.injusto === 0,
  'ninguém foi demitido estando dentro da meta');
// ESTE TESTE É ESTATÍSTICO, e por isso o limite tem folga.
// Com 8 temporadas sorteadas e uma taxa real perto de 25%, exigir "no máximo 35%"
// falha por azar mais ou menos uma vez a cada nove execuções — e teste que acusa
// sem nada ter mudado é teste que a gente aprende a ignorar. Em 50% o alarme
// falso cai para ~3% e ainda pega de longe o que importa: uma diretoria que
// demite o técnico do time grande na maioria das temporadas.
ok(forte.demitidos <= forte.n * 0.5, 'time grande raramente é demitido no meio do ano');
ok(medio.demitidos < medio.n, 'time do meio consegue segurar o emprego');
ok(fraco.demitidos + forte.demitidos + medio.demitidos > 0,
  'a demissão no meio do ano existe de verdade');
ok(!fraco.rodadaMedia || fraco.rodadaMedia > 12,
  'a demissão nunca vem no começo da temporada, quando a tabela ainda mente');

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
