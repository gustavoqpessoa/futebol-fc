// formacoes.js — as formações e, principalmente, QUE VAGA É CADA UMA.
//
// Isto vivia dentro do careerUI.js, então só a tela sabia que a vaga 1 é o
// lateral-ESQUERDO e a 4 é o lateral-DIREITO. O motor de simulação não fazia ideia,
// e por isso escalar dois laterais-esquerdos não tinha consequência nenhuma — o
// Gustavo pediu essa distinção várias vezes e ela nunca chegava ao jogo, só ao texto
// da tela.
//
// Agora as duas partes leem daqui: a tela para desenhar, o motor para PENALIZAR quem
// joga fora da posição.

export const FORMS = {
  '4-4-2': { d: 4, m: 4, a: 2, coords: [[50, 90], [15, 70], [38, 70], [62, 70], [85, 70], [15, 46], [38, 46], [62, 46], [85, 46], [35, 22], [65, 22]] },
  '4-3-3': { d: 4, m: 3, a: 3, coords: [[50, 90], [15, 72], [38, 72], [62, 72], [85, 72], [28, 48], [50, 50], [72, 48], [20, 24], [50, 20], [80, 24]] },
  '3-5-2': { d: 3, m: 5, a: 2, coords: [[50, 90], [28, 72], [50, 74], [72, 72], [12, 50], [32, 46], [50, 44], [68, 46], [88, 50], [38, 22], [62, 22]] },
  '4-2-3-1': { d: 4, m: 5, a: 1, coords: [[50, 90], [15, 72], [38, 72], [62, 72], [85, 72], [36, 56], [64, 56], [18, 34], [50, 36], [82, 34], [50, 16]] },
  '4-1-4-1': { d: 4, m: 5, a: 1, coords: [[50, 90], [15, 72], [38, 72], [62, 72], [85, 72], [50, 58], [15, 40], [38, 40], [62, 40], [85, 40], [50, 16]] },
  '4-5-1': { d: 4, m: 5, a: 1, coords: [[50, 90], [15, 72], [38, 72], [62, 72], [85, 72], [12, 46], [33, 48], [50, 44], [67, 48], [88, 46], [50, 18]] },
  '5-3-2': { d: 5, m: 3, a: 2, coords: [[50, 90], [10, 66], [30, 74], [50, 76], [70, 74], [90, 66], [30, 48], [50, 46], [70, 48], [38, 20], [62, 20]] },
  '3-4-3': { d: 3, m: 4, a: 3, coords: [[50, 90], [28, 74], [50, 76], [72, 74], [12, 50], [38, 48], [62, 48], [88, 50], [20, 22], [50, 18], [80, 22]] },
  '4-4-2 losango': { d: 4, m: 4, a: 2, coords: [[50, 90], [15, 72], [38, 72], [62, 72], [85, 72], [50, 58], [26, 44], [74, 44], [50, 32], [38, 16], [62, 16]] },
  '3-6-1': { d: 3, m: 6, a: 1, coords: [[50, 90], [28, 74], [50, 76], [72, 74], [10, 52], [32, 50], [50, 46], [68, 50], [90, 52], [50, 30], [50, 14]] },
  '5-4-1': { d: 5, m: 4, a: 1, coords: [[50, 90], [10, 66], [30, 74], [50, 76], [70, 74], [90, 66], [18, 46], [40, 44], [60, 44], [82, 46], [50, 18]] },
};

// As 11 vagas de CADA formação, escritas à mão e na ordem das coordenadas acima.
//
// Antes isto era uma regra genérica ("se o meio tem 4 ou mais, o primeiro é volante").
// O resultado é que o 4-4-2 escalava um volante, e 4-4-2 não tem volante: tem dois
// meio-campistas por dentro e dois homens pelos lados. Quem tem volante, dois MC e um
// meia é o 4-4-2 losango (o 4-1-2-1-2). Regra genérica não dá conta de futebol —
// cada formação é uma formação.
const SLOTS = {
  '4-4-2':         ['GOL', 'LE', 'ZAG', 'ZAG', 'LD', 'PE', 'MC', 'MC', 'PD', 'ATA', 'ATA'],
  '4-3-3':         ['GOL', 'LE', 'ZAG', 'ZAG', 'LD', 'MC', 'VOL', 'MC', 'PE', 'ATA', 'PD'],
  '3-5-2':         ['GOL', 'ZAG', 'ZAG', 'ZAG', 'LE', 'VOL', 'MEI', 'VOL', 'LD', 'ATA', 'ATA'],
  '4-2-3-1':       ['GOL', 'LE', 'ZAG', 'ZAG', 'LD', 'VOL', 'VOL', 'PE', 'MEI', 'PD', 'ATA'],
  '4-1-4-1':       ['GOL', 'LE', 'ZAG', 'ZAG', 'LD', 'VOL', 'PE', 'MC', 'MC', 'PD', 'ATA'],
  '4-5-1':         ['GOL', 'LE', 'ZAG', 'ZAG', 'LD', 'PE', 'MC', 'MEI', 'MC', 'PD', 'ATA'],
  '5-3-2':         ['GOL', 'LE', 'ZAG', 'ZAG', 'ZAG', 'LD', 'VOL', 'MEI', 'MC', 'ATA', 'ATA'],
  '3-4-3':         ['GOL', 'ZAG', 'ZAG', 'ZAG', 'LE', 'MC', 'MC', 'LD', 'PE', 'ATA', 'PD'],
  '4-4-2 losango': ['GOL', 'LE', 'ZAG', 'ZAG', 'LD', 'VOL', 'MC', 'MC', 'MEI', 'ATA', 'ATA'],
  '3-6-1':         ['GOL', 'ZAG', 'ZAG', 'ZAG', 'LE', 'MC', 'VOL', 'MC', 'LD', 'MEI', 'ATA'],
  '5-4-1':         ['GOL', 'LE', 'ZAG', 'ZAG', 'ZAG', 'LD', 'PE', 'MC', 'MC', 'PD', 'ATA'],
};

// O nome da vaga muda com a altura em que ela joga: PE lá na frente é ponta-esquerda,
// PE na linha de quatro do meio-campo é meia-esquerda. É a mesma perna, papel diferente.
const NOME = { GOL: 'Goleiro', ZAG: 'Zagueiro', LE: 'Lateral-esquerdo', LD: 'Lateral-direito',
  VOL: 'Volante', MC: 'Meio-campo', MEI: 'Meia', PE: 'Ponta-esquerda', PD: 'Ponta-direita', ATA: 'Atacante' };
const GRUPO = { GOL: 'G', ZAG: 'DEF', LE: 'DEF', LD: 'DEF', VOL: 'MID', MC: 'MID', MEI: 'MID',
  PE: 'ATT', PD: 'ATT', ATA: 'ATT' };

/** As 11 vagas da formação, cada uma sabendo que posição ela é. */
export function slotsDaFormacao(formation) {
  const f = FORMS[formation] || FORMS['4-4-2'];
  const subs = SLOTS[formation] || SLOTS['4-4-2'];
  const nAtaque = f.a;
  return subs.map((sub, i) => {
    let lbl = NOME[sub];
    // um PE/PD que está entre os 11 - nAtaque primeiros é meia de lado, não ponta
    if ((sub === 'PE' || sub === 'PD') && i < 11 - nAtaque)
      lbl = sub === 'PE' ? 'Meia-esquerda' : 'Meia-direita';
    // ala do 3-5-2 e do 3-6-1: é lateral, mas joga a linha inteira
    if ((sub === 'LE' || sub === 'LD') && f.d === 3)
      lbl = sub === 'LE' ? 'Ala-esquerda' : 'Ala-direita';
    return { g: GRUPO[sub], lbl, sub };
  });
}

/** Posições que servem de quebra-galho para cada vaga, da menos pior para a pior. */
/** O que custa jogar cada um numa vaga que não é a dele, em pontos de overall.
 *
 *  A versão antiga tratava "parecida" como uma lista genérica e cobrava 4 ou 6 para
 *  qualquer vizinha. O Gustavo, escalando o Bolton: "o MC pode jogar de volante
 *  tranquilo, ou jogar de meia, tudo bem. O que não pode é o MC jogar de ponta
 *  direita. Agora o meia jogar de volante também é complicado". É isso que a tabela
 *  diz agora, par a par — e o aviso de "fora de posição" só aparece de 3 para cima,
 *  então volante/meia-central deixou de ser alarme.
 */
export const TROCAS = {
  GOL: {},
  ZAG: { VOL: 3, LD: 4, LE: 4 },
  LE:  { LD: 3, ZAG: 4, PE: 5, MC: 7 },
  LD:  { LE: 3, ZAG: 4, PD: 5, MC: 7 },
  VOL: { MC: 1, ZAG: 3, MEI: 5 },
  MC:  { VOL: 1, MEI: 1, ZAG: 6, PE: 7, PD: 7 },
  MEI: { MC: 1, PE: 3, PD: 3, ATA: 4, VOL: 5 },
  PE:  { PD: 2, MEI: 3, ATA: 4, LE: 5, MC: 6 },
  PD:  { PE: 2, MEI: 3, ATA: 4, LD: 5, MC: 6 },
  ATA: { PE: 4, PD: 4, MEI: 4, MC: 7 },
};

export const PARECIDAS = {
  LE: ['LD', 'ZAG'], LD: ['LE', 'ZAG'], ZAG: ['LD', 'LE'],
  VOL: ['MC', 'ZAG'], MC: ['VOL', 'MEI'], MEI: ['MC', 'PE', 'PD'],
  PE: ['PD', 'MEI', 'ATA'], PD: ['PE', 'MEI', 'ATA'], ATA: ['PE', 'PD', 'MEI'],
  GOL: [],
};

/** Quanto o jogador PERDE por estar fora da posição natural, em pontos de overall.
 *
 *  É o que faz a distinção entre lateral-esquerdo e direito valer alguma coisa. Sem
 *  penalidade, escalar dois canhotos na defesa não mudava nada no resultado e a
 *  separação era só enfeite de tela.
 */
export function penalidadeDePosicao(subVaga, subJogador) {
  if (!subVaga || !subJogador || subVaga === subJogador) return 0;
  if (subVaga === 'GOL' || subJogador === 'GOL') return 25;   // linha no gol é desastre
  const t = TROCAS[subVaga];
  const v = t && t[subJogador];
  return v == null ? 9 : v;                                   // posição totalmente trocada
}

