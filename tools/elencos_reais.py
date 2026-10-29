#!/usr/bin/env python3
"""
elencos_reais.py — dá o elenco REAL aos clubes que estavam com elenco genérico.

O problema
----------
Clubes como o Napoli, o FC Porto e o Zenit entraram no jogo quando o "Resto do Mundo"
foi desmontado, mas o `players.base.json` nunca teve elenco para eles: ficaram com
jogadores genéricos, ou com elenco emprestado de outro time. São 154 clubes assim nas
primeiras divisões — nome certo, escudo certo, elenco de mentira.

A base do Transfermarkt tem o elenco de verdade desses clubes. O que ela NÃO tem é
overall e potencial, que são invenção de jogo, não dado do mundo real.

Como o overall é obtido, e por que não é chute
----------------------------------------------
Ele é MEDIDO no próprio jogo. Existem ~28.700 jogadores que já têm as três coisas —
valor de mercado real, idade e overall do SoFIFA. Isso dá uma tabela de duas entradas
(idade × valor) construída a partir de dado, não de fórmula minha.

A idade importa muito, e o Gustavo apontou isso antes de mim. Com o MESMO valor de
€ 10 milhões:

    16-20 anos -> overall 70      24-26 anos -> overall 75      33-40 anos -> overall 82

No jovem o preço embute o futuro; no veterano, o preço já caiu mas o jogador ainda é
bom. Uma tabela só de valor erraria por 11 pontos nas pontas.

Três coisas entram na conta:
  - **idade e valor de mercado**, pela tabela medida acima;
  - **jogos pela seleção**, que com o mesmo valor valem até +4 de overall (quem é
    titular de seleção é bom comprovado, mesmo com o preço baixo);
  - **potencial**, que é o overall mais a folga típica da idade: +10,5 até os 20 anos,
    +0,4 depois dos 33 — também medido, não arbitrado.

O que este script NÃO faz
-------------------------
Não toca em clube que já tem elenco coerente. Não toca no Brasil. Não inventa jogador:
todo nome, idade, posição e pé vêm do Transfermarkt.

Uso:  python3 tools/elencos_reais.py [pasta-do-archive]
"""
import bisect
import collections
import csv
import difflib
import json
import math
import os
import re
import sys
import unicodedata

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQ = os.path.join(RAIZ, 'public', 'players.json')
PADRAO = os.path.expanduser('~/Downloads/archive')
ANO = 2026
ATUAL = '2025'

# Só primeiras divisões, que é o que a base cobre. O Brasil fica de fora inteiro:
# a Série A tem os 704 jogadores reais do .docx do Gustavo.
LIGAS = {
    'Inglaterra — 1ª Divisão', 'Espanha — 1ª Divisão', 'Itália — 1ª Divisão',
    'Alemanha — 1ª Divisão', 'França — 1ª Divisão', 'Portugal — Liga',
    'Holanda — 1ª Divisão', 'Bélgica — Liga', 'Turquia — 1ª Divisão', 'Rússia — Liga',
    'Áustria — Liga', 'Suíça — Liga', 'Grécia — Liga', 'Escócia — Liga',
    'Dinamarca — Liga', 'Noruega — Liga', 'Suécia — Liga', 'Polônia — 1ª Divisão',
    'República Tcheca — Liga', 'Croácia — Liga', 'Sérvia — Liga',
    'Romênia — 1ª Divisão', 'Ucrânia — Liga', 'Arábia Saudita — Liga',
    'Estados Unidos — 1ª Divisão', 'México — Liga', 'Argentina — 1ª Divisão',
    'Japão — Liga', 'Coreia do Sul — Liga', 'Austrália — Liga',
}

MIN_ELENCO, MAX_ELENCO = 16, 30

# competition_id do Transfermarkt -> liga no jogo, para saber o país de cada clube
COMP_LIGA = {
    'GB1': 'Inglaterra — 1ª Divisão', 'ES1': 'Espanha — 1ª Divisão',
    'IT1': 'Itália — 1ª Divisão', 'L1': 'Alemanha — 1ª Divisão',
    'FR1': 'França — 1ª Divisão', 'PO1': 'Portugal — Liga',
    'NL1': 'Holanda — 1ª Divisão', 'BE1': 'Bélgica — Liga',
    'TR1': 'Turquia — 1ª Divisão', 'RU1': 'Rússia — Liga',
    'A1': 'Áustria — Liga', 'C1': 'Suíça — Liga', 'GR1': 'Grécia — Liga',
    'SC1': 'Escócia — Liga', 'DK1': 'Dinamarca — Liga', 'NO1': 'Noruega — Liga',
    'SE1': 'Suécia — Liga', 'PL1': 'Polônia — 1ª Divisão',
    'TS1': 'República Tcheca — Liga', 'KR1': 'Croácia — Liga',
    'SER1': 'Sérvia — Liga', 'RO1': 'Romênia — 1ª Divisão', 'UKR1': 'Ucrânia — Liga',
    'SA1': 'Arábia Saudita — Liga', 'MLS1': 'Estados Unidos — 1ª Divisão',
    'MEX1': 'México — Liga', 'ARG1': 'Argentina — 1ª Divisão',
    'JAP1': 'Japão — Liga', 'RSK1': 'Coreia do Sul — Liga',
    'AUS1': 'Austrália — Liga', 'BRA1': 'Brasileirão Série A',
}

RUIDO = set('fc sc cf ac ad ud cd rc rcd sd sv vfl vfb tsg sk jk fk kv krc kaa rsc afc osc '
            'ssc ss us as ca cs ec se aa gd cp hnk nk gnk ofk pfk bsc sfc club clube de da do '
            'the balompie calcio futebol futbol football kulubu'.split())
ESTRANHAS = str.maketrans({'ø': 'o', 'Ø': 'o', 'ß': 's', 'đ': 'd', 'ł': 'l',
                           'æ': 'a', 'ð': 'd'})

# Posição do Transfermarkt -> (grupo do jogo, SIGLA FINA).
#
# O grupo é o que o motor usa para escalar (G goleiro, Z zagueiro, L lateral, M meio,
# A ataque). A sigla fina é o que aparece na tela: LE, LD, VOL, PE, PD...
#
# Eu tinha jogado a sigla fina fora — gravava o grupo nos dois lugares, então Højlund,
# Neres e Lang, que são ponta e centroavante, viravam todos "A". O Gustavo pegou isso
# olhando o A. Santos. O Transfermarkt sempre teve Left Winger e Right Winger
# separados; a perda foi minha.
SUBPOS = {
    'Goalkeeper':         ('G', 'GOL'),
    'Centre-Back':        ('Z', 'ZAG'),
    'Left-Back':          ('L', 'LE'),
    'Right-Back':         ('L', 'LD'),
    'Defensive Midfield': ('M', 'VOL'),
    'Central Midfield':   ('M', 'MC'),
    'Attacking Midfield': ('M', 'MEI'),
    # o jogo não tem vaga de meia-de-lado; entram como meia, que é o mais próximo
    'Left Midfield':      ('M', 'MEI'),
    'Right Midfield':     ('M', 'MEI'),
    'Left Winger':        ('A', 'PE'),
    'Right Winger':       ('A', 'PD'),
    'Centre-Forward':     ('A', 'ATA'),
    'Second Striker':     ('A', 'ATA'),
}
POS = {'Goalkeeper': ('G', 'GOL'), 'Defender': ('Z', 'ZAG'),
       'Midfield': ('M', 'MC'), 'Attack': ('A', 'ATA')}


def sem_acento(t):
    return unicodedata.normalize('NFD', t.translate(ESTRANHAS)).encode('ascii', 'ignore').decode()


def nucleo(t):
    ws = [w for w in re.split(r'[^a-z0-9]+', sem_acento(t).lower())
          if w and w not in RUIDO and not w.isdigit()]
    return ''.join(ws)


def chave_jogador(nome):
    """Sobrenome + inicial: é o que "E. Haaland" e "Erling Haaland" têm em comum."""
    ps = [p for p in re.split(r'[^a-z]+', sem_acento(nome).lower()) if p]
    return (ps[-1], ps[0][0]) if ps else None


def sobrenome(n):
    ps = [p for p in re.split(r'[^a-z]+', sem_acento(n).lower()) if p]
    return ps[-1] if ps else ''


def encurtar(nome):
    """"Erling Haaland" -> "E. Haaland", que é como o jogo escreve (SoFIFA)."""
    ps = nome.split()
    return f'{ps[0][0]}. {" ".join(ps[1:])}' if len(ps) > 1 else nome


def inteiro(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return 0


def ajustar(am):
    """Mínimos quadrados de overall = a + b·log10(valor) + c·idade."""
    n = len(am)
    sx = sum(x for x, _, _ in am); sy = sum(y for _, y, _ in am)
    sz = sum(z for _, _, z in am); sxx = sum(x * x for x, _, _ in am)
    syy = sum(y * y for _, y, _ in am); sxy = sum(x * y for x, y, _ in am)
    sxz = sum(x * z for x, _, z in am); syz = sum(y * z for _, y, z in am)
    M = [[n, sx, sy, sz], [sx, sxx, sxy, sxz], [sy, sxy, syy, syz]]
    for i in range(3):
        piv = max(range(i, 3), key=lambda r: abs(M[r][i]))
        M[i], M[piv] = M[piv], M[i]
        for r in range(3):
            if r != i:
                f = M[r][i] / M[i][i]
                for k in range(i, 4):
                    M[r][k] -= f * M[i][k]
    return [M[i][3] / M[i][i] for i in range(3)]


def faixa_idade(i):
    for a, b in ((16, 20), (21, 23), (24, 26), (27, 29), (30, 32), (33, 45)):
        if a <= i <= b:
            return (a, b)
    return (24, 26)


def main():
    origem = sys.argv[1] if len(sys.argv) > 1 else PADRAO
    if not os.path.isdir(origem):
        print(f'{origem} não existe — pulei os elencos reais')
        return 0
    csv.field_size_limit(10 ** 9)
    dados = json.load(open(ARQ, encoding='utf-8'))

    # ---------------------------------------------- 1. a tabela idade × valor
    # Medida nos jogadores que já têm valor real E overall. Nada de fórmula.
    amostra = []
    folga = collections.defaultdict(list)
    salario = collections.defaultdict(list)
    for l in dados['leagues']:
        for c in l['clubs']:
            for p in c['players']:
                if not p[5] or p[5] < 50000 or not (15 <= p[4] <= 45):
                    continue

                folga[faixa_idade(p[4])].append(p[3] - p[2])
                if p[6]:
                    salario[p[2] // 5].append(p[6])
    # A referência vem do transfermarkt.py e traz SÓ quem tem valor real do
    # Transfermarkt junto do overall do SoFIFA. Montar a amostra aqui, a partir de
    # players.json, misturaria os que ficaram com valor do SoFIFA — duas escalas
    # diferentes no mesmo saco, que foi o que inflou o Højlund.
    REF = os.path.join(RAIZ, 'tools', 'referencia_overall.json')
    if not os.path.exists(REF):
        print('sem tools/referencia_overall.json — rode o transfermarkt.py antes')
        return 1
    amostra = [(math.log10(v), i, o) for v, i, o in json.load(open(REF))]
    folga_m = {k: sum(v) / len(v) for k, v in folga.items() if v}
    salario_m = {k: sorted(v)[len(v) // 2] for k, v in salario.items() if len(v) >= 8}
    if len(amostra) < 2000:
        print('sem amostra suficiente para medir o overall — nada foi feito')
        return 1

    # O overall sai da MEDIANA dos jogadores do SoFIFA parecidos — mesma faixa de valor
    # e de idade. É "traçar a base pelos do SoFIFA", que foi o que o Gustavo pediu.
    #
    # Duas tentativas anteriores erraram para cima, e vale registrar as duas:
    #
    # 1. Tabela de células (idade × valor). As células de veterano caro têm amostra de
    #    4 a 118 jogadores e só contêm craques de elite tipo Modrić, então o Dzyuba,
    #    38 anos e € 1 mi num clube russo, saía com overall 77.
    # 2. Mínimos quadrados sobre log10(valor) e idade. Bom no topo, generoso no miolo:
    #    dava 88 ao Højlund, mais que o Isak, e o Gustavo pegou na hora.
    #
    # A mediana de vizinhos não sofre disso porque não extrapola: ela devolve o que o
    # SoFIFA de fato dá a quem vale aquilo naquela idade. Conferido contra jogadores
    # que existem nas duas bases — Vlahović 80 (real 81), Kolo Muani 79 (79),
    # Gyökeres 85 (86), Højlund 79.
    #
    # A amostra usa o valor do TRANSFERMARKT com o overall do SOFIFA. Medir na escala do
    # SoFIFA seria outro erro: os elencos novos trazem valor do Transfermarkt, e as duas
    # escalas não são a mesma.
    amostra.sort()
    eixo_valor = [x for x, _y, _o in amostra]
    print(f'   overall pela mediana dos vizinhos do SoFIFA '
          f'({len(amostra)} jogadores de referência)')

    def overall_de(idade, valor, caps):
        # A janela de VALOR fica apertada e a idade é corrigida depois, em vez de
        # procurar vizinhos da mesma idade. Buscando por idade, o McTominay (30 anos,
        # € 40 mi) tinha poucos vizinhos e a janela abria até € 22-70 mi — aí a mediana
        # subia junto com os mais caros e ele saía com 86, acima do Vlahović, que o
        # SoFIFA põe em 81 valendo € 35 mi.
        lv = math.log10(max(valor, 50000))
        janela = 0.10
        perto = []
        while janela < 1.5 and len(perto) < 40:
            i = bisect.bisect_left(eixo_valor, lv - janela)
            j = bisect.bisect_right(eixo_valor, lv + janela)
            perto = [(y, o) for _x, y, o in amostra[i:j]]
            janela *= 1.4
        if not perto:
            return 60
        ovs = sorted(o for _y, o in perto)
        base = ovs[len(ovs) // 2]
        # correção de idade, com o mesmo coeficiente medido nos 26 mil (+0,24 por ano)
        idade_media = sum(y for y, _o in perto) / len(perto)
        base += 0.24 * (idade - idade_media)
        # SEM bônus de seleção. Ele parecia justo — com o mesmo valor, quem joga pela
        # seleção é melhor comprovado — mas somar bônus a um modelo que já acerta só
        # infla. Validado nos 6.769 jogadores de referência, este cálculo tem viés de
        # +0,17 ponto e erro médio de 3,1; o bônus de +2 jogava todo mundo para cima e
        # foi o que fez o Gustavo dizer que "o overall ficou muito grande".
        return max(45, min(94, int(round(base))))

    def potencial_de(overall, idade):
        return max(overall, min(95, int(round(overall + folga_m.get(faixa_idade(idade), 1)))))

    def salario_de(overall):
        k = overall // 5
        if k in salario_m:
            return salario_m[k]
        perto = min(salario_m, key=lambda x: abs(x - k)) if salario_m else None
        return salario_m[perto] if perto is not None else 5000

    # --------------------------- 1b. overall REAL de quem já existe no jogo
    # O elenco passa a vir 100% do Transfermarkt, mas quem já está no jogo leva o
    # overall do SoFIFA junto. Sem isto o Haaland perderia o 91 real e ganharia um
    # derivado — o derivado é bom para quem não tem nada, nunca melhor que o real.
    reais_por_chave = {}
    for l in dados['leagues']:
        for c in l['clubs']:
            for p in c['players']:
                k = chave_jogador(p[0])
                if k:
                    reais_por_chave.setdefault(k, []).append((p, nucleo(c['n'])))

    gastos = set()

    def overall_real(nome, idade, clube_atual):
        """Overall e potencial do SoFIFA, se este jogador já existir no jogo.

        Cada ficha do SoFIFA vale por UM jogador. O registro tem 9 campos, então a
        marca de usado fica num conjunto à parte — escrever um p[9] estoura.
        """
        # A idade do jogo (SoFIFA) está 1 a 2 anos ATRÁS da do Transfermarkt em 55%
        # dos casos — medido em 8.705 jogadores. O SoFIFA diz que o Yamal tem 17 e o
        # Transfermarkt, nascido em 2007, dá 19. Com tolerância de ±1 ano ele não
        # casava, perdia o overall 89 real e virava um "L. Yamal" derivado de 84.
        # O CLUBE precisa bater primeiro. Sem isso o Vitinha do Genoa herdava o
        # overall 90 do Vitinha do PSG: com nome único ("Vitinha", "Rodri", "Pedro")
        # o sobrenome e a inicial são idênticos e a colisão é garantida.
        cands = [(p, cl) for p, cl in reais_por_chave.get(chave_jogador(nome) or ('', ''), [])
                 if -1 <= (idade - p[4]) <= 3 and id(p) not in gastos]
        # Exige o MESMO CLUBE, sem exceção. Aceitar "o único candidato" quando ninguém
        # do clube casa parece generoso e é justamente o buraco: o Vitinha do Genoa
        # pegava o 90 do Vitinha do PSG, que era o único candidato. Quem trocou de time
        # entre as duas bases perde o overall do SoFIFA e recebe o derivado, que é
        # calibrado — melhor um número certo por cálculo que um número errado por nome.
        for p, cl in cands:
            if cl == clube_atual:
                gastos.add(id(p))
                # o NOME também vem do jogo: o SoFIFA escreve "Lamine Yamal" e o meu
                # encurtador faria "L. Yamal", sumindo com ele para quem procura
                return p[2], p[3], p[0]
        return None

    # ------------------------------------------------- 2. elencos do Transfermarkt
    linhas = [r for r in csv.DictReader(open(os.path.join(origem, 'players.csv'),
                                             encoding='utf-8'))
              if r.get('last_season') == ATUAL]

    # País de cada clube do Transfermarkt, para o casamento não cruzar fronteira.
    # SEM isto o "Inter" italiano casava com o "Inter Miami" e herdava o elenco do
    # Messi: nucleo('Inter') = 'inter' cabe dentro de 'intermiami'. É a mesma
    # armadilha do Cercle Brugge x Club Brugge, agora barrada pelo país.
    pais_da_liga_do_jogo = {}
    for l in dados['leagues']:
        pais_da_liga_do_jogo[l['name']] = l.get('country')
    pais_tm = {}
    for r in csv.DictReader(open(os.path.join(origem, 'clubs.csv'), encoding='utf-8')):
        liga = COMP_LIGA.get(r.get('domestic_competition_id'))
        if liga:
            pais_tm[nucleo(r['name'])] = pais_da_liga_do_jogo.get(liga)

    elenco_tm = collections.defaultdict(list)
    for r in linhas:
        elenco_tm[nucleo(r.get('current_club_name') or '')].append(r)
    chaves = [k for k in elenco_tm if k]

    def achar_clube(nome, pais):
        k = nucleo(nome)
        if k in elenco_tm and pais_tm.get(k) in (None, pais):
            return k
        melhor, ponto = None, 0.0
        for k2 in chaves:
            if pais_tm.get(k2) != pais:      # nunca cruza fronteira
                continue
            if (len(k) >= 5 and k in k2) or (len(k2) >= 5 and k2 in k):
                r = 0.90
            else:
                r = difflib.SequenceMatcher(None, k, k2).ratio()
            if r > ponto:
                melhor, ponto = k2, r
        return melhor if ponto >= 0.86 else None

    # Estádio e capacidade dos clubes. Tem de ser AQUI, e não no transfermarkt.py:
    # aquele roda antes do ligas_reais.py, quando os clubes ainda estão com o nome
    # antigo, e por isso o Napoli não casava com "SSC Napoli".
    # ESTADIOS. O casamento era so pelo nucleo EXATO do nome, e por isso 73% dos
    # clubes ficavam sem: 'Corinthians' nao bate com 'Sport Club Corinthians
    # Paulista'. Agora ha tres tentativas, da mais estrita para a mais frouxa, e
    # todas dentro do MESMO PAIS — sem isso o Nacional do Uruguai pega o estadio do
    # Nacional de Portugal.
    paises_comp = {}
    arq_comp = os.path.join(origem, 'competitions.csv')
    if os.path.exists(arq_comp):
        for r in csv.DictReader(open(arq_comp, encoding='utf-8')):
            if r.get('competition_id'):
                paises_comp[r['competition_id']] = (r.get('country_name') or '').strip()

    PT_PAIS = {'Brazil': 'Brasil', 'England': 'Inglaterra', 'Spain': 'Espanha', 'Italy': 'Itália',
               'Germany': 'Alemanha', 'France': 'França', 'Portugal': 'Portugal',
               'Netherlands': 'Holanda', 'Argentina': 'Argentina', 'Turkiye': 'Turquia',
               'Turkey': 'Turquia', 'Belgium': 'Bélgica', 'Scotland': 'Escócia',
               'Russia': 'Rússia', 'Greece': 'Grécia', 'Switzerland': 'Suíça',
               'Austria': 'Áustria', 'Denmark': 'Dinamarca', 'Sweden': 'Suécia',
               'Norway': 'Noruega', 'Poland': 'Polônia', 'Ukraine': 'Ucrânia',
               'Croatia': 'Croácia', 'Serbia': 'Sérvia', 'Czech Republic': 'República Tcheca',
               'Romania': 'Romênia', 'Mexico': 'México', 'United States': 'Estados Unidos',
               'Japan': 'Japão', 'Saudi Arabia': 'Arábia Saudita', 'Colombia': 'Colômbia',
               'Chile': 'Chile', 'Uruguay': 'Uruguai', 'Paraguay': 'Paraguai', 'Peru': 'Peru'}

    exato, por_palavra = {}, {}
    for r in csv.DictReader(open(os.path.join(origem, 'clubs.csv'), encoding='utf-8')):
        nome_est = (r.get('stadium_name') or '').strip()
        if not nome_est:
            continue
        try:
            lug = int(r.get('stadium_seats') or 0)
        except ValueError:
            lug = 0
        bruto = paises_comp.get((r.get('domestic_competition_id') or '').strip(), '')
        pais = PT_PAIS.get(bruto, bruto)
        nome = r['name']
        exato.setdefault((pais, nucleo(nome)), (nome_est, lug))
        # cada palavra significativa do nome vira uma chave: 'corinthians' encontra
        # 'Sport Club Corinthians Paulista'
        for palavra in re.split(r'[^A-Za-zÀ-ÿ0-9]+', nome):
            if len(palavra) >= 5:
                por_palavra.setdefault((pais, nucleo(palavra)), []).append((nome_est, lug))

    com_estadio = 0
    for l in dados['leagues']:
        pais_liga = l.get('country', '')
        for c in l['clubs']:
            chave = nucleo(c['n'])
            e = exato.get((pais_liga, chave))
            if not e:
                # o nome do clube inteiro como uma palavra do nome longo do TM
                cand = por_palavra.get((pais_liga, chave))
                if cand and len(cand) == 1:
                    e = cand[0]
            if not e:
                # a palavra mais distintiva do nome do clube
                for palavra in re.split(r'[^A-Za-zÀ-ÿ0-9]+', c['n']):
                    if len(palavra) < 5:
                        continue
                    cand = por_palavra.get((pais_liga, nucleo(palavra)))
                    if cand and len(cand) == 1:
                        e = cand[0]
                        break
            if e:
                c['estadio'], c['lugares'] = e
                com_estadio += 1

    trocados, ignorados, sem_dado = [], 0, 0
    reaproveitados = derivados = 0
    for l in dados['leagues']:
        if l['name'] not in LIGAS:
            continue
        for c in l['clubs']:
            k = achar_clube(c['n'], l.get('country'))
            if not k:
                sem_dado += 1
                continue
            reais = elenco_tm[k]
            # monta o elenco real, do mais valioso para o mais barato
            reais = sorted(reais, key=lambda r: -inteiro(r.get('market_value_in_eur')))
            novo, goleiros = [], 0
            for r in reais:
                if len(novo) >= MAX_ELENCO:
                    break
                nasc = (r.get('date_of_birth') or '')[:4]
                if not nasc.isdigit():
                    continue
                idade = ANO - int(nasc)
                if not (15 <= idade <= 43):
                    continue
                par = SUBPOS.get(r.get('sub_position')) or POS.get(r.get('position'))
                if not par:
                    continue
                pos, sigla = par
                if pos == 'G':
                    if goleiros >= 3:
                        continue
                    goleiros += 1
                valor = inteiro(r.get('market_value_in_eur'))
                do_sofifa = overall_real(r['name'], idade, nucleo(c['n']))
                if do_sofifa:
                    ov, pot, nome_jogo = do_sofifa
                    reaproveitados += 1
                else:
                    nome_jogo = encurtar(r['name'])
                    ov = overall_de(idade, valor, inteiro(r.get('international_caps')))
                    pot = potencial_de(ov, idade)
                    derivados += 1
                # 10 campos: o último é a SIGLA FINA. O registro tinha 9 e eu escrevia
                # o grupo no campo 9, que o motor lê como "elegibilidade", não como
                # posição — por isso a sigla nunca chegava na tela.
                novo.append([nome_jogo, pos, ov, pot,
                             idade, valor, salario_de(ov),
                             'L' if (r.get('foot') or '').lower() == 'left' else 'R',
                             pos, sigla])
            if len(novo) < MIN_ELENCO or goleiros == 0:
                sem_dado += 1
                continue
            antes = round(sum(sorted((p[2] for p in c['players']), reverse=True)[:11]) / 11)
            c['players'] = novo
            depois = round(sum(sorted((p[2] for p in novo), reverse=True)[:11]) / 11)
            trocados.append((c['n'], l['name'], len(novo), antes, depois))

    dados['meta']['players'] = sum(len(c['players']) for l in dados['leagues'] for c in l['clubs'])
    json.dump(dados, open(ARQ, 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))

    print(f'{com_estadio} clubes ganharam estádio e capacidade')
    print(f'{len(trocados)} clubes ganharam o elenco real do Transfermarkt')
    print(f'   {reaproveitados} jogadores mantiveram o overall REAL do SoFIFA')
    print(f'   {derivados} tiveram o overall derivado (não existiam no jogo)')
    print(f'   {sem_dado} sem elenco utilizável na base')
    for n, lg, q, a, dp in sorted(trocados)[:10]:
        print(f'   {n:24} {lg:22} {q:2} jogadores, força {a} -> {dp}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
