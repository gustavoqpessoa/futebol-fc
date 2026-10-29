// _test_propostas.mjs — O MERCADO TEM DOIS LADOS.
//
// Até agora você comprava do mundo inteiro e ninguém nunca vinha atrás do seu
// craque. Faltava a parte que dá peso a ter um bom jogador: segurar quem todo
// mundo quer, ou vender bem e reconstruir. Aqui eu cobro que a proposta faça
// sentido (quem oferece, por quem, por quanto) e que aceitar/recusar tenha
// consequência de verdade.
import { readFileSync } from 'fs';
global.window = {};
const ds = JSON.parse(readFileSync('./public/players.json', 'utf8'));
const { hydrateDataset, avgForca, bestEleven } = await import('../src/career/database.js');
const { CareerManager } = await import('../src/career/careerManager.js');

let falhas = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : '  XX  ') + m); if (!c) falhas++; };

function jogo(nome) {
  const d = hydrateDataset(JSON.parse(JSON.stringify(ds)));
  const cl = d.clubs.find((x) => x.name === nome);
  const m = new CareerManager(d);
  m.selectClub(cl.id);
  m.escalarAutomatico();
  return m;
}

// ---- quem faz proposta, e por quem ----
const m = jogo('Corinthians');
const minha = avgForca(bestEleven(m.userClub()));
let todas = [];
for (let i = 0; i < 25; i++) todas = todas.concat(m.gerarPropostasPorMeusJogadores(3));

ok(todas.length > 0, `chegam propostas (${todas.length} em 25 janelas)`);
ok(todas.every((p) => avgForca(bestEleven(m.clubById(p.clubeId))) > minha),
  'só clube mais forte que o seu faz proposta');
ok(todas.every((p) => p.forca >= 68), 'ninguém faz proposta pelo terceiro goleiro');
ok(todas.every((p) => m.userClub().squad.some((x) => x.id === p.jogadorId)),
  'a proposta é sempre por um jogador que é seu');
const alta = todas.filter((p) => p.valor > p.justo).length;
ok(alta > todas.length * 0.3, 'boa parte das propostas vem acima do valor de mercado');

// ---- aceitar ----
const m2 = jogo('Corinthians');
const prop = m2.gerarPropostasPorMeusJogadores(6)[0] || { jogadorId: m2.userClub().squad[0].id };
if (prop.valor) {
  const caixaAntes = m2.userClub().caixa;
  const elencoAntes = m2.userClub().squad.length;
  const compradorAntes = m2.clubById(prop.clubeId).squad.length;
  const r = m2.aceitarPropostaPorMeuJogador(prop);
  ok(r.ok, 'a venda é aceita');
  ok(m2.userClub().caixa === caixaAntes + prop.valor, 'o dinheiro entra no caixa, no valor exato');
  ok(m2.userClub().squad.length === elencoAntes - 1, 'o jogador sai do seu elenco');
  ok(m2.clubById(prop.clubeId).squad.length === compradorAntes + 1, 'e chega no elenco de quem comprou');
  ok(!(m2.lineupIds || []).includes(prop.jogadorId), 'o vendido sai da sua escalação');
} else {
  console.log('  --  nenhuma proposta nesta rodada para testar a venda');
}

// ---- recusar uma oferta alta tem preço ----
const m3 = jogo('Corinthians');
m3.moralElenco = 60;
m3.recusarPropostaPorMeuJogador({ nome: 'Fulano', clube: 'Real Madrid', valor: 90000000, generosa: true });
ok(m3.moralElenco < 60, 'recusar uma proposta muito alta incomoda o vestiário');
const m4 = jogo('Corinthians');
m4.moralElenco = 60;
m4.recusarPropostaPorMeuJogador({ nome: 'Fulano', clube: 'Remo', valor: 100, generosa: false });
ok(m4.moralElenco === 60, 'recusar proposta baixa não mexe com ninguém');

// ---- elenco curto não vende ----
const m5 = jogo('Corinthians');
const p5 = m5.gerarPropostasPorMeusJogadores(6)[0];
if (p5) {
  m5.userClub().squad = m5.userClub().squad.slice(0, 18);
  if (!m5.userClub().squad.some((x) => x.id === p5.jogadorId)) m5.userClub().squad[0].id = p5.jogadorId;
  const r5 = m5.aceitarPropostaPorMeuJogador(p5);
  ok(!r5.ok, 'com o elenco no limite, a venda é barrada');
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
