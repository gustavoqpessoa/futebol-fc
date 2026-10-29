// _test_mercado.mjs — vender jogador virou negociacao, e o elenco nao tem mais teto.
//
// O Gustavo vendeu o Kaue por 40 milhoes: "o Kaue foi para casa no caralho. Nao
// mostrou para que time ele foi. Como e que eu vendi um jogador por quarenta milhoes
// e ele foi para agente livre? Qual o sentido disso? Tem que chegar algumas proposta
// pra mim poder analisar."
//
// Era isso mesmo: a venda pegava o primeiro clube com vaga e, se nao achasse, jogava
// o cara no mercado de agentes livres com o dinheiro entrando igual.
//
// E sobre o elenco: "a quantidade que voce quiser. Tem que ter um minimo: nove no
// banco e onze titulares, no minimo vinte, mas o teto e quantos voce quiser."
import fs from 'fs';
import { hydrateDataset } from '../src/career/database.js';
import { CareerManager } from '../src/career/careerManager.js';

const cru = fs.readFileSync('./public/players.json', 'utf8');
const ds = hydrateDataset(JSON.parse(cru));
let falhas = 0;
const ok = (c, m) => { if (!c) { console.log('  XX  ' + m); falhas++; } };
const M = (v) => '€ ' + (v / 1e6).toFixed(1) + 'M';

// Cada bloco recebe um mundo NOVO. Compartilhando o mesmo dataset, o primeiro teste
// (que vende ate o piso) deixava o Corinthians com 20 jogadores e os testes seguintes
// falhavam com "elenco minimo" — parecendo bug do jogo, quando era do teste.
const carreira = (nome) => {
  const d = hydrateDataset(JSON.parse(cru));
  const comp = d.competitions.find((c) => c.country === 'Brasil' && c.tier === 1);
  const cl = d.clubs.find((c) => c.name === nome && c.comp === comp.id);
  const m = new CareerManager(d);
  m.selectClub(cl.id);
  return m;
};

console.log('=== o elenco nao tem mais teto, tem piso ===');
{
  const m = carreira('Corinthians');
  const u = m.userClub();
  ok(CareerManager.MINIMO_ELENCO === 20, `o minimo e ${CareerManager.MINIMO_ELENCO}`);
  ok(u.squad.length > 20, `o elenco comeca com ${u.squad.length} jogadores`);
  let vendidos = 0;
  while (vendidos < 60) {
    const p = u.squad[u.squad.length - 1];
    const r = m.sellPlayer(p.id);
    if (!r.ok) break;
    vendidos++;
  }
  ok(u.squad.length === 20, `parou em ${u.squad.length} jogadores (o piso e 20)`);
  console.log(`  vendeu ate o piso: sobrou ${u.squad.length} (11 em campo e 9 no banco)`);
}

console.log('\n=== quem compra e um clube de verdade ===');
{
  const m = carreira('Corinthians');
  const u = m.userClub();
  const caros = u.squad.slice().sort((a, b) => b.valorMercado - a.valorMercado);
  let comProposta = 0;
  for (const p of caros.slice(0, 8)) {
    const props = m.propostasPor(p.id);
    if (props.length) comProposta++;
    for (const x of props) {
      ok(!!m.clubById(x.clubeId), `${x.clube}: proposta de um clube que nao existe`);
      ok(x.total > 0 && x.aVista > 0, `${x.clube}: proposta de valor zero`);
      ok(x.parcelas >= 1 && x.parcelas <= 5, `${x.clube}: ${x.parcelas} parcelas`);
      ok(Math.abs(x.aVista * x.parcelas - x.total) <= x.parcelas,
        `${x.clube}: ${x.parcelas}x ${M(x.aVista)} nao fecha com ${M(x.total)}`);
    }
  }
  ok(comProposta >= 6, `${comProposta} dos 8 jogadores mais caros receberam proposta`);
  console.log(`  ${comProposta} de 8 jogadores com proposta na mesa`);
}

console.log('\n=== a venda entrega o jogador ao comprador ===');
{
  const m = carreira('Corinthians');
  const u = m.userClub();
  const p = u.squad.slice().sort((a, b) => b.valorMercado - a.valorMercado)[0];
  const props = m.propostasPor(p.id);
  ok(props.length > 0, 'ha proposta pelo melhor jogador do elenco');
  if (props.length) {
    const escolhida = props[0];
    const caixaAntes = u.caixa;
    const r = m.aceitarPropostaDeVenda(p.id, escolhida.id);
    ok(r.ok, `a venda falhou: ${r.msg}`);
    ok(!u.squad.some((x) => x.id === p.id), 'o jogador saiu do seu elenco');
    const destino = m.clubById(escolhida.clubeId);
    ok((destino.squad || []).some((x) => x.nome === p.nome),
      `${p.nome} nao chegou ao ${escolhida.clube} — foi para o limbo, como antes`);
    ok(u.caixa === caixaAntes + escolhida.aVista,
      `o caixa subiu ${M(u.caixa - caixaAntes)}, a primeira parcela era ${M(escolhida.aVista)}`);
    if (escolhida.parcelas > 1) {
      ok((m.aReceber || []).length === escolhida.parcelas - 1,
        `${(m.aReceber || []).length} parcelas guardadas, esperava ${escolhida.parcelas - 1}`);
    }
    console.log(`  ${p.nome} -> ${escolhida.clube} por ${M(escolhida.total)} ${escolhida.rotulo}`);
  }
}

console.log('\n=== a parcela cai no caixa na virada da temporada ===');
{
  const m = carreira('Palmeiras');
  const u = m.userClub();
  const p = u.squad.slice().sort((a, b) => b.valorMercado - a.valorMercado)[0];
  const parcelada = m.propostasPor(p.id).find((x) => x.parcelas > 1);
  if (!parcelada) { console.log('  (nenhuma proposta parcelada nesta rodada)'); }
  else {
    m.aceitarPropostaDeVenda(p.id, parcelada.id);
    const guardadas = (m.aReceber || []).length;
    const caixaAntes = u.caixa;
    const s0 = m.season;
    let g = 0;
    while (g++ < 400 && m.season === s0) {
      if (m.isSeasonOver()) break;
      if (m.cupFinalPending) { m.simulateCupFinal(m.cupFinalPending); continue; }
      m.simulateUserResult();
    }
    ok((m.aReceber || []).length < guardadas, 'nenhuma parcela venceu na virada da temporada');
    ok(u.caixa !== caixaAntes, 'o caixa nao mudou na virada');
    console.log(`  ${guardadas} parcelas guardadas, ${(m.aReceber || []).length} ainda a receber`);
  }
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
