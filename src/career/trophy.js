// trophy.js — troféus em SVG. Um troféu genérico + variações personalizadas por
// campeonato, no estilo dos reais (Champions "orelhuda", Libertadores, Mundo, taça de liga).

const GOLD = `<defs> <linearGradient id="tgg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c4"/><stop offset="0.35" stop-color="#f5c518"/><stop offset="0.7" stop-color="#d99a12"/><stop offset="1" stop-color="#a6720a"/></linearGradient> <linearGradient id="tgs" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c8920f"/><stop offset="0.5" stop-color="#ffe680"/><stop offset="1" stop-color="#c8920f"/></linearGradient> <linearGradient id="tsl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef3f8"/><stop offset="1" stop-color="#9fb0c4"/></linearGradient></defs>`;

// genérica (taça dourada)
export function trophy(size = 64) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${GOLD}
  <path d="M16 14 C6 14 6 30 18 31" fill="none" stroke="url(#tgg)" stroke-width="3.5"/> <path d="M48 14 C58 14 58 30 46 31" fill="none" stroke="url(#tgg)" stroke-width="3.5"/> <path d="M16 10 H48 V20 C48 32 40 38 32 38 C24 38 16 32 16 20 Z" fill="url(#tgg)" stroke="#8a5f08" stroke-width="1"/> <path d="M21 13 H30 V20 C30 27 26 31 22 31 C21 27 21 20 21 13 Z" fill="#fff" opacity="0.28"/> <rect x="29.5" y="38" width="5" height="9" fill="url(#tgs)"/><rect x="22" y="47" width="20" height="4" rx="2" fill="url(#tgg)" stroke="#8a5f08" stroke-width="0.6"/><rect x="18" y="51" width="28" height="5" rx="2.5" fill="url(#tgs)" stroke="#8a5f08" stroke-width="0.6"/> <path d="M32 17 l1.6 3.3 3.6 .5 -2.6 2.5 .6 3.6 -3.2 -1.7 -3.2 1.7 .6 -3.6 -2.6 -2.5 3.6 -.5 Z" fill="#fff8d0" opacity="0.9"/></svg>`;
}

// Champions League — taça prateada de "orelhas" grandes
function champions(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${GOLD}
  <path d="M12 12 C0 14 2 40 20 40" fill="none" stroke="url(#tsl)" stroke-width="5"/> <path d="M52 12 C64 14 62 40 44 40" fill="none" stroke="url(#tsl)" stroke-width="5"/> <path d="M18 8 H46 V24 C46 36 40 42 32 42 C24 42 18 36 18 24 Z" fill="url(#tsl)" stroke="#5f7488" stroke-width="1"/> <rect x="29" y="42" width="6" height="7" fill="#9fb0c4"/><rect x="20" y="49" width="24" height="4" rx="2" fill="url(#tsl)"/><rect x="17" y="53" width="30" height="5" rx="2.5" fill="#7f93a8"/> <path d="M24 12 H40 V22 C40 30 36 35 32 35 C28 35 24 30 24 22 Z" fill="#fff" opacity="0.25"/></svg>`;
}

// Libertadores — grande taça dourada em pedestal alto
function libertadores(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${GOLD}
  <ellipse cx="32" cy="14" rx="16" ry="6" fill="url(#tgg)" stroke="#8a5f08" stroke-width="1"/> <path d="M16 14 C16 30 24 36 32 36 C40 36 48 30 48 14 Z" fill="url(#tgg)" stroke="#8a5f08" stroke-width="1"/> <path d="M22 15 C22 26 27 31 32 31 C33 24 30 18 22 15 Z" fill="#fff" opacity="0.25"/> <rect x="29" y="36" width="6" height="10" fill="url(#tgs)"/> <path d="M20 46 H44 L40 52 H24 Z" fill="url(#tgg)" stroke="#8a5f08" stroke-width="0.6"/><rect x="20" y="52" width="24" height="5" rx="2" fill="url(#tgs)"/></svg>`;
}

// Copa do Mundo — troféu de duas figuras segurando o globo
function worldcup(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${GOLD}
  <circle cx="32" cy="15" r="10" fill="url(#tgg)" stroke="#8a5f08" stroke-width="1"/> <ellipse cx="32" cy="15" rx="10" ry="4" fill="none" stroke="#a6720a" stroke-width="0.8"/> <path d="M32 6 V24 M22 15 H42" stroke="#a6720a" stroke-width="0.6"/> <path d="M24 24 C24 40 28 46 30 50 H34 C36 46 40 40 40 24 C37 30 27 30 24 24 Z" fill="url(#tgg)" stroke="#8a5f08" stroke-width="1"/> <path d="M28 24 C28 38 30 44 31 48 C31 40 29 32 28 24 Z" fill="#fff" opacity="0.25"/> <rect x="22" y="50" width="20" height="4" rx="2" fill="url(#tgs)"/><rect x="19" y="54" width="26" height="5" rx="2.5" fill="url(#tgs)"/></svg>`;
}

// taça de liga (prata) — para campeonatos nacionais / copas locais
function league(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${GOLD}
  <path d="M14 12 C4 12 4 28 17 30" fill="none" stroke="url(#tsl)" stroke-width="3.5"/> <path d="M50 12 C60 12 60 28 47 30" fill="none" stroke="url(#tsl)" stroke-width="3.5"/> <path d="M16 9 H48 V22 C48 33 40 38 32 38 C24 38 16 33 16 22 Z" fill="url(#tsl)" stroke="#5f7488" stroke-width="1"/> <rect x="29.5" y="38" width="5" height="9" fill="#9fb0c4"/><rect x="21" y="47" width="22" height="4" rx="2" fill="url(#tsl)"/><rect x="17" y="51" width="30" height="5" rx="2.5" fill="#7f93a8"/></svg>`;
}

// escolhe o troféu certo pelo nome do campeonato
export function compTrophy(name = '', size = 64) {
  const n = name.toLowerCase();
  if (n.includes('mundo') || n.includes('copa do mundo')) return worldcup(size);
  if (n.includes('champions')) return champions(size);
  if (n.includes('libertadores')) return libertadores(size);
  if (n.includes('copa') || n.includes('cup') || n.includes('taça') || n.includes('pokal') || n.includes('coppa') || n.includes('coupe')) return league(size);
  return trophy(size);   // ligas → taça dourada
}
