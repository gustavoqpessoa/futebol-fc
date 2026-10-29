// database.js — carrega o dataset real (public/players.json) com ~37 mil jogadores,
// 50 ligas e centenas de clubes, e hidrata tudo no formato que a carreira usa.
// Cada jogador traz overall (força), potencial, idade, valor, salário e posição reais.
import { TACTICS } from '../Tactics.js';
import { carregarLogos } from './crest.js';

// paleta de cores p/ os uniformes (o dataset não traz cores)
const PALETTE = [
  [0xd50000, 0x111111], [0x006437, 0xffffff], [0x111111, 0xffffff], [0xe4022a, 0xffffff],
  [0x1c3f94, 0xffffff], [0x0d80bf, 0x111111], [0xf5c518, 0x111111], [0x8a1538, 0xffffff],
  [0x123c7b, 0xd21e2b], [0x0a7d3a, 0xffffff], [0xd21e2b, 0x111111], [0x1763d6, 0xf5c518],
  [0x6a0dad, 0xffffff], [0xff6b00, 0x111111], [0x00838f, 0xffffff], [0x455a64, 0xffffff],
  [0xc2185b, 0xffffff], [0x2e7d32, 0xf5c518], [0x5d4037, 0xffffff], [0x1a237e, 0xff6f00],
  [0x00695c, 0xffffff], [0xb71c1c, 0xffffff], [0x263238, 0x90caf9], [0x827717, 0xffffff],
];

const POS_NAME = { G: 'G', Z: 'Z', L: 'L', M: 'M', A: 'A' };
let _pid = 1, _cid = 1;

// Estado inicial de cada jogador, guardado na hidratação. O save grava só quem
// MUDOU em relação a isto — sem essa comparação o save saía com 7,9 MB (o mundo
// inteiro) e estourava a cota de 5 MB do navegador.
export const BASE_JOGADOR = new Map();
/** Como o elenco de cada clube era ao sair do players.json. O save usa isto para
 *  gravar só os clubes cujo elenco mudou de verdade. */
export const ELENCO_ORIGINAL = new Map();

// Posição detalhada. Para a Série A ela vem do documento do usuário (índice 9);
// para o resto do mundo é deduzida do pé e da elegibilidade, que é o que existe.
function siglaDetalhada(pos, foot, elig, sub, id) {
  if (sub) return sub;
  if (pos === 'G') return 'GOL';
  if (pos === 'Z') return 'ZAG';
  if (pos === 'L') return foot === 'L' ? 'LE' : 'LD';
  if (pos === 'M') {
    if (elig && elig.includes('A')) return 'MEI';       // meia que chega ao ataque
    if (elig && elig.includes('Z')) return 'VOL';
    return id % 3 === 0 ? 'VOL' : 'MC';
  }
  if (elig && elig.includes('M')) return foot === 'L' ? 'PE' : 'PD';
  return id % 3 === 0 ? (foot === 'L' ? 'PE' : 'PD') : 'ATA';
}

// Quanto cada clube tem para gastar numa janela.
//
// Era 9% do valor do elenco para todo mundo, e o Gustavo viu o problema na hora:
// "o Corinthians e um time falido, nao deveria ter muito dinheiro assim" — e estava
// com 19 milhoes de euros no caixa. Elenco caro nao e o mesmo que clube rico: clube
// brasileiro grande tem elenco de 200 milhoes e vive de VENDER para pagar a folha,
// enquanto um clube ingles de meio de tabela tem elenco menor e mais dinheiro livre.
//
// Isto e uma ESTIMATIVA por liga, nao um balanco: nao tenho o balanco de 1.300
// clubes. O que existe de real aqui e a diferenca de economia entre os campeonatos.
const FOLGA = {
  'Inglaterra': 1.7,                                    // dinheiro de TV fora da curva
  'Alemanha': 1.2, 'Espanha': 1.1, 'Itália': 1.1, 'França': 1.0,
  'Arábia Saudita': 1.8,                                // caixa estatal
  'Estados Unidos': 1.0, 'Holanda': 0.9, 'Portugal': 0.8, 'Turquia': 0.7,
  'Brasil': 0.42, 'Argentina': 0.32,                    // vivem de vender, e endividados
};

function caixaDoClube(valorDoElenco, pais, tier) {
  const folga = FOLGA[pais] != null ? FOLGA[pais] : 0.8;
  // divisao de baixo tem menos folga ainda, mas nunca fica sem nada para trabalhar
  const porDivisao = tier === 1 ? 1 : tier === 2 ? 0.6 : 0.4;
  const base = valorDoElenco * 0.06 * folga * porDivisao;
  const piso = tier === 1 ? 400000 : 150000;
  return Math.round(Math.max(piso, base));
}

/** O que o jogador VALE pelo que ele é: overall, idade e o quanto ainda pode crescer.
 *
 *  O Gustavo, procurando goleiro na League One: "um goleiro de 36 anos, de 74 de
 *  overall, custa 300 mil; um de 38, com 72, custa 680 mil. Teria que ser ao
 *  contrário". O valor vinha cru do Transfermarkt, que reflete contrato, lesão e
 *  hype — e no meio de 38 mil jogadores isso vira incoerência na cara do jogador.
 *  Aqui o valor real continua mandando, mas dentro de uma faixa em volta do justo:
 *  nada custa menos da metade nem mais que o dobro do que a régua diz.
 */
export function valorJusto(forca, idade, potencial) {
  const base = 300000 * Math.pow(1.207, forca - 60);          // 60 ≈ 300 mil, 80 ≈ 12 mi, 90 ≈ 79 mi
  const porIdade = idade <= 18 ? 1.10 : idade <= 21 ? 1.15 : idade <= 23 ? 1.10
    : idade <= 27 ? 1 : idade === 28 ? 0.9 : idade === 29 ? 0.8
    : idade <= 31 ? 0.6 : idade <= 33 ? 0.38 : idade <= 35 ? 0.22 : idade <= 37 ? 0.12 : 0.06;
  const promessa = idade <= 23 ? 1 + Math.min(0.6, Math.max(0, potencial - forca) * 0.05) : 1;
  return Math.round(base * porIdade * promessa);
}

function hydratePlayer(arr) {
  // arr = [name, pos, ovr, pot, age, val, wage, foot, elig, sub, pais]
  const [name, pos, ovr, pot, age, val, wage, foot, elig, sub, pais] = arr;
  const forca = ovr | 0;
  const idade = age | 0;
  const potencial = Math.max(forca, pot | 0);
  const justo = valorJusto(forca, idade, potencial);
  const valorMercado = val > 0
    ? Math.round(Math.min(justo * 2.2, Math.max(justo * 0.45, val)))
    : justo;
  const salario = wage > 0 ? wage : Math.round(valorMercado * 0.01);
  const id = _pid++;
  return {
    id, nome: name, posicao: POS_NAME[pos] || 'M', forca, potencial,
    sub: siglaDetalhada(POS_NAME[pos] || 'M', foot || 'R', elig, sub, id),
    idade, energia: 100, valorMercado, salario, foot: foot || 'R', pais: pais || '', gols: 0, assist: 0,
    contrato: 1 + (id % 5), forma: 6 + (id % 5), lesao: 0, suspenso: 0, amarelos: 0, jogos: 0,
  };
}

// campos que mudam ao longo de uma carreira e precisam entrar no save
export const CAMPOS_MUTAVEIS = ['forca', 'potencial', 'idade', 'valorMercado', 'salario',
  'gols', 'assist', 'jogos', 'contrato', 'forma', 'lesao', 'suspenso', 'amarelos', 'energia'];

/** Os campos que importam para um jogador de OUTRO clube.
 *
 *  Energia, forma, cartões e lesão do lateral reserva do Cádiz não mudam nada na sua
 *  carreira, mas mudavam TODO save: como o mundo inteiro é simulado, 29 mil dos 31 mil
 *  jogadores apareciam como "alterados" e o arquivo ia a 1,4 MB só de jogador. Fora do
 *  seu elenco, guardo o que de fato persiste. */
export const CAMPOS_DO_MUNDO = ['forca', 'potencial', 'idade', 'valorMercado', 'salario',
  'gols', 'assist', 'jogos', 'contrato'];

// Atributos derivados do overall + posição (ficha do jogador). Determinístico por id.
export function deriveAttributes(p) {
  const seed = p.id * 2654435761 % 100 / 100;
  const j = (base, k) => Math.max(30, Math.min(99, Math.round(base + (((p.id * k) % 13) - 6))));
  const o = p.forca, pos = p.posicao;
  const prof = {
    G: { pace: o - 20, chute: o - 30, passe: o - 8, drible: o - 25, defesa: o - 30, fisico: o - 2 },
    Z: { pace: o - 6, chute: o - 20, passe: o - 8, drible: o - 14, defesa: o + 4, fisico: o + 3 },
    L: { pace: o + 5, chute: o - 14, passe: o - 2, drible: o + 1, defesa: o - 2, fisico: o - 2 },
    M: { pace: o - 2, chute: o - 4, passe: o + 4, drible: o + 2, defesa: o - 6, fisico: o - 3 },
    A: { pace: o + 4, chute: o + 4, passe: o - 6, drible: o + 3, defesa: o - 22, fisico: o - 2 },
  }[pos] || { pace: o, chute: o, passe: o, drible: o, defesa: o - 10, fisico: o };
  return {
    Ritmo: j(prof.pace, 7), Chute: j(prof.chute, 11), Passe: j(prof.passe, 13),
    Drible: j(prof.drible, 17), Defesa: j(prof.defesa, 19), Físico: j(prof.fisico, 23),
  };
}

// Constrói o objeto liga/clubes a partir do JSON já carregado.
export function hydrateDataset(data) {
  // Zera os contadores: o mesmo players.json tem de gerar SEMPRE os mesmos ids, ou o
  // save por diferença aponta para jogador errado ao recarregar.
  _pid = 1; _cid = 1; BASE_JOGADOR.clear(); ELENCO_ORIGINAL.clear();
  const clubs = [];
  const competitions = [];
  data.leagues.forEach((lg, li) => {
    const comp = { id: li, name: lg.name, country: lg.country, tier: lg.tier || 1, clubIds: [] };
    lg.clubs.forEach((cl, ci) => {
      const pal = PALETTE[(_cid + ci) % PALETTE.length];
      const squad = cl.players.map(hydratePlayer);
      squad.forEach((p) => BASE_JOGADOR.set(p.id, CAMPOS_MUTAVEIS.map((k) => p[k])));
      const squadValue = squad.reduce((s, p) => s + p.valorMercado, 0);
      const club = {
        id: _cid++, name: cl.n, primary: cl.primary != null ? cl.primary : pal[0], secondary: cl.secondary != null ? cl.secondary : pal[1],
        comp: li, country: lg.country, league: lg.name, tier: lg.tier || 1,
        tactic: cl.t || 'wm', caixa: caixaDoClube(squadValue, lg.country, lg.tier || 1), squad,
        estadio: cl.estadio || null, lugares: cl.lugares || 0,
      };
      ELENCO_ORIGINAL.set(club.id, squad.map((p) => p.id));
      clubs.push(club); comp.clubIds.push(club.id);
    });
    competitions.push(comp);
  });
  // agentes livres (mercado global de scout)
  const market = (data.market || []).map((a) => {
    const p = hydratePlayer(a); p.origem = a[8] || ''; return p;
  });
  return { clubs, competitions, market, meta: data.meta };
}

// Carrega os jogadores.
// No arquivo único (FUTEBOL-FC.html, aberto com 2 cliques ou publicado num link) os
// dados já vêm embutidos em window.__PLAYERS — sem isso o fetch falharia, porque
// abrir um arquivo local não tem servidor por trás. No projeto com Vite, cai no fetch.
// O JOGO SÓ PRECISA BAIXAR OS DADOS UMA VEZ.
//
// Sem isto, abrir a carreira de jogador depois da de treinador refazia o
// download inteiro do players.json. Além de lento, era um ponto de falha a mais:
// se a rede (ou o servidor local) oscilasse nesse meio-tempo, o modo jogador
// abria com "Não consegui carregar players.json" mesmo com o jogo já rodando.
let _datasetEmMemoria = null;

export async function loadDataset() {
  if (_datasetEmMemoria) return _datasetEmMemoria;
  // escudos oficiais: no arquivo único vêm em window.__LOGOS; no projeto, por fetch
  try {
    if (typeof window !== 'undefined' && window.__LOGOS) {
      carregarLogos(window.__LOGOS, window.__MAPA_LOGOS);
    } else if (typeof fetch === 'function') {
      const [l, m] = await Promise.all([
        fetch('logos.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('mapa_logos.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (l && m) carregarLogos(l, m);
    }
  } catch (e) { /* sem logos: o jogo usa os brasões desenhados */ }

  if (typeof window !== 'undefined' && window.__PLAYERS) {
    _datasetEmMemoria = hydrateDataset(window.__PLAYERS);
    return _datasetEmMemoria;
  }
  const res = await fetch('players.json');
  if (!res.ok) throw new Error('players.json não encontrado (' + res.status + ')');
  const data = await res.json();
  _datasetEmMemoria = hydrateDataset(data);
  return _datasetEmMemoria;
}

// ---- utilidades usadas pela carreira ----
export function bestEleven(club, lineupIds) {
  if (lineupIds && lineupIds.length === 11) return lineupIds.map((id) => club.squad.find((p) => p.id === id)).filter(Boolean);
  const byPos = (ps, used) => club.squad.filter((p) => ps.includes(p.posicao) && !used.includes(p)).sort((a, b) => b.forca - a.forca);
  const used = [];
  const gk = byPos(['G'], used).slice(0, 1); used.push(...gk);
  const def = byPos(['Z', 'L'], used).slice(0, 4); used.push(...def);
  const mid = byPos(['M', 'L'], used).slice(0, 4); used.push(...mid);
  const att = byPos(['A', 'M'], used).slice(0, 2); used.push(...att);
  const eleven = [...gk, ...def, ...mid, ...att];
  if (eleven.length < 11) for (const p of club.squad) { if (eleven.length >= 11) break; if (!eleven.includes(p)) eleven.push(p); }
  return eleven.slice(0, 11);
}

export function avgForca(players) { return players.length ? players.reduce((s, p) => s + p.forca, 0) / players.length : 60; }
// O dado de valor vem do Transfermarkt, que é em EURO. A tela dizia R$ e não batia
// com nada que o Gustavo conferisse no site.
export function fmtMoney(v) { return '€ ' + Math.round(v).toLocaleString('pt-BR'); }
export { TACTICS };
