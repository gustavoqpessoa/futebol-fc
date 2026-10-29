// dilemas.js — as decisões da carreira de jogador.
//
// O Gustavo: "as decisões é sempre as mesmas toda temporada... um empresário
// oferece uma consultoria de imagem, tá, beleza, mas esse empresário fez o quê na
// minha vida? Não mudou nada, essa decisão não mudou nada na carreira. Eu dispensei
// e não teve nenhuma consequência."
//
// Eram oito textos fixos e genéricos. Duas coisas mudam aqui:
//
// 1. CONTEXTO. O dilema fala do SEU mundo: o nome do seu clube, o companheiro que
//    disputa a sua posição, o rival da sua cidade, a competição que você está
//    jogando, a sua idade e o seu papel no elenco. O mesmo molde vira dezenas de
//    situações diferentes porque os dados são diferentes.
//
// 2. ECO. Escolha que não volta não é decisão, é enfeite. Uma escolha pode deixar um
//    ECO: algo que acontece depois, uma, duas ou três temporadas à frente, e que o
//    jogo te lembra de onde veio. O empresário que você contratou aparece com uma
//    proposta; o jornalista que você humilhou volta a te atacar; o garoto que você
//    apadrinhou vira titular e te agradece.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Situação do jogador, para escolher que dilemas fazem sentido agora. */
export function contexto(pc) {
  const clube = pc.clube ? pc.clube() : null;
  const comp = pc.compDoClube ? pc.compDoClube() : null;
  const elenco = clube ? (clube.squad || []) : [];
  const mesmaPosicao = elenco
    .filter((p) => (p.sub || p.posicao) === pc.sub && p.nome !== pc.nome)
    .sort((a, b) => b.forca - a.forca);
  const veteranos = elenco.filter((p) => p.idade >= 31).sort((a, b) => b.forca - a.forca);
  const garotos = elenco.filter((p) => p.idade <= 19).sort((a, b) => b.potencial - a.potencial);
  const craques = elenco.slice().sort((a, b) => b.forca - a.forca);
  return {
    pc,
    clube: clube ? clube.name : 'seu clube',
    liga: comp ? comp.name : 'o campeonato',
    pais: comp ? comp.country : (pc.nacionalidade || 'Brasil'),
    concorrente: mesmaPosicao[0] ? mesmaPosicao[0].nome : null,
    veterano: veteranos[0] ? veteranos[0].nome : null,
    garoto: garotos[0] ? garotos[0].nome : null,
    craque: craques[0] && craques[0].nome !== pc.nome ? craques[0].nome : (craques[1] ? craques[1].nome : null),
    idade: pc.idade, papel: pc.papel ? pc.papel() : 'titular',
    ovr: pc.ovr, reputacao: pc.reputacao, moral: pc.moral,
    dinheiro: pc.dinheiro, temporada: pc.ano,
  };
}

// Cada dilema: quando pode aparecer (`quando`), o texto (função do contexto) e as
// opções. `eco` marca uma consequência que volta no futuro.
const CATALOGO = [
  // ---------------------------------------------------------------- elenco
  { id: 'concorrente-chegou', peso: 3,
    quando: (c) => c.concorrente,
    txt: (c) => `O ${c.clube} contratou ${c.concorrente} para a sua posição. O técnico avisou que vai revezar.`,
    ops: (c) => [
      { txt: 'Encaro como desafio e treino dobrado', ef: { desempenho: +8, forma: -6, moral: -3 } },
      { txt: 'Converso com o técnico e cobro meu espaço', ef: { tecnico: -6, moral: +5, rep: +2 } },
      { txt: 'Aceito o revezamento sem reclamar', ef: { tecnico: +10, moral: -5 },
        eco: { em: 1, tipo: 'tecnico-confia', txt: `O técnico não esqueceu que você aceitou dividir posição com ${c.concorrente}.` } },
    ] },
  { id: 'veterano-conselho', peso: 2,
    quando: (c) => c.veterano && c.idade <= 23,
    txt: (c) => `${c.veterano}, o mais velho do elenco, te chama para um papo sobre carreira.`,
    ops: () => [
      { txt: 'Escuto tudo e anoto', ef: { desempenho: +6, moral: +4 },
        eco: { em: 2, tipo: 'mentor', txt: 'O conselho que você ouviu do veterano começou a fazer sentido.' } },
      { txt: 'Agradeço, mas sigo meu caminho', ef: { moral: +2, rep: +1 } },
    ] },
  { id: 'apadrinhar-garoto', peso: 2,
    quando: (c) => c.garoto && c.idade >= 26,
    txt: (c) => `${c.garoto}, garoto da base, pede para treinar com você depois do expediente.`,
    ops: (c) => [
      { txt: 'Levo ele comigo todo dia', ef: { forma: -4, rep: +5, moral: +5 },
        eco: { em: 2, tipo: 'afilhado', txt: `${c.garoto} virou titular e disse à imprensa que aprendeu tudo com você.` } },
      { txt: 'Não tenho tempo agora', ef: { forma: +5, rep: -2 } },
    ] },
  { id: 'briga-vestiario', peso: 2,
    quando: (c) => c.craque && c.moral < 60,
    txt: (c) => `O vestiário rachou depois de uma sequência ruim. ${c.craque} e o técnico se estranharam.`,
    ops: (c) => [
      { txt: 'Fico do lado do elenco', ef: { tecnico: -12, moral: +8, rep: +3 } },
      { txt: 'Fico do lado do técnico', ef: { tecnico: +14, moral: -6 },
        eco: { em: 1, tipo: 'vestiario-marcado', txt: 'Parte do elenco ainda te vê como o jogador do técnico.' } },
      { txt: 'Não me meto', ef: { moral: -2 } },
    ] },

  // ---------------------------------------------------------------- imprensa
  { id: 'jornalista-provoca', peso: 3,
    quando: () => true,
    txt: (c) => `Um comentarista disse na TV que você só aparece contra os pequenos do ${c.liga}.`,
    ops: () => [
      { txt: 'Respondo dentro de campo', ef: { desempenho: +10, moral: -2 },
        eco: { em: 1, tipo: 'cobranca', txt: 'A imprensa está de olho para ver se você repete o que fez depois da provocação.' } },
      { txt: 'Rebato na entrevista', ef: { rep: +4, moral: -5 },
        eco: { em: 1, tipo: 'inimigo-imprensa', txt: 'Aquele comentarista virou seu desafeto e não perde uma chance de te alfinetar.' } },
      { txt: 'Ignoro', ef: { moral: +2 } },
    ] },
  { id: 'documentario', peso: 2,
    quando: (c) => c.reputacao >= 55,
    txt: (c) => `Uma produtora quer fazer um documentário sobre a sua trajetória até o ${c.clube}.`,
    ops: () => [
      { txt: 'Topo, com acesso total', ef: { rep: +9, dinheiro: +1200000, forma: -5 },
        eco: { em: 1, tipo: 'exposicao', txt: 'O documentário estreou e a sua imagem explodiu — junto com a cobrança.' } },
      { txt: 'Topo, mas só depois da temporada', ef: { rep: +4, dinheiro: +600000 } },
      { txt: 'Recuso, quero foco', ef: { desempenho: +6 } },
    ] },
  { id: 'polemica-rede', peso: 2,
    quando: () => true,
    txt: () => 'Uma postagem antiga sua viralizou e virou assunto ruim.',
    ops: () => [
      { txt: 'Peço desculpas publicamente', ef: { rep: -2, moral: +3 } },
      { txt: 'Apago e não comento', ef: { rep: -5 } },
      { txt: 'Explico o contexto numa entrevista longa', ef: { rep: +3, moral: -4 } },
    ] },

  // ---------------------------------------------------------------- dinheiro
  { id: 'empresario-imagem', peso: 3,
    quando: (c) => c.dinheiro > 800000,
    txt: () => 'Um empresário oferece cuidar da sua imagem. Cobra caro e promete abrir portas.',
    ops: () => [
      { txt: 'Contrato (R$ 2 mi)', ef: { dinheiro: -2000000, rep: +6 },
        eco: { em: 1, tipo: 'empresario', txt: 'O empresário que você contratou fechou um patrocínio bem acima do seu nível.' } },
      { txt: 'Contrato o mais barato (R$ 500 mil)', ef: { dinheiro: -500000, rep: +2 } },
      { txt: 'Dispenso, cuido disso sozinho', ef: { moral: +2 },
        eco: { em: 2, tipo: 'sem-empresario', txt: 'Sem ninguém cuidando da sua imagem, você ficou de fora de uma campanha grande.' } },
    ] },
  { id: 'familia-casa', peso: 2,
    quando: (c) => c.dinheiro > 3000000,
    txt: () => 'Sua família pede ajuda para comprar uma casa.',
    ops: () => [
      { txt: 'Compro à vista (R$ 3 mi)', ef: { dinheiro: -3000000, moral: +12 },
        eco: { em: 1, tipo: 'familia-perto', txt: 'Com a família por perto e tranquila, a sua cabeça está em outro lugar.' } },
      { txt: 'Ajudo com uma parte (R$ 900 mil)', ef: { dinheiro: -900000, moral: +5 } },
      { txt: 'Explico que ainda não é hora', ef: { moral: -7 } },
    ] },
  { id: 'investimento', peso: 2,
    quando: (c) => c.dinheiro > 5000000,
    txt: () => 'Um ex-jogador te chama para investir num negócio fora do futebol.',
    ops: () => [
      { txt: 'Entro com tudo (R$ 5 mi)', ef: { dinheiro: -5000000 },
        eco: { em: 2, tipo: 'investimento', txt: 'Aquele investimento fora do futebol deu retorno.' } },
      { txt: 'Entro com pouco (R$ 1 mi)', ef: { dinheiro: -1000000 },
        eco: { em: 2, tipo: 'investimento-pequeno', txt: 'O negócio em que você pôs um pouco de dinheiro cresceu.' } },
      { txt: 'Não misturo futebol com negócio', ef: { desempenho: +3 } },
    ] },

  // ---------------------------------------------------------------- corpo
  { id: 'dor-joelho', peso: 3,
    quando: () => true,
    txt: (c) => `O técnico do ${c.clube} quer te escalar mesmo com uma dor no joelho.`,
    ops: () => [
      { txt: 'Jogo, o time precisa de mim', ef: { moral: +6, lesaoRisco: 0.35, rep: +2, tecnico: +12 } },
      { txt: 'Peço para poupar', ef: { moral: -4, forma: +11, tecnico: -8 } },
    ] },
  { id: 'preparador-particular', peso: 2,
    quando: (c) => c.dinheiro > 1500000 && c.idade >= 24,
    txt: () => 'Um preparador físico particular se oferece para cuidar só de você.',
    ops: () => [
      { txt: 'Contrato (R$ 1,5 mi por ano)', ef: { dinheiro: -1500000, forma: +14 },
        eco: { em: 2, tipo: 'preparador', txt: 'O trabalho com o preparador particular está segurando o seu corpo.' } },
      { txt: 'Fico com o departamento do clube', ef: {} },
    ] },
  { id: 'festa', peso: 2,
    quando: (c) => c.idade <= 26,
    txt: () => 'Convite para uma festa grande na véspera de um jogo importante.',
    ops: () => [
      { txt: 'Vou, mereço', ef: { moral: +8, forma: -12, rep: -4 },
        eco: { em: 1, tipo: 'fama-festa', txt: 'Fotos daquela noite ainda voltam quando você joga mal.' } },
      { txt: 'Passo rápido e volto cedo', ef: { moral: +3, forma: -3 } },
      { txt: 'Fico em casa', ef: { forma: +6, moral: -2 } },
    ] },

  // ---------------------------------------------------------------- carreira
  { id: 'proposta-exterior', peso: 3,
    quando: (c) => c.pais === 'Brasil' && c.ovr >= 72 && c.idade <= 27,
    txt: () => 'Um clube da Europa sondou você, mas a proposta é para o ano que vem.',
    ops: (c) => [
      { txt: 'Aviso o clube que quero sair', ef: { tecnico: -10, moral: +4, rep: +3 },
        eco: { em: 1, tipo: 'quer-sair', txt: `A diretoria do ${c.clube} sabe que você quer sair e já procura substituto.` } },
      { txt: 'Guardo comigo e sigo jogando', ef: { desempenho: +7 },
        eco: { em: 1, tipo: 'sondagem', txt: 'Aquele clube europeu continua acompanhando você de perto.' } },
    ] },
  { id: 'braçadeira', peso: 2,
    quando: (c) => c.idade >= 27 && (c.papel === 'estrela' || c.papel === 'titular'),
    txt: (c) => `O elenco do ${c.clube} discute quem deve usar a braçadeira.`,
    ops: () => [
      { txt: 'Me candidato', ef: { rep: +7, moral: +6, desempenho: -3 },
        eco: { em: 1, tipo: 'capitao', txt: 'Como capitão, você passou a responder por tudo que acontece no time.' } },
      { txt: 'Apoio outro nome', ef: { moral: +4, tecnico: +5 } },
    ] },
  { id: 'renovacao', peso: 3,
    quando: (c) => c.idade >= 22,
    txt: (c) => `O ${c.clube} quer renovar o seu contrato por mais tempo, com salário menor no começo.`,
    ops: (c) => [
      { txt: 'Assino: aqui é minha casa', ef: { moral: +9, rep: +3 },
        eco: { em: 2, tipo: 'idolo', txt: `A torcida do ${c.clube} passou a te tratar como ídolo da casa.` } },
      { txt: 'Só assino pelo que eu valho', ef: { tecnico: -5, moral: -3 },
        eco: { em: 1, tipo: 'impasse', txt: 'O impasse do contrato azedou a relação com a diretoria.' } },
      { txt: 'Não renovo, quero sair no fim', ef: { moral: -5, rep: -2 } },
    ] },
  { id: 'numero-camisa', peso: 1,
    quando: (c) => c.idade >= 20 && c.reputacao >= 45,
    txt: (c) => `A camisa 10 do ${c.clube} vagou. Vários jogadores querem.`,
    ops: () => [
      { txt: 'Peço para mim', ef: { rep: +6, moral: +5 },
        eco: { em: 1, tipo: 'peso-da-10', txt: 'Vestir a 10 aumentou a cobrança em cima de você.' } },
      { txt: 'Deixo para outro', ef: { moral: -2, tecnico: +3 } },
    ] },
  { id: 'selecao-recusa', peso: 2,
    quando: (c) => c.reputacao >= 60,
    txt: () => 'A seleção te convocou para uma data-Fifa em que você estava contando com descanso.',
    ops: () => [
      { txt: 'Vou, é a seleção', ef: { rep: +8, forma: -9, moral: +6 } },
      { txt: 'Peço dispensa por desgaste', ef: { forma: +10, rep: -7 },
        eco: { em: 1, tipo: 'selecao-magoada', txt: 'A comissão da seleção não gostou da sua dispensa e demorou a te chamar de volta.' } },
    ] },
  { id: 'torcida-cobra', peso: 2,
    quando: () => true,
    txt: (c) => `A torcida do ${c.clube} foi ao CT cobrar o elenco depois de três jogos sem vencer.`,
    ops: () => [
      { txt: 'Vou conversar de frente', ef: { rep: +5, moral: +5 },
        eco: { em: 1, tipo: 'peito-aberto', txt: 'A torcida lembra que você foi o único que deu a cara a bater.' } },
      { txt: 'Foco no trabalho, sem barulho', ef: { desempenho: +7 } },
    ] },
  { id: 'agente-troca', peso: 2,
    quando: (c) => c.idade >= 23,
    txt: () => 'Um agente maior quer te representar e promete um contrato bem melhor.',
    ops: () => [
      { txt: 'Troco de agente', ef: { rep: +3 },
        eco: { em: 1, tipo: 'agente-novo', txt: 'O agente novo colocou o seu nome em conversas que você nem imaginava.' } },
      { txt: 'Fico com quem me trouxe até aqui', ef: { moral: +6 } },
    ] },
];

/** Sorteia dilemas que fazem sentido para a situação de agora. */
export function sortearDilemas(pc, quantos = 2, jaVistos = []) {
  const c = contexto(pc);
  const vistoRecente = new Set(jaVistos.slice(-6));
  const elegiveis = CATALOGO.filter((d) => {
    try { return d.quando(c) && !vistoRecente.has(d.id); } catch { return false; }
  });
  if (!elegiveis.length) return [];
  const saco = [];
  elegiveis.forEach((d) => { for (let i = 0; i < (d.peso || 1); i++) saco.push(d); });
  const fora = [];
  const usados = new Set();
  while (fora.length < quantos && saco.length) {
    const d = saco[Math.floor(Math.random() * saco.length)];
    if (usados.has(d.id)) { if (usados.size >= elegiveis.length) break; continue; }
    usados.add(d.id);
    fora.push({ id: d.id, txt: d.txt(c), ops: d.ops(c) });
  }
  return fora;
}

/** Quantas situações diferentes o catálogo consegue montar. */
export function tamanhoDoCatalogo() { return CATALOGO.length; }
