
import { nomeDoPais, baldesDe } from './nomes.js';// evolution.js — como o MUNDO envelhece de uma temporada para a outra.
//
// É a peça central dos dois modos:
//  • no Treinador, roda uma vez a cada virada de temporada;
//  • na ponte Jogador → Treinador, roda N vezes de uma vez só, para que ao aposentar
//    aos 38 o mundo esteja realmente 22 anos mais velho — e não congelado em 2026.
//
// Regras: jovens sobem rumo ao POTENCIAL, veteranos caem, quem passa da idade se
// aposenta e deixa um REGEN (mesmo sobrenome, mesmo teto) para o elenco nunca esvaziar.

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];

// Quanto o jogador ganha (ou perde) de overall neste ano.
// O ganho é uma FATIA do que falta para o teto — assim quem tem potencial 90 chega
// perto dos 90 por volta dos 26, em vez de estacionar no meio do caminho. Sem isso o
// mundo inteiro fica mais fraco a cada temporada.
export function growthFor(age, forca, potencial) {
  const room = (potencial || forca) - forca;
  if (room > 0) {
    let rate = 0;
    if (age <= 18) rate = 0.34;         // explosão da base
    else if (age <= 21) rate = 0.30;
    else if (age <= 24) rate = 0.24;
    else if (age <= 27) rate = 0.14;    // amadurece devagar
    else if (age <= 30) rate = 0.06;    // ainda lapida detalhes
    if (rate > 0) {
      const g = Math.round(room * rate * (0.7 + Math.random() * 0.6));
      return Math.max(age <= 24 ? 1 : 0, Math.min(room, g));
    }
  }
  if (age <= 30) return 0;               // auge, estável
  if (age <= 33) return -1;
  if (age <= 35) return -2;
  return -3;                             // fim de carreira
}

// o jogador pendura as chuteiras neste fim de temporada?
export function retiresNow(p) {
  if (p.idade >= 39) return true;
  if (p.idade >= 37) return Math.random() < 0.65;
  if (p.idade >= 35 && p.forca < 68) return Math.random() < 0.5;
  if (p.idade >= 33 && p.forca < 58) return Math.random() < 0.35;
  return false;
}

const PRIMEIROS = ['Léo', 'Kaio', 'Enzo', 'Davi', 'Yuri', 'Ruan', 'Gabriel', 'Vitor', 'Lucas', 'João',
  'Pedro', 'Bruno', 'Miguel', 'Arthur', 'Bernardo', 'Théo', 'Heitor', 'Nicolas', 'Rafael', 'Caio',
  'Matheus', 'Igor', 'Murilo', 'Wesley', 'Douglas', 'Alan', 'Felipe', 'Otávio'];
const SOBRENOMES = ['Silva', 'Souza', 'Costa', 'Lima', 'Alves', 'Rocha', 'Gomes', 'Dias', 'Melo',
  'Reis', 'Santos', 'Nunes', 'Ferreira', 'Barbosa', 'Cardoso', 'Teixeira', 'Moreira', 'Pinto'];

let _seq = 900000;
export function nextRegenId() { return ++_seq; }

// gera o herdeiro de quem se aposentou: mantém o sobrenome e o teto do craque
// Sigla fina a partir do grupo. Sem isto o jogador nasce sem posição de verdade:
// aparece como "M" em vez de volante, e a escalação o encaixa em qualquer vaga do
// meio-campo. Numa carreira de nove temporadas o problema se acumula — os regens e
// os juvenis iam somando até 14 jogadores sem posição no elenco.
const FINA = { G: ['GOL'], Z: ['ZAG'], L: ['LE', 'LD'],
  M: ['VOL', 'VOL', 'MC', 'MC', 'MEI'], A: ['PE', 'PD', 'ATA', 'ATA'] };
function subDoGrupo(grupo, pe) {
  const opc = FINA[grupo] || FINA.M;
  const escolha = opc[Math.floor(Math.random() * opc.length)];
  // canhoto tende ao lado esquerdo, destro ao direito
  if (escolha === 'LE' && pe !== 'L' && Math.random() < 0.75) return 'LD';
  if (escolha === 'LD' && pe === 'L' && Math.random() < 0.6) return 'LE';
  if (escolha === 'PE' && pe !== 'L' && Math.random() < 0.5) return 'PD';
  return escolha;
}

export function regenFrom(p, paisDoClube) {
  // O herdeiro leva o sobrenome de quem saiu (é a graça do regen), mas o primeiro
  // nome vem do PAÍS dele — antes todo mundo virava 'Léo' ou 'Kaio', inclusive no
  // Japão e na Inglaterra.
  const partes = String(p.nome || '').trim().split(/\s+/);
  const sobrenome = partes.length > 1 ? partes[partes.length - 1] : baldesDe(p.pais)[1][rnd(8)];
  const idade = 16 + rnd(3);
  const potencial = Math.max(60, Math.min(93, (p.potencial || p.forca) + rnd(3) - 1));
  const forca = Math.max(45, Math.min(potencial - 6, 48 + rnd(14)));
  return {
    id: nextRegenId(), nome: `${pick(baldesDe(p.pais)[0])} ${sobrenome}`,
    posicao: p.posicao, elig: p.elig || p.posicao, foot: p.foot || 'R',
    // herda a posição fina do jogador de quem ele é o herdeiro
    sub: p.sub || subDoGrupo(p.posicao, p.foot),
    pais: p.pais || paisDoClube || '',
    idade, forca, potencial,
    valorMercado: Math.round(forca * forca * 180), salario: Math.round(forca * 380),
    energia: 100, forma: 6, contrato: 3 + rnd(3),
    gols: 0, assist: 0, jogos: 0, amarelos: 0, lesao: 0, suspenso: 0,
    base: true, regenDe: p.nome,
  };
}

// promessa de base comum (quando o elenco fica curto e não há aposentadoria para herdar)
export function youthPlayer(baseForca, pais) {
  const forca = Math.max(45, Math.min(70, Math.round(baseForca - 10 + rnd(8))));
  const p = {
    id: nextRegenId(), nome: nomeDoPais(pais || 'Inglaterra'), pais: pais || '',
    posicao: pick(['G', 'Z', 'L', 'M', 'A']), foot: Math.random() < 0.22 ? 'L' : 'R',
    idade: 16 + rnd(3), forca,
    potencial: Math.min(91, forca + 8 + rnd(14)),
    valorMercado: Math.round(forca * forca * 160), salario: Math.round(forca * 350),
    energia: 100, forma: 6, contrato: 3 + rnd(2),
    gols: 0, assist: 0, jogos: 0, amarelos: 0, lesao: 0, suspenso: 0, base: true,
  };
  p.elig = p.posicao;
  p.sub = subDoGrupo(p.posicao, p.foot);
  return p;
}

// Reajuste de valor na virada de temporada.
//
// A versão anterior RECALCULAVA o preço por uma fórmula própria (forca² × 200) que
// não tem nada a ver com a escala do SoFIFA que vem no dado. Resultado: depois de
// uma temporada o Mbappé valia 2 milhões. Agora o valor é AJUSTADO a partir do que
// ele já valia — cada ponto de overall move ~14%, e a idade move o resto.
const fatorIdade = (idade) => Math.max(0.35, 1 - Math.abs(26 - idade) * 0.045);

function reprice(p, ovrAntes, idadeAntes) {
  const dOvr = p.forca - (ovrAntes != null ? ovrAntes : p.forca);
  const razaoIdade = fatorIdade(p.idade) / fatorIdade(idadeAntes != null ? idadeAntes : p.idade);
  const base = p.valorMercado > 0 ? p.valorMercado : (p.forca ** 2) * 200;
  p.valorMercado = Math.max(50000, Math.round(base * Math.pow(1.14, dOvr) * razaoIdade));
  // o salário acompanha, mas com muito menos amplitude que o passe
  p.salario = Math.max(5000, Math.round((p.salario || p.valorMercado * 0.01) * Math.pow(1.06, dOvr)));
}

/**
 * Envelhece o mundo inteiro em UM ano.
 * @param {object} mgr  CareerManager
 * @param {object} opts { userClubId, market, minSquad, onNews }
 * @returns {{aposentados:number, regens:number, destaques:Array}}
 */
export function ageWorldOneYear(mgr, opts = {}) {
  let saidasDoUsuario = 0;
  const userClubId = opts.userClubId != null ? opts.userClubId : mgr.userClubId;
  const minSquad = opts.minSquad || 20;
  const market = opts.market || (mgr.league && mgr.league.market) || [];
  let aposentados = 0, regens = 0;
  const destaques = [];   // quem mais evoluiu — vira notícia da temporada

  for (const club of mgr.clubs()) {
    const sobreviventes = [];
    const herdeiros = [];

    for (const p of club.squad) {
      p.idade++;
      const antes = p.forca;
      p.ovrAnterior = antes;         // para a tela do elenco mostrar quem subiu e quem caiu
      let d = growthFor(p.idade, p.forca, p.potencial || p.forca);
      // O TREINO DO SEU CLUBE. Um técnico de verdade escolhe no que o elenco
      // trabalha o ano inteiro, e isso aparece em quem evolui. O foco vale só para
      // o SEU time — os outros seguem o caminho natural.
      if (club.id === userClubId && mgr && mgr.treinoDoTime && d >= 0) {
        const foco = mgr.treinoDoTime;
        const sub = p.sub || p.posicao;
        const jovem = p.idade <= 22;
        const alvo = foco === 'base' ? jovem
          : foco === 'ataque' ? ['PE', 'PD', 'ATA', 'MEI'].includes(sub)
          : foco === 'defesa' ? ['GOL', 'ZAG', 'LE', 'LD', 'VOL'].includes(sub)
          : foco === 'fisico';            // físico pega todo mundo, mas rende menos
        if (alvo) {
          const bonus = foco === 'fisico' ? 1 : 2;
          const teto = (p.potencial || p.forca) - p.forca;
          d = Math.min(teto, d + (Math.random() < 0.55 ? bonus : 1));
        }
      }
      p.forca = Math.max(42, Math.min(p.potencial || 99, p.forca + d));
      if (p.forca > antes + 2) destaques.push({ nome: p.nome, club: club.name, de: antes, para: p.forca });

      if (retiresNow(p)) {
        aposentados++;
        // craques e titulares deixam um herdeiro; reservas velhos simplesmente saem
        if (p.forca >= 66 || Math.random() < 0.45) { herdeiros.push(regenFrom(p, club.country)); regens++; }
        if (club.id === userClubId && mgr._pushNews) {
          mgr._pushNews(` ${p.nome} (${p.idade} anos) pendurou as chuteiras.`);
        }
        continue;
      }

      p.contrato = (p.contrato || 1) - 1;
      if (p.contrato <= 0) {
        if (club.id === userClubId) {
          // O CONTRATO QUE ACABA TEM DE ACABAR. Antes o jogador do usuário ficava
          // com contrato 0 para sempre e nunca saía: num teste de oito temporadas o
          // elenco foi de 34 para 51 jogadores, de graça. Agora ele fica UMA
          // temporada como "fim de contrato" e, se não renovar, vai embora.
          // Sai quem está há DUAS temporadas sem renovar — e nunca a ponto de deixar
          // o elenco abaixo de 20, que é o mínimo para escalar o time.
          const restam = club.squad.length - (saidasDoUsuario + 1);
          if (p.contrato <= 0 && p.avisoFimContrato >= 2 && restam >= 20) {
            saidasDoUsuario++;
            market.push({ ...p, contrato: 1 + rnd(3), gols: 0, assist: 0 });
            if (mgr && mgr._pushNews) mgr._pushNews(`${p.nome} não renovou e saiu de graça.`);
            continue;
          }
          p.contrato = 0; p.avisoFimContrato = (p.avisoFimContrato || 0) + 1; sobreviventes.push(p);
        }
        else {
          // QUEM VIRA AGENTE LIVRE. Era 25% de todo mundo que chegava ao fim do
          // contrato, e o Gustavo achou Brahim Díaz e Nico Williams de graça no
          // mercado: "com certeza teriam um clube". Craque renova — quem sai de
          // graça é veterano no fim da linha ou reserva que o clube não quer.
          const fica = 0.72
            + (p.forca >= 80 ? 0.26 : p.forca >= 74 ? 0.18 : p.forca >= 68 ? 0.08 : 0)
            - (p.idade >= 34 ? 0.30 : p.idade >= 32 ? 0.15 : 0)
            - (p.forca < 58 ? 0.18 : 0);
          if (Math.random() < fica) { p.contrato = 1 + rnd(4); sobreviventes.push(p); }
          else { p.contrato = 1 + rnd(3); market.push({ ...p, gols: 0, assist: 0 }); }
        }
      } else sobreviventes.push(p);

      reprice(p, antes, p.idade - 1);
      p.energia = 100; p.lesao = 0; p.suspenso = 0; p.forma = 6;
    }

    club.squad = sobreviventes.concat(herdeiros);
    const media = club.squad.length
      ? club.squad.reduce((s, p) => s + p.forca, 0) / club.squad.length
      : 66;
    while (club.squad.length < minSquad) club.squad.push(youthPlayer(media, club.country));
  }

  if (market.length > 5000) market.sort((a, b) => b.forca - a.forca).splice(5000);
  destaques.sort((a, b) => (b.para - b.de) - (a.para - a.de));
  return { aposentados, regens, destaques: destaques.slice(0, 8) };
}

/**
 * Salta N anos de uma vez — usado quando o jogador se aposenta e vira treinador.
 * Além de envelhecer todo mundo, mexe o mercado entre os clubes da IA para que os
 * elencos não fiquem exatamente onde estavam duas décadas antes.
 */
export function advanceWorld(mgr, years, opts = {}) {
  let aposentados = 0, regens = 0;
  for (let i = 0; i < Math.max(0, years); i++) {
    const r = ageWorldOneYear(mgr, opts);
    aposentados += r.aposentados; regens += r.regens;
    if (mgr._runTransferWindow) mgr._runTransferWindow(40);
  }
  if (typeof mgr.season === 'number') mgr.season += Math.max(0, years);
  return { years, aposentados, regens };
}
