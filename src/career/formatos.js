// GERADO por tools/gera_formatos.py a partir de tools/formatos_ligas.json.
// Não editar à mão: mexa no JSON e rode o pipeline de novo.
// Cada liga é o campeonato do país como ele é de verdade — quem divide a
// temporada em dois grupos no fim divide aqui também.
export const FORMATOS = {
 "Bélgica": {
  "formato": "pontos_corridos",
  "detalhe": "Turno e returno, 34 rodadas. A liga cresceu de 16 para 18 clubes em 2026-27 e ACABOU com os playoffs — antes tinha Playoffs I, II e III com os pontos cortados pela metade.",
  "split": {
   "grupos": [
    6,
    12
   ],
   "pontos": "metade",
   "jogos": 10
  }
 },
 "Escócia": {
  "formato": "divisao",
  "turnos": 3,
  "detalhe": "Cada clube enfrenta os outros três vezes (33 rodadas). Aí divide em top 6 e bottom 6, mais 5 rodadas dentro do grupo. Total de 38 jogos. Os pontos NÃO são cortados.",
  "repescagem": "11º disputa repescagem contra o vencedor do playoff da Championship",
  "split": {
   "grupos": [
    6,
    6
   ],
   "pontos": "mantem",
   "jogos": 5
  }
 },
 "Áustria": {
  "formato": "divisao",
  "detalhe": "22 rodadas de turno e returno; divide em grupo do título (top 6) e grupo do rebaixamento (bottom 6), com os pontos CORTADOS PELA METADE e arredondados para baixo. Mais 10 rodadas. Total de 32 jogos.",
  "split": {
   "grupos": [
    6,
    6
   ],
   "pontos": "metade",
   "jogos": 10
  }
 },
 "Dinamarca": {
  "formato": "divisao",
  "detalhe": "22 rodadas; divide em playoff do título (top 6) e playoff de classificação (bottom 6), 10 rodadas cada. Total de 32. Pontos não são cortados.",
  "split": {
   "grupos": [
    6,
    6
   ],
   "pontos": "mantem",
   "jogos": 10
  }
 },
 "Coreia do Sul": {
  "formato": "divisao",
  "turnos": 3,
  "detalhe": "Cada clube enfrenta os outros três vezes (33 rodadas); divide em Final A (top 6) e Final B (bottom 6), mais 5 rodadas. Total de 38.",
  "repescagem": "10º e 11º disputam repescagem contra clubes da K League 2",
  "split": {
   "grupos": [
    6,
    6
   ],
   "pontos": "mantem",
   "jogos": 5
  }
 },
 "México": {
  "formato": "apertura_clausura",
  "detalhe": "Dois torneios por temporada, Apertura (jul-dez) e Clausura (jan-mai), cada um com campeão próprio. Fase regular em tabela única; os 8 primeiros vão à liguilla, mata-mata de ida e volta.",
  "observacao": "Rebaixamento suspenso desde 2020. Decisão do TAS de set/2025 manda voltar a partir de 2026-27."
 },
 "Argentina": {
  "formato": "apertura_clausura",
  "detalhe": "30 clubes divididos em dois grupos de 15. Apertura e Clausura, cada um com os 8 melhores de cada grupo indo ao mata-mata (oitavas até a final, jogo único). Há ainda o título de Campeão de Liga, para quem somar mais pontos no ano.",
  "observacao": "Rebaixamento por PROMEDIOS: média de pontos dos últimos três anos, não a posição do ano."
 },
 "Estados Unidos": {
  "formato": "conferencias_playoffs",
  "detalhe": "30 franquias em duas conferências (Leste e Oeste), 34 jogos na fase regular, depois playoffs pela MLS Cup.",
  "observacao": "Não há acesso nem rebaixamento — é liga fechada. Toronto FC, CF Montréal e Vancouver Whitecaps são canadenses e jogam aqui."
 },
 "Canadá": {
  "formato": "playoffs",
  "detalhe": "Canadian Premier League, 8 clubes, fase regular seguida de playoffs."
 },
 "Austrália": {
  "formato": "playoffs",
  "detalhe": "A-League Men, 12 clubes, fase regular seguida de finals series.",
  "observacao": "Liga fechada. Auckland FC e Wellington Phoenix são da Nova Zelândia e jogam aqui."
 },
 "Paraguai": {
  "formato": "apertura_clausura",
  "detalhe": "Apertura e Clausura, cada um com campeão próprio."
 },
 "África do Sul": {
  "formato": "pontos_corridos"
 },
 "Costa do Marfim": {
  "formato": "pontos_corridos"
 },
 "Senegal": {
  "formato": "pontos_corridos"
 },
 "Uruguai": {
  "formato": "apertura_clausura",
  "detalhe": "Temporada no calendário europeu (agosto a julho). Apertura e Clausura; os campeões dos dois se enfrentam numa final de ida e volta pelo título do ano."
 },
 "Chile": {
  "formato": "pontos_corridos",
  "detalhe": "Turno e returno simples, sem playoff. Campeão é quem soma mais pontos."
 },
 "Colômbia": {
  "formato": "apertura_clausura",
  "detalhe": "Apertura (fev-jun) e Finalización (jul-dez), cada um com campeão próprio. Fase única de 19 rodadas, os 8 melhores vão aos cuadrangulares (dois grupos de quatro), e os vencedores decidem em ida e volta.",
  "observacao": "Rebaixamento por MÉDIA de pontos das últimas três temporadas, não pela posição do ano."
 },
 "Peru": {
  "formato": "apertura_clausura",
  "detalhe": "Apertura, Clausura e playoffs. Os campeões dos dois torneios e os dois melhores da tabela acumulada fazem semifinais e final. Quem vence os dois torneios é campeão direto."
 },
 "Equador": {
  "formato": "duas_etapas",
  "detalhe": "Primeira e segunda etapa, cada uma em turno e returno. Os vencedores das duas decidem o título numa terceira etapa; quem vence as duas é campeão direto."
 },
 "Bolívia": {
  "formato": "pontos_corridos",
  "detalhe": "Turno e returno.",
  "repescagem": "o penúltimo disputa repescagem contra o vice da Copa Simón Bolívar"
 },
 "Venezuela": {
  "formato": "playoffs",
  "detalhe": "Turno e returno, com os 8 melhores indo à fase semifinal em dois grupos de quatro; os vencedores decidem o título.",
  "observacao": "A fonte lista 14 clubes mas descreve o formato citando 20 — CONFERIR o número antes de confiar."
 },
 "Japão": {
  "formato": "pontos_corridos",
  "detalhe": "Turno e returno, 38 jogos. Os dois primeiros vão à AFC Champions League Elite e o terceiro à AFC Champions League Two."
 },
 "China": {
  "formato": "pontos_corridos",
  "detalhe": "Turno e returno, 30 jogos."
 },
 "País de Gales": {
  "formato": "split",
  "detalhe": "Turno e returno e depois divisão em três grupos (6 de cima, 4 do meio, 6 de baixo), 35 rodadas no total. Pontos NÃO são zerados.",
  "observacao": "Cardiff, Swansea, Wrexham e Newport NÃO jogam aqui — jogam no sistema inglês, e é lá que eles têm de estar no jogo.",
  "repescagem": "o 14º joga repescagem contra os classificados da Cymru North e da Cymru South",
  "split": {
   "grupos": [
    6,
    4,
    6
   ],
   "pontos": "mantem",
   "jogos": 5
  }
 },
 "Grécia": {
  "formato": "split",
  "detalhe": "26 rodadas de turno e returno. Depois os 4 primeiros fazem um quadrangular de 6 jogos pelo título, do 5º ao 8º disputam vaga na Conference, e os 6 últimos jogam o play-out do rebaixamento. Pontos são MANTIDOS.",
  "observacao": "O número de rebaixados pode mudar por licenciamento no fim da temporada.",
  "split": {
   "grupos": [
    4,
    10
   ],
   "pontos": "mantem",
   "jogos": 6
  }
 },
 "Romênia": {
  "formato": "split",
  "detalhe": "30 rodadas de turno e returno, depois divisão: os 6 primeiros no play-off do título (mais 10 jogos) e os 10 restantes no play-out (mais 9). Os pontos são DIVIDIDOS PELA METADE na virada.",
  "split": {
   "grupos": [
    6,
    10
   ],
   "pontos": "metade",
   "jogos": 10
  }
 },
 "Suíça": {
  "formato": "split",
  "turnos": 3,
  "detalhe": "33 rodadas (todos contra todos três vezes), depois divisão em grupo do título e grupo do rebaixamento, com mais 5 jogos cada. Pontos são MANTIDOS.",
  "repescagem": "o penúltimo joga repescagem contra o vice da Challenge League",
  "split": {
   "grupos": [
    6,
    6
   ],
   "pontos": "mantem",
   "jogos": 5
  }
 },
 "Nova Zelândia": {
  "formato": "fechada",
  "detalhe": "Fase regional (Norte, Centro e Sul) e depois uma fase nacional de turno único entre os melhores de cada região, com grande final. Auckland FC Reserves e Wellington Phoenix Reserves entram direto.",
  "observacao": "Não há acesso nem rebaixamento: os clubes se requalificam pela liga regional todo ano. O Wellington Phoenix principal joga na A-League da Austrália — na Nova Zelândia só está o time reserva."
 },
 "Croácia": {
  "formato": "pontos_corridos",
  "turnos": 4,
  "detalhe": "Só 10 clubes, então todos se enfrentam QUATRO vezes: 36 rodadas. A temporada inteira tem 180 jogos, o que com 5 partidas por rodada dá exatamente 36.",
  "observacao": "Eu tinha anotado 33 rodadas, que é um formato antigo (1999-2000 e 2006-07) e não fecha com 10 clubes."
 },
 "Sérvia": {
  "formato": "split",
  "detalhe": "26 rodadas de turno e returno. Depois divide: os 6 primeiros jogam mais 5 rodadas pelo título e os 8 últimos mais 7 pela permanência. Total de 33. Pontos são MANTIDOS.",
  "observacao": "A Wikipédia em inglês diz 8+8, que é o formato de quando a liga tinha 16 clubes — está errada para hoje. A partir de 2027-28 a liga cai para 12.",
  "repescagem": "o antepenúltimo joga repescagem contra o 3º da segunda divisão",
  "split": {
   "grupos": [
    6,
    8
   ],
   "pontos": "mantem",
   "jogos": [
    5,
    7
   ]
  }
 },
 "República Tcheca": {
  "formato": "split",
  "detalhe": "30 rodadas de turno e returno e depois três grupos: os 6 primeiros jogam mais 5 partidas pelo título, do 7º ao 10º disputam vaga europeia, e do 11º ao 16º brigam contra a queda. Pontos são MANTIDOS.",
  "repescagem": "o 14º e o 15º jogam repescagem contra o 2º e o 3º da segunda divisão",
  "split": {
   "grupos": [
    6,
    10
   ],
   "pontos": "mantem",
   "jogos": 5
  }
 },
 "Chipre": {
  "formato": "split",
  "detalhe": "26 rodadas de turno e returno, depois divisão: os 6 primeiros jogam mais 10 partidas pelo título e os 8 últimos mais 7 fugindo da queda. Pontos e saldo são MANTIDOS.",
  "split": {
   "grupos": [
    6,
    8
   ],
   "pontos": "mantem",
   "jogos": 10
  }
 },
 "Israel": {
  "formato": "split",
  "detalhe": "26 rodadas de turno e returno. Depois os 6 primeiros se enfrentam duas vezes pelo título e os 8 últimos uma vez para escapar do rebaixamento.",
  "observacao": "A fonte não diz se os pontos são zerados na virada para o playoff — CONFERIR.",
  "split": {
   "grupos": [
    6,
    8
   ],
   "pontos": "mantem",
   "jogos": 10
  }
 },
 "Bulgária": {
  "formato": "split",
  "detalhe": "Turno e returno e depois divide em TRÊS grupos: 1º ao 4º (mais 6 rodadas) brigam pelo título, 5º ao 8º (mais 6) por vaga na Europa e 9º ao 14º (mais 5) para não cair.",
  "observacao": "A fonte não diz se os pontos são cortados na virada da fase; deixei MANTIDOS, que é como a liga sempre jogou — CONFERIR.",
  "repescagem": "o 12º e o 13º jogam repescagem contra o 2º e o 3º da segunda divisão",
  "split": {
   "grupos": [
    4,
    4,
    6
   ],
   "pontos": "mantem",
   "jogos": [
    6,
    6,
    5
   ]
  }
 },
 "Suécia": {
  "formato": "pontos_corridos",
  "calendario": "ano civil",
  "detalhe": "Turno e returno, 30 rodadas. A temporada vai de abril a novembro, dentro do mesmo ano.",
  "repescagem": "o antepenúltimo joga repescagem contra o 3º da segunda divisão"
 },
 "Noruega": {
  "formato": "pontos_corridos",
  "calendario": "ano civil",
  "detalhe": "Turno e returno, 30 rodadas, de março a novembro.",
  "repescagem": "o 14º joga repescagem contra um clube da segunda divisão"
 },
 "Finlândia": {
  "formato": "split",
  "calendario": "ano civil",
  "detalhe": "22 rodadas de abril a outubro e depois divisão: 6 de cima brigam pelo título e 6 de baixo pela permanência, mais 5 jogos cada. Pontos são MANTIDOS.",
  "repescagem": "o penúltimo joga repescagem de ida e volta contra o vice da segunda divisão",
  "split": {
   "grupos": [
    6,
    6
   ],
   "pontos": "mantem",
   "jogos": 5
  }
 },
 "Polônia": {
  "formato": "pontos_corridos",
  "detalhe": "Turno e returno, 34 rodadas. O split de 8/8 que existia até 2019-20 acabou.",
  "observacao": "A fonte não diz quantos caem — CONFERIR (pode ser 3)."
 },
 "Ucrânia": {
  "formato": "split",
  "detalhe": "Turno e returno e depois divisão em dois grupos, que jogam entre si de novo. Temporada de julho a junho com pausa de três meses no inverno.",
  "observacao": "A fonte se contradiz (fala em 16 clubes, 26 jogos e dois grupos de seis) — CONFERIR o formato antes de programar."
 },
 "Rússia": {
  "formato": "pontos_corridos",
  "detalhe": "Turno e returno, 30 rodadas.",
  "repescagem": "o 13º e o 14º jogam repescagem de ida e volta contra o 3º e o 4º da segunda divisão"
 },
 "Arábia Saudita": {
  "formato": "pontos_corridos",
  "detalhe": "Turno e returno, 34 rodadas.",
  "observacao": "Sobem 2 direto e o terceiro sai de um playoff entre o 3º e o 6º da segunda divisão."
 },
 "Emirados Árabes Unidos": {
  "formato": "pontos_corridos",
  "detalhe": "Turno e returno.",
  "observacao": "A fonte confirma que existe acesso e rebaixamento mas NÃO diz quantos — CONFERIR."
 },
 "Índia": {
  "formato": "pontos_corridos",
  "detalhe": "Turno e returno de setembro a abril. Os playoffs acabaram em 2025-26: campeão é quem termina em primeiro.",
  "observacao": "A liga DEIXOU de ser fechada: o primeiro rebaixamento da história foi em 2025-26."
 },
 "Portugal": {
  "formato": "pontos_corridos",
  "detalhe": "Turno e returno, 34 rodadas.",
  "observacao": "Times B da segunda divisão não podem subir, então a conta pode virar 3 e 3 dependendo do ano."
 },
 "Holanda": {
  "formato": "pontos_corridos",
  "detalhe": "Turno e returno, 34 rodadas.",
  "repescagem": "o antepenúltimo entra num playoff com seis clubes bem colocados da segunda divisão"
 },
 "Turquia": {
  "formato": "pontos_corridos",
  "detalhe": "Turno e returno, 34 rodadas, de agosto a maio.",
  "observacao": "Sobem 2 direto e o terceiro sai de um playoff entre o 3º e o 7º da segunda divisão."
 },
 "França": {
  "formato": "pontos_corridos",
  "detalhe": "Turno e returno, 34 rodadas. São 18 clubes desde 2023-24, não 20."
 },
 "Alemanha": {
  "formato": "pontos_corridos",
  "detalhe": "Turno e returno, 34 rodadas.",
  "repescagem": "o antepenúltimo joga repescagem de ida e volta contra o 3º da 2. Bundesliga"
 },
 "Brasil": {
  "formato": "pontos_corridos",
  "calendario": "ano civil",
  "detalhe": "Turno e returno, 38 rodadas, de maio a dezembro.",
  "observacao": "Do 1º ao 6º vão à Libertadores; do 7º ao 12º à Sul-Americana."
 },
 "Inglaterra": {
  "formato": "pontos_corridos",
  "detalhe": "Turno e returno, 38 rodadas, de agosto a maio.",
  "observacao": "Sobem 2 direto e o terceiro sai do playoff entre o 3º e o 6º da segunda divisão."
 },
 "Espanha": {
  "formato": "pontos_corridos",
  "detalhe": "Turno e returno, 38 rodadas.",
  "observacao": "Sobem 2 direto e o terceiro sai do playoff entre o 3º e o 6º da segunda divisão."
 },
 "Itália": {
  "formato": "pontos_corridos",
  "detalhe": "Turno e returno, 38 rodadas, de agosto a maio.",
  "observacao": "Os 3 primeiros da Serie B sobem."
 },
 "Hungria": {
  "formato": "pontos_corridos",
  "turnos": 3,
  "detalhe": "12 clubes que se enfrentam TRÊS vezes, 33 rodadas. O terceiro jogo é no estádio de quem não recebeu o último.",
  "observacao": "O 11º ainda disputa uma repescagem contra o 2º da segunda divisão, em campo neutro."
 },
 "Irlanda": {
  "formato": "pontos_corridos",
  "turnos": 4,
  "calendario": "ano civil",
  "detalhe": "10 clubes que se enfrentam QUATRO vezes, duas em casa e duas fora: 36 rodadas.",
  "observacao": "O 9º disputa repescagem contra o vencedor do playoff da First Division."
 }
};

export function formatoDoPais(pais) { return FORMATOS[pais] || null; }
/** Só a 1ª divisão joga o formato do país; as de baixo são pontos corridos. */
/** Quantas vezes cada clube enfrenta cada adversario na fase regular da 1a divisao.
  A hungara e a escocesa jogam 3 vezes, a irlandesa 4; o resto joga turno e returno. */
export function turnosDaLiga(pais, tier) {
  if ((tier || 1) !== 1) return 2;
  const f = FORMATOS[pais];
  return (f && f.turnos) || 2;
}
export function splitDaLiga(pais, tier) {
  if ((tier || 1) !== 1) return null;
  const f = FORMATOS[pais];
  return (f && f.split) || null;
}
