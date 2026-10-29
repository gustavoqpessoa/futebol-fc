// playerCareer.js — MOTOR da Carreira de Jogador (inspirado no The Fenômeno).
//
// Você cria um garoto de 16 anos e vive a carreira dele por DECISÕES + simulação:
// treina, cumpre (ou não) o objetivo do clube, ganha prêmios, é convocado, assina
// patrocínio, troca de clube e um dia pendura as chuteiras — e aí recebe uma nota
// final e um tier, de "Amador" até "O Fenômeno".
//
// Este arquivo não desenha nada. Ele só responde perguntas e muda o estado; quem
// desenha é o playerCareerUI.js. Assim dá para testar a carreira inteira no terminal.

import { advanceWorld } from './evolution.js';
import { sortearDilemas } from './dilemas.js';
import { vagasDeAcesso } from './paises.js';
import { torneioDeSelecao } from './copas.js';

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const chance = (p) => Math.random() < p;
const esc0 = (t) => String(t);

// Nome de verdade das competições. "Copa Continental" não diz nada; quem joga na
// Espanha disputa a Champions, quem joga no Brasil disputa a Libertadores.
const CONTINENTAL = {
  Brasil: 'Copa Libertadores', Argentina: 'Copa Libertadores', Chile: 'Copa Libertadores',
  Colômbia: 'Copa Libertadores', Uruguai: 'Copa Libertadores', Peru: 'Copa Libertadores',
  Equador: 'Copa Libertadores', Paraguai: 'Copa Libertadores', Bolívia: 'Copa Libertadores',
  Venezuela: 'Copa Libertadores',
  México: 'Concacaf Champions Cup', 'Estados Unidos': 'Concacaf Champions Cup',
  Canadá: 'Concacaf Champions Cup',
  Japão: 'AFC Champions League', 'Coreia do Sul': 'AFC Champions League',
  China: 'AFC Champions League', 'Arábia Saudita': 'AFC Champions League',
  'Emirados Árabes Unidos': 'AFC Champions League', Índia: 'AFC Champions League',
  'África do Sul': 'CAF Champions League', Senegal: 'CAF Champions League',
  'Costa do Marfim': 'CAF Champions League',
  Austrália: 'AFC Champions League', 'Nova Zelândia': 'OFC Champions League',
};
const COPA_NACIONAL = {
  Brasil: 'Copa do Brasil', Inglaterra: 'FA Cup', Espanha: 'Copa del Rey',
  Alemanha: 'DFB-Pokal', Itália: 'Coppa Italia', França: 'Coupe de France',
  Portugal: 'Taça de Portugal', Holanda: 'KNVB Beker', Argentina: 'Copa Argentina',
};
const nomeDaCopaContinental = (pais) => CONTINENTAL[pais] || 'UEFA Champions League';
const nomeDaCopaNacional = (pais) => COPA_NACIONAL[pais] || `Copa ${pais}`;

// O torneio de seleções depende de onde você nasceu.
const SUL = ['Brasil', 'Argentina', 'Chile', 'Colômbia', 'Uruguai', 'Peru', 'Equador',
  'Paraguai', 'Bolívia', 'Venezuela'];
const NORTE = ['México', 'Estados Unidos', 'Canadá'];
const ASIA = ['Japão', 'Coreia do Sul', 'China', 'Arábia Saudita', 'Emirados Árabes Unidos', 'Índia'];
const AFRICA = ['Senegal', 'Costa do Marfim', 'África do Sul'];
function torneioContinentalDe(pais) {
  if (SUL.includes(pais)) return 'Copa América';
  if (NORTE.includes(pais)) return 'Copa Ouro';
  if (ASIA.includes(pais)) return 'Copa da Ásia';
  if (AFRICA.includes(pais)) return 'Copa Africana de Nações';
  if (pais === 'Austrália' || pais === 'Nova Zelândia') return 'Copa das Nações da OFC';
  return 'Eurocopa';
}

// ---------------------------------------------------------------- posições
// Posições jogáveis, com o detalhe que o futebol de verdade tem. O 'grupo' é o que
// o motor usa por dentro (G/Z/L/M/A); a sigla é o que você vê.
export const POSICOES = [
  { key: 'GOL', grupo: 'G', nome: 'Goleiro', desc: 'Goleiro' },
  { key: 'ZAG', grupo: 'Z', nome: 'Zagueiro', desc: 'Zagueiro' },
  { key: 'ALA', grupo: 'L', nome: 'Ala', desc: 'Lateral que sobe o campo todo' },
  { key: 'VOL', grupo: 'M', nome: 'Volante', desc: 'Primeiro homem do meio' },
  { key: 'MC', grupo: 'M', nome: 'Meio-campo', desc: 'Dono do meio' },
  { key: 'MEI', grupo: 'M', nome: 'Meia armador', desc: 'Quem cria as jogadas' },
  { key: 'PON', grupo: 'A', nome: 'Ponta', desc: 'Velocidade pelos lados' },
  { key: 'SA', grupo: 'A', nome: 'Segundo atacante', desc: 'Joga entre as linhas' },
  { key: 'ATA', grupo: 'A', nome: 'Atacante', desc: 'Centroavante' },
];
// Que numero um garoto de 16 anos consegue no primeiro contrato.
//
// O Gustavo: "o numero da camisa teria que ter poucas opcoes de inicio, algo
// dificil de conseguir um dos melhores". E e assim mesmo: ninguem chega na base e
// pede a 10. Aqui so entram os numeros que sobram — os cobicados vem depois, e o
// jogo tem um dilema proprio para quando a 10 do clube vaga.
export const CAMISAS = [16, 21, 24, 26, 28, 29, 31, 33, 35, 38, 44, 77];
export const CAMISAS_COBICADAS = [1, 7, 9, 10, 11];

// alguns detalhes rendem diferente: o ponta dá mais assistência, o segundo atacante
// participa mais do jogo, o volante marca menos gols
const AJUSTE_SUB = {
  ALA: { gol: 0.8, ass: 1.35 }, VOL: { gol: 0.45, ass: 0.75 },
  MC: { gol: 0.85, ass: 1.1 }, MEI: { gol: 1.25, ass: 1.5 },
  PON: { gol: 0.8, ass: 1.6 }, SA: { gol: 0.95, ass: 1.3 }, ATA: { gol: 1.2, ass: 0.75 },
};

// como cada posição pesa os atributos para virar OVR
const PESOS = {
  G: { ritmo: 0.05, finalizacao: 0.02, passe: 0.13, drible: 0.05, defesa: 0.50, fisico: 0.25 },
  Z: { ritmo: 0.12, finalizacao: 0.03, passe: 0.12, drible: 0.05, defesa: 0.45, fisico: 0.23 },
  L: { ritmo: 0.24, finalizacao: 0.06, passe: 0.18, drible: 0.14, defesa: 0.24, fisico: 0.14 },
  M: { ritmo: 0.13, finalizacao: 0.14, passe: 0.30, drible: 0.20, defesa: 0.13, fisico: 0.10 },
  A: { ritmo: 0.22, finalizacao: 0.34, passe: 0.10, drible: 0.20, defesa: 0.02, fisico: 0.12 },
};

// gols e assistências esperados por jogo, no auge, para um jogador mediano da posição
// Gols e assistencias por JOGO, por posicao.
//
// Recalibrado depois que a temporada passou a ter 45 jogos em vez de 30: com a
// producao antiga o atacante fazia 64 gols no ano, e a mediana dava 0,66 gol por
// jogo. No futebol de verdade um atacante bom faz 0,4 por jogo, um craque 0,6, e
// 0,9 e temporada historica.
const PRODUCAO = {
  G: { gol: 0.000, ass: 0.004 },
  Z: { gol: 0.032, ass: 0.022 },
  L: { gol: 0.035, ass: 0.095 },
  M: { gol: 0.135, ass: 0.165 },
  A: { gol: 0.330, ass: 0.130 },
};

/** Segura o meio da tabela sem cortar quem e fenomeno.
 *
 *  A primeira versao usava raiz quadrada e virava um teto de fato: parava perto de
 *  40 gols e nao passava dali. O Gustavo: "nao coloque um maximo de gols, quando o
 *  cara e muito craque ele pode fazer muito mais que isso" — e e verdade, o Messi
 *  fez 73 em 2011-12 e o Ronaldo fez 61.
 *
 *  Entao nao ha teto: o que existe e um freio que aperta devagar (expoente 0,86).
 *  Uma temporada boa passa quase inteira, uma temporada absurda ainda cresce, so
 *  mais devagar. Numero grande continua possivel, mas custa caro. */
function freioSuave(valor, jogos, comecaEm) {
  const limiar = jogos * comecaEm;
  if (valor <= limiar) return valor;
  return Math.round(limiar + Math.pow(valor - limiar, 0.86));
}

export function siglaPosicao(pos, pe) {
  if (pos === 'L') return pe === 'L' ? 'LE' : 'LD';
  const p = POSICOES.find((x) => x.key === pos);
  return p ? p.sigla : pos;
}

export function ovrDe(attrs, pos) {
  const w = PESOS[pos] || PESOS.M;
  let s = 0;
  for (const k in w) s += (attrs[k] || 50) * w[k];
  return Math.round(s);
}

// ---------------------------------------------------------------- tiers finais
export const TIERS = [
  { min: 0, nome: 'Amador', emoji: '<i class="ico-bola"></i>' },
  { min: 30, nome: 'Profissional', emoji: '' },
  { min: 45, nome: 'Destaque', emoji: '' },
  { min: 58, nome: 'Craque', emoji: '' },
  { min: 70, nome: 'Ídolo', emoji: '' },
  { min: 82, nome: 'Lenda', emoji: '' },
  { min: 92, nome: 'O Fenômeno', emoji: '' },
];
export function tierDe(nota) {
  let t = TIERS[0];
  for (const x of TIERS) if (nota >= x.min) t = x;
  return t;
}

// ---------------------------------------------------------------- treino
export const FOCOS = [
  { key: 'fin', nome: 'Finalização', attrs: ['finalizacao', 'drible'] },
  { key: 'cri', nome: 'Criação', attrs: ['passe', 'drible'] },
  { key: 'vel', nome: 'Velocidade', attrs: ['ritmo', 'fisico'] },
  { key: 'def', nome: 'Defesa', attrs: ['defesa', 'fisico'] },
  { key: 'com', nome: 'Completo', attrs: ['ritmo', 'finalizacao', 'passe', 'drible', 'defesa', 'fisico'] },
];
export const INTENSIDADES = [
  { key: 'leve', nome: 'Leve', ganho: 0.6, moral: +4, lesao: 0.02 },
  { key: 'normal', nome: 'Normal', ganho: 1.0, moral: 0, lesao: 0.06 },
  { key: 'pesada', nome: 'Pesada', ganho: 1.5, moral: -5, lesao: 0.16 },
];

// ESPECIALIDADES: o treino extra que vira marca do jogador.
//
// O Gustavo: "o treino, eu queria que tivesse alguma coisa diferente". Foco e
// intensidade sao dois botoes que mexem no mesmo numero. Isto e outra coisa: voce
// escolhe UMA habilidade para trabalhar de verdade, ela leva TEMPORADAS para sair,
// e quando sai vira um traco seu — o cara que cobra falta, o que nao erra penalti,
// o que ganha tudo pelo alto. Nao da para treinar duas ao mesmo tempo.
export const ESPECIALIDADES = [
  { key: 'falta', nome: 'Cobrança de falta',
    desc: 'Bola parada perto da área vira chance de gol.',
    quem: (pc) => pc.posicao !== 'G', ef: { golsExtra: 0.055 } },
  { key: 'penalti', nome: 'Cobrança de pênalti',
    desc: 'Você vira o batedor oficial do time.',
    quem: (pc) => pc.posicao !== 'G', ef: { golsExtra: 0.045 } },
  { key: 'cabeceio', nome: 'Jogo aéreo',
    desc: 'Ganha no alto na área dos dois lados.',
    quem: (pc) => ['A', 'Z', 'M'].includes(pc.posicao), ef: { golsExtra: 0.035, nota: 0.12 } },
  { key: 'drible', nome: 'Drible curto',
    desc: 'Passa pelo marcador no espaço apertado.',
    quem: (pc) => ['A', 'M', 'L'].includes(pc.posicao), ef: { assistExtra: 0.05, nota: 0.1 } },
  { key: 'passe', nome: 'Passe de trinta metros',
    desc: 'Abre o jogo de um lado para o outro.',
    quem: (pc) => ['M', 'Z', 'L'].includes(pc.posicao), ef: { assistExtra: 0.06 } },
  { key: 'lideranca', nome: 'Liderança',
    desc: 'O time joga melhor com você em campo.',
    quem: (pc) => pc.idade >= 22, ef: { nota: 0.22, moralAno: 4 } },
  { key: 'marcacao', nome: 'Marcação sob pressão',
    desc: 'Rouba a bola sem cometer falta.',
    quem: (pc) => ['Z', 'L', 'M'].includes(pc.posicao), ef: { nota: 0.25 } },
  { key: 'resistencia', nome: 'Resistência',
    desc: 'Aguenta a temporada inteira sem cair de rendimento.',
    quem: () => true, ef: { formaAno: 7, jogosExtra: 0.05 } },

  // GOLEIRO tinha as mesmas opcoes de um zagueiro: 'cobranca de falta',
  // 'marcacao sob pressao' e 'resistencia'. Nenhuma e de goleiro. Estas sao.
  { key: 'penaltis', nome: 'Defender pênaltis',
    desc: 'Estuda o batedor e cai para o lado certo.',
    quem: (pc) => pc.posicao === 'G', ef: { nota: 0.3 } },
  { key: 'saida', nome: 'Saída do gol',
    desc: 'Domina a área e corta o cruzamento antes do atacante.',
    quem: (pc) => pc.posicao === 'G', ef: { nota: 0.26 } },
  { key: 'pes', nome: 'Jogo com os pés',
    desc: 'Sai jogando e começa o ataque de trás.',
    quem: (pc) => pc.posicao === 'G', ef: { assistExtra: 0.02, nota: 0.16 } },
  { key: 'comando', nome: 'Comando da defesa',
    desc: 'Organiza a linha e a barreira; o time atrás rende mais.',
    quem: (pc) => pc.posicao === 'G' && pc.idade >= 22, ef: { nota: 0.22, moralAno: 3 } },
];
export const NIVEIS_ESPECIALIDADE = 3;

// ---------------------------------------------------------------- patrocínios
const MARCAS_MATERIAL = ['Nike', 'adidas', 'Puma', 'Under Armour', 'New Balance', 'Umbro', 'Mizuno', 'Topper'];
const MARCAS_IMAGEM = ['Red Bull', 'Gatorade', 'Pepsi', 'Rolex', 'Bet365', 'Betano', 'Stake', 'Sportingbet', 'Capa do EA Sports'];

// ---------------------------------------------------------------- loja
// Estrutura pessoal em NÍVEIS. Cada nível custa mais que o anterior e entrega mais —
// investir vira decisão de quando, não de se. (Antes era compra única e acabou.)
export const PERKS = [
  { key: 'pt', nome: 'Personal trainer', base: 700000, desc: (n) => `+${8 * n}% de ganho no treino` },
  { key: 'nut', nome: 'Nutricionista', base: 600000, desc: (n) => `${20 * n}% menos risco de lesão` },
  { key: 'fisio', nome: 'Fisioterapeuta', base: 900000, desc: (n) => `Recupera lesão ${n === 3 ? '3x' : n === 2 ? '2x' : '1,5x'} mais rápido` },
  { key: 'mental', nome: 'Preparador mental', base: 800000, desc: (n) => `Moral nunca cai abaixo de ${25 + 10 * n}` },
  { key: 'chef', nome: 'Chef e nutrição de elite', base: 500000, desc: (n) => `+${n} de físico por temporada` },
];
export const NIVEL_MAX = 3;
// nível 1 custa a base; o 2 custa 2,6x; o 3 custa 6x — subir sempre dói mais
export function precoDoNivel(perk, nivel) { return Math.round(perk.base * [1, 2.6, 6][nivel - 1]); }
// A LOJA.
//
// O Gustavo: "eu acredito que poderia ter coisas diferentes, coisas mais caras,
// tambem coisas mais simples, mais baratas — sei la, um tenis de corrida, um
// relogio, algo que tambem fosse ajudar a pessoa na carreira dela. Nao que fosse
// somente a luxo."
//
// Antes eram seis itens de luxo puro, do carro de 1,5 milhao a ilha de 150, e
// nenhum fazia nada alem de somar patrimonio. Agora tem coisa de gente que esta
// comecando, e ate a mansao tem efeito — porque ter onde morar em paz muda o ano.
export const BENS = [
  // --- barato e util: da para comprar no primeiro contrato ---
  { key: 'tenis', nome: 'Tênis de corrida bom', preco: 4000, tipo: 'util',
    desc: 'Treinar sem dor no joelho. Pouca coisa, mas é por onde começa.',
    ef: { forma: +3 } },
  { key: 'relogio', nome: 'Relógio de treino', preco: 12000, tipo: 'util',
    desc: 'Mede sono e carga. Você passa a saber quando parar.',
    ef: { forma: +4, lesaoMenos: 0.05 } },
  { key: 'colchao', nome: 'Colchão e rotina de sono', preco: 30000, tipo: 'util',
    desc: 'Dormir direito é metade da recuperação.',
    ef: { forma: +6 } },
  { key: 'academia', nome: 'Academia em casa', preco: 180000, tipo: 'util',
    desc: 'Treino extra sem depender do clube.',
    ef: { desempenho: +4, forma: +4 } },
  { key: 'video', nome: 'Analista de vídeo particular', preco: 350000, tipo: 'util',
    desc: 'Alguém corta os seus lances e mostra o que você não vê.',
    ef: { desempenho: +7 } },
  { key: 'carro-usado', nome: 'Carro popular', preco: 90000, tipo: 'util',
    desc: 'Chegar no treino sem depender de carona.',
    ef: { moral: +4 } },
  { key: 'casa-familia', nome: 'Casa para a família', preco: 800000, tipo: 'util',
    desc: 'Tirar os seus de onde eles estavam.',
    ef: { moral: +12 } },
  { key: 'escola', nome: 'Escolinha de futebol no seu bairro', preco: 1200000, tipo: 'util',
    desc: 'Onde você aprendeu, agora com o seu nome.',
    ef: { rep: +8, moral: +6 } },

  // --- luxo: caro, e agora com efeito de verdade ---
  { key: 'carro', nome: 'Carro esportivo', preco: 1500000, tipo: 'luxo',
    desc: 'O primeiro carro de quem chegou.', ef: { moral: +6, rep: +2 } },
  { key: 'casa', nome: 'Mansão', preco: 8000000, tipo: 'luxo',
    desc: 'Espaço, silêncio e uma piscina.', ef: { moral: +9, forma: +3 } },
  { key: 'iate', nome: 'Iate', preco: 25000000, tipo: 'luxo',
    desc: 'Férias longe de tudo.', ef: { moral: +10, forma: -2, rep: +4 } },
  { key: 'jato', nome: 'Jatinho', preco: 60000000, tipo: 'luxo',
    desc: 'Menos aeroporto, mais descanso entre os jogos.', ef: { forma: +8, rep: +5 } },
  { key: 'rest', nome: 'Rede de restaurantes', preco: 40000000, tipo: 'luxo',
    desc: 'Renda que não depende da bola.', ef: { rendaAnual: 3500000, rep: +3 } },
  { key: 'clube', nome: 'Time da sua cidade', preco: 90000000, tipo: 'luxo',
    desc: 'Comprar o clube onde você começou.', ef: { rep: +14, moral: +10, rendaAnual: 2000000 } },
  { key: 'ilha', nome: 'Ilha particular', preco: 150000000, tipo: 'luxo',
    desc: 'O lugar onde ninguém te acha.', ef: { moral: +14, rep: +6 } },
];

// ---------------------------------------------------------------- dilemas
const DILEMAS = [
  {
    txt: 'O técnico quer te escalar mesmo com uma dor no joelho. O que você faz?',
    ops: [
      { txt: 'Jogo, o time precisa de mim', ef: { moral: +6, lesaoRisco: 0.35, rep: +2, tecnico: +12 } },
      { txt: 'Peço para poupar', ef: { moral: -4, forma: +11, tecnico: -8 } },
    ],
  },
  {
    txt: 'Um jornalista te provoca dizendo que você só joga contra time pequeno.',
    ops: [
      { txt: 'Respondo na bola', ef: { desempenho: +9, moral: -2 } },
      { txt: 'Respondo na entrevista', ef: { rep: +3, moral: -6 } },
      { txt: 'Ignoro', ef: { moral: +2 } },
    ],
  },
  {
    txt: 'A torcida está cobrando o elenco depois de três jogos sem vencer.',
    ops: [
      { txt: 'Vou conversar com a torcida organizada', ef: { rep: +4, moral: +5 } },
      { txt: 'Foco no trabalho, sem barulho', ef: { desempenho: +7 } },
    ],
  },
  {
    txt: 'Convite para uma festa grande na véspera de um clássico.',
    ops: [
      { txt: 'Vou, mereço relaxar', ef: { moral: +8, forma: -20, desempenho: -9, tecnico: -15 } },
      { txt: 'Fico em casa descansando', ef: { forma: +14, desempenho: +5, tecnico: +6 } },
    ],
  },
  {
    txt: 'Um empresário oferece uma consultoria de imagem que custa caro.',
    ops: [
      { txt: 'Contrato (R$ 2 mi)', ef: { dinheiro: -2000000, rep: +8 } },
      { txt: 'Dispenso', ef: {} },
    ],
  },
  {
    txt: 'O clube pede que você assuma a braçadeira de capitão.',
    ops: [
      { txt: 'Aceito a responsabilidade', ef: { rep: +6, moral: +4, capitao: true, tecnico: +10 } },
      { txt: 'Ainda não é hora', ef: { moral: +1 } },
    ],
  },
  {
    txt: 'Você foi sondado por um clube rival do seu.',
    ops: [
      { txt: 'Nego publicamente', ef: { rep: +3, moral: +6 } },
      { txt: 'Deixo a porta aberta', ef: { moral: -8, rep: -2, propostaBoost: true, tecnico: -12 } },
    ],
  },
  {
    txt: 'A pré-temporada tem um amistoso na Europa e uma folga em casa.',
    ops: [
      { txt: 'Vou para a Europa me mostrar', ef: { rep: +5, forma: -4, propostaBoost: true } },
      { txt: 'Descanso com a família', ef: { moral: +7, forma: +11 } },
    ],
  },
];

// ================================================================ o motor
export class PlayerCareer {
  /**
   * @param {object} dataset  o mesmo dataset hidratado do modo Treinador
   * @param {object} ficha    { nome, posicao, pe, nacionalidade }
   */
  constructor(dataset, ficha) {
    this.league = dataset;
    this.nome = ficha.nome || 'Novato';
    // aceita tanto a sigla nova (ATA, PON, VOL) quanto o grupo antigo (A, M)
    const detalhe = POSICOES.find((p) => p.key === ficha.posicao);
    this.sub = detalhe ? detalhe.key : null;
    this.posicao = detalhe ? detalhe.grupo : (ficha.posicao || 'A');
    this.camisa = ficha.camisa || CAMISAS[0];   // 10 nao esta mais entre as de estreia
    this.pe = ficha.pe || 'R';
    this.nacionalidade = ficha.nacionalidade || 'Brasil';

    this.idade = 16;
    this.temporada = 1;
    this.anoInicial = 2026;

    // Atributos de garoto de base, com viés para a posição.
    // O Gustavo achou o começo baixo demais ("o overall de início pode ser um
    // pouquinho maior, até uns sessenta"). Subiu a faixa: dá 53 a 60 no começo,
    // em vez de 45 a 53.
    const base = () => 48 + rnd(12);
    this.attrs = { ritmo: base(), finalizacao: base(), passe: base(), drible: base(), defesa: base(), fisico: base() };
    for (const k of (FOCOS.find((f) => f.key === 'com').attrs)) this.attrs[k] = this.attrs[k];
    const fortes = { G: ['defesa', 'fisico'], Z: ['defesa', 'fisico'], L: ['ritmo', 'passe'], M: ['passe', 'drible'], A: ['finalizacao', 'ritmo'] }[this.posicao];
    fortes.forEach((k) => (this.attrs[k] = clamp(this.attrs[k] + 9 + rnd(6), 46, 74)));

    this.potencial = clamp(74 + rnd(22), 74, 96);   // teto oculto do jogador
    this.moral = 70; this.forma = 70; this.lesao = 0;
    this.reputacao = 5;                              // 0..100, abre portas
    this.dinheiro = 0; this.capitao = false;
    this.perks = []; this.bens = [];
    this.patrocinioMaterial = null; this.patrocinioImagem = null;
    this.anosComMarca = 0; this.chuteiraAssinatura = null;

    this.carreira = { jogos: 0, gols: 0, assist: 0, titulos: [], premios: [] };
    this.historico = [];       // uma linha por temporada
    this.selecao = { convocado: false, jogos: 0, gols: 0, titulos: [] };
    this.aposentado = false;
    this.notaFinal = null;

    this._criarRival();
    this._escolherClubeInicial();
    this._novaTemporada();
  }

  // ------------------------------------------------------------ rival
  //
  // Todo craque tem o outro da mesma geração. O rival nasce junto com você, na mesma
  // posição, e evolui por conta — no fim da carreira vocês são comparados.
  _criarRival() {
    const nomes = ['Léo Ribeiro', 'Kauã Nogueira', 'Enzo Ferrari', 'Matías Ocampo', 'Diego Salcedo',
      'Rafa Bastos', 'Yuri Andrade', 'Tomás Ferreyra', 'Vinícius Prado', 'Luca Bianchi',
      'Emiliano Sosa', 'Théo Marques', 'Nico Herrera', 'Bruno Vidal', 'Iker Montes'];
    // O RIVAL TEM CLUBE E PAÍS. O Gustavo: "não mostra o time desse Emiliano Sosa,
    // nacionalidade, não sei nem se ele é brasileiro — preciso acompanhar melhor a
    // carreira dele". Sem isso ele era um nome solto com números do lado.
    const nome = pick(nomes);
    // o sobrenome entrega a origem: Ocampo/Salcedo/Ferreyra/Sosa/Herrera são
    // hispânicos, Bianchi/Ferrari italianos, o resto brasileiro
    const pais = /Ocampo|Salcedo|Ferreyra|Sosa|Herrera|Montes/.test(nome) ? 'Argentina'
      : /Bianchi|Ferrari/.test(nome) ? 'Itália' : 'Brasil';
    // começa num clube de verdade, de porte parecido com o de um garoto de 16
    const candidatos = (this.league && this.league.clubs ? this.league.clubs : [])
      .filter((c) => c && c.name && c.squad && c.squad.length > 14);
    const casa = candidatos.length
      ? candidatos[Math.floor(Math.random() * candidatos.length)] : null;
    this.rival = {
      nome, idade: 16, pais,
      ovr: 52 + rnd(8), potencial: clamp(78 + rnd(18), 78, 96),
      gols: 0, assist: 0, jogos: 0, titulos: 0, premios: 0, bolasDeOuro: 0,
      clube: casa ? casa.name : null, clubeId: casa ? casa.id : null,
      aposentado: false,
    };
  }

  _rodarRival() {
    const r = this.rival;
    if (!r || r.aposentado) return null;
    r.idade++;
    const sobra = Math.max(0, r.potencial - r.ovr);
    const taxa = r.idade <= 21 ? 0.30 : r.idade <= 24 ? 0.22 : r.idade <= 27 ? 0.12 : r.idade <= 30 ? 0.04 : 0;
    r.ovr = Math.min(r.potencial, r.ovr + Math.round(sobra * taxa * (0.7 + Math.random() * 0.6)));
    if (r.idade >= 31) r.ovr -= r.idade >= 34 ? 2 : 1;
    const jogos = 26 + rnd(12);
    const prod = PRODUCAO[this.posicao];
    const mult = clamp(1 + (r.ovr - 72) / 16, 0.4, 3);
    r.jogos += jogos;
    r.gols += Math.round(jogos * prod.gol * mult * (0.7 + Math.random() * 0.6));
    r.assist += Math.round(jogos * prod.ass * mult * (0.7 + Math.random() * 0.6));
    if (chance(clamp((r.ovr - 74) / 40, 0, 0.4))) r.titulos++;
    if (chance(clamp((r.ovr - 80) / 50, 0, 0.3))) r.premios++;
    if (r.ovr >= 90 && chance(0.12)) { r.bolasDeOuro++; r.premios++; }
    if (r.idade >= 38 || (r.idade >= 35 && r.ovr < 72 && chance(0.5))) r.aposentado = true;
    return r;
  }

  // ------------------------------------------------------------ imprensa
  _manchete(r) {
    const n = this.nome.split(' ')[0];
    if (r.premios.some((p) => p.includes('Bola de Ouro'))) return `"${this.nome} é o melhor do mundo" — e ninguém discute.`;
    if (r.titulos.length >= 2) return `Ano de ${n}: ${r.titulos.length} títulos e a torcida no bolso.`;
    if (r.titulos.length === 1) {
      const t = r.titulos[0];
      const selecao = t.includes('Copa do Mundo') || t.includes('Copa América') || t.includes('Eurocopa');
      return selecao
        ? `${esc0(t)}! ${n} campeão pela seleção — o país inteiro fala do seu nome.`
        : `${esc0(t)}: ${n} entra para a história do clube.`;
    }
    if (r.gols >= 25) return `${r.gols} gols. A imprensa já pergunta quando vem a convocação.`;
    if (r.premios.length) return `${esc0(r.premios[0])} para ${n}. O nome está na boca do país.`;
    if (r.movimento && r.movimento.tipo === 'subiu') return `Acesso conquistado. ${n} foi peça do time que subiu.`;
    if (r.movimento && r.movimento.tipo === 'caiu') return `Queda dolorida. Cobram explicações — e ${n} está no meio.`;
    if (r.nota >= 7.3) return `Temporada sólida: nota ${r.nota} e respeito conquistado.`;
    if (!r.cumpriu && r.jogos < 15) return `Ano apagado. ${n} mal saiu do banco e a diretoria reclama.`;
    if (!r.cumpriu) return `Objetivo não cumprido. A pressão aumenta para a próxima temporada.`;
    return `${n} cumpre o combinado e segue no radar.`;
  }

  // ------------------------------------------------------------ acesso rápido
  get ovr() { return ovrDe(this.attrs, this.posicao); }
  get ano() { return this.anoInicial + this.temporada - 1; }
  get sigla() { return this.sub || siglaPosicao(this.posicao, this.pe); }
  clube() { return this.league.clubs.find((c) => c.id === this.clubeId); }
  compDoClube() { const c = this.clube(); return c ? this.league.competitions.find((x) => x.id === c.comp) : null; }

  /** Quanto voce vale no mercado, em reais.
   *
   *  A formula antiga crescia rapido demais na base: um garoto de 16 anos com
   *  overall 60 aparecia valendo R$ 16 milhoes na primeira tela da carreira. Agora
   *  esta ancorada em valores que existem — 60 vale meio milhao, 70 vale uns
   *  cinco, 80 uns quarenta, 90 passa dos trezentos. */
  valorMercado() {
    const o = this.ovr;
    const fatorIdade = this.idade <= 19 ? 1.45
      : this.idade <= 23 ? 1.3
      : this.idade <= 28 ? 1.0
      : Math.max(0.15, 1 - (this.idade - 28) * 0.14);
    return Math.round(Math.pow(1.25, o - 60) * 500000 * fatorIdade);
  }

  forcaDoClube(club) {
    const c = club || this.clube();
    if (!c || !c.squad.length) return 65;
    const top = c.squad.map((p) => p.forca).sort((a, b) => b - a).slice(0, 11);
    return top.reduce((s, v) => s + v, 0) / top.length;
  }

  // papel no elenco: titular absoluto, titular, rotação ou reserva
  // Quantos jogam na minha posição (base 4-3-3). Estar atrás de UM zagueiro não faz
  // de você reserva — faz de você o outro titular.
  // A confiança do técnico decide se você joga. Sobe com bom desempenho e com
  // decisões que agradam; cai quando você fura o trabalho ou rende mal.
  confiancaDoTecnico() { return this.relacaoTecnico != null ? this.relacaoTecnico : 50; }
  descreverRelacao() {
    const r = this.confiancaDoTecnico();
    if (r >= 85) return { txt: 'Intocável — é o xodó do treinador', cor: 'ok' };
    if (r >= 65) return { txt: 'Confia em você', cor: 'ok' };
    if (r >= 40) return { txt: 'Está te observando', cor: '' };
    if (r >= 20) return { txt: 'Desconfiado — você precisa provar', cor: 'bad' };
    return { txt: 'Não conta com você', cor: 'bad' };
  }

  papel() {
    const c = this.clube(); if (!c) return 'reserva';
    const vagas = { G: 1, Z: 2, L: 2, M: 3, A: 3 }[this.posicao] || 2;
    const acima = c.squad.filter((p) => p.posicao === this.posicao && p.forca > this.ovr).length;
    // a confiança do técnico vale como se você fosse melhor (ou pior) do que é
    const ajuste = Math.round((this.confiancaDoTecnico() - 50) / 12);
    const efetivo = acima - ajuste;
    if (efetivo <= 0 && this.ovr >= this.forcaDoClube() + 2) return 'estrela';
    if (efetivo < vagas) return 'titular';
    if (efetivo < vagas + 2) return 'rotacao';
    return 'reserva';
  }

  // ------------------------------------------------------------ clube inicial
  // Quatro portas para começar, do país escolhido: uma mais forte (difícil ganhar
  // espaço), duas medianas e uma pequena (você joga desde já). A escolha importa.
  opcoesDeClubeInicial() {
    const doPais = this.league.clubs.filter((c) => c.country === this.nacionalidade);
    const pool = (doPais.length ? doPais : this.league.clubs)
      .map((c) => ({ c, f: this.forcaDoClube(c) }))
      .filter((x) => x.f < 82);

    const faixa = (min, max) => {
      const lista = pool.filter((x) => x.f >= min && x.f < max);
      return lista.length ? lista[rnd(lista.length)] : null;
    };
    const brutos = [faixa(76, 82), faixa(71, 76), faixa(66, 71), faixa(50, 66)].filter(Boolean);

    return brutos.map(({ c, f }) => {
      const comp = this.league.competitions.find((x) => x.id === c.comp);
      return {
        clubeId: c.id, nome: c.name, liga: comp ? comp.name : '', forca: Math.round(f),
        // quanto mais forte o clube, mais difícil entrar no time
        dificuldade: f >= 76 ? 'Muito difícil ganhar espaço' : f >= 71 ? 'Vai ter de brigar por vaga'
          : f >= 66 ? 'Chance real de jogar cedo' : 'Titular desde já',
        salario: Math.round(6000 + (f - 55) * 900 + rnd(4000)),
      };
    });
  }

  escolherClubeInicial(clubeId, salario) {
    const c = this.league.clubs.find((x) => x.id === clubeId);
    if (!c) return false;
    this.clubeId = c.id;
    this.contrato = 3;
    this.salario = salario || Math.round(12000 + rnd(20000));
    this.relacaoTecnico = 50;      // começa neutro
    // LUVAS DO PRIMEIRO CONTRATO. O dinheiro só entrava no fim da temporada, então
    // o jogador começava com R$ 0 no banco e a loja — que promete "dá para comprar
    // com o primeiro salário" — não deixava comprar nem o tênis de 4 mil.
    // Assinar contrato profissional paga adiantado, e é assim mesmo.
    this.dinheiro += Math.round(this.salario * 3);
    this._novaTemporada();
    return true;
  }

  _escolherClubeInicial() {
    const ops = this.opcoesDeClubeInicial();
    if (ops.length) this.escolherClubeInicial(ops[ops.length - 1].clubeId, ops[ops.length - 1].salario);
  }

  // ------------------------------------------------------------ temporada
  _novaTemporada() {
    this.treino = { foco: 'com', intensidade: 'normal' };
    // Os dilemas vêm do catálogo com CONTEXTO: falam do seu clube, do companheiro
    // que disputa a sua posição, do garoto da base, do rival. Antes eram oito textos
    // fixos que se repetiam todo ano — "as decisões é sempre as mesmas toda
    // temporada", como o Gustavo disse.
    this.dilemasVistos = this.dilemasVistos || [];
    this.decisoesPendentes = sortearDilemas(this, 2, this.dilemasVistos);
    // ECOS que venciam neste ano viram a primeira notícia da temporada.
    this.ecosDoAno = [];
    this.ecos = (this.ecos || []).filter((e) => {
      if (e.quando > this.ano) return true;
      this.ecosDoAno.push(e);
      this._aplicarEco(e);
      return false;
    });
    // Se você se machucou feio, a primeira decisão do ano é sobre a sua recuperação.
    if (this.lesaoGrave) {
      const semanas = this.lesaoGrave.semanas;
      this.decisoesPendentes.unshift({
        txt: `Você se machucou no fim da temporada passada. Os médicos falam em ${semanas} semanas de recuperação. O que você faz?`,
        ops: [
          { txt: 'Forço a volta antes do prazo', ef: { moral: +6, rep: +3, lesaoRisco: 0.55, desempenho: -7 } },
          { txt: 'Trato direito, sem pressa', ef: { forma: +18, moral: -5, desempenho: +5 } },
          { txt: 'Pago um tratamento no exterior (R$ 3 mi)', ef: { dinheiro: -3000000, forma: +16, moral: +4 } },
        ],
      });
      this.lesaoGrave = null;
    }
    const be = this._bonusEspecialidades();
    if (be.formaAno) this.forma = clamp(this.forma + be.formaAno, 0, 100);
    if (be.moralAno) this.moral = clamp(this.moral + be.moralAno, 0, 100);
    this.bonusDesempenho = 0;
    this.objetivo = this._sortearObjetivo();
    this.temporadaSimulada = false;
    this.relatorio = null;
    this.propostas = null;
  }

  _sortearObjetivo() {
    const p = this.papel();
    const escala = p === 'reserva' ? 0.4 : p === 'rotacao' ? 0.7 : 1;
    const opcoes = {
      G: [{ tipo: 'jogos', txt: 'Disputar {n} jogos', n: Math.round(22 * escala) },
          { tipo: 'nota', txt: 'Fechar a temporada com nota média {n}', n: 6.8 }],
      Z: [{ tipo: 'jogos', txt: 'Disputar {n} jogos', n: Math.round(24 * escala) },
          { tipo: 'nota', txt: 'Fechar a temporada com nota média {n}', n: 6.9 }],
      L: [{ tipo: 'assist', txt: 'Dar {n} assistências', n: Math.max(2, Math.round(5 * escala)) },
          { tipo: 'jogos', txt: 'Disputar {n} jogos', n: Math.round(24 * escala) }],
      M: [{ tipo: 'ga', txt: 'Participar de {n} gols (gols + assistências)', n: Math.max(4, Math.round(12 * escala)) },
          { tipo: 'assist', txt: 'Dar {n} assistências', n: Math.max(3, Math.round(7 * escala)) }],
      A: [{ tipo: 'gols', txt: 'Marcar {n} gols', n: Math.max(4, Math.round(14 * escala)) },
          { tipo: 'ga', txt: 'Participar de {n} gols (gols + assistências)', n: Math.max(6, Math.round(18 * escala)) }],
    }[this.posicao];
    const o = { ...pick(opcoes) };
    if (chance(0.18)) return { tipo: 'titulo', txt: 'Conquistar um título com o clube', n: 1 };
    o.txt = o.txt.replace('{n}', o.n);
    return o;
  }

  // ------------------------------------------------------------ decisões
  /** A CONVERSA COM A DIRETORIA quando o ano não foi bom.
   *
   *  O Gustavo: "acabou a temporada, eu não atingi meu objetivo, tá bom, o que
   *  aconteceu? A diretoria reclama. Beleza, o que que eu posso falar pra diretoria
   *  me ajudar? Sabe, eu preciso de opções."
   *
   *  Antes o ano ruim virava uma frase na manchete e acabava ali. Agora eles te
   *  chamam para uma sala, dizem o que incomodou, e você responde — e a resposta
   *  muda a temporada seguinte: quanto o técnico confia em você, se pedem sua saída,
   *  se te dão mais uma chance ou se cortam o seu salário.
   */
  conversaComADiretoria(r) {
    if (!r) return null;
    const clube = this.clube();
    const nomeClube = clube ? clube.name : 'a diretoria';
    const poucoJogo = r.jogos < 15;
    const caiu = r.movimento && r.movimento.tipo === 'caiu';
    const caro = this.salario > 0 && r.jogos < 20;

    if (r.cumpriu && !caiu) return null;   // ano bom não gera conversa

    let txt, ops;
    if (caiu) {
      txt = `O ${nomeClube} caiu de divisão. A diretoria reuniu o elenco e quer ouvir cada um.`;
      ops = [
        { txt: 'Assumo a minha parte e digo que fico para subir de volta',
          ef: { moral: +8, rep: +6, tecnico: +12 },
          eco: { em: 1, tipo: 'idolo', txt: `Você ficou quando o ${nomeClube} caiu, e a torcida não esqueceu.` } },
        { txt: 'Digo que o problema foi o elenco montado por eles',
          ef: { moral: +4, rep: -4, tecnico: -14 },
          eco: { em: 1, tipo: 'impasse', txt: 'A diretoria ainda lembra que você jogou a culpa nela.' } },
        { txt: 'Peço para sair', ef: { moral: -6, rep: -3 },
          eco: { em: 1, tipo: 'quer-sair', txt: `Depois do rebaixamento você pediu para sair, e o ${nomeClube} já procura substituto.` } },
      ];
    } else if (poucoJogo) {
      txt = `A diretoria do ${nomeClube} te chamou: você jogou só ${r.jogos} partidas no ano e eles querem saber o que fazer com você.`;
      ops = [
        { txt: 'Peço uma chance de verdade na próxima temporada',
          ef: { moral: +5, tecnico: -4 },
          eco: { em: 1, tipo: 'cobranca', txt: 'Você pediu chance e ela veio — agora precisa responder dentro de campo.' } },
        { txt: 'Aceito baixar o salário para provar meu valor',
          ef: { moral: -4, tecnico: +16, dinheiro: -Math.round(this.salario * 3) },
          eco: { em: 1, tipo: 'tecnico-confia', txt: 'Baixar o salário comprou a confiança da comissão.' } },
        { txt: 'Peço para ser emprestado e jogar em outro lugar',
          ef: { moral: +6, rep: -2 },
          eco: { em: 1, tipo: 'sondagem', txt: 'O pedido de empréstimo colocou o seu nome no mercado.' } },
        { txt: 'Digo que o problema é o técnico', ef: { tecnico: -22, moral: +3, rep: -5 },
          eco: { em: 1, tipo: 'vestiario-marcado', txt: 'Falar do técnico para a diretoria vazou, e o vestiário soube.' } },
      ];
    } else {
      txt = `A meta era ${r.objetivo ? r.objetivo.txt.toLowerCase() : 'outra'}, e não saiu. A diretoria quer conversar.`;
      ops = [
        { txt: 'Assumo e prometo entregar no ano que vem',
          ef: { moral: +4, tecnico: +8 },
          eco: { em: 1, tipo: 'cobranca', txt: 'Você prometeu entregar, e eles anotaram.' } },
        { txt: 'Mostro os números e explico o que faltou no time',
          ef: { rep: +4, tecnico: -6, moral: +3 } },
        { txt: 'Aceito uma meta mais dura para provar',
          ef: { moral: -3, tecnico: +12, desempenho: +8 },
          eco: { em: 1, tipo: 'peso-da-10', txt: 'A meta que você mesmo aceitou está pesando.' } },
        { txt: 'Digo que quero sair no fim do contrato', ef: { moral: -5, tecnico: -12 },
          eco: { em: 1, tipo: 'quer-sair', txt: `O ${nomeClube} sabe que você não quer ficar.` } },
      ];
    }
    return { id: 'diretoria', txt, ops, diretoria: true };
  }

  /** O que cada eco faz quando chega a hora. */
  _aplicarEco(e) {
    const efeitos = {
      'empresario': () => { this.patrocinioBonus = (this.patrocinioBonus || 0) + 0.35; },
      'sem-empresario': () => { this.patrocinioBonus = (this.patrocinioBonus || 0) - 0.25; },
      'tecnico-confia': () => { this.relacaoTecnico = clamp(this.confiancaDoTecnico() + 14, 0, 100); },
      'vestiario-marcado': () => { this.moral = clamp(this.moral - 8, 0, 100); },
      'mentor': () => { this.bonusDesempenho += 6; },
      'afilhado': () => { this.reputacao = clamp(this.reputacao + 5, 0, 100); this.moral = clamp(this.moral + 6, 0, 100); },
      'cobranca': () => { this.bonusDesempenho += 4; },
      'inimigo-imprensa': () => { this.reputacao = clamp(this.reputacao - 5, 0, 100); },
      'exposicao': () => { this.patrocinioBonus = (this.patrocinioBonus || 0) + 0.5; this.moral = clamp(this.moral - 5, 0, 100); },
      'familia-perto': () => { this.moral = clamp(this.moral + 10, 0, 100); this.bonusDesempenho += 5; },
      'investimento': () => { this.dinheiro += 9000000; },
      'investimento-pequeno': () => { this.dinheiro += 2200000; },
      'preparador': () => { this.forma = clamp(this.forma + 12, 0, 100); },
      'fama-festa': () => { this.reputacao = clamp(this.reputacao - 4, 0, 100); },
      'quer-sair': () => { this._propostaBoost = true; this.relacaoTecnico = clamp(this.confiancaDoTecnico() - 10, 0, 100); },
      'sondagem': () => { this._propostaBoost = true; },
      'capitao': () => { this.capitao = true; this.reputacao = clamp(this.reputacao + 4, 0, 100); },
      'idolo': () => { this.reputacao = clamp(this.reputacao + 8, 0, 100); this.moral = clamp(this.moral + 8, 0, 100); },
      'impasse': () => { this.moral = clamp(this.moral - 9, 0, 100); },
      'peso-da-10': () => { this.bonusDesempenho += 3; this.moral = clamp(this.moral - 4, 0, 100); },
      'selecao-magoada': () => { this.reputacao = clamp(this.reputacao - 6, 0, 100); },
      'peito-aberto': () => { this.moral = clamp(this.moral + 9, 0, 100); },
      'agente-novo': () => { this._propostaBoost = true; this.patrocinioBonus = (this.patrocinioBonus || 0) + 0.2; },
    };
    const f = efeitos[e.tipo];
    if (f) f();
  }

  /** Os ecos que chegaram neste ano, para a tela poder contar. */
  ecosDaTemporada() { return this.ecosDoAno || []; }

  proximaDecisao() { return this.decisoesPendentes.length ? this.decisoesPendentes[0] : null; }

  responderDecisao(indiceOpcao) {
    const d = this.decisoesPendentes.shift();
    if (!d) return null;
    const ef = d.ops[indiceOpcao].ef || {};
    if (ef.moral) this.moral = clamp(this.moral + ef.moral, 0, 100);
    if (ef.forma) this.forma = clamp(this.forma + ef.forma, 0, 100);
    if (ef.rep) this.reputacao = clamp(this.reputacao + ef.rep, 0, 100);
    if (ef.dinheiro) this.dinheiro = Math.max(0, this.dinheiro + ef.dinheiro);
    if (ef.desempenho) this.bonusDesempenho += ef.desempenho;
    if (ef.capitao) this.capitao = true;
    if (ef.tecnico) this.relacaoTecnico = clamp(this.confiancaDoTecnico() + ef.tecnico, 0, 100);
    if (ef.propostaBoost) this._propostaBoost = true;
    if (ef.lesaoRisco && chance(ef.lesaoRisco)) this.lesao = 2 + rnd(4);
    if (d.id) (this.dilemasVistos = this.dilemasVistos || []).push(d.id);
    // A ESCOLHA QUE VOLTA. Sem isto, decidir não muda nada: o Gustavo dispensou o
    // empresário e não aconteceu coisa nenhuma. Agora a escolha pode deixar um eco
    // marcado para uma temporada à frente, e o jogo lembra de onde ele veio.
    const eco = d.ops[indiceOpcao].eco;
    if (eco) {
      (this.ecos = this.ecos || []).push({
        ...eco, quando: this.ano + (eco.em || 1), origem: d.txt, escolha: d.ops[indiceOpcao].txt,
      });
    }
    return { escolha: d.ops[indiceOpcao].txt, ef, eco: eco || null };
  }

  // -------------------------------------------------------- especialidades
  /** As que fazem sentido para este jogador. */
  especialidadesDisponiveis() {
    return ESPECIALIDADES.filter((e) => e.quem(this));
  }
  nivelEspecialidade(key) { return (this.especialidades && this.especialidades[key]) || 0; }
  /** Escolhe em que trabalhar neste ano. Uma por vez. */
  definirEspecialidade(key) { this.especialidadeAtual = key || null; }

  /** No fim do ano, o trabalho extra rende — ou não. */
  _avancarEspecialidade() {
    const key = this.especialidadeAtual;
    if (!key) return null;
    const esp = ESPECIALIDADES.find((e) => e.key === key);
    if (!esp) return null;
    this.especialidades = this.especialidades || {};
    const nivel = this.nivelEspecialidade(key);
    if (nivel >= NIVEIS_ESPECIALIDADE) return null;
    // Nao e garantido: treinar um ano nao entrega a habilidade. Quanto mais alto o
    // nivel, mais dificil — e treino pesado ajuda.
    const pesado = this.treino && this.treino.intensidade === 'pesada';
    const chanceDeEvoluir = [0.62, 0.42, 0.26][nivel] + (pesado ? 0.12 : 0) + (this.idade <= 23 ? 0.08 : 0);
    if (!chance(chanceDeEvoluir)) {
      return { key, nome: esp.nome, nivel, evoluiu: false,
        txt: `Você trabalhou ${esp.nome.toLowerCase()} o ano inteiro e ainda não saiu.` };
    }
    this.especialidades[key] = nivel + 1;
    const agora = nivel + 1;
    return { key, nome: esp.nome, nivel: agora, evoluiu: true,
      txt: agora >= NIVEIS_ESPECIALIDADE
        ? `${esp.nome} virou a sua marca. Ninguém no elenco faz isso melhor.`
        : `Evoluiu em ${esp.nome.toLowerCase()} — nível ${agora} de ${NIVEIS_ESPECIALIDADE}.` };
  }

  /** O que as especialidades somam na temporada. */
  _bonusEspecialidades() {
    const b = { golsExtra: 0, assistExtra: 0, nota: 0, moralAno: 0, formaAno: 0, jogosExtra: 0 };
    for (const [key, nivel] of Object.entries(this.especialidades || {})) {
      const esp = ESPECIALIDADES.find((e) => e.key === key);
      if (!esp) continue;
      const p = nivel / NIVEIS_ESPECIALIDADE;
      for (const k of Object.keys(b)) if (esp.ef[k]) b[k] += esp.ef[k] * p;
    }
    return b;
  }

  // ------------------------------------------------------------ treino
  definirTreino(foco, intensidade) { this.treino = { foco, intensidade }; }

  _aplicarTreino() {
    const foco = FOCOS.find((f) => f.key === this.treino.foco) || FOCOS[4];
    const inten = INTENSIDADES.find((i) => i.key === this.treino.intensidade) || INTENSIDADES[1];
    const teto = this.potencial;
    const sobra = Math.max(0, teto - this.ovr);
    // quanto mais novo e mais longe do teto, mais ele cresce
    const fatorIdade = this.idade <= 21 ? 1.0 : this.idade <= 25 ? 0.72 : this.idade <= 29 ? 0.35 : 0;
    // ATENÇÃO: o alvo é em pontos de OVERALL, não em pontos de atributo. Somar 12 em
    // atributos espalhados mexe ~2 no overall — foi assim que a primeira versão deixou
    // o jogador estacionado a carreira inteira.
    let alvo = sobra > 0 ? (sobra * 0.15 + 0.6) * inten.ganho * fatorIdade : 0;
    alvo *= 1 + 0.08 * this.nivelDe('pt');
    alvo *= 0.75 + (this.moral / 200);
    // Ninguém salta 12 pontos de overall numa temporada. Com o teto, sair de 52 aos
    // 16 e chegar a 90 leva a carreira toda, que é o que faz a evolução ter graça.
    alvo = Math.min(alvo, this.idade <= 20 ? 6 : this.idade <= 24 ? 5 : 4);

    // JOGAR É O QUE FAZ EVOLUIR.
    //
    // A conta acima só olhava treino, idade e teto: quem passou a temporada no banco
    // crescia igual a quem jogou 38 partidas. O Gustavo, depois de uma temporada com
    // 4 jogos: "subi três de overall — não era para eu ter ganhado três". Não era
    // mesmo. Agora o tempo em campo pesa: uma temporada inteira no banco rende pouco
    // mais de um terço do que rende uma temporada jogada.
    // O treino roda ANTES da temporada, então quem manda aqui é o ano passado:
    // quem ficou no banco chega menos preparado para crescer no ano seguinte. No
    // primeiro ano não há passado, e aí ninguém é penalizado.
    // CALIBRAGEM: a primeira conta (0,38 a 1,0) era dura demais e criava a mesma
    // bola de neve da moral — garoto joga pouco, cresce pouco, segue reserva e
    // nunca deslancha. A carreira inteira caiu de nota 100 para 29 no teste.
    // Agora quem não joga ainda evolui com o treino, só mais devagar.
    const jogosAnoPassado = this._jogosDoAnoPassado;
    if (jogosAnoPassado != null) {
      alvo *= 0.68 + 0.32 * Math.min(1, jogosAnoPassado / 18);
    }

    // Só treina o que conta para a posição. O foco "Completo" jogava ponto em Defesa
    // até um atacante ficar com 99 de marcação — desperdício que também inflava o
    // overall, porque o laço só parava quando a meta era atingida.
    const peso = PESOS[this.posicao] || PESOS.M;
    const uteis = foco.attrs.filter((k) => peso[k] >= 0.10);
    const alvos = uteis.length ? uteis : foco.attrs;
    const ovrInicial = this.ovr;
    let voltas = 0;
    // O TETO VALE: o treino para no potencial. Sem esta trava todo jogador chegava a
    // 98 e virava lenda, e o potencial não queria dizer nada.
    // Se o foco já estourou (finalização e drible em 99), o treino escorre para os
    // outros atributos que a posição usa — senão o jogador travava no meio do teto
    // sem ter mais onde crescer.
    const reservas = Object.keys(peso).filter((k) => peso[k] >= 0.08 && !alvos.includes(k));
    while (this.ovr - ovrInicial < alvo && this.ovr < teto && voltas++ < 600) {
      const abertos = alvos.filter((k) => this.attrs[k] < 99);
      const lista = abertos.length ? abertos : reservas.filter((k) => this.attrs[k] < 99);
      if (!lista.length) break;
      this.attrs[pick(lista)]++;
    }
    if (this.nivelDe('chef')) this.attrs.fisico = Math.min(99, this.attrs.fisico + this.nivelDe('chef'));

    this.moral = clamp(this.moral + inten.moral, 0, 100);
    let riscoLesao = inten.lesao;
    riscoLesao *= Math.max(0.2, 1 - 0.2 * this.nivelDe('nut'));
    if (chance(riscoLesao)) this.lesao = 2 + rnd(6);

    // declínio: a partir dos 31 os atributos físicos vão embora
    if (this.idade >= 31) {
      // O declínio era brando demais: num teste de 27 temporadas o meia chegava aos
      // 43 anos ainda com 79 de overall, e ninguém se aposentava antes dos 41.
      const perda = this.idade >= 36 ? 5 : this.idade >= 34 ? 3 : 2;
      ['ritmo', 'fisico', 'drible'].forEach((k) => (this.attrs[k] = Math.max(30, this.attrs[k] - perda)));
    }
  }

  // ------------------------------------------------------------ simulação
  simularTemporada() {
    if (this.temporadaSimulada) return this.relatorio;

    this._aplicarTreino();
    const ovr = this.ovr;
    const papel = this.papel();
    const clube = this.clube();
    const comp = this.compDoClube();
    const forcaClube = this.forcaDoClube();

    // QUANTOS JOGOS ELE FAZ NO ANO.
    //
    // O Gustavo: "meu jogador joga poucos jogos, trinta e poucas partidas, e um
    // jogador de futebol hoje joga cinquenta pra mais. Parece que voces estão lendo
    // só a liga local". Era exatamente isso: a conta olhava o campeonato e mais nada.
    // Agora cada competição que o clube disputa entra na conta — e o relatório diz
    // quantos jogos vieram de onde.
    const rodadasDaLiga = comp && comp.country === 'Brasil' && comp.tier === 1 ? 38 : 34;
    const doPaisJogos = this.league.clubs.filter((c) => c.country === (comp ? comp.country : ''));
    const melhorDoPais = doPaisJogos.reduce((m, c) => Math.max(m, this.forcaDoClube(c)), 60);
    const grandeza = clamp((forcaClube - (melhorDoPais - 18)) / 18, 0, 1);

    const calendario = [{ nome: comp ? comp.name : 'Campeonato', jogos: rodadasDaLiga }];
    // Copa nacional: todo clube entra. Quanto maior o clube, mais longe costuma ir.
    calendario.push({ nome: nomeDaCopaNacional(comp ? comp.country : ''),
      jogos: 2 + Math.round(grandeza * 5 + Math.random() * 3) });
    // Estadual: no Brasil a temporada abre por ele, e são muitos jogos.
    if (comp && comp.country === 'Brasil') calendario.push({ nome: 'Estadual', jogos: 11 + rnd(4) });
    // Continental: só quem se classificou.
    if (comp && comp.tier === 1 && forcaClube >= 76) {
      calendario.push({ nome: nomeDaCopaContinental(comp.country),
        jogos: 6 + Math.round(grandeza * 7 + Math.random() * 3) });
    }
    const jogosDoClube = calendario.reduce((s, x) => s + x.jogos, 0);

    // Dentro disso, quanto ELE joga depende do papel no elenco.
    const fatia = { estrela: 0.86, titular: 0.74, rotacao: 0.46, reserva: 0.17 }[papel];
    let corte = fatia * (0.9 + Math.random() * 0.2);
    if (this.idade <= 17) corte *= 0.45;                          // moleque não joga tudo
    else if (this.idade <= 19) corte *= 0.75;
    if (this.lesao > 0) corte *= (1 - this.lesao / 12);
    const fisio = [1, 0.66, 0.5, 0.33][this.nivelDe('fisio')];
    this.lesao = Math.max(0, Math.round(this.lesao * fisio) - 1);
    const bonusEsp = this._bonusEspecialidades();
    corte += bonusEsp.jogosExtra;      // quem aguenta a temporada joga mais
    let jogos = Math.max(0, Math.round(jogosDoClube * clamp(corte, 0, 0.95)));
    // de onde vieram os jogos, para o relatório poder mostrar
    const porCompeticao = calendario.map((x) => ({ nome: x.nome,
      jogos: Math.round(x.jogos * clamp(corte, 0, 0.95)) }));

    // produção: quanto ele está acima da média da liga
    const mediaLiga = comp
      ? this.league.clubs.filter((c) => c.comp === comp.id).reduce((s, c) => s + this.forcaDoClube(c), 0) / Math.max(1, this.league.clubs.filter((c) => c.comp === comp.id).length)
      : 70;
    const acima = (ovr - mediaLiga) / 10;
    // As decisões pesam MUITO mais: antes cada ponto de bônus mexia 3% e não dava
    // para sentir. Agora escolher certo (ou errado) muda a temporada de verdade.
    // O quanto ele esta ACIMA da liga pesa mais do que pesava. Com 0,55 um jogador
    // de overall 92 tinha mediana de 22 gols no ano — pouco para quem e o melhor em
    // campo toda semana. Quem esta na media da liga nao sente diferenca (acima ~ 0);
    // quem e muito superior, sente.
    const mult = clamp(1 + acima * 0.82 + this.bonusDesempenho * 0.09
      + (this.forma - 60) / 120 + (this.moral - 60) / 200, 0.25, 3.6);
    const prod = PRODUCAO[this.posicao];

    // Fator de maturidade: aos 16 e 17 o corpo e a cabeça ainda não sustentam uma
    // temporada de artilheiro, por melhor que ele seja.
    const maturidade = this.idade <= 16 ? 0.30 : this.idade <= 17 ? 0.45 : this.idade <= 18 ? 0.62
      : this.idade <= 19 ? 0.78 : this.idade <= 21 ? 0.92 : 1;
    const aj = AJUSTE_SUB[this.sub] || { gol: 1, ass: 1 };
    const golsBrutos = Math.max(0, Math.round(jogos * prod.gol * aj.gol * mult * maturidade * (0.7 + Math.random() * 0.6)));
    const assistBrutas = Math.max(0, Math.round(jogos * prod.ass * aj.ass * mult * maturidade * (0.7 + Math.random() * 0.6)));
    // A TEMPORADA MAGICA. Existe e e rara: o Messi de 2011-12 fez 73 gols, o Ronaldo
    // fez 61. Sem isto o jogo tinha um teto de fato — 421 temporadas simuladas e
    // nenhuma passava de 45 gols, porque o multiplicador de desempenho nunca chegava
    // perto do proprio limite. A chance cresce com o quanto o jogador esta ACIMA da
    // liga em que joga: quem e muito superior ao redor tem ano de numero absurdo.
    const superioridade = clamp((ovr - mediaLiga) / 14, 0, 1);
    const magica = Math.random() < 0.05 + superioridade * 0.13
      ? 1.18 + Math.random() * 0.34 + superioridade * 0.2
      : 1;
    if (magica > 1) this.temporadaMagica = true;
    // O que as especialidades somam: bola parada vira gol, drible vira assistencia.
    const espec = this._bonusEspecialidades();
    const gols = freioSuave(Math.round(golsBrutos * magica + jogos * espec.golsExtra), jogos,
      this.posicao === 'A' ? 0.72 : 0.38);
    const assist = freioSuave(Math.round(assistBrutas * (1 + (magica - 1) * 0.7) + jogos * espec.assistExtra),
      jogos, 0.38);
    // a nota acompanha o que ele produziu de fato — 30 gols não podem dar nota 6.5
    const esperado = jogos * (prod.gol + prod.ass) || 1;
    const rendimento = (gols + assist) / esperado;
    const nota = clamp(6.0 + acima * 0.32 + (rendimento - 1) * 0.85 + (this.forma - 60) / 260
      + espec.nota + (Math.random() - 0.5) * 0.4, 4.3, 9.7);

    // o clube na competição
    const posicaoLiga = this._simularPosicaoDoClube(forcaClube, comp);
    const titulos = [];
    if (posicaoLiga === 1) titulos.push(comp ? comp.name : 'Campeonato');

    // copas: as finais ficam guardadas para o jogador poder ASSISTIR
    const finais = this._copas(forcaClube, comp);
    finais.filter((f) => f.venceu).forEach((f) => titulos.push(f.copa));

    // acesso e rebaixamento — ganhar a Série D tem de levar você para a Série C
    const movimento = this._acessoOuQueda(posicaoLiga, comp, clube);

    // prêmios
    const premios = this._premios({ gols, assist, nota, jogos, posicaoLiga, ovr, titulos,
      mediaLiga, tier: comp ? comp.tier : 3 });

    // seleção
    const sel = this._selecao(ovr, nota);
    // braçadeira da seleção: só para quem é referência de verdade
    if (sel.convocado && !this.capitaoSelecao && ovr >= 86 && this.reputacao >= 70 && this.idade >= 26) {
      this.capitaoSelecao = true;
      sel.virouCapitao = true;
    }
    if (sel.titulo) titulos.push(sel.titulo);

    // objetivo cumprido?
    const cumpriu = this._checarObjetivo({ gols, assist, jogos, nota, titulos });

    // dinheiro do ano
    const salarioAno = this.salario * 12;
    const patroc = (this.patrocinioMaterial ? this.patrocinioMaterial.valor : 0)
      + (this.patrocinioImagem ? this.patrocinioImagem.valor : 0);
    this.dinheiro += salarioAno + patroc;

    // REPUTAÇÃO. A fórmula só premiava nota ACIMA de 6,5, e ignorava quem o jogador
    // virou. Jogando a carreira eu vi um atacante que era "estrela do time", que subiu
    // de 57 para 68 de overall em duas temporadas, com reputação ZERO e travada ali —
    // e reputação zero fecha tudo: não vem patrocínio (precisa de 20) nem proposta de
    // clube melhor.
    //
    // Agora existe um PISO ligado ao que você é: o seu nível e o tamanho do clube onde
    // você joga. Um 68 na Série D é conhecido na região; um 90 na Série A é conhecido
    // no país. O desempenho continua mexendo em cima disso, para cima e para baixo.
    const pisoRep = Math.max(0, (this.ovr - 55) * 1.2 * (this.forcaDoClube() / 75));
    const porDesempenho = this.reputacao + (nota - 6.5) * 4
      + premios.length * 5 + titulos.length * 4 + (cumpriu ? 3 : -3);
    this.reputacao = clamp(Math.max(pisoRep, porDesempenho), 0, 100);
    // O técnico julga pelo que viu em campo, mas a confiança CONVERGE em vez de
    // acumular. Somando temporada a temporada, ela caía a zero e não voltava mais,
    // por melhor que fosse o ano seguinte.
    const alvo = clamp(50 + (nota - 6.5) * 22 + (cumpriu ? 12 : -12) + (this.capitao ? 6 : 0), 0, 100);
    this.relacaoTecnico = clamp(this.confiancaDoTecnico() + (alvo - this.confiancaDoTecnico()) * 0.55, 0, 100);
    const pisoMoral = this.nivelDe('mental') ? 25 + 10 * this.nivelDe('mental') : 0;
    this.moral = clamp(this.moral + (cumpriu ? 10 : -12) + titulos.length * 6, pisoMoral, 100);
    this.forma = clamp(this.forma + rnd(20) - 8, 20, 100);

    // acumula
    // JOGO DE SELEÇÃO É JOGO. O Gustavo: "os jogos de seleção tinham que contar no
    // total da temporada". Contam — no total da carreira e na tela do ano, com o
    // detalhe de quanto veio de cada lado.
    this.carreira.jogos += jogos + sel.jogos;
    this.carreira.gols += gols + sel.gols;
    this.carreira.assist += assist;
    this.carreira.titulos.push(...titulos);
    this.carreira.premios.push(...premios);
    this.selecao.jogos += sel.jogos; this.selecao.gols += sel.gols;
    if (sel.titulo) this.selecao.titulos.push(sel.titulo);

    // Temporada de outro mundo empurra o teto para cima: quem joga muito acima do
    // esperado descobre que era melhor do que se pensava.
    if (nota >= 7.5 && cumpriu && this.idade <= 28 && this.potencial < 97) this.potencial++;

    // lesão séria: vira uma DECISÃO na próxima temporada, não só um número
    this.lesaoGrave = null;
    if (this.lesao >= 3 || (jogos < 20 && this.lesao > 0)) {
      this.lesaoGrave = { semanas: 6 + rnd(10) };
    }

    const comp2 = this.compDoClube();
    this.disputaBolaDeOuro = (ovr >= 84)
      ? this._bolaDeOuro({ gols, assist, nota, titulos, ovr, comp: comp2 })
      : null;
    if (this.disputaBolaDeOuro && this.disputaBolaDeOuro.venceu
        && !premios.some((x) => x.includes('Bola de Ouro'))) premios.push('Bola de Ouro');

    const rival = this._rodarRival();
    const marcos = this._marcos(sel);

    this.relatorio = {
      ano: this.ano, idade: this.idade, clube: clube ? clube.name : '—', comp: comp ? comp.name : '—',
      papel, jogos, porCompeticao, jogosDoClube, gols, assist, nota: Math.round(nota * 10) / 10, posicaoLiga,
      titulos, premios, selecao: sel, objetivo: this.objetivo, cumpriu, ovr, finais, movimento,
      campanha: finais.campanha || [],
      ganhouOvr: ovr - (this._ovrAnterior != null ? this._ovrAnterior : ovr),
      salarioAno, patrocinio: patroc, marcos, lesaoGrave: this.lesaoGrave,
      rival: rival ? { ...rival } : null, manchete: null,
      bolaDeOuro: this.disputaBolaDeOuro,
    };
    this.relatorio.manchete = this._manchete(this.relatorio);
    this.historico.push(this.relatorio);
    this.temporadaSimulada = true;
    // quantas vezes você entrou em campo: é o que vai pesar no treino do ano que vem
    this._jogosDoAnoPassado = this.relatorio.jogos;
    this.propostas = this._gerarPropostas(nota, premios.length, titulos.length);
    return this.relatorio;
  }

  // ---------------------------------------------------------- copas
  //
  // Cada copa vira uma CAMPANHA: você chega (ou não) à final, e a final tem placar e
  // adversário, para poder ser assistida. Chegar à final de uma copa nacional jogando
  // a 4ª divisão é raríssimo — a chance sai da sua força comparada à do melhor clube
  // do país, e não de um número fixo como antes.
  _copas(forcaClube, comp) {
    if (!comp) return [];
    const doPais = this.league.clubs.filter((c) => c.country === comp.country);
    const melhor = doPais.reduce((m, c) => Math.max(m, this.forcaDoClube(c)), 60);
    const nivel = clamp((forcaClube - (melhor - 15)) / 15, 0, 1);   // 0 = clube pequeno

    const campanhas = [];
    const disputar = (copa, chanceFinal, forcaRival) => {
      if (!chance(chanceFinal)) return;
      const rival = doPais
        .filter((c) => c.id !== this.clubeId && this.forcaDoClube(c) >= forcaRival - 6)
        .sort(() => Math.random() - 0.5)[0];
      const minha = forcaClube + (Math.random() - 0.5) * 10;
      const dele = (rival ? this.forcaDoClube(rival) : forcaClube) + (Math.random() - 0.5) * 10;
      const venceu = minha >= dele;
      const gm = venceu ? 1 + rnd(3) : rnd(2);
      const gs = venceu ? Math.min(gm - 1, rnd(2)) : gm + 1 + rnd(2);
      campanhas.push({
        copa, venceu, adversario: rival ? rival.name : 'Adversário',
        adversarioId: rival ? rival.id : null, placar: [gm, gs],
      });
    };

    disputar(nomeDaCopaNacional(comp.country), 0.03 + Math.pow(nivel, 2) * 0.30, melhor - 10);
    if (comp.tier === 1 && forcaClube >= 76) {
      disputar(nomeDaCopaContinental(comp.country), 0.10 + nivel * 0.18, melhor - 4);
    }

    // ATÉ ONDE O CLUBE FOI em cada competição, e não só quando chegou à final.
    // O Gustavo: "seria legal você mostrar no final da temporada um resumo, em que
    // fase eu parei na copa nacional, no estadual, se joguei uma copa continental".
    // Sem isto o ano acabava e não se sabia nada além da posição no campeonato.
    const FASES = ['Primeira fase', 'Segunda fase', 'Oitavas', 'Quartas', 'Semifinal', 'Final'];
    const ateOndeFoi = (nome, forcaBase, entradaTardia) => {
      const jaTem = campanhas.find((x) => x.copa === nome);
      if (jaTem) return { copa: nome, fase: jaTem.venceu ? 'Campeão' : 'Vice', campeao: jaTem.venceu };
      // clube grande entra mais tarde e costuma ir mais longe
      let f = entradaTardia ? 2 : 0;
      while (f < FASES.length - 1 && chance(0.30 + forcaBase * 0.34)) f++;
      return { copa: nome, fase: `Eliminado — ${FASES[f].toLowerCase()}`, campeao: false };
    };

    const campanha = [ateOndeFoi(nomeDaCopaNacional(comp.country), nivel, nivel > 0.6)];
    if (comp.country === 'Brasil') campanha.push(ateOndeFoi('Estadual', nivel, false));
    if (comp.tier === 1 && forcaClube >= 76) {
      campanha.push(ateOndeFoi(nomeDaCopaContinental(comp.country), nivel * 0.8, true));
    }
    campanhas.campanha = campanha;
    return campanhas;
  }

  // ---------------------------------------------------------- acesso / queda
  _compVizinha(comp, direcao) {
    if (!comp) return null;
    return this.league.competitions.find((c) => c.country === comp.country && c.tier === comp.tier + direcao);
  }

  _acessoOuQueda(posicao, comp, clube) {
    if (!comp || !clube) return null;
    const nClubes = this.league.clubs.filter((c) => c.comp === comp.id).length;
    // Cada país tem a sua regra (ver paises.js): 4 no Brasil, 3 na Inglaterra,
    // 2 na Alemanha, nenhuma na MLS.
    const [sobem, caem] = vagasDeAcesso(comp.country);

    const acima = this._compVizinha(comp, -1);
    if (acima && sobem > 0 && posicao <= sobem) {
      clube.comp = acima.id;
      return { tipo: 'subiu', de: comp.name, para: acima.name };
    }
    const abaixo = this._compVizinha(comp, +1);
    if (abaixo && caem > 0 && posicao > nClubes - caem) {
      clube.comp = abaixo.id;
      return { tipo: 'caiu', de: comp.name, para: abaixo.name };
    }
    return null;
  }

  _simularPosicaoDoClube(forcaClube, comp) {
    if (!comp) return 1;
    let rivais = this.league.clubs.filter((c) => c.comp === comp.id);
    // Liga grande demais joga em GRUPOS (a Série D tem 64 clubes). Sem isto o
    // relatório dizia "33º lugar" numa competição que, na prática, tem 16 clubes
    // na sua tabela.
    if (rivais.length > 24) {
      const porGrupo = rivais.length >= 48 ? 16 : Math.ceil(rivais.length / 2);
      const ordem = rivais.slice().sort((a, b) => this.forcaDoClube(b) - this.forcaDoClube(a));
      const meu = ordem.findIndex((c) => c.id === this.clubeId);
      const nGrupos = Math.ceil(ordem.length / porGrupo);
      const grupoDoMeu = meu < 0 ? 0 : (Math.floor(meu / nGrupos) % 2 === 0
        ? meu % nGrupos : nGrupos - 1 - (meu % nGrupos));
      rivais = ordem.filter((_, i) => {
        const volta = Math.floor(i / nGrupos);
        const g = volta % 2 === 0 ? i % nGrupos : nGrupos - 1 - (i % nGrupos);
        return g === grupoDoMeu;
      });
    }
    const notas = rivais.filter((c) => c.id !== this.clubeId)
      .map((c) => this.forcaDoClube(c) + (Math.random() - 0.5) * 7);
    const minha = forcaClube + (Math.random() - 0.5) * 7 + (this.papel() === 'estrela' ? 1.5 : 0);
    return notas.filter((n) => n > minha).length + 1;
  }

  _premios({ gols, assist, nota, jogos, posicaoLiga, ovr, titulos, mediaLiga, tier }) {
    const out = [];
    const destaque = nota >= 7.4 && jogos >= 20;

    // Prêmios DO CAMPEONATO: valem em qualquer divisão — ser artilheiro da Série D é
    // ser artilheiro da Série D, e o nome do prêmio já diz isso.
    if (this.posicao === 'A' && gols >= 18 && chance(0.55)) out.push('Artilheiro do campeonato');
    if (this.posicao === 'G' && nota >= 7.3 && chance(0.5)) out.push('Luva de Ouro');
    if (destaque && posicaoLiga <= 3 && chance(0.45)) out.push('MVP do campeonato');
    if (destaque && chance(0.5)) out.push('Seleção do campeonato');

    // Prêmios MUNDIAIS: o Golden Boy e a Bola de Ouro olham o planeta inteiro. Ninguém
    // ganha Golden Boy jogando a quarta divisão, por mais gols que faça.
    const vitrine = tier <= 1 && mediaLiga >= 74;
    if (vitrine && this.idade <= 21 && ovr >= 80 && chance(0.35)) out.push('Golden Boy');
    const pontos = nota * 10 + gols * 1.6 + assist * 1.2 + titulos.length * 12 + (ovr - 80) * 2;
    if (vitrine && mediaLiga >= 77 && ovr >= 89 && pontos >= 145 && chance(0.22)) out.push('Bola de Ouro');
    return out;
  }

  // DISPUTA DE BOLA DE OURO: um pódio de verdade, com os craques do mundo e você
  // dentro da lista. Antes o prêmio simplesmente aparecia (ou não) e ninguém via a
  // briga — agora dá para ver quem ficou na frente e por quanto.
  _bolaDeOuro({ gols, assist, nota, titulos, ovr, comp }) {
    const meusPontos = gols * 4 + assist * 2 + ovr * 1.4 + titulos.length * 12
      + (this.selecao.titulos.length ? 8 : 0);

    // concorrentes: os melhores do mundo, com produção estimada e estável no ano
    const candidatos = [];
    for (const c of this.league.clubs) {
      for (const p of c.squad) {
        if (p.forca < 86) continue;
        const r = ((p.id * 2654435761 + this.temporada * 40503) % 1000) / 1000;
        const base = { A: 0.62, M: 0.28, L: 0.10, Z: 0.06, G: 0 }[p.posicao] || 0.2;
        const g = Math.round(34 * base * (0.75 + r * 0.6));
        const a = Math.round(g * 0.5 * (0.6 + r * 0.8));
        candidatos.push({ nome: p.nome, clube: c.name, gols: g, assist: a, ovr: p.forca,
          pontos: g * 4 + a * 2 + p.forca * 1.4 + (r > 0.7 ? 12 : 0) });
      }
    }
    candidatos.push({ nome: this.nome, clube: (this.clube() || {}).name || '—',
      gols, assist, ovr, pontos: meusPontos, euMesmo: true });
    candidatos.sort((x, y) => y.pontos - x.pontos);

    const podio = candidatos.slice(0, 3);
    const minhaPos = candidatos.findIndex((x) => x.euMesmo) + 1;
    // só vira notícia se você estiver brigando de verdade
    if (minhaPos > 10) return null;
    return { podio, minhaPos, venceu: podio[0] && podio[0].euMesmo };
  }

  _selecao(ovr, nota) {
    const conv = ovr >= 78 || (ovr >= 74 && this.reputacao > 55);
    this.selecao.convocado = conv;
    if (!conv) return { convocado: false, jogos: 0, gols: 0, torneio: null, titulo: null };
    const jogos = 4 + rnd(7);
    const gols = Math.max(0, Math.round(jogos * PRODUCAO[this.posicao].gol * (0.6 + Math.random())));
    let torneio = null, titulo = null;
    const ano = this.ano;
    if (ano % 4 === 2) torneio = 'Copa do Mundo';           // 2026, 2030, 2034...
    else if (ano % 4 === 0) torneio = torneioContinentalDe(this.nacionalidade);
    let final = null, campanha = null;
    if (torneio) {
      const forca = (ovr - 70) / 30 + nota / 20;
      const fmt = torneioDeSelecao(torneio);
      const paises = [...new Set(this.league.clubs.map((c) => c.country))]
        .filter((p) => p !== this.nacionalidade);

      // A CAMPANHA, FASE A FASE, no formato de verdade do torneio. Antes o jogo
      // sorteava só "chegou à final, sim ou não" — você nunca sabia se caiu nas
      // oitavas ou nos grupos, nem contra quem. A Copa do Mundo tem 48 seleções em 12
      // grupos e mata-mata a partir da fase de 32; a Eurocopa tem 24 em 6 grupos; a
      // Copa América tem 16 em 4 grupos e começa nas quartas.
      if (fmt && fmt.fases) {
        const fases = fmt.fases.map((f) => f.nome);
        campanha = { torneio, entram: fmt.entram, fases: [], ateOnde: fases[0] };
        // passar da fase de grupos é o mais fácil; cada mata-mata pesa mais
        let vivo = chance(clamp(0.45 + forca * 0.45, 0.25, 0.9));
        campanha.fases.push({ nome: fases[0], passou: vivo });
        for (let i = 1; i < fases.length && vivo; i++) {
          const rival = pick(paises) || 'Adversário';
          const passa = chance(clamp(0.30 + forca * 0.42, 0.12, 0.82));
          campanha.fases.push({ nome: fases[i], rival, passou: passa });
          campanha.ateOnde = fases[i];
          if (!passa) { vivo = false; break; }
          if (i === fases.length - 1) vivo = true;
        }
        const ultima = campanha.fases[campanha.fases.length - 1];
        campanha.campeao = ultima && ultima.nome === 'Final' && ultima.passou;
        // a final ganha o destaque que já existia na tela
        const fFinal = campanha.fases.find((f) => f.nome === 'Final');
        if (fFinal) {
          const venceu = !!fFinal.passou;
          const gm = venceu ? 1 + rnd(2) : rnd(2);
          const gs = venceu ? Math.min(gm - 1, rnd(2)) : gm + 1;
          let penA = 0, penB = 0;
          if (gm === gs) { penA = 4 + rnd(2); penB = penA - 1 - rnd(2); }
          final = { torneio, rival: fFinal.rival || 'Adversário', venceu, placar: [gm, gs], penA, penB };
          if (venceu) titulo = torneio;
        }
      } else {
        // torneio sem formato pesquisado (Copa Ouro, Copa da Ásia): como era antes
        const chegouFinal = chance(clamp(forca * 0.55, 0.08, 0.6));
        if (chegouFinal) {
          const rival = pick(paises) || 'Adversário';
          const venceu = chance(clamp(forca * 0.55, 0.2, 0.72));
          const gm = venceu ? 1 + rnd(2) : rnd(2);
          const gs = venceu ? Math.min(gm - 1, rnd(2)) : gm + 1;
          let penA = 0, penB = 0;
          if (gm === gs) { penA = 4 + rnd(2); penB = penA - 1 - rnd(2); }
          final = { torneio, rival, venceu, placar: [gm, gs], penA, penB };
          if (venceu) titulo = torneio;
        }
      }
    }
    return { convocado: true, jogos, gols, torneio, titulo, final, campanha };
  }

  _checarObjetivo({ gols, assist, jogos, nota, titulos }) {
    const o = this.objetivo;
    switch (o.tipo) {
      case 'gols': return gols >= o.n;
      case 'assist': return assist >= o.n;
      case 'ga': return gols + assist >= o.n;
      case 'jogos': return jogos >= o.n;
      case 'nota': return nota >= o.n;
      case 'titulo': return titulos.length > 0;
      default: return true;
    }
  }

  _marcos(sel) {
    const out = [];
    // A PRIMEIRA CONVOCAÇÃO é um momento, não uma linha de estatística. O Gustavo
    // pediu isso: "faltou o momento da primeira convocação".
    if (sel && sel.convocado && !this._jaFoiConvocado) {
      this._jaFoiConvocado = true;
      out.push(`Primeira convocação para a seleção ${this.nacionalidade || ''}`.trim());
    }
    const g = this.carreira.gols;
    for (const m of [50, 100, 200, 300, 400, 500]) {
      if (g >= m && !(this._marcosVistos || []).includes(m)) {
        (this._marcosVistos = this._marcosVistos || []).push(m);
        out.push(`${m} gols na carreira`);
      }
    }
    if (this.carreira.jogos >= 500 && !(this._marcosVistos || []).includes('j500')) {
      (this._marcosVistos = this._marcosVistos || []).push('j500');
      out.push('500 jogos na carreira');
    }
    return out;
  }

  // ------------------------------------------------------------ mercado
  _gerarPropostas(nota, nPremios, nTitulos) {
    const desejo = this.ovr + nota * 2 + nPremios * 4 + nTitulos * 3 + (this._propostaBoost ? 6 : 0);
    this._propostaBoost = false;
    // Teto de salto: ninguém sai da Série D direto para o Chelsea. O degrau que você
    // consegue subir cresce com a sua reputação.
    const atual = this.forcaDoClube();
    // O degrau é curto de propósito: não se sai da Série D para o Real Madrid.
    const teto = atual + 4 + this.reputacao / 10;
    const candidatos = this.league.clubs
      .filter((c) => c.id !== this.clubeId)
      .filter((c) => {
        const f = this.forcaDoClube(c);
        // O piso não pode passar do teto. Numa carreira muito vitoriosa o `desejo`
        // passava de 150 (overall + nota + prêmios + títulos), o piso virava 120 e
        // nenhum clube do mundo tinha força 120: o melhor jogador do jogo ficava
        // temporadas seguidas SEM UMA PROPOSTA, preso no mesmo clube.
        const piso = Math.min(desejo - 30, teto - 14);
        return f <= Math.min(desejo - 4, teto) && f >= piso && f > atual - 8;
      });
    if (!candidatos.length) return [];
    // mais portas abertas: ficar com uma proposta por temporada deixava o mercado morto
    const n = this.contrato <= 0 ? 4 : (desejo > 95 ? 4 : desejo > 85 ? 3 : 2);
    // O SORTEIO PUXA PARA OS MELHORES DA FAIXA. Sorteando plano, como era antes,
    // ganha quem é mais numeroso — e clube fraco é muito mais numeroso que clube
    // forte. Dava para estar no RB Leipzig e a melhor proposta da temporada ser o
    // Almagro, da segunda divisão argentina. Agora dois terços das propostas saem do
    // terço mais forte de quem te quer, e o resto continua aberto para surpresa.
    candidatos.sort((a, b) => this.forcaDoClube(b) - this.forcaDoClube(a));
    const topo = Math.max(1, Math.ceil(candidatos.length / 3));
    const escolhidos = [];
    for (let i = 0; i < n && candidatos.length; i++) {
      const daElite = Math.random() < 0.66;
      const limite = daElite ? Math.min(topo, candidatos.length) : candidatos.length;
      const c = candidatos.splice(rnd(limite), 1)[0];
      const f = this.forcaDoClube(c);
      escolhidos.push({
        clubeId: c.id, nome: c.name, liga: c.league, forca: Math.round(f),
        papel: this.ovr >= f + 2 ? 'titular' : this.ovr >= f - 3 ? 'rotação' : 'reserva',
        // o clube que te quer paga pelo que você VALE, não pelo que você ganhava
        // o clube que te quer paga pelo que você VALE naquele patamar de clube; o
        // salário antigo só serve de piso brando, para a proposta não ser um insulto
        salario: Math.round(Math.max(
          this.salario * 0.7,
          this.salarioDeMercado(this.ovr, f) * (1.0 + Math.random() * 0.45))),
        anos: 2 + rnd(4),
      });
    }
    return escolhidos.sort((a, b) => b.forca - a.forca);
  }

  aceitarProposta(clubeId) {
    const p = (this.propostas || []).find((x) => x.clubeId === clubeId);
    if (!p) return false;
    this.clubeId = p.clubeId; this.salario = p.salario; this.contrato = p.anos;
    this.relacaoTecnico = 55;   // técnico novo, crédito inicial
    this.moral = clamp(this.moral + 8, 0, 100);
    this.propostas = null;
    return true;
  }

  // Pedir para sair: você abre mão do contrato e o mercado te oferece clubes do
  // mesmo nível. Custa moral e reputação, como na vida real.
  pedirParaSair() {
    const atual = this.forcaDoClube();
    const candidatos = this.league.clubs
      .filter((c) => c.id !== this.clubeId)
      .filter((c) => { const f = this.forcaDoClube(c); return f >= atual - 6 && f <= atual + 5; });
    if (!candidatos.length) return [];
    this.moral = clamp(this.moral - 12, 0, 100);
    this.reputacao = clamp(this.reputacao - 4, 0, 100);
    this.contrato = 0;
    const escolhidos = [];
    for (let i = 0; i < 4 && candidatos.length; i++) {
      const c = candidatos.splice(rnd(candidatos.length), 1)[0];
      const f = this.forcaDoClube(c);
      escolhidos.push({
        clubeId: c.id, nome: c.name, liga: c.league, forca: Math.round(f),
        papel: this.ovr >= f + 2 ? 'titular' : this.ovr >= f - 3 ? 'rotação' : 'reserva',
        salario: Math.round(this.salario * (0.9 + Math.random() * 0.8)),
        anos: 2 + rnd(4),
      });
    }
    this.propostas = escolhidos.sort((a, b) => b.forca - a.forca);
    return this.propostas;
  }

  /** O que um jogador do seu nível ganha por mês, naquele clube.
   *
   *  Todo salário do jogo era uma porcentagem do salário ANTERIOR: a renovação
   *  multiplicava por 1,15 a 1,6 e a proposta de outro clube por 1,2 a 2,6. Como o
   *  contrato de base começa em uns 25 mil, o salário nunca alcançava o jogador: um
   *  atacante de 79 de overall, avaliado em 45 milhões, seguia ganhando 34 mil por
   *  mês — menos que um reserva de Série B de verdade.
   *
   *  Agora existe um piso ligado ao NÍVEL. Cresce junto com o overall, e clube grande
   *  paga mais que clube pequeno pelo mesmo jogador.
   */
  salarioDeMercado(ovr = this.ovr, forcaClube = this.forcaDoClube()) {
    const porNivel = 28000 * Math.pow(1.155, Math.max(0, ovr - 60));
    const porClube = Math.max(0.55, Math.min(1.9, forcaClube / 70));
    return Math.round(porNivel * porClube);
  }

  opcoesRenovacao() {
    if (this.contrato > 0) return null;
    // A renovação parte do que você VALE HOJE, não do que você ganhava. Isso corta
    // para os dois lados: quem estourou de bom não renova por 15% a mais do contrato
    // de garoto, e o veterano em queda renova por menos — antes o salário só subia, e
    // um jogador de 40 anos com 80 de overall ganhava 12 milhões por mês enquanto o
    // mercado dele era 500 mil.
    //
    // Quem manda é o mercado: se você virou um jogador de 90, o clube paga de 90 — e
    // limitar a subida a 160% por renovação fazia o craque de 94 ganhar 239 mil
    // enquanto valia quase 4 milhões. Na descida existe piso: o clube não corta mais
    // da metade de uma vez.
    const mercado = this.salarioDeMercado();
    const base = Math.max(this.salario * 0.55, mercado);
    return [
      { anos: 2, salario: Math.round(base * 1.15) },
      { anos: 3, salario: Math.round(base * 1.05) },
      { anos: 5, salario: Math.round(base * 0.95) },
    ];
  }

  renovar(anos, salario) { this.contrato = anos; this.salario = salario; this.moral = clamp(this.moral + 5, 0, 100); }

  // ------------------------------------------------------------ patrocínios
  ofertasPatrocinio() {
    const r = this.reputacao;
    const out = [];
    if (r >= 20) {
      const m = pick(MARCAS_MATERIAL);
      out.push({ tipo: 'material', marca: m, valor: Math.round(150000 * Math.pow(1.055, r)), anos: 3 });
    }
    if (r >= 45) {
      const m = pick(MARCAS_IMAGEM);
      out.push({ tipo: 'imagem', marca: m, valor: Math.round(120000 * Math.pow(1.06, r)), anos: 2 });
    }
    return out;
  }

  /** Trocar de marca no meio do contrato TEM preço. */
  multaDeSaida(novaOferta) {
    const atual = this.patrocinioMaterial;
    if (!atual || novaOferta.tipo !== 'material' || atual.marca === novaOferta.marca) return 0;
    const restam = Math.max(0, (atual.anos || 1) - (this.anosNoContratoAtual || 0));
    if (restam <= 0) return 0;
    return Math.round(atual.valor * restam * 0.6);
  }

  assinarPatrocinio(oferta) {
    if (oferta.tipo === 'material') {
      const mesma = this.patrocinioMaterial && this.patrocinioMaterial.marca === oferta.marca;
      if (!mesma) {
        // O Gustavo: "eu fechei um contrato de seis anos, se eu for sair eu vou ter
        // alguma consequência". Tem: você paga para romper, e a fidelidade zera.
        const multa = this.multaDeSaida(oferta);
        if (multa > 0) {
          this.dinheiro = Math.max(0, this.dinheiro - multa);
          this.ultimaMulta = { valor: multa, marca: this.patrocinioMaterial.marca };
        }
        this.anosComMarca = 0;
        this.anosNoContratoAtual = 0;
      }
      this.patrocinioMaterial = oferta;
    } else this.patrocinioImagem = oferta;
  }

  /** FIDELIDADE À MARCA, em degraus.
   *
   *  O Gustavo: "eu fiquei dez anos com a mesma marca de chuteira, eu ganhei uma
   *  chuteira especial — seria legal essas coisas". Antes havia um degrau só, aos
   *  três anos. Agora são quatro, e o último é o que acontece com quem virou a
   *  marca: a linha leva o nome dele para sempre.
   */
  _checarChuteira() {
    if (!this.patrocinioMaterial) return null;
    this.anosComMarca++;
    this.anosNoContratoAtual = (this.anosNoContratoAtual || 0) + 1;
    const marca = this.patrocinioMaterial.marca;
    const principal = { G: 'defesa', Z: 'defesa', L: 'ritmo', M: 'passe', A: 'finalizacao' }[this.posicao];
    const primeiro = this.nome.split(' ')[0];

    if (this.anosComMarca === 3 && !this.chuteiraAssinatura) {
      this.attrs[principal] = Math.min(99, this.attrs[principal] + 2);
      this.chuteiraAssinatura = `${marca} ${primeiro} ${this.ano}`;
      return { marca: this.chuteiraAssinatura, anos: 3,
        txt: `A ${marca} fez uma chuteira com o seu nome.` };
    }
    if (this.anosComMarca === 6 && !this.linhaPropria) {
      this.attrs[principal] = Math.min(99, this.attrs[principal] + 2);
      this.reputacao = clamp(this.reputacao + 6, 0, 100);
      this.patrocinioMaterial.valor = Math.round(this.patrocinioMaterial.valor * 1.4);
      this.linhaPropria = `Linha ${primeiro} — ${marca}`;
      return { marca: this.linhaPropria, anos: 6,
        txt: `Seis anos de casa: a ${marca} lançou uma linha inteira com o seu nome, e renovou por mais.` };
    }
    if (this.anosComMarca === 10 && !this.contratoVitalicio) {
      this.reputacao = clamp(this.reputacao + 10, 0, 100);
      this.contratoVitalicio = `${marca} — contrato vitalício`;
      this.rendaVitalicia = Math.round(this.patrocinioMaterial.valor * 0.8);
      return { marca: this.contratoVitalicio, anos: 10,
        txt: `Dez anos com a ${marca}. Eles te ofereceram um contrato vitalício — você não usa outra marca até morrer, e recebe por isso a vida toda.` };
    }
    return null;
  }

  // ------------------------------------------------------------ loja
  // nível atual de uma melhoria (0 = não tem)
  nivelDe(chave) { return (this.niveis && this.niveis[chave]) || 0; }

  comprar(item) {
    const perk = PERKS.find((x) => x.key === item);
    if (perk) {
      this.niveis = this.niveis || {};
      const atual = this.nivelDe(item);
      if (atual >= NIVEL_MAX) return false;
      const custo = precoDoNivel(perk, atual + 1);
      if (this.dinheiro < custo) return false;
      this.dinheiro -= custo;
      this.niveis[item] = atual + 1;
      if (!this.perks.includes(item)) this.perks.push(item);   // compatível com saves antigos
      return true;
    }
    const bem = BENS.find((x) => x.key === item);
    if (!bem || this.bens.includes(item) || this.dinheiro < bem.preco) return false;
    this.dinheiro -= bem.preco;
    this.bens.push(item);
    // O que você compra passa a fazer alguma coisa. Antes o iate e o tênis eram a
    // mesma coisa para o jogo: só saíam do caixa e entravam no patrimônio.
    const ef = bem.ef || {};
    if (ef.moral) this.moral = clamp(this.moral + ef.moral, 0, 100);
    if (ef.forma) this.forma = clamp(this.forma + ef.forma, 0, 100);
    if (ef.rep) this.reputacao = clamp(this.reputacao + ef.rep, 0, 100);
    if (ef.desempenho) this.bonusDesempenho += ef.desempenho;
    return true;
  }

  /** Renda anual que não vem do futebol (restaurante, clube da cidade, vitalício). */
  rendaFora() {
    const dosBens = this.bens.reduce((s, k) => {
      const b = BENS.find((x) => x.key === k);
      return s + ((b && b.ef && b.ef.rendaAnual) || 0);
    }, 0);
    return dosBens + (this.rendaVitalicia || 0);
  }

  patrimonio() {
    return this.dinheiro + this.bens.reduce((s, k) => s + (BENS.find((b) => b.key === k) || { preco: 0 }).preco, 0);
  }

  // ------------------------------------------------------------ virar o ano
  avancarTemporada() {
    if (!this.temporadaSimulada) this.simularTemporada();
    const chuteira = this._checarChuteira();
    this.evolucaoEspecialidade = this._avancarEspecialidade();
    // o que você montou fora do futebol rende todo ano
    const fora = this.rendaFora();
    if (fora > 0) this.dinheiro += fora;

    this._ovrAnterior = this.ovr;
    this.idade++; this.temporada++;
    this.contrato = Math.max(0, this.contrato - 1);

    // o mundo também envelhece — os outros clubes não ficam parados no tempo
    advanceWorld({ clubs: () => this.league.clubs, league: this.league, season: 0 }, 1,
      { userClubId: null, market: this.league.market });

    if (this._deveAposentar()) return { aposentou: true, chuteira };
    this._novaTemporada();
    return { aposentou: false, chuteira };
  }

  /** Quando pendurar as chuteiras.
   *
   *  Antes era quase só aos 41: no teste, TODOS os jogadores chegavam aos 43 ainda
   *  jogando. No futebol a conta é outra — a maioria para entre 33 e 38, e quem
   *  passa disso é exceção que ainda joga muito.
   */
  _deveAposentar() {
    if (this.idade >= 40) return true;
    if (this.idade >= 38) return chance(0.75);
    if (this.idade >= 36) return chance(this.ovr < 74 ? 0.6 : 0.3);
    if (this.idade >= 34 && (this.ovr < 70 || this.papel() === 'reserva')) return chance(0.4);
    if (this.idade >= 33 && this.ovr < 64) return chance(0.35);
    return false;
  }

  aposentar() {
    this.aposentado = true;
    const c = this.carreira;
    const anos = this.temporada - 1;

    // nota final 0..100 — pesa o que uma carreira realmente deixa
    // Os tetos são apertados de propósito: para chegar a "O Fenômeno" (92) é preciso
    // ir bem em TODAS as frentes — não basta empilhar gols por 25 temporadas.
    let n = 0;
    n += Math.min(22, c.gols * 0.055);
    n += Math.min(10, c.assist * 0.055);
    n += Math.min(10, c.jogos * 0.013);
    n += Math.min(18, c.titulos.length * 1.4);
    n += Math.min(18, c.premios.length * 1.9);
    n += Math.min(8, this.selecao.titulos.length * 3);
    n += Math.min(14, Math.max(0, (this._picoOvr || this.ovr) - 72) * 0.55);
    const nota = clamp(Math.round(n), 0, 100);

    this.notaFinal = nota;
    this.tier = tierDe(nota);
    this.anosDeCarreira = anos;
    this._salvarNoRanking();
    return {
      nota, tier: this.tier, anos, idade: this.idade,
      jogos: c.jogos, gols: c.gols, assist: c.assist,
      titulos: c.titulos, premios: c.premios,
      patrimonio: this.patrimonio(), picoOvr: this._picoOvr || this.ovr,
      selecao: this.selecao,
    };
  }

  // ------------------------------------------------------------ ranking local
  _salvarNoRanking() {
    try {
      const chave = 'futebolfc_ranking_jogador';
      const lista = JSON.parse(localStorage.getItem(chave) || '[]');
      lista.push({
        nome: this.nome, pos: this.sigla, nota: this.notaFinal, tier: this.tier.nome,
        gols: this.carreira.gols, jogos: this.carreira.jogos,
        titulos: this.carreira.titulos.length, ano: this.ano,
      });
      lista.sort((a, b) => b.nota - a.nota);
      localStorage.setItem(chave, JSON.stringify(lista.slice(0, 50)));
    } catch (e) { /* sem localStorage (teste no terminal): ignora */ }
  }

  static ranking() {
    try { return JSON.parse(localStorage.getItem('futebolfc_ranking_jogador') || '[]'); }
    catch (e) { return []; }
  }

  // ------------------------------------------------------------ save
  //
  // Guardamos só o JOGADOR, nunca o mundo: os 30 mil jogadores dariam vários MB e
  // não cabem no localStorage. Ao carregar, o mundo é envelhecido de novo pelo mesmo
  // número de temporadas — os elencos dos outros clubes não voltam idênticos, mas
  // voltam com as idades e o nível certos para o ano em que você parou. Sem isso o
  // jogo abriria com o mundo em 2026 enquanto você está em 2040.
  toSnapshot() {
    const { league, ...resto } = this;
    return JSON.stringify({ v: 1, jogador: resto });
  }

  static fromSnapshot(dataset, raw) {
    const bruto = JSON.parse(raw);
    const o = bruto.v ? bruto.jogador : bruto;   // aceita saves antigos
    const pc = Object.create(PlayerCareer.prototype);
    Object.assign(pc, o);
    pc.league = dataset;
    const anos = Math.max(0, (pc.temporada || 1) - 1);
    if (anos) advanceWorld({ clubs: () => dataset.clubs, league: dataset }, anos, { userClubId: null, market: dataset.market });
    return pc;
  }
}

// registra o pico de overall a cada simulação (usado na nota final)
const _simOriginal = PlayerCareer.prototype.simularTemporada;
PlayerCareer.prototype.simularTemporada = function (...args) {
  const r = _simOriginal.apply(this, args);
  this._picoOvr = Math.max(this._picoOvr || 0, this.ovr);
  return r;
};
