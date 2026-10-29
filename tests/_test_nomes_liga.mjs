// _test_nomes_liga.mjs — toda liga do jogo mostra o nome de verdade.
//
// Internamente as competicoes se chamam "Inglaterra — 5ª Divisão" e "Turquia — 2ª
// Divisão"; a tela deve trocar isso pelo nome real. O mapa existia mas nao cobria as
// divisoes que eu adicionei depois, e na tela de Ligas apareciam lado a lado
// "Premier League", "LaLiga" e "Inglaterra — 5ª Divisão".
import fs from 'fs';
import { nomeDaLiga } from '../src/career/paises.js';

const P = JSON.parse(fs.readFileSync('./public/players.json', 'utf8'));
let falhas = 0;
const ok = (c, m) => { if (!c) { console.log('  XX  ' + m); falhas++; } };

const feios = [];
const nomes = {};
for (const l of P.leagues) {
  const n = nomeDaLiga(l.country, l.tier, l.name);
  if (n.includes('—') || /\d+ª Divisão/.test(n)) feios.push(`${l.name} -> "${n}"`);
  (nomes[n] = nomes[n] || []).push(l.country);
}
ok(feios.length === 0, `${feios.length} liga(s) com nome tecnico:\n      ` + feios.join('\n      '));
console.log(`  ${P.leagues.length} ligas, todas com nome de verdade`);

// Nome repetido entre paises e legitimo (a liga austriaca se chama Bundesliga
// mesmo), mas nao pode repetir DENTRO do mesmo pais.
for (const [n, paises] of Object.entries(nomes)) {
  const unicos = new Set(paises);
  ok(unicos.size === paises.length,
    `"${n}" aparece ${paises.length}x e so em ${unicos.size} pais(es) — repetiu no mesmo pais`);
}
const repetidos = Object.entries(nomes).filter(([, v]) => v.length > 1);
console.log(`  ${repetidos.length} nomes que existem em mais de um pais (legitimo): `
  + repetidos.map(([n, v]) => `${n} (${v.join('/')})`).join(', '));

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
