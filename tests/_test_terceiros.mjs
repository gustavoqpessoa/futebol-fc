// _test_terceiros.mjs — quem termina em 3º no grupo da Libertadores cai para a
// Sul-Americana, e não para casa.
//
// O Gustavo: "eu fiquei em terceiro no grupo com o Corinthians e não fui para lugar
// nenhum. Na Libertadores o terceiro cai para a Sul-Americana." O playoff das oitavas
// da Sul-Americana era preenchido na montagem com "os melhores que sobraram" do pool,
// porque na hora de montar a chave a fase de grupos da principal ainda não tinha
// acontecido. Agora, quando ela acontece, os times de verdade substituem os reservas.
import fs from 'fs';
import { hydrateDataset } from '../src/career/database.js';
import { CareerManager } from '../src/career/careerManager.js';

const ds = hydrateDataset(JSON.parse(fs.readFileSync('./public/players.json', 'utf8')));
let falhas = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : '  XX  ') + m); if (!c) falhas++; };

let casos = 0, corretos = 0, meusCasos = 0, meusOk = 0;
for (const nome of ['Corinthians', 'Palmeiras', 'Flamengo', 'São Paulo', 'Grêmio',
  'Internacional', 'Fluminense', 'Botafogo']) {
  const m = new CareerManager(ds);
  m.selectClub(ds.clubs.find((c) => c.name === nome).id);
  const lib = m.cups.find((c) => c.kind === 'cont');
  const sul = m.cups.find((c) => c.kind === 'cont2');
  if (!lib || !sul) continue;
  const iPlay = sul.stages.findIndex((n) => /playoff/i.test(n));
  const s0 = m.season;
  let g = 0;
  while (m.season === s0 && g++ < 800 && !(sul.stage > iPlay)) m.simulateUserResult();

  const terceiros = lib.terceiros || [];
  const vieram = sul.vieramDaPrincipal || [];
  if (!terceiros.length) continue;
  casos++;
  if (vieram.length && vieram.every((id) => terceiros.includes(id))) corretos++;
  if (terceiros.includes(m.userClubId)) {
    meusCasos++;
    if (vieram.includes(m.userClubId)) meusOk++;
    console.log(`      ${nome} terminou em 3º no grupo e `
      + (vieram.includes(m.userClubId) ? 'caiu para a Sul-Americana' : 'NÃO caiu'));
  }
}

// Nem toda temporada chega aos grupos dentro do limite de dias (o clube pode cair
// nas preliminares), entao o teste cobra a maioria, nao as oito.
ok(casos >= 4, `${casos} temporadas com os grupos da Libertadores resolvidos`);
ok(corretos === casos, `o playoff da Sul-Americana veio dos terceiros em ${corretos}/${casos}`);
ok(meusCasos === meusOk, `o SEU clube caiu para a Sul-Americana em ${meusOk}/${meusCasos} vez(es) que ficou em 3º`);

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
