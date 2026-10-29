// base.js — a CATEGORIA DE BASE do clube.
//
// O Gustavo: "seria legal ter a base, o elenco de base, pra gente poder ver se
// alguém vai ser um bom jogador. Não encontrei isso." O jogo tinha olheiro (que
// mostra joia dos OUTROS clubes) mas não tinha os garotos da sua própria casa.
//
// A regra que faz isso valer alguma coisa: o teto do garoto é SECRETO. Ninguém no
// futebol sabe até onde um moleque de 16 anos vai chegar — o que existe é a leitura
// de quem observa, e ela erra. Então o olheiro dá uma FAIXA, e a faixa aperta
// conforme ele joga e treina. Promover cedo é aposta; esperar demais é perder ele
// de graça no fim do contrato.

import { bandeiraDoJogador } from './paises.js';
import { nomeDoPais } from './nomes.js';

const SUBS = [
  ['GOL', 'G', 1], ['ZAG', 'Z', 3], ['LE', 'L', 1.4], ['LD', 'L', 1.4],
  ['VOL', 'M', 2], ['MC', 'M', 2], ['MEI', 'M', 1.6],
  ['PE', 'A', 1.5], ['PD', 'A', 1.5], ['ATA', 'A', 2.2],
];

/** Gerador com semente: a base de um clube é sempre a mesma na mesma carreira. */
function semente(n) {
  let x = (n * 1103515245 + 12345) & 0x7fffffff;
  return () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; };
}


function posicaoPorPeso(r) {
  const total = SUBS.reduce((s, [, , p]) => s + p, 0);
  let v = r() * total;
  for (const [sub, grupo] of SUBS.map((x) => x)) { v -= x_peso(sub); if (v <= 0) return [sub, grupo]; }
  return ['MC', 'M'];
  function x_peso(sub) { return (SUBS.find((s) => s[0] === sub) || [, , 1])[2]; }
}

/** A leitura do olheiro sobre o teto do garoto: uma FAIXA, não um número. */
export function leituraDoOlheiro(p) {
  const conhecido = p.observado || 0;               // quanto já se sabe dele (0 a 1)
  const margem = Math.max(2, Math.round(11 * (1 - conhecido)));
  const centro = p.potencial + (p.vies || 0);       // o olheiro tem vício próprio
  return { de: Math.max(p.forca, centro - margem), ate: Math.min(91, centro + margem), margem };
}

/** Em uma linha: o que o olheiro diria desse garoto. */
export function parecerDoOlheiro(p) {
  const { de, ate, margem } = leituraDoOlheiro(p);
  const conf = margem <= 3 ? 'já dá para cravar'
    : margem <= 6 ? 'a leitura está ficando firme'
    : margem <= 9 ? 'ainda dá para errar feio'
    : 'é cedo demais para saber';
  return `Teto entre ${de} e ${ate} — ${conf}`;
}

/** Monta a base de um clube. Determinística: o mesmo clube dá sempre os mesmos nomes. */
export function gerarBase(club, forcaDoClube, quantos = 10) {
  const r = semente(club.id * 7919 + Math.round(forcaDoClube));
  const fora = [];
  for (let i = 0; i < quantos; i++) {
    const [sub, grupo] = posicaoPorPeso(r);
    const idade = 15 + Math.floor(r() * 4);                     // 15 a 18
    // Garoto de base é garoto: começa bem abaixo do time principal e cresce.
    // Na primeira calibragem eles saíam com 68 num clube de 79 — quase titulares
    // aos 15 anos, o que não existe.
    // O GAROTO NÃO É UM ZUMBI. No Vaduz (o clube mais fraco da Suíça) a base saía
    // com 30 de overall — o Gustavo: "30 de overall não tem como, o jogador não sabe
    // nem andar em campo". Mesmo num clube pequeno, quem está na base de um clube
    // profissional já joga: o piso é 42 e a distância para o time principal encurtou.
    const forca = Math.max(42, Math.round(forcaDoClube - 20 + r() * 8 + (idade - 15) * 2));
    // O teto de VERDADE, que o jogo sabe e você não. A maioria não chega longe;
    // um em cada dez ou doze é o que muda a vida do clube.
    const salto = r() < 0.09 ? 26 + r() * 14 : 6 + r() * 16;
    const potencial = Math.min(91, Math.round(forca + salto));
    fora.push({
      id: -(club.id * 1000 + i + 1),                            // id negativo: não é do elenco
      nome: nomeDoPais(club.country, r),   // garoto da base do Bolton é inglês, não brasileiro
      posicao: grupo, sub, elig: grupo,
      foot: r() < 0.24 ? 'L' : 'R',
      idade, forca, potencial,
      pais: club.country,
      vies: Math.round((r() - 0.5) * 10),                       // o erro do olheiro
      observado: 0,
      valorMercado: Math.round(forca * forca * 90),
      salario: Math.round(forca * 120),
      energia: 100, forma: 6, contrato: 2 + Math.floor(r() * 3),
      gols: 0, assist: 0, jogos: 0, amarelos: 0, lesao: 0, suspenso: 0,
      base: true,
    });
  }
  return fora.sort((a, b) => b.forca - a.forca);
}

/** Passa um ano na base: eles crescem, ficam mais conhecidos, e alguns saem. */
export function avancarBase(base, forcaDoClube) {
  const saem = [];
  for (const p of base) {
    p.idade += 1;
    // quanto mais longe do teto, mais rápido cresce; e um pouco de sorte
    const espaco = Math.max(0, p.potencial - p.forca);
    p.forca = Math.min(p.potencial, p.forca + Math.round(espaco * (0.16 + Math.random() * 0.2)));
    p.observado = Math.min(1, (p.observado || 0) + 0.34);       // o olheiro vai acertando
    p.vies = Math.round((p.vies || 0) * 0.5);
    p.valorMercado = Math.round(p.forca * p.forca * 90);
    p.contrato = Math.max(0, (p.contrato || 1) - 1);
    if (p.idade >= 20) saem.push(p);                            // idade de base acabou
  }
  return { ficam: base.filter((p) => p.idade < 20), saem };
}
