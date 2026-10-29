// paises.js — bandeira, continente e nome oficial de cada liga por país.
//
// Serve à navegação estilo FIFA (país → liga → clube) e aos rótulos das divisões:
// "D1" não diz nada; "Premier League" e "Bundesliga" dizem tudo.

export const BANDEIRA = {
  'Alemanha': '🇩🇪', 'Argentina': '🇦🇷', 'Arábia Saudita': '🇸🇦', 'Austrália': '🇦🇺',
  'Bolívia': '🇧🇴', 'Brasil': '🇧🇷', 'Bélgica': '🇧🇪', 'Canadá': '🇨🇦', 'Chile': '🇨🇱',
  'China': '🇨🇳', 'Chipre': '🇨🇾', 'Colômbia': '🇨🇴', 'Coreia do Sul': '🇰🇷',
  'Costa do Marfim': '🇨🇮', 'Croácia': '🇭🇷', 'Dinamarca': '🇩🇰',
  'Emirados Árabes Unidos': '🇦🇪', 'Equador': '🇪🇨', 'Escócia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Espanha': '🇪🇸',
  'Estados Unidos': '🇺🇸', 'Finlândia': '🇫🇮', 'França': '🇫🇷', 'Grécia': '🇬🇷',
  'Holanda': '🇳🇱', 'Hungria': '🇭🇺', 'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Irlanda': '🇮🇪', 'Itália': '🇮🇹',
  'Japão': '🇯🇵', 'México': '🇲🇽', 'Noruega': '🇳🇴', 'Nova Zelândia': '🇳🇿',
  'Paraguai': '🇵🇾', 'País de Gales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Peru': '🇵🇪', 'Polônia': '🇵🇱',
  'Portugal': '🇵🇹', 'República Tcheca': '🇨🇿', 'Romênia': '🇷🇴', 'Rússia': '🇷🇺',
  'Senegal': '🇸🇳', 'Suécia': '🇸🇪', 'Suíça': '🇨🇭', 'Sérvia': '🇷🇸', 'Turquia': '🇹🇷',
  'Ucrânia': '🇺🇦', 'Uruguai': '🇺🇾', 'Venezuela': '🇻🇪', 'África do Sul': '🇿🇦',
  'Áustria': '🇦🇹', 'Índia': '🇮🇳', 'Bulgária': '🇧🇬', 'Israel': '🇮🇱',

  // Nacionalidades que faltavam: 1.739 jogadores apareciam SEM bandeira, entre eles
  // o Zakaria Labyad do Corinthians, que é marroquino. O dado da nacionalidade
  // sempre existiu — o que faltava era a bandeira para desenhar.
  'Albânia': '🇦🇱', 'Andorra': '🇦🇩', 'Angola': '🇦🇴', 'Antigua and Barbuda': '🇦🇬',
  'Argélia': '🇩🇿', 'Armênia': '🇦🇲', 'Azerbaijan': '🇦🇿', 'Belarus': '🇧🇾',
  'Benin': '🇧🇯', 'Bonaire': '🇧🇶', 'Botswana': '🇧🇼', 'Burkina Faso': '🇧🇫',
  'Burundi': '🇧🇮', 'Bósnia': '🇧🇦', 'Cabo Verde': '🇨🇻', 'Camarões': '🇨🇲',
  'Central African Republic': '🇨🇫', 'Chad': '🇹🇩', 'Comoros': '🇰🇲', 'Congo': '🇨🇬',
  'Costa Rica': '🇨🇷', 'Cuba': '🇨🇺', 'Curacao': '🇨🇼', 'Dominican Republic': '🇩🇴',
  'Egito': '🇪🇬', 'El Salvador': '🇸🇻', 'Equatorial Guinea': '🇬🇶', 'Eritrea': '🇪🇷',
  'Eslováquia': '🇸🇰', 'Eslovênia': '🇸🇮', 'Estonia': '🇪🇪', 'Faroe Islands': '🇫🇴',
  'French Guiana': '🇬🇫', 'Gabão': '🇬🇦', 'Gana': '🇬🇭', 'Geórgia': '🇬🇪',
  'Grenada': '🇬🇩', 'Guadeloupe': '🇬🇵', 'Guatemala': '🇬🇹', 'Guiné': '🇬🇳',
  'Guiné-Bissau': '🇬🇼', 'Guyana': '🇬🇾', 'Haiti': '🇭🇹', 'Honduras': '🇭🇳',
  'Indonesia': '🇮🇩', 'Iraque': '🇮🇶', 'Irlanda do Norte': '🇬🇧', 'Irã': '🇮🇷',
  'Sri Lanka': '🇱🇰', 'Hongkong': '🇭🇰', 'Barbados': '🇧🇧', 'Timor-Leste': '🇹🇱',
  'Gibraltar': '🇬🇮', 'Oman': '🇴🇲', 'Nicaragua': '🇳🇮', 'Ethiopia': '🇪🇹',
  'Islândia': '🇮🇸', 'Jamaica': '🇯🇲', 'Jordan': '🇯🇴', 'Kazakhstan': '🇰🇿',
  'Kosovo': '🇽🇰', 'Latvia': '🇱🇻', 'Lebanon': '🇱🇧', 'Liberia': '🇱🇷',
  'Libya': '🇱🇾', 'Lithuania': '🇱🇹', 'Luxembourg': '🇱🇺', 'Macedônia do Norte': '🇲🇰',
  'Madagascar': '🇲🇬', 'Malawi': '🇲🇼', 'Malaysia': '🇲🇾', 'Mali': '🇲🇱',
  'Malta': '🇲🇹', 'Marrocos': '🇲🇦', 'Martinique': '🇲🇶', 'Mauritania': '🇲🇷',
  'Mauritius': '🇲🇺', 'Moldova': '🇲🇩', 'Montenegro': '🇲🇪', 'Moçambique': '🇲🇿',
  'New Caledonia': '🇳🇨', 'Niger': '🇳🇪', 'Nigéria': '🇳🇬', 'Palestine': '🇵🇸',
  'Panamá': '🇵🇦', 'Philippines': '🇵🇭', 'Puerto Rico': '🇵🇷', 'Quênia': '🇰🇪',
  'RD Congo': '🇨🇩', 'Rwanda': '🇷🇼', 'Sierra Leone': '🇸🇱', 'Somalia': '🇸🇴',
  'Southern Sudan': '🇸🇸', 'St. Kitts & Nevis': '🇰🇳', 'St. Vincent & Grenadinen': '🇻🇨', 'Sudan': '🇸🇩',
  'Suriname': '🇸🇷', 'Syria': '🇸🇾', 'Tajikistan': '🇹🇯', 'Tanzania': '🇹🇿',
  'Thailand': '🇹🇭', 'The Gambia': '🇬🇲', 'Togo': '🇹🇬', 'Trinidad and Tobago': '🇹🇹',
  'Tunísia': '🇹🇳', 'Türkiye': '🇹🇷', 'Uganda': '🇺🇬', 'Uzbekistan': '🇺🇿',
  'Vanuatu': '🇻🇺', 'Yemen': '🇾🇪', 'Zimbábue': '🇿🇼', 'Zâmbia': '🇿🇲',
};

// As grandes ligas do mundo aparecem primeiro na tela de países.
export const PESO = {
  'Brasil': 100, 'Inglaterra': 95, 'Espanha': 94, 'Itália': 93, 'Alemanha': 92,
  'França': 91, 'Portugal': 85, 'Holanda': 84, 'Argentina': 83, 'Bélgica': 78,
  'Turquia': 76, 'Escócia': 74, 'México': 73, 'Estados Unidos': 72, 'Arábia Saudita': 71,
  'Áustria': 70, 'Suíça': 69, 'Grécia': 68, 'Rússia': 67, 'Ucrânia': 66,
  'Colômbia': 65, 'Chile': 64, 'Japão': 63, 'Coreia do Sul': 62, 'Dinamarca': 61,
};

// Nome de verdade de cada divisão. O que existir aqui substitui o "País — Nª Divisão".
export const NOME_LIGA = {
  // A 5ª inglesa é a National League — o jogo mostrava "Inglaterra — 5ª Divisão".
  'Inglaterra': ['Premier League', 'Championship', 'League One', 'League Two',
                 'National League'],
  'Espanha': ['LaLiga', 'LaLiga 2', 'Primera Federación'],
  'Itália': ['Serie A', 'Serie B', 'Serie C'],
  'Alemanha': ['Bundesliga', '2. Bundesliga', '3. Liga', 'Regionalliga'],
  'França': ['Ligue 1', 'Ligue 2', 'National'],
  'Portugal': ['Primeira Liga', 'Liga Portugal 2'],
  'Holanda': ['Eredivisie', 'Eerste Divisie'],
  'Brasil': ['Brasileirão Série A', 'Brasileirão Série B', 'Brasileirão Série C', 'Brasileirão Série D'],
  'Argentina': ['Liga Profesional', 'Primera Nacional'],
  'Escócia': ['Premiership', 'Championship'],
  'Bélgica': ['Pro League'], 'Turquia': ['Süper Lig', 'TFF 1. Lig'],
  'Grécia': ['Super League'],
  'Rússia': ['Premier Liga'], 'Ucrânia': ['Premier Liha'], 'Áustria': ['Bundesliga'],
  'Suíça': ['Super League'], 'Dinamarca': ['Superliga'], 'Noruega': ['Eliteserien'],
  'Suécia': ['Allsvenskan'], 'Polônia': ['Ekstraklasa', 'I liga'],
  'República Tcheca': ['Fortuna Liga'],
  'Croácia': ['HNL'], 'Sérvia': ['SuperLiga'], 'Romênia': ['SuperLiga', 'Liga II'],
  'Hungria': ['NB I'], 'Chipre': ['First Division'], 'Finlândia': ['Veikkausliiga'],
  'Irlanda': ['Premier Division'], 'País de Gales': ['Cymru Premier'],
  'México': ['Liga MX'], 'Estados Unidos': ['MLS', 'USL Championship'],
  'Canadá': ['Canadian Premier League'],
  'Colômbia': ['Liga BetPlay'], 'Chile': ['Primera División'], 'Peru': ['Liga 1'],
  'Equador': ['LigaPro'], 'Uruguai': ['Primera División'], 'Paraguai': ['División Profesional'],
  'Bolívia': ['División Profesional'], 'Venezuela': ['Liga FUTVE'],
  'Japão': ['J1 League'], 'Coreia do Sul': ['K League 1'],
  'China': ['Super League', 'China League One'],
  'Arábia Saudita': ['Saudi Pro League'], 'Emirados Árabes Unidos': ['UAE Pro League'],
  'Índia': ['Indian Super League'], 'Austrália': ['A-League'], 'Nova Zelândia': ['National League'],
  'África do Sul': ['Premiership'], 'Senegal': ['Ligue 1'], 'Costa do Marfim': ['Ligue 1'],
  'Bulgária': ['efbet Liga'], 'Israel': ['Ligat ha\'Al'],
};

export function bandeira(pais) { return BANDEIRA[pais] || '🏳️'; }
/** Bandeira do jogador. Sem país conhecido não desenha nada: bandeira branca
 *  seria dizer 'é de algum lugar', e o certo é não afirmar. */
export function bandeiraDoJogador(pais) { return (pais && BANDEIRA[pais]) || ''; }

// Nome bonito da competição. tier é 1-based.
export function nomeDaLiga(pais, tier, nomeOriginal) {
  const lista = NOME_LIGA[pais];
  if (lista && lista[tier - 1]) return lista[tier - 1];
  return nomeOriginal;
}

// Rótulo curto da divisão, para a etiqueta ao lado do nome.
export function rotuloDivisao(tier) {
  return ['1ª divisão', '2ª divisão', '3ª divisão', '4ª divisão'][tier - 1] || `${tier}ª divisão`;
}

// ---------------------------------------------------------------- acesso
//
// Quantos sobem e quantos caem em cada país. Sem isso o jogo usava "só o primeiro
// sobe" em toda liga do mundo, o que não é verdade em lugar nenhum.
// Formato: [quantos sobem, quantos caem] na divisão de cima para a de baixo.
export const ACESSO = {
  'Brasil': [4, 4],            // Série A/B/C/D: 4 sobem, 4 caem
  'Inglaterra': [3, 3],        // 2 diretos + playoff
  'Espanha': [3, 3],
  'Itália': [3, 3],
  'Alemanha': [2, 2],          // 2 diretos + 1 playoff
  'França': [3, 3],           // 18 clubes desde 2023-24, e caem 3 e nao 2
  'Portugal': [2, 2],
  'Holanda': [2, 2],
  'Argentina': [2, 2],         // rebaixamento por PROMEDIOS (média de 3 anos)
  'Turquia': [3, 3],

  // --- conferidos na Wikipédia (ver tools/formatos_ligas.json) ---
  'Escócia': [2, 2],           // 1 direto + repescagem do 11º
  'Bélgica': [2, 2],           // 2 diretos + repescagem do 16º
  'Áustria': [1, 1],
  'Dinamarca': [2, 2],
  'Coreia do Sul': [1, 1],     // 12º cai; 10º e 11º disputam repescagem
  'Paraguai': [1, 1],
  'África do Sul': [2, 2],
  'Costa do Marfim': [2, 2],
  'Senegal': [2, 2],

  // --- segunda leva: América do Sul e Ásia (ver tools/formatos_ligas.json) ---
  'Uruguai': [2, 2],
  'Chile': [2, 2],
  'Colômbia': [2, 2],          // rebaixamento por MÉDIA de pontos de 3 temporadas
  'Peru': [2, 2],
  'Equador': [2, 2],
  'Bolívia': [1, 1],           // o penúltimo ainda joga repescagem
  'Venezuela': [2, 2],
  'Japão': [3, 3],
  'País de Gales': [2, 2],     // o 14º ainda joga repescagem
  'Grécia': [2, 2],
  'Romênia': [2, 2],
  'Suíça': [1, 1],             // o penúltimo joga repescagem
  'Croácia': [1, 1],
  'Sérvia': [2, 2],            // o antepenúltimo joga repescagem
  'República Tcheca': [1, 1],  // o 14º e o 15º jogam repescagem
  'Chipre': [3, 3],
  'Israel': [2, 2],
  'Bulgária': [2, 2],
  'Suécia': [2, 2],            // o antepenúltimo joga repescagem
  'Noruega': [2, 2],           // o 14º joga repescagem
  'Finlândia': [1, 1],         // o penúltimo joga repescagem
  'Polônia': [2, 2],
  'Ucrânia': [2, 2],
  'Rússia': [2, 2],            // o 13º e o 14º jogam repescagem
  'Índia': [1, 1],             // deixou de ser fechada em 2025-26
  'Arábia Saudita': [3, 3],
  'Emirados Árabes Unidos': [2, 2],
  'China': [2, 2],

  // --- ligas FECHADAS: não existe acesso nem rebaixamento ---
  'Estados Unidos': [0, 0],    // MLS
  'México': [0, 0],            // suspenso desde 2020; o TAS mandou voltar em 2026-27
  'Austrália': [0, 0],         // A-League
  'Canadá': [0, 0],            // Canadian Premier League

  'Nova Zelândia': [0, 0],   // os clubes se requalificam pela liga regional
};

export function vagasDeAcesso(pais) { return ACESSO[pais] || [2, 3]; }
