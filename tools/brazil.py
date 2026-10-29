# -*- coding: utf-8 -*-
# Brasileirão Série A, B e C montado à mão (a base FIFA não licencia o Brasil).
# Série A: elencos com jogadores reais (nome, posição, overall estimado por nós).
# Série B e C: clubes reais + jogadores (nomes reais onde conhecidos; o resto é gerado),
# com overalls estimados por divisão. Posições: G, Z, L, M, A.
import random

random.seed(42)  # determinístico

# --------- gerador de nomes brasileiros (para completar elencos) ---------
FIRST = ["Bruno","Léo","Rafael","Diego","Thiago","Gabriel","Vitor","Kaio","Igor","Murilo","Enzo","Davi","Caio","Yuri","Pedro","Luan","Alan","Nathan","Ruan","Wesley","Juan","Ítalo","Breno","Matheus","Lucas","João","Guilherme","Felipe","André","Rodrigo","Éverton","Wanderson","Cauã","Emerson","Marcelo","Ronaldo","Paulo","Renan","Fábio","Douglas","Willian","Gustavo","Danilo","Vinícius","Richard","Otávio","Léo","Samuel","Adriano","Fernando"]
LAST = ["Silva","Souza","Costa","Lima","Alves","Rocha","Gomes","Ramos","Pinto","Dias","Melo","Nunes","Reis","Cardoso","Teixeira","Moraes","Barros","Freitas","Cruz","Farias","Ferreira","Ribeiro","Carvalho","Araújo","Nascimento","Moreira","Cavalcante","Batista","Correia","Macedo","Pereira","Oliveira","Santos","Fonseca","Andrade","Vieira","Duarte","Machado","Tavares","Pires"]

def gen_name():
    return FIRST[random.randrange(len(FIRST))] + " " + LAST[random.randrange(len(LAST))]

POS_PLAN = [("G", 3), ("Z", 5), ("L", 4), ("M", 6), ("A", 4)]  # 22

def fill_squad(existing, base):
    """completa um elenco até ~22 jogadores respeitando posições, com overalls perto de `base`."""
    squad = list(existing)
    have = {p: 0 for p in "GZLMA"}
    for (pos, ovr, name) in squad: have[pos] += 1
    for pos, n in POS_PLAN:
        while have[pos] < n:
            ovr = max(48, min(90, int(random.gauss(base - 2, 4))))
            squad.append((pos, ovr, gen_name())); have[pos] += 1
    return squad

def player_obj(pos, ovr, name):
    idade = random.randint(18, 34)
    age_factor = max(0.4, 1 - abs(26 - idade) * 0.045)
    pot = min(92, ovr + (random.randint(0, 8) if idade < 24 else random.randint(0, 2)))
    val = int((ovr ** 2) * age_factor * 210)
    wage = int(val * 0.010)
    foot = "L" if random.random() < 0.25 else "R"
    return [name, pos, ovr, pot, idade, val, wage, foot]

# =================== SÉRIE A (elencos reais) ===================
# club: (primary, secondary, base_overall, [(pos, ovr, nome), ...])
SERIE_A = {
"Flamengo": (0xd50000, 0x000000, 79, [
  ("G",82,"Agustín Rossi"),("Z",81,"Léo Pereira"),("Z",78,"Léo Ortiz"),("L",80,"Ayrton Lucas"),("L",76,"Guillermo Varela"),
  ("M",82,"Giorgian de Arrascaeta"),("M",80,"Nicolás de la Cruz"),("M",80,"Gerson"),("M",78,"Erick Pulgar"),
  ("A",82,"Pedro"),("A",81,"Bruno Henrique"),("A",80,"Gabriel Barbosa"),("A",77,"Everton Cebolinha"),("M",76,"Everton Ribeiro")]),
"Palmeiras": (0x006437, 0xffffff, 78, [
  ("G",82,"Weverton"),("Z",83,"Gustavo Gómez"),("Z",78,"Murilo"),("L",80,"Piquerez"),("L",77,"Mayke"),
  ("M",80,"Raphael Veiga"),("M",78,"Richard Ríos"),("M",77,"Zé Rafael"),("M",76,"Aníbal Moreno"),
  ("A",84,"Estêvão"),("A",78,"Rony"),("A",77,"Dudu"),("A",76,"Flaco López"),("A",75,"Maurício")]),
"Botafogo": (0x000000, 0xffffff, 77, [
  ("G",80,"John"),("Z",78,"Bastos"),("Z",77,"Adryelson"),("L",78,"Alex Telles"),("L",76,"Vitinho"),
  ("M",78,"Marlon Freitas"),("M",78,"Gregore"),("M",81,"Thiago Almada"),
  ("A",83,"Luiz Henrique"),("A",81,"Tiquinho Soares"),("A",80,"Jefferson Savarino"),("A",76,"Júnior Santos")]),
"Fortaleza": (0x00539b, 0xd2001c, 74, [
  ("G",76,"João Ricardo"),("Z",75,"Brítez"),("Z",74,"Titi"),("L",78,"Yago Pikachu"),("L",73,"Bruno Pacheco"),
  ("M",76,"Pochettino"),("M",75,"Hércules"),("M",74,"Zé Welison"),
  ("A",78,"Juan Martín Lucero"),("A",76,"Moisés"),("A",74,"Marinho"),("A",73,"Kervin Andrade")]),
"Internacional": (0xd10a11, 0xffffff, 76, [
  ("G",80,"Sergio Rochet"),("Z",79,"Vitão"),("Z",76,"Mercado"),("L",76,"Bernabei"),("L",74,"Bruno Gomes"),
  ("M",80,"Alan Patrick"),("M",76,"Fernando"),("M",75,"Thiago Maia"),
  ("A",80,"Enner Valencia"),("A",76,"Wanderson"),("A",74,"Borré"),("A",73,"Wesley")]),
"São Paulo": (0xe4022a, 0x000000, 76, [
  ("G",80,"Rafael"),("Z",80,"Arboleda"),("Z",77,"Alan Franco"),("L",77,"Rafinha"),("L",74,"Welington"),
  ("M",81,"Lucas Moura"),("M",77,"Luciano"),("M",76,"Alisson"),("M",74,"Bobadilla"),
  ("A",80,"Calleri"),("A",75,"Ferreirinha"),("A",73,"André Silva")]),
"Corinthians": (0x000000, 0xffffff, 75, [
  ("G",80,"Hugo Souza"),("Z",76,"Félix Torres"),("Z",74,"Cacá"),("L",76,"Matheuzinho"),("L",73,"Hugo"),
  ("M",80,"Rodrigo Garro"),("M",77,"André Carrillo"),("M",75,"Raniele"),
  ("A",81,"Memphis Depay"),("A",80,"Yuri Alberto"),("A",74,"Ángel Romero"),("A",73,"Talles Magno")]),
"Bahia": (0x0055a4, 0xd2001c, 74, [
  ("G",78,"Marcos Felipe"),("Z",76,"Kanu"),("Z",74,"Gabriel Xavier"),("L",76,"Santiago Arias"),("L",73,"Luciano Juba"),
  ("M",76,"Everton Ribeiro"),("M",75,"Cauly"),("M",74,"Jean Lucas"),
  ("A",77,"Everaldo"),("A",75,"Thaciano"),("A",74,"Ademir"),("A",73,"Biel")]),
"Cruzeiro": (0x1c3f94, 0xffffff, 75, [
  ("G",80,"Cássio"),("Z",76,"João Marcelo"),("Z",74,"Zé Ivaldo"),("L",76,"William"),("L",74,"Marlon"),
  ("M",80,"Matheus Pereira"),("M",76,"Lucas Silva"),("M",74,"Walace"),
  ("A",78,"Gabriel Veron"),("A",76,"Rafa Silva"),("A",75,"Kaio Jorge"),("A",73,"Lautaro Díaz")]),
"Vasco": (0x000000, 0xffffff, 74, [
  ("G",79,"Léo Jardim"),("Z",75,"João Victor"),("Z",73,"Maicon"),("L",74,"Paulinho"),("L",73,"Lucas Piton"),
  ("M",82,"Philippe Coutinho"),("M",76,"Souza"),("M",74,"Hugo Moura"),("M",78,"Payet"),
  ("A",79,"Vegetti"),("A",74,"David"),("A",73,"Rayan")]),
"Atlético-MG": (0x000000, 0xffffff, 76, [
  ("G",79,"Everson"),("Z",78,"Junior Alonso"),("Z",76,"Bruno Fuchs"),("L",77,"Guilherme Arana"),("L",74,"Saravia"),
  ("M",80,"Gustavo Scarpa"),("M",78,"Bernard"),("M",76,"Otávio"),("M",74,"Fausto Vera"),
  ("A",83,"Hulk"),("A",78,"Paulinho"),("A",74,"Deyverson")]),
"Grêmio": (0x0d80bf, 0x000000, 75, [
  ("G",80,"Marchesín"),("Z",77,"Kannemann"),("Z",74,"Geromel"),("L",75,"Reinaldo"),("L",73,"João Pedro"),
  ("M",78,"Cristaldo"),("M",76,"Villasanti"),("M",75,"Dodi"),
  ("A",79,"Soteldo"),("A",77,"Pavón"),("A",75,"Braithwaite"),("A",73,"Diego Costa")]),
"Fluminense": (0x8a1538, 0x005c36, 75, [
  ("G",82,"Fábio"),("Z",78,"Thiago Silva"),("Z",76,"Manoel"),("L",77,"Marcelo"),("L",74,"Diogo Barbosa"),
  ("M",80,"Ganso"),("M",76,"Martinelli"),("M",75,"Lima"),
  ("A",80,"Jhon Arias"),("A",79,"Germán Cano"),("A",74,"Keno"),("A",73,"Kauã Elias")]),
"Juventude": (0x0a7d3a, 0xffffff, 70, [
  ("G",73,"Gabriel"),("Z",71,"Rodrigo Sam"),("Z",70,"Wilker Ángel"),("L",71,"Alan Ruschel"),
  ("M",73,"Nenê"),("M",71,"Jadson"),("M",70,"Caíque"),
  ("A",73,"Gilberto"),("A",71,"Gabriel Taliari"),("A",70,"Ênio")]),
"RB Bragantino": (0xffffff, 0xd21e2b, 74, [
  ("G",77,"Cleiton"),("Z",75,"Léo Ortiz"),("Z",73,"Eduardo Santos"),("L",75,"Nathan Mendes"),("L",73,"Juninho Capixaba"),
  ("M",76,"Jadsom"),("M",74,"Lucas Evangelista"),("M",73,"Matheus Fernandes"),
  ("A",76,"Eduardo Sasha"),("A",75,"Helinho"),("A",74,"Vitinho"),("A",73,"Thiago Borbas")]),
"Criciúma": (0xf5c518, 0x000000, 70, [
  ("G",73,"Gustavo"),("Z",71,"Rodrigo"),("Z",70,"Tobias"),("L",71,"Marcelo Hermes"),
  ("M",73,"Fellipe Mateus"),("M",71,"Barreto"),("M",70,"Meli"),
  ("A",74,"Bolasie"),("A",71,"Yannick Bolasie"),("A",70,"Allano")]),
"Athletico-PR": (0xb0121a, 0x000000, 74, [
  ("G",79,"Bento"),("Z",75,"Thiago Heleno"),("Z",73,"Kaique Rocha"),("L",74,"Fernandinho"),("L",73,"Esquivel"),
  ("M",76,"Christian"),("M",74,"Fernandinho"),("M",73,"Cuello"),
  ("A",76,"Pablo"),("A",75,"Canobbio"),("A",74,"Julimar"),("A",73,"Nikão")]),
"Cuiabá": (0x1a7a3a, 0xf5c518, 70, [
  ("G",73,"Walter"),("Z",71,"Alan Empereur"),("Z",70,"Marllon"),("L",71,"Railson"),
  ("M",72,"Denilson"),("M",71,"Fernando Sobral"),("M",70,"Lucas Mineiro"),
  ("A",74,"Deyverson"),("A",72,"Clayson"),("A",70,"Pitta")]),
"Atlético-GO": (0xc8102e, 0x000000, 69, [
  ("G",72,"Ronaldo"),("Z",70,"Alix Vinícius"),("Z",69,"Adriano Martins"),("L",70,"Guilherme Romão"),
  ("M",71,"Shaylon"),("M",70,"Rhaldney"),("M",69,"Baralhas"),
  ("A",72,"Luiz Fernando"),("A",70,"Emiliano Rodríguez"),("A",69,"Janderson")]),
"Vitória": (0xd21e2b, 0x000000, 70, [
  ("G",73,"Lucas Arcanjo"),("Z",71,"Wagner Leonardo"),("Z",70,"Neris"),("L",71,"Lucas Esteves"),
  ("M",72,"Matheusinho"),("M",71,"Willian Oliveira"),("M",70,"Dudu"),
  ("A",73,"Osvaldo"),("A",71,"Alerrandro"),("A",70,"Everaldo")]),
}

# =================== SÉRIE B e C (clubes reais; jogadores em maioria gerados) ===================
# club: (primary, secondary, base_overall)
SERIE_B = {
"Santos": (0xf2f2f2, 0x111111, 74), "Sport": (0xd21e2b, 0x111111, 72), "Ceará": (0x111111, 0xffffff, 72),
"Novorizontino": (0xf5c518, 0x123c7b, 71), "Mirassol": (0xf5c518, 0x0a7d3a, 71), "Goiás": (0x0a7d3a, 0xffffff, 72),
"Vila Nova": (0xd21e2b, 0xffffff, 70), "América-MG": (0x0a7d3a, 0x111111, 72), "Chapecoense": (0x0a7d3a, 0xffffff, 70),
"Coritiba": (0x0a5c36, 0xffffff, 72), "Avaí": (0x1c48a0, 0xffffff, 70), "Operário-PR": (0x111111, 0xffffff, 69),
"Ponte Preta": (0x111111, 0xffffff, 70), "Guarani": (0x0a7d3a, 0xffffff, 69), "Amazonas": (0x0e7a4f, 0xf5c518, 68),
"Paysandu": (0x1c48a0, 0xffffff, 69), "CRB": (0xd21e2b, 0x111111, 70), "Botafogo-SP": (0xd21e2b, 0x111111, 69),
"Ituano": (0xd21e2b, 0x111111, 68), "Brusque": (0xd21e2b, 0xffffff, 67),
}
# alguns nomes reais conhecidos p/ dar identidade à Série B
SERIE_B_STARS = {
"Santos": [("A",76,"Guilherme"),("M",75,"Giuliano"),("A",74,"Julio Furch"),("G",75,"João Paulo"),("Z",74,"Gil"),("L",73,"Escobar")],
"Sport": [("A",73,"Gustavo Coutinho"),("M",72,"Lucas Lima"),("G",72,"Caíque França"),("Z",72,"Rafael Thyere")],
"Ceará": [("A",73,"Aylon"),("M",72,"Lourenço"),("G",73,"Richard"),("Z",72,"Marcos Victor")],
"Goiás": [("A",72,"Anselmo Ramon"),("M",71,"Rildo"),("G",72,"Tadeu")],
"América-MG": [("A",72,"Adyson"),("M",72,"Alê"),("G",72,"Matheus Cavichioli")],
"Coritiba": [("A",72,"Robson"),("M",71,"Sebastián Gómez"),("G",72,"Pedro Morisco")],
}
SERIE_C = {
"Remo": (0x0a2b5c, 0xffffff, 65), "Ferroviária": (0xd21e2b, 0xffffff, 64), "São Bernardo": (0x111111, 0xffffff, 64),
"Náutico": (0xd21e2b, 0xffffff, 65), "ABC": (0x111111, 0xffffff, 64), "Londrina": (0x1c48a0, 0xffffff, 63),
"São José-RS": (0x1c48a0, 0xffffff, 62), "Ypiranga-RS": (0x0a7d3a, 0xffffff, 63), "Volta Redonda": (0x0a7d3a, 0xf5c518, 63),
"Floresta": (0x0a7d3a, 0x111111, 61), "Athletic-MG": (0x111111, 0xf5c518, 62), "Confiança": (0x1c48a0, 0xffffff, 62),
"Sampaio Corrêa": (0xd21e2b, 0xf5c518, 63), "Botafogo-PB": (0xd21e2b, 0x111111, 62), "CSA": (0x1c48a0, 0xffffff, 63),
"Figueirense": (0x111111, 0xffffff, 63), "Tombense": (0x0a7d3a, 0xffffff, 61), "Aparecidense": (0x0a7d3a, 0xffffff, 60),
"Caxias": (0x0a7d3a, 0xffffff, 62), "Ferroviário-CE": (0xd21e2b, 0x111111, 61),
}

TACTS = ["guardiola","posicao","tikitaka","total","gegen","relacionismo","invertidos","false9","vertical","catenaccio","libero","wm","sacchismo","lavolpe","424"]

def _mk_club(i, name, pri, sec, real_players, base):
    squad = fill_squad(real_players, base)
    squad.sort(key=lambda x: -x[1])
    return {"n": name, "t": TACTS[i % len(TACTS)], "primary": pri, "secondary": sec,
            "players": [player_obj(pos, ovr, nome) for (pos, ovr, nome) in squad]}

def build_brazil():
    leagues = []
    # Série A
    clubs = []
    for i, (name, (pri, sec, base, players)) in enumerate(SERIE_A.items()):
        clubs.append(_mk_club(i, name, pri, sec, players, base))
    leagues.append({"name": "Brasileirão Série A", "country": "Brasil", "tier": 1, "real": True, "clubs": clubs})
    # Série B
    clubs = []
    for i, (name, (pri, sec, base)) in enumerate(SERIE_B.items()):
        clubs.append(_mk_club(i, name, pri, sec, SERIE_B_STARS.get(name, []), base))
    leagues.append({"name": "Brasileirão Série B", "country": "Brasil", "tier": 2, "real": True, "clubs": clubs})
    # Série C
    clubs = []
    for i, (name, (pri, sec, base)) in enumerate(SERIE_C.items()):
        clubs.append(_mk_club(i, name, pri, sec, [], base))
    leagues.append({"name": "Brasileirão Série C", "country": "Brasil", "tier": 3, "real": True, "clubs": clubs})
    return leagues
