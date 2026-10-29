// matchBridge.js — traduz os dados da carreira para a partida 3D e de volta.
import { bestEleven, avgForca } from './database.js';

// converte força média (45..85) em multiplicador de velocidade (~0.9 .. 1.12)
function strengthToSpeed(f) { return 0.9 + (f - 60) / 200; }

// Monta as configs de time (cores + 11 nomes + força) para o Game 3D
export function buildMatchConfigs(career, oppOverride) {
  const user = career.userClub();
  const opp = oppOverride || career.opponentClub();
  const userEleven = bestEleven(user, career.lineupIds);
  const oppEleven = bestEleven(opp, null);
  const userCfg = {
    name: user.name, primary: user.primary, secondary: user.secondary,
    roster: userEleven.map((p) => p.nome.split(' ')[0]),
    speedMul: strengthToSpeed(avgForca(userEleven)),
    tactic: career.tacticOf(user).key,
  };
  const oppCfg = {
    name: opp.name, primary: opp.primary, secondary: opp.secondary,
    roster: oppEleven.map((p) => p.nome.split(' ')[0]),
    speedMul: strengthToSpeed(avgForca(oppEleven)),
    tactic: career.tacticOf(opp).key,
  };
  // usuário sempre joga como "home" na cena 3D (mando é só tático/financeiro)
  return { homeCfg: userCfg, awayCfg: oppCfg };
}
