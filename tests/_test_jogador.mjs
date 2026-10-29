import fs from 'fs';
import { hydrateDataset } from '../src/career/database.js';
import { PlayerCareer } from '../src/career/playerCareer.js';

const ds = hydrateDataset(JSON.parse(fs.readFileSync('public/players.json', 'utf8')));
const pc = new PlayerCareer(ds, { nome: 'Gustavo Queiroz', posicao: 'A', pe: 'R', nacionalidade: 'Brasil' });

console.log(`${pc.nome} (${pc.sigla}), ${pc.idade} anos — ${pc.clube().name} / ${pc.compDoClube().name}`);
console.log(`OVR ${pc.ovr} | teto oculto ${pc.potencial} | valor ${pc.valorMercado().toLocaleString('pt-BR')}\n`);

let n = 0;
while (!pc.aposentado && n++ < 30) {
  // responde as decisões escolhendo sempre a primeira opção
  while (pc.proximaDecisao()) pc.responderDecisao(0);
  pc.definirTreino(n < 8 ? 'fin' : 'com', n < 12 ? 'pesada' : 'normal');

  const r = pc.simularTemporada();
  const p = pc.ofertasPatrocinio();
  if (p.length && !pc.patrocinioMaterial) pc.assinarPatrocinio(p[0]);

  const extra = [r.titulos.length ? '🏆 ' + r.titulos.join(', ') : '', r.premios.join(', '), r.marcos.join(', ')]
    .filter(Boolean).join(' | ');
  console.log(`${r.ano} ${String(r.idade).padStart(2)}a ${r.clube.slice(0,18).padEnd(18)} OVR ${r.ovr} ${r.papel.padEnd(8)}`
    + ` ${String(r.jogos).padStart(2)}j ${String(r.gols).padStart(2)}g ${String(r.assist).padStart(2)}a nota ${r.nota}`
    + ` ${r.cumpriu ? '✅' : '❌'} ${extra}`);

  if (pc.propostas && pc.propostas.length && pc.propostas[0].forca > pc.forcaDoClube() + 2) {
    console.log(`   → aceitou proposta: ${pc.propostas[0].nome} (${pc.propostas[0].liga}, força ${pc.propostas[0].forca}, ${pc.propostas[0].papel})`);
    pc.aceitarProposta(pc.propostas[0].clubeId);
  }
  if (pc.contrato <= 0 && !pc.propostas?.length) { const o = pc.opcoesRenovacao(); if (o) pc.renovar(o[1].anos, o[1].salario); }
  if (pc.dinheiro > 2000000) pc.comprar('pt');

  const av = pc.avancarTemporada();
  if (av.chuteira) console.log(`   👟 chuteira de assinatura: ${av.chuteira}`);
  if (av.aposentou) break;
}

const f = pc.aposentar();
console.log(`\n===== FIM DE CARREIRA =====`);
console.log(`${pc.nome} — ${f.anos} temporadas, aposentou aos ${f.idade}`);
console.log(`${f.jogos} jogos, ${f.gols} gols, ${f.assist} assistências | pico de OVR ${f.picoOvr}`);
console.log(`Títulos (${f.titulos.length}): ${[...new Set(f.titulos)].slice(0,6).join(', ')}`);
console.log(`Prêmios (${f.premios.length}): ${[...new Set(f.premios)].slice(0,6).join(', ')}`);
console.log(`Seleção: ${pc.selecao.jogos} jogos, ${pc.selecao.gols} gols, títulos: ${pc.selecao.titulos.join(', ') || '—'}`);
console.log(`Patrimônio: R$ ${f.patrimonio.toLocaleString('pt-BR')}`);
console.log(`NOTA FINAL ${f.nota}/100 — ${f.tier.emoji} ${f.tier.nome}`);
