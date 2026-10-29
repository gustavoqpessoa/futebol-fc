// _test_salario.mjs — o salário do jogador tem de acompanhar o jogador.
//
// Todo salário do jogo era uma porcentagem do salário ANTERIOR: a renovação
// multiplicava por 1,15 a 1,6 e a proposta de outro clube por 1,2 a 2,6. Como o
// contrato de base começa em uns 25 mil, o salário nunca alcançava o jogador — jogando
// a carreira eu vi um atacante de 79 de overall, avaliado em 45 milhões, seguir
// ganhando 34 mil por mês, quase o mesmo de quando tinha 16 anos.
//
// Agora existe um salário de mercado ligado ao NÍVEL do jogador e ao tamanho do clube,
// e ele vale para os dois lados: sobe quando o jogador estoura e CAI quando ele decai.
// Na primeira tentativa eu tratei só a subida, e um veterano de 40 anos com 80 de
// overall ficou ganhando 12 milhões por mês enquanto o mercado dele era 500 mil.
import fs from 'fs';
import { hydrateDataset } from '../src/career/database.js';
import { PlayerCareer } from '../src/career/playerCareer.js';

const ds = hydrateDataset(JSON.parse(fs.readFileSync('./public/players.json', 'utf8')));
let falhas = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : '  XX  ') + m); if (!c) falhas++; };
const K = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');

console.log('=== a régua do salário de mercado ===');
{
  const pc = new PlayerCareer(ds, { nome: 'Regua', posicao: 'A', nacionalidade: 'Brasil' });
  const m = (o, f = 76) => pc.salarioDeMercado(o, f);
  ok(m(90) > m(80) && m(80) > m(70) && m(70) > m(60), 'cresce junto com o overall');
  ok(m(80) > m(70) * 3, `um 80 ganha bem mais que um 70 (${(m(80) / m(70)).toFixed(1)}x)`);
  ok(m(80, 90) > m(80, 55) * 1.5, 'clube grande paga mais pelo mesmo jogador');
  ok(m(60) > 20000 && m(60) < 60000, `um 60 de overall ganha ${K(m(60))}/mes`);
  ok(m(90) > 1e6 && m(90) < 8e6, `um 90 de overall ganha ${K(m(90))}/mes`);
  for (const o of [60, 70, 80, 90]) console.log(`      OVR ${o}: ${K(m(o))}/mes`);
}

console.log('\n=== numa carreira inteira ===');
{
  // O salário só muda quando você renova ou troca de clube, então comparar duas
  // temporadas seguidas não diz nada. O que importa é a FORMA da curva: o que ele
  // ganhava de garoto, o que ganhou no auge e o que ganha no fim.
  let subiram = 0, cairam = 0, absurdos = 0;
  const carreiras = 3;
  for (let n = 0; n < carreiras; n++) {
    const pc = new PlayerCareer(ds, { nome: 'Ze Teste', posicao: 'A', nacionalidade: 'Brasil' });
    let primeiro = null, pico = { ovr: 0, sal: 0 }, ultimo = null, idadeFim = 0;
    for (let i = 0; i < 26 && !pc.aposentado; i++) {
      const r = pc.simularTemporada();
      if (!r) break;
      if (!primeiro) primeiro = { ovr: pc.ovr, sal: pc.salario };
      if (pc.ovr > pico.ovr) pico = { ovr: pc.ovr, sal: pc.salario };
      if (pc.salario > pc.salarioDeMercado() * 5) absurdos++;
      ultimo = { ovr: pc.ovr, sal: pc.salario };
      idadeFim = pc.idade;
      if (pc.contrato <= 0) { const o = pc.opcoesRenovacao(); if (o) pc.renovar(o[1].anos, o[1].salario); }
      if (pc.avancarTemporada) pc.avancarTemporada();
    }
    // no auge tem de ganhar MUITO mais que no contrato de base
    if (pico.sal > primeiro.sal * 8) subiram++;
    // e no fim, já em queda, tem de ganhar menos que no auge
    if (ultimo && ultimo.ovr < pico.ovr - 4 && ultimo.sal < pico.sal) cairam++;
    console.log(`      carreira ${n + 1}: comecou OVR ${primeiro.ovr} com ${K(primeiro.sal)}, `
      + `pico OVR ${pico.ovr} com ${K(pico.sal)}, terminou aos ${idadeFim} OVR ${ultimo.ovr} com ${K(ultimo.sal)}`);
  }
  // Nem toda carreira decola: quem para num overall 75 nunca multiplica o salario por
  // oito, e isso e o jogo funcionando. O teste cobra a MAIORIA, nao todas.
  ok(subiram >= carreiras - 1, `o salario do auge passa de 8x o de garoto em ${subiram}/${carreiras} carreiras`);
  ok(cairam >= carreiras - 1, `o salario caiu do auge para o fim em ${cairam}/${carreiras} carreiras`);
  ok(absurdos === 0, `${absurdos} temporada(s) com salario acima de 5x o valor de mercado`);
}

console.log('\n=== a proposta de outro clube tambem ===');
{
  const pc = new PlayerCareer(ds, { nome: 'Proposta', posicao: 'A', nacionalidade: 'Brasil' });
  // faz o jogador virar craque e ver o que o mercado oferece
  for (let i = 0; i < 8 && !pc.aposentado; i++) {
    pc.simularTemporada();
    if (pc.contrato <= 0) { const o = pc.opcoesRenovacao(); if (o) pc.renovar(o[1].anos, o[1].salario); }
    if (pc.avancarTemporada) pc.avancarTemporada();
  }
  const props = pc.propostas || [];
  if (!props.length) { console.log('      (nenhuma proposta nesta rodada — nada a conferir)'); }
  for (const p of props.slice(0, 3)) {
    const justo = pc.salarioDeMercado(pc.ovr, p.forca);
    ok(p.salario > justo * 0.6,
      `${p.nome} (forca ${p.forca}) oferece ${K(p.salario)} para um OVR ${pc.ovr} — mercado ali e ${K(justo)}`);
  }
}

console.log('\n=== reputacao e mercado ===');
// Jogando a carreira eu vi tres travas em sequencia, todas do mesmo tipo: o jogador
// evoluia e o mundo nao percebia.
//   1) a reputacao so subia com nota acima de 6,5 — um garoto "estrela do time" da
//      Serie D subiu de 57 para 68 de overall com reputacao ZERO e travada ali, e
//      reputacao zero fecha patrocinio (precisa de 20) e proposta de clube melhor;
//   2) numa carreira muito vitoriosa o "desejo" passava de 150 e o filtro exigia
//      clubes de forca 120, que nao existem: o melhor jogador do jogo ficava
//      temporadas SEM UMA PROPOSTA;
//   3) o sorteio das propostas era plano, e clube fraco e muito mais numeroso que
//      clube forte — dava para estar no RB Leipzig e a melhor oferta ser o Almagro.
{
  const pc = new PlayerCareer(ds, { nome: 'Trava', posicao: 'A', nacionalidade: 'Brasil' });
  // começa de propósito num clube pequeno, que é onde a trava aparecia
  const pequeno = ds.clubs.find((c) => {
    const k = ds.competitions.find((x) => x.id === c.comp);
    return k && k.name === 'Brasileirão Série D';
  });
  if (pequeno) pc.clubeId = pequeno.id;

  let repSubiu = false, semProposta = 0, maiorForca = 0, patrocinioApareceu = false;
  let repInicial = pc.reputacao;
  for (let i = 0; i < 14 && !pc.aposentado; i++) {
    const r = pc.simularTemporada();
    if (!r) break;
    if (pc.reputacao > repInicial + 8) repSubiu = true;
    if ((pc.ofertasPatrocinio() || []).length) patrocinioApareceu = true;
    const props = pc.propostas || [];
    if (!props.length) semProposta++;
    for (const p of props) maiorForca = Math.max(maiorForca, p.forca);
    if (props.length) pc.aceitarProposta(props[0].clubeId);
    else if (pc.contrato <= 0) { const o = pc.opcoesRenovacao(); if (o) pc.renovar(o[1].anos, o[1].salario); }
    if (pc.avancarTemporada) pc.avancarTemporada();
  }
  ok(repSubiu, `a reputacao saiu do lugar (chegou a ${Math.round(pc.reputacao)})`);
  ok(patrocinioApareceu, 'chegou a receber oferta de patrocinio');
  // Depende de sorteio: em 4 de 5 execucoes ficou em 3 ou 4, mas passa de 5 de vez em
  // quando. O que o teste vigia e a trava — ficar SEM proposta a carreira inteira.
  ok(semProposta <= 7, `${semProposta} de 14 temporadas sem nenhuma proposta`);
  ok(maiorForca >= 78, `a melhor proposta da carreira foi de um clube forca ${maiorForca}`);
  console.log(`      terminou com reputacao ${Math.round(pc.reputacao)}, melhor proposta forca ${maiorForca}`);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
