import { ESCUDOS_REAIS } from './escudos.js';

// ---------------------------------------------------------------- logo oficial
//
// Quando existe o PNG oficial do clube (baixado do football-logos.cc e embutido em
// logos.json), ele ganha do brasão desenhado — nada substitui o escudo de verdade.
// O desenho continua valendo para quem não tem logo, que é a maioria do mundo.
let LOGOS = null, MAPA = null;
export function carregarLogos(logos, mapa) { LOGOS = logos || null; MAPA = mapa || null; }
function logoDe(nome) {
  if (!LOGOS || !MAPA) return null;
  const slug = MAPA[nome];
  return slug && LOGOS[slug] ? LOGOS[slug] : null;
}

// crest.js — ESCUDO (brasão) em SVG. Grandes clubes ganham um padrão FIEL ao real
// (listras certas, faixa/sash, quadrantes, estrela) com as cores oficiais; os demais
// usam um padrão estável derivado do nome. (Logos oficiais são marcas registradas.)

const hx = (n) => '#' + (n >>> 0 & 0xffffff).toString(16).padStart(6, '0');
function norm(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function hash(str) { let h = 0; for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }
function initials(name) {
  const clean = (name || '?').replace(/[^A-Za-zÀ-ÿ0-9 ]/g, '').trim();
  const words = clean.split(/\s+/).filter((w) => !['fc', 'de', 'da', 'do', 'sc', 'ec', 'ac', 'sl', 'cf', 'club', 'city'].includes(w.toLowerCase()) && (w.length > 1 || /[0-9]/.test(w)));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return clean.slice(0, 3).toUpperCase();
}
function lum(n) { const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
function tc(bg) { return lum(bg) > 0.55 ? '#111' : '#fff'; }

// A tabela de escudos reais mora em escudos.js — são centenas de clubes com a cor e
// o padrão de camisa de verdade. Aqui fica só o desenho.
const OVER = ESCUDOS_REAIS;

// A base guarda o nome oficial completo ("Sevilla FC", "Olympique de Marseille",
// "Bayer 04 Leverkusen") e a tabela de escudos usa o nome curto. Para os dois se
// encontrarem, tiramos as siglas de tipo de clube e os números do nome.
const RUIDO = new Set(['fc', 'sc', 'cf', 'ac', 'ad', 'ud', 'cd', 'rc', 'rcd', 'sd', 'sv',
  'vfl', 'vfb', 'vfr', 'tsg', 'tsv', 'sk', 'jk', 'fk', 'kv', 'krc', 'kaa', 'rsc', 'afc',
  'osc', 'ssc', 'ss', 'us', 'as', 'ca', 'cs', 'ec', 'se', 'aa', 'gd', 'cp', 'hnk', 'nk',
  'gnk', 'ofk', 'pfk', 'bsc', 'sfc', 'jsc', 'club', 'clube', 'de', 'da', 'do', 'the',
  'balompie', 'torna', 'calcio', 'futebol', 'futbol', 'football', 'kulubu']);

function nucleo(nome) {
  return (nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !RUIDO.has(t) && !/^\d+$/.test(t))
    .join('');
}

// índice: nome exato e núcleo apontam para a mesma entrada
const INDICE = {};
for (const [k, v] of Object.entries(OVER)) {
  INDICE[k] = v;
  const nk = nucleo(k);
  if (nk && !INDICE[nk]) INDICE[nk] = v;
}
function escudoReal(nome) {
  return INDICE[norm(nome)] || INDICE[nucleo(nome)] || null;
}

// ---------------------------------------------------------------- desenho
//
// Todo clube sem escudo desenhado à mão sai daqui. O problema da versão anterior era
// que ela tinha 5 padrões e uma forma só: de longe, todos os escudos do mundo eram o
// mesmo quadrado com duas letras. Agora a combinação é FORMA x PADRÃO x PALETA x
// DETALHE, escolhida pelo nome do clube — dá milhares de escudos diferentes, e o mesmo
// clube tem sempre o mesmo.

// contornos: escudo clássico, bico, redondo, e o "banner" de ponta reta
const FORMAS = [
  'M4,2 H36 V24 C36,36 27,42 20,44 C13,42 4,36 4,24 Z',              // clássico
  'M20,1 L37,8 V23 C37,34 29,41 20,45 C11,41 3,34 3,23 V8 Z',        // bico
  'M20,1 C31,1 38,9 38,20 C38,32 30,41 20,45 C10,41 2,32 2,20 C2,9 9,1 20,1 Z', // redondo
  'M4,2 H36 V32 L20,45 L4,32 Z',                                      // banner
];

// paletas fechadas: cada par já foi escolhido para ter contraste e cara de futebol
const PALETAS = [
  [0xd11a1a, 0xffffff], [0x0d2f6b, 0xffffff], [0x0a6b32, 0xffffff], [0x111111, 0xffffff],
  [0xf5c518, 0x111111], [0x6a1b9a, 0xffd54f], [0x00695c, 0xffffff], [0xb71c1c, 0xf5c518],
  [0x1565c0, 0xf5c518], [0x2e7d32, 0xf5c518], [0x4e342e, 0xffcc80], [0x37474f, 0x80deea],
  [0xad1457, 0xffffff], [0xe65100, 0x111111], [0x1a237e, 0xff5252], [0x004d40, 0xffab40],
  [0x880e4f, 0x4fc3f7], [0x263238, 0xff7043], [0x33691e, 0xffffff], [0x5d4037, 0xffd54f],
  [0x01579b, 0xffffff], [0xc62828, 0x0d2f6b], [0x455a64, 0xffffff], [0x6d4c41, 0x8bc34a],
];

const PADROES = ['solid', 'vstripes', 'hstripes', 'sash', 'quarters', 'halfv', 'halfh',
  'chevron', 'cross', 'diag', 'hoops', 'pale'];

// Paletas por região. Um clube inventado da Noruega tem de parecer norueguês, não
// sortear roxo com laranja como qualquer outro do mundo.
const REGIAO = {
  nordico: [[0x1560bd, 0xffffff], [0xd50000, 0xffffff], [0xf5c518, 0x123c7b], [0xffffff, 0x111111], [0x0a7d3a, 0xffffff]],
  leste: [[0xd50000, 0xffffff], [0x1560bd, 0xffffff], [0x0a7d3a, 0xffffff], [0x111111, 0xffffff], [0x8a1538, 0xf5c518]],
  britanico: [[0xd50000, 0xffffff], [0x123c7b, 0xffffff], [0x6cabdd, 0x111111], [0xf5c518, 0x111111], [0x7b1235, 0x6cabdd]],
  latino: [[0xd50000, 0xffffff], [0x123c7b, 0xffffff], [0x0a7d3a, 0xffffff], [0xf5c518, 0x123c7b], [0x6cabdd, 0xffffff]],
  africa: [[0x0a7d3a, 0xffffff], [0xd50000, 0xf5c518], [0xf5761a, 0x111111], [0x1560bd, 0xf5c518], [0x111111, 0x0a7d3a]],
  asia: [[0xd50000, 0xffffff], [0x1560bd, 0xffffff], [0x6a1b9a, 0xffffff], [0xf5c518, 0x123c7b], [0x00695c, 0xffffff]],
  arabe: [[0x0a7d3a, 0xffffff], [0x1560bd, 0xffffff], [0xd50000, 0x111111], [0xf5c518, 0x123c7b], [0x6a1b9a, 0xffffff]],
};
const PAIS_REGIAO = {
  'Noruega': 'nordico', 'Suécia': 'nordico', 'Finlândia': 'nordico', 'Dinamarca': 'nordico',
  'Rússia': 'leste', 'Ucrânia': 'leste', 'Polônia': 'leste', 'República Tcheca': 'leste',
  'Sérvia': 'leste', 'Croácia': 'leste', 'Hungria': 'leste', 'Romênia': 'leste', 'Grécia': 'leste',
  'Inglaterra': 'britanico', 'Escócia': 'britanico', 'País de Gales': 'britanico',
  'Irlanda': 'britanico', 'Austrália': 'britanico', 'Nova Zelândia': 'britanico',
  'Canadá': 'britanico', 'Estados Unidos': 'britanico', 'África do Sul': 'africa',
  'Brasil': 'latino', 'Argentina': 'latino', 'Chile': 'latino', 'Colômbia': 'latino',
  'Uruguai': 'latino', 'Peru': 'latino', 'Equador': 'latino', 'Paraguai': 'latino',
  'Bolívia': 'latino', 'Venezuela': 'latino', 'México': 'latino', 'Portugal': 'latino',
  'Espanha': 'latino', 'Itália': 'latino', 'França': 'latino',
  'Senegal': 'africa', 'Costa do Marfim': 'africa',
  'Japão': 'asia', 'Coreia do Sul': 'asia', 'China': 'asia', 'Índia': 'asia',
  'Arábia Saudita': 'arabe', 'Emirados Árabes Unidos': 'arabe', 'Turquia': 'arabe', 'Chipre': 'leste',
};

function patternFill(pat, pri, sec, n) {
  const P = hx(pri), S = hx(sec);
  const fundo = `<rect width="40" height="46" fill="${P}"/>`;
  switch (pat) {
    case 'vstripes': {                       // 2, 3 ou 4 listras verticais
      const qtd = 2 + (n % 3);
      const larg = 40 / (qtd * 2 + 1);
      let out = fundo;
      for (let i = 0; i < qtd; i++) out += `<rect x="${(i * 2 + 1) * larg}" width="${larg}" height="46" fill="${S}"/>`;
      return out;
    }
    case 'hstripes': {
      const qtd = 2 + (n % 3);
      const alt = 46 / (qtd * 2 + 1);
      let out = fundo;
      for (let i = 0; i < qtd; i++) out += `<rect y="${(i * 2 + 1) * alt}" width="40" height="${alt}" fill="${S}"/>`;
      return out;
    }
    case 'hoops': {                          // argolas: faixas horizontais grossas
      let out = fundo;
      for (let y = 4; y < 46; y += 12) out += `<rect y="${y}" width="40" height="6" fill="${S}"/>`;
      return out;
    }
    case 'pale':                             // faixa larga vertical
      return fundo + `<rect x="13" width="14" height="46" fill="${S}"/>`;
    case 'sash':
      return fundo + `<polygon points="0,12 40,30 40,41 0,23" fill="${S}"/>`;
    case 'diag':
      return fundo + `<polygon points="0,0 40,0 0,46" fill="${S}"/>`;
    case 'chevron':
      return fundo + `<polygon points="20,10 40,26 40,38 20,22 0,38 0,26" fill="${S}"/>`;
    case 'cross':
      return fundo + `<rect x="15" width="10" height="46" fill="${S}"/><rect y="16" width="40" height="10" fill="${S}"/>`;
    case 'quarters':
      return fundo + `<rect x="20" width="20" height="23" fill="${S}"/><rect y="23" width="20" height="23" fill="${S}"/>`;
    case 'halfv':
      return `<rect width="20" height="46" fill="${P}"/><rect x="20" width="20" height="46" fill="${S}"/>`;
    case 'halfh':
      return `<rect width="40" height="23" fill="${P}"/><rect y="23" width="40" height="23" fill="${S}"/>`;
    default:
      return fundo;
  }
}

// estrela, bola ou nada — só um detalhe, para não poluir em tamanho pequeno
function detalhe(tipo, cor) {
  // a estrela solitária do Botafogo é BRANCA, não dourada
  if (tipo === 'starbranca') return `<path d="M20 21 l2.6 5.4 5.9 .9 -4.3 4.2 1 5.9 -5.2 -2.8 -5.2 2.8 1 -5.9 -4.3 -4.2 5.9 -.9 Z" fill="#fff" stroke="#111" stroke-width="0.5"/>`;
  if (tipo === 'star') return `<path d="M20 5.4 l1.5 3.1 3.4 .5 -2.5 2.4 .6 3.4 -3 -1.6 -3 1.6 .6 -3.4 -2.5 -2.4 3.4 -.5 Z" fill="#f5c518" stroke="#8a5f08" stroke-width="0.3"/>`;
  if (tipo === 'cross') return `<g fill="#111"><rect x="18.5" y="15" width="3" height="16"/><rect x="13" y="20.5" width="14" height="3"/></g>`;
  if (tipo === 'ball') return `<circle cx="20" cy="10" r="3.4" fill="#fff" stroke="#111" stroke-width="0.7"/><path d="M20 7.2 l1.6 1.2 -.6 1.9 -2 0 -.6 -1.9 Z" fill="#111"/>`;
  return '';
}

/** Quão clara é uma cor, de 0 (preto) a 1 (branco). */
function luz(n) {
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function crest(club, size = 26) {
  // Sem clube não há escudo — e derrubar a tela inteira por causa disso já
  // aconteceu: um resultado sem adversário quebrava o pop-up e o jogo parava de
  // responder a cliques.
  if (!club || !club.name) return `<span style="display:inline-block;width:${size}px"></span>`;
  const oficial = logoDe(club.name);
  if (oficial) {
    // O PNG oficial tem 64x64. Pedir mais do que isso não cria pixel nenhum: o
    // navegador estica e o escudo sai borrado — foi o que aconteceu quando a tela
    // passou a mostrar o escudo a 78px. Então o tamanho é travado no natural.
    const LADO = 128;   // os escudos passaram a vir em 128px (tools/logos_alta.py)
    const s2 = Math.min(size, LADO);
    const h2 = Math.round(s2 * 1.14);
    return `<span class="escudoimg" style="display:inline-flex;align-items:center;justify-content:center;width:${s2}px;height:${h2}px;vertical-align:middle">
<img src="${oficial}" alt="" width="${s2}" height="${s2}" style="object-fit:contain;display:block;max-width:${LADO}px;max-height:${LADO}px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))"></span>`;
  }
  const key = norm(club.name);
  const ov = escudoReal(club.name);
  const h = hash(club.name || '');
  let pri, sec, ini, pat, extra, forma;

  if (ov) {
    pri = ov.a; sec = ov.b; ini = ov.mono; pat = ov.pattern; extra = ov.extra;
    forma = FORMAS[0];                       // os grandes ficam no escudo clássico
  } else {
    // AS CORES DO PRÓPRIO CLUBE.
    //
    // O escudo desenhado saía com uma paleta sorteada pela região do país, e por isso
    // o clube podia aparecer de vermelho no escudo e de azul na camisa. As cores
    // verdadeiras já estavam no dataset (é delas que sai o uniforme no campo) e não
    // eram usadas aqui. Agora são: o escudo desenhado combina com o time.
    //
    // Só cai na paleta regional quando o clube não trouxe cor nenhuma.
    const temCor = club.primary != null && club.secondary != null
      && club.primary !== club.secondary;
    if (temCor) {
      pri = club.primary; sec = club.secondary;
      // preto no preto não se lê: se as duas forem escuras demais, a segunda clareia
      if (luz(pri) < 0.28 && luz(sec) < 0.28) sec = 0xf0f0f0;
    } else {
      const regiao = REGIAO[PAIS_REGIAO[club.country]] || PALETAS;
      const paleta = regiao[h % regiao.length];
      pri = paleta[0]; sec = paleta[1];
    }
    ini = initials(club.name);
    // >>> e não >>: com deslocamento COM sinal, hash acima de 2^31 vira negativo,
    // o índice fica negativo e a forma sai undefined (escudo invisível).
    pat = PADROES[(h >>> 3) % PADROES.length];
    forma = FORMAS[(h >>> 7) % FORMAS.length];
    const d = (h >>> 11) % 5;
    extra = d === 0 ? 'star' : d === 1 ? 'ball' : null;
  }

  const id = 'c' + (hash(key) % 100000).toString(36);
  const w = size, ht = Math.round(size * 1.14);
  const shield = forma;
  const enfeite = detalhe(extra);
  const fontSize = ini.length >= 5 ? 7 : ini.length === 4 ? 8.5 : ini.length === 3 ? 11 : 15;
  return `<span style="display:inline-block;width:${w}px;height:${ht}px;vertical-align:middle;line-height:0">
<svg width="${w}" height="${ht}" viewBox="0 0 40 47" xmlns="http://www.w3.org/2000/svg">
<defs><clipPath id="${id}"><path d="${shield}"/></clipPath></defs>
<path d="${shield}" fill="#000" opacity="0.25" transform="translate(0,1.2)"/>
<g clip-path="url(#${id})">${patternFill(pat, pri, sec, h)}</g>
<path d="${shield}" fill="none" stroke="${hx(sec)}" stroke-width="2.2"/>
<path d="${shield}" fill="none" stroke="#000" stroke-width="0.5" opacity="0.35"/>
${enfeite}
<text x="20" y="${extra ? 30 : 25}" ${ini ? '' : 'display="none"'} text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="900" font-size="${fontSize}" fill="${tc(pri)}" style="paint-order:stroke;stroke:${hx(pri)};stroke-width:2.2px">${ini}</text>
</svg></span>`;
}
