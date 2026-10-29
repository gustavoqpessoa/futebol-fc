// estados.js — de que estado é cada clube brasileiro, e o nome do estadual.
//
// Serve para montar os Campeonatos Estaduais, que no Brasil abrem a temporada antes
// de a série nacional começar. No jogo eles rodam nas primeiras rodadas do calendário.

export const ESTADO_DO_CLUBE = {
  // ---- Série A ----
  'Palmeiras': 'SP', 'Flamengo': 'RJ', 'Athletico-PR': 'PR', 'Fluminense': 'RJ',
  'Bahia': 'BA', 'RB Bragantino': 'SP', 'Cruzeiro': 'MG', 'Botafogo': 'RJ',
  'Corinthians': 'SP', 'Atlético-MG': 'MG', 'Coritiba': 'PR', 'São Paulo': 'SP',
  'Vitória': 'BA', 'Mirassol': 'SP', 'Santos': 'SP', 'Internacional': 'RS',
  'Grêmio': 'RS', 'Vasco': 'RJ', 'Remo': 'PA', 'Chapecoense': 'SC',

  // ---- Série B ----
  'Juventude': 'RS', 'Sport': 'PE', 'Ceará': 'CE', 'Novorizontino': 'SP',
  'Piauí': 'PI', 'Goiás': 'GO', 'Vila Nova': 'GO', 'América-MG': 'MG',
  'Portuguesa': 'SP', 'Cascavel': 'PR', 'Avaí': 'SC', 'Operário-PR': 'PR',
  'Ponte Preta': 'SP', 'Guarani': 'SP', 'Amazonas': 'AM', 'Paysandu': 'PA',
  'CRB': 'AL', 'Botafogo-SP': 'SP', 'Ituano': 'SP', 'Brusque': 'SC',

  // ---- Série C ----
  'Figueirense': 'SC', 'Londrina': 'PR', 'CSA': 'AL', 'Sampaio Correa': 'MA',
  'ABC': 'RN', 'Nautico Recife': 'PE', 'Ferroviario': 'CE', 'Botafogo PB': 'PB',
  'Palmas': 'TO', 'Aparecidense': 'GO', 'Ypiranga-RS': 'RS', 'Tombense': 'MG',
  'Sao Jose': 'RS', 'Caxias': 'RS', 'Confiança': 'SE', 'Floresta': 'CE',
  'Volta Redonda': 'RJ', 'Ferroviária': 'SP', 'São Bernardo': 'SP', '4 de Julho': 'PI',

  // ---- Série D ----
  'Brasiliense': 'DF', 'Ceilândia': 'DF', 'Gama': 'DF', 'Anápolis': 'GO',
  'Nova Iguaçu': 'RJ', 'Portuguesa-RJ': 'RJ', 'Boavista': 'RJ', 'América-RN': 'RN',
  'Sousa': 'PB', 'Campinense': 'PB', 'Treze': 'PB', 'Central': 'PE',
  'Retrô': 'PE', 'Juazeirense': 'BA', 'Jacuipense': 'BA', 'Itabuna': 'BA',
  'Coruripe': 'AL', 'Lagarto': 'SE', 'Itabaiana': 'SE', 'Sergipe': 'SE',
  'Humaitá': 'AC', 'Trem': 'AP', 'Manauara': 'AM', 'São Raimundo-AM': 'AM',
  'Porto Velho': 'RO', 'Real Ariquemes': 'RO', 'Marcílio Dias': 'SC',
  'Hercílio Luz': 'SC', 'Guarani-SC': 'SC', 'Rio Branco-AC': 'AC', 'GAS': 'RR',
  'Ypiranga-AP': 'AP', 'Nacional-PB': 'PB', 'Globo-RN': 'RN', 'Potiguar': 'RN',
  'Santa Cruz-RN': 'RN', 'Penedense': 'AL', 'Falcon': 'SE', 'Bahia de Feira': 'BA',
  'Petrolina': 'PE', 'EC Palmas': 'TO', 'AA Cuiabá': 'MT', 'SC Rondonópolis': 'MT',
  'CA Sinop': 'MT', 'GE Dourados': 'MS', 'AD Naviraí': 'MS', 'SE Uberaba': 'MG',
  'União Patos de Minas': 'MG', 'Real Poços de Caldas': 'MG', 'Nacional Varginha': 'MG',
  'EC Cabo Frio': 'RJ', 'AA Macaé': 'RJ', 'SC Barra Mansa': 'RJ', 'CA Teresópolis': 'RJ',
  'GE Bragança': 'SP', 'AD Marília': 'SP', 'SE Bauru': 'SP', 'União Franca': 'SP',
  'Real Sorocaba': 'SP', 'Nacional Presidente Prudente': 'SP', 'EC Chapecó': 'SC',
  'AA Criciúma': 'SC', 'SC Blumenau': 'SC', 'CA Pelotas': 'RS',

  // ---- os que faltavam ----
  // 56 clubes brasileiros estavam sem estado e caíam num "Campeonato Estadual (??)":
  // Fortaleza, Cuiabá, Criciúma, Náutico e Santa Cruz entre eles. Quatro tinham nome
  // ambíguo e foram conferidos um a um: o Barra é de Balneário Camboriú (SC), o
  // Independência é de Rio Branco (AC), o Primavera é de Primavera do Leste (MT) e o
  // Laguna é de Tibau do Sul (RN) — não do Ceará, como o nome sugere.
  'Fortaleza': 'CE', 'Athletic': 'MG', 'Cuiabá': 'MT', 'Atlético-GO': 'GO',
  'Criciúma': 'SC', 'Náutico': 'PE', 'Santa Cruz': 'PE', 'Barra': 'SC',
  'Maranhão': 'MA', 'Botafogo-PB': 'PB', 'Inter de Limeira': 'SP', 'Maringá': 'PR',
  'Nacional-AM': 'AM', 'São Raimundo-RR': 'RR', 'Monte Roraima': 'RR', 'Manaus': 'AM',
  'Guaporé': 'RO', 'Araguaína': 'TO', 'Independência': 'AC', 'Galvez': 'AC',
  'Luverdense': 'MT', 'Primavera': 'MT', 'Inhumas': 'GO', 'Capital-DF': 'DF',
  'Goiatuba': 'GO', 'Mixto': 'MT', 'União-MT': 'MT', 'Várzea Grande': 'MT',
  'Águia de Marabá': 'PA', 'Imperatriz': 'MA', 'Tuna Luso': 'PA',
  'Tocantinópolis': 'TO', 'Oratório': 'AP', 'Iguatu': 'CE', 'Maracanã': 'CE',
  'Parnahyba': 'PI', 'Sampaio Corrêa': 'MA', 'Moto Club': 'MA', 'Ferroviário': 'CE',
  'Fluminense-PI': 'PI', 'Atlético de Altos': 'PI', 'Atlético Cearense': 'CE',
  'Maguary': 'PE', 'Laguna': 'RN', 'Serra Branca': 'PB', 'Decisão': 'SE',
  'ASA': 'AL', 'CSE': 'AL', 'Atlético de Alagoinhas': 'BA', 'Uberlândia': 'MG',
  'Betim': 'MG', 'CRAC': 'GO', 'Ivinhema': 'MS', 'Operário-MS': 'MS',
  'Democrata-GV': 'MG',
};

export const NOME_ESTADUAL = {
  SP: 'Campeonato Paulista', RJ: 'Campeonato Carioca', MG: 'Campeonato Mineiro',
  RS: 'Campeonato Gaúcho', PR: 'Campeonato Paranaense', SC: 'Campeonato Catarinense',
  BA: 'Campeonato Baiano', PE: 'Campeonato Pernambucano', CE: 'Campeonato Cearense',
  GO: 'Campeonato Goiano', PA: 'Campeonato Paraense', AM: 'Campeonato Amazonense',
  AL: 'Campeonato Alagoano', SE: 'Campeonato Sergipano', PB: 'Campeonato Paraibano',
  RN: 'Campeonato Potiguar', PI: 'Campeonato Piauiense', MA: 'Campeonato Maranhense',
  DF: 'Campeonato Brasiliense', MT: 'Campeonato Mato-Grossense',
  MS: 'Campeonato Sul-Mato-Grossense', TO: 'Campeonato Tocantinense',
  RO: 'Campeonato Rondoniense', AC: 'Campeonato Acreano', AP: 'Campeonato Amapaense',
  RR: 'Campeonato Roraimense',
};

// As cidades que o gerador usa quando precisa criar um clube brasileiro. Sem isto o
// "EC Jaú" que ele inventa não teria estado e cairia num "Campeonato Estadual (??)".
export const CIDADE_UF = {
  'Marília': 'SP', 'Rio Claro': 'SP', 'Araçatuba': 'SP', 'Bauru': 'SP', 'Jaú': 'SP',
  'Franca': 'SP', 'Barretos': 'SP', 'Catanduva': 'SP', 'Assis': 'SP',
  'Itapetininga': 'SP', 'Registro': 'SP', 'Ubatuba': 'SP', 'Caraguatatuba': 'SP',
  'Itanhaém': 'SP', 'Avaré': 'SP', 'Lins': 'SP',
};

export function estadoDe(nomeClube) {
  if (ESTADO_DO_CLUBE[nomeClube]) return ESTADO_DO_CLUBE[nomeClube];
  // clube criado pelo gerador: o nome é prefixo + cidade (ou cidade + sufixo)
  for (const [cidade, uf] of Object.entries(CIDADE_UF)) {
    if (nomeClube.includes(cidade)) return uf;
  }
  return null;
}
export function nomeDoEstadual(uf) { return NOME_ESTADUAL[uf] || `Campeonato Estadual (${uf})`; }
