// _test_metodos.mjs — MÉTODO CHAMADO QUE NÃO EXISTE.
//
// Já aconteceu duas vezes: uma edição apagou _pastilhasDe e depois _checagem e
// _trocaDaVaga. Os testes passavam porque nenhum deles abre a tela, e o jogo
// chegava quebrado na mão do Gustavo — "aperto em dirigir a partida e não faz
// nada". Este teste lê o arquivo e cobra: tudo que é chamado tem que existir.
import fs from 'fs';

const ARQUIVOS = [
  'src/career/careerUI.js',
  'src/career/careerManager.js',
];

let falhas = 0;
for (const arq of ARQUIVOS) {
  const s = fs.readFileSync(arq, 'utf-8');
  const chamados = new Set([...s.matchAll(/this\.(_[A-Za-z0-9_]+)\s*\(/g)].map((m) => m[1]));
  const definidos = new Set([...s.matchAll(/^\s{2}(?:async\s+)?(_[A-Za-z0-9_]+)\s*\(/gm)].map((m) => m[1]));
  // também conta os que são atribuídos como propriedade (this._x = () => {})
  for (const m of s.matchAll(/this\.(_[A-Za-z0-9_]+)\s*=/g)) definidos.add(m[1]);

  const faltando = [...chamados].filter((n) => !definidos.has(n)).sort();
  if (faltando.length) {
    falhas += faltando.length;
    console.log(`  XX  ${arq}: chamado mas não existe → ${faltando.join(', ')}`);
  } else {
    console.log(`  OK  ${arq}: ${chamados.size} métodos chamados, todos existem`);
  }
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
