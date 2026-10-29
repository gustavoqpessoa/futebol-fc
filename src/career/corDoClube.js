// corDoClube.js — DE ONDE SAI A COR DA TELA.
//
// O campo de cor do dataset não serve sozinho: o Corinthians é preto e branco,
// o Botafogo também, e com isso a tela inteira saía cinza — "você não mudou
// nada". Mas o escudo do clube tem cor. Então a regra passa a ser:
//
//   1. se as cores declaradas do clube têm saturação de verdade, usa a mais viva;
//   2. se o clube é monocromático (preto/branco), tira a cor dominante DO ESCUDO;
//   3. se nem isso der, clareia o que houver.
//
// Nada é inventado: tudo vem do próprio clube.

const cache = new Map();

const hx = (n) => `#${(n >>> 0).toString(16).padStart(6, '0').slice(-6)}`;

function hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

/** Clareia uma cor até ela aparecer em fundo escuro. */
function clarear(n, f) {
  const mix = (v) => Math.round(v + (255 - v) * f);
  return (mix((n >> 16) & 255) << 16) | (mix((n >> 8) & 255) << 8) | mix(n & 255);
}

/** A cor dominante de uma imagem: a faixa de matiz com mais pixels vivos. */
export function corDaImagem(img) {
  try {
    const L = 48;
    const cv = document.createElement('canvas');
    cv.width = L; cv.height = L;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, L, L);
    const d = ctx.getImageData(0, 0, L, L).data;
    // 24 baldes de matiz; cada pixel vivo vota com o peso da sua saturação
    const peso = new Float64Array(24), soma = new Float64Array(24 * 3);
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3]; if (a < 160) continue;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const [h, s, l] = hsl(r, g, b);
      // branco, preto e cinza não contam: eles são o fundo do escudo
      if (s < 0.33 || l < 0.16 || l > 0.88) continue;
      const k = Math.min(23, Math.floor(h / 15));
      const w = s * (1 - Math.abs(l - 0.5));
      peso[k] += w; soma[k * 3] += r * w; soma[k * 3 + 1] += g * w; soma[k * 3 + 2] += b * w;
    }
    let melhor = -1, max = 0;
    for (let k = 0; k < 24; k++) if (peso[k] > max) { max = peso[k]; melhor = k; }
    if (melhor < 0 || max < 2) return null;
    const r = Math.round(soma[melhor * 3] / max);
    const g = Math.round(soma[melhor * 3 + 1] / max);
    const b = Math.round(soma[melhor * 3 + 2] / max);
    let n = (r << 16) | (g << 8) | b;
    // tem que brilhar no escuro
    const [, , l] = hsl(r, g, b);
    if (l < 0.34) n = clarear(n, 0.34 - l + 0.1);
    return hx(n);
  } catch (e) { return null; }
}

/** Cor escura não aparece em fundo escuro: o verde do Palmeiras e o vinho do
 *  Fluminense sumiam no botão. Aqui ela sobe até o ponto em que se lê. */
function paraTela(n) {
  const [, , l] = hsl((n >> 16) & 255, (n >> 8) & 255, n & 255);
  return l < 0.34 ? clarear(n, (0.34 - l) * 1.25) : n;
}

/** A cor de acento do clube, já resolvida (síncrona, sem olhar o escudo). */
export function acentoRapido(club) {
  const p1 = club.primary | 0, p2 = club.secondary | 0;
  const vivo = (n) => { const [, s, l] = hsl((n >> 16) & 255, (n >> 8) & 255, n & 255); return s > 0.3 && l > 0.13; };
  if (vivo(p1)) return hx(paraTela(p1));
  if (vivo(p2)) return hx(paraTela(p2));
  const [, , l1] = hsl((p1 >> 16) & 255, (p1 >> 8) & 255, p1 & 255);
  return l1 > 0.3 ? hx(p1) : hx(p2 || 0xffffff);
}

/**
 * A cor de acento definitiva. Devolve na hora o que der, e chama `aoAchar`
 * depois se o escudo revelar uma cor melhor (o escudo é uma imagem: só dá
 * para ler depois que ela carrega).
 */
export function acentoDoClube(club, htmlDoEscudo, aoAchar) {
  if (!club || !club.name) return '#ffffff';
  if (cache.has(club.name)) return cache.get(club.name);

  const rapido = acentoRapido(club);
  const p1 = club.primary | 0, p2 = club.secondary | 0;
  const [, s1] = hsl((p1 >> 16) & 255, (p1 >> 8) & 255, p1 & 255);
  const [, s2] = hsl((p2 >> 16) & 255, (p2 >> 8) & 255, p2 & 255);
  const monocromatico = s1 < 0.3 && s2 < 0.3;

  if (!monocromatico) { cache.set(club.name, rapido); return rapido; }

  // clube preto-e-branco: a cor vem do escudo
  const m = String(htmlDoEscudo || '').match(/src="([^"]+)"/);
  if (m) {
    const img = new Image();
    img.onload = () => {
      const cor = corDaImagem(img) || rapido;
      cache.set(club.name, cor);
      if (aoAchar) aoAchar(cor);
    };
    img.onerror = () => cache.set(club.name, rapido);
    img.src = m[1];
  }
  return rapido;
}
