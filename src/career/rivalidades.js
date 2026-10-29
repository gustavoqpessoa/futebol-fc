// rivalidades.js — os clássicos.
//
// Nem toda rodada é igual. Contra o rival, a torcida cobra antes, a vitória levanta
// o elenco e a derrota abre crise — mesmo que valha os mesmos três pontos.

const D = (a, b, nome, peso = 1) => ({ a, b, nome, peso });

export const CLASSICOS = [
  // ---- Brasil ----
  D('Flamengo', 'Fluminense', 'Fla-Flu', 1.3),
  D('Flamengo', 'Vasco', 'Clássico dos Milhões', 1.3),
  D('Flamengo', 'Botafogo', 'Clássico da Rivalidade', 1.2),
  D('Fluminense', 'Botafogo', 'Clássico Vovô', 1.1),
  D('Fluminense', 'Vasco', 'Clássico dos Gigantes', 1.1),
  D('Vasco', 'Botafogo', 'Clássico da Amizade', 1.1),
  D('Corinthians', 'Palmeiras', 'Derby Paulista', 1.4),
  D('Corinthians', 'São Paulo', 'Majestoso', 1.3),
  D('Corinthians', 'Santos', 'Clássico Alvinegro', 1.2),
  D('Palmeiras', 'São Paulo', 'Choque-Rei', 1.3),
  D('Palmeiras', 'Santos', 'Clássico da Saudade', 1.2),
  D('São Paulo', 'Santos', 'San-São', 1.2),
  D('Grêmio', 'Internacional', 'Grenal', 1.4),
  D('Atlético-MG', 'Cruzeiro', 'Clássico Mineiro', 1.4),
  D('Atlético-MG', 'América-MG', 'Clássico Alvinegro Mineiro', 1.0),
  D('Cruzeiro', 'América-MG', 'Clássico das Multidões', 1.0),
  D('Bahia', 'Vitória', 'Ba-Vi', 1.3),
  D('Athletico-PR', 'Coritiba', 'Atletiba', 1.3),
  D('Sport', 'Náutico', 'Clássico dos Clássicos', 1.2),
  D('Sport', 'Santa Cruz', 'Clássico das Multidões', 1.2),
  D('Náutico', 'Santa Cruz', 'Clássico dos Clássicos', 1.1),
  D('Remo', 'Paysandu', 'Re-Pa', 1.4),
  D('Ceará', 'Fortaleza', 'Clássico-Rei', 1.3),
  D('Goiás', 'Vila Nova', 'Clássico Goianense', 1.2),
  D('Figueirense', 'Avaí', 'Clássico da Capital', 1.2),
  D('Ponte Preta', 'Guarani', 'Derby Campineiro', 1.3),
  D('CRB', 'CSA', 'Clássico das Multidões', 1.2),
  D('ABC', 'América-RN', 'Clássico Rei', 1.2),
  D('Juventude', 'Caxias', 'Ca-Ju', 1.2),

  // ---- Mundo ----
  D('Real Madrid', 'FC Barcelona', 'El Clásico', 1.5),
  D('Real Madrid', 'Atlético Madrid', 'Derby de Madrid', 1.3),
  D('FC Barcelona', 'RCD Espanyol', 'Derby Catalão', 1.2),
  D('Sevilla FC', 'Real Betis Balompié', 'Derby Sevilhano', 1.3),
  D('Athletic Club', 'Real Sociedad', 'Derby Basco', 1.2),
  D('Liverpool', 'Everton', 'Derby de Merseyside', 1.3),
  D('Liverpool', 'Manchester United', 'Clássico da Inglaterra', 1.4),
  D('Manchester United', 'Manchester City', 'Derby de Manchester', 1.4),
  D('Arsenal', 'Tottenham Hotspur', 'Derby do Norte de Londres', 1.3),
  D('Chelsea', 'Arsenal', 'Derby de Londres', 1.2),
  D('Inter', 'AC Milan', 'Derby della Madonnina', 1.4),
  D('Juventus', 'Inter', 'Derby d\'Italia', 1.3),
  D('Roma', 'Lazio', 'Derby della Capitale', 1.4),
  D('Napoli', 'Juventus', 'Clássico do Sul', 1.2),
  D('Genoa', 'Sampdoria', 'Derby della Lanterna', 1.2),
  D('Bayern München', 'Borussia Dortmund', 'Der Klassiker', 1.4),
  D('Schalke 04', 'Borussia Dortmund', 'Derby do Ruhr', 1.4),
  D('Hamburger SV', 'FC St. Pauli', 'Derby de Hamburgo', 1.2),
  D('Paris Saint-Germain', 'Olympique de Marseille', 'Le Classique', 1.4),
  D('Olympique Lyonnais', 'AS Saint-Étienne', 'Derby do Ródano', 1.3),
  D('Benfica', 'FC Porto', 'O Clássico', 1.4),
  D('Benfica', 'Sporting CP', 'Derby de Lisboa', 1.4),
  D('Ajax', 'Feyenoord', 'De Klassieker', 1.4),
  D('Boca Juniors', 'River Plate', 'Superclásico', 1.5),
  D('Racing Club', 'Independiente', 'Clásico de Avellaneda', 1.3),
  D('Peñarol', 'Nacional', 'Clásico Uruguayo', 1.4),
  D('Colo-Colo', 'Universidad de Chile', 'Superclásico Chileno', 1.4),
  D('Olimpia', 'Cerro Porteño', 'Superclásico Paraguaio', 1.4),
  D('Millonarios', 'Independiente Santa Fe', 'El Clásico Capitalino', 1.3),
  D('Alianza Lima', 'Universitario', 'Clásico Peruano', 1.4),
  D('Celtic', 'Rangers', 'Old Firm', 1.5),
  D('Galatasaray', 'Fenerbahçe', 'Derby Intercontinental', 1.5),
  D('Olympiacos', 'Panathinaikos', 'Derby dos Eternos Inimigos', 1.4),
  D('Crvena Zvezda', 'Partizan', 'Eterno Derby', 1.4),
  D('Club América', 'Chivas', 'El Súper Clásico', 1.4),
];

// índice por par de nomes, nos dois sentidos
const MAPA = {};
for (const c of CLASSICOS) {
  MAPA[c.a + '|' + c.b] = c;
  MAPA[c.b + '|' + c.a] = c;
}

/** Retorna o clássico entre dois clubes, ou null. */
export function classicoEntre(nomeA, nomeB) {
  return MAPA[nomeA + '|' + nomeB] || null;
}

/**
 * Clássico "de estado": dois clubes grandes do mesmo estado que não estão na lista
 * ainda contam como jogo de rivalidade, só que com peso menor.
 */
export function ehDerbyRegional(clubeA, clubeB, estadoDe) {
  if (!estadoDe) return false;
  const ea = estadoDe(clubeA.name), eb = estadoDe(clubeB.name);
  return !!ea && ea === eb;
}
