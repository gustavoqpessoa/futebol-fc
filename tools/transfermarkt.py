#!/usr/bin/env python3
"""
transfermarkt.py — usa a base do Transfermarkt para dar realismo ao mundo.

A base (o `archive` que o Gustavo baixou) tem 50.150 jogadores e 797 clubes das 31
primeiras divisões, com dados de agosto de 2026. Ela resolve duas coisas que até aqui
eram palpite meu:

1. **A ORDEM dos clubes em cada liga.** Eu vinha escrevendo à mão quem é o mais forte
   de cada campeonato. O arquivo `clubs.csv` traz o valor de mercado total do elenco,
   que é a medida certa e não depende do meu chute.

2. **O VALOR DE MERCADO de cada jogador.** O jogo trazia um valor do SoFIFA; aqui vem
   o valor de verdade, o maior valor da carreira e o vencimento do contrato.

Como o casamento é feito, e onde ele para
-----------------------------------------
As duas bases escrevem os nomes de outro jeito: o jogo diz "E. Haaland" (SoFIFA) e o
Transfermarkt diz "Erling Haaland". O casamento é por SOBRENOME + INICIAL, e quando
sobra mais de um candidato, a IDADE desempata. Se ainda assim ficar dúvida, o jogador
é deixado como está — **nada é escrito no chute**.

Isso casa 43% dos jogadores (13.003 de 29.624). Os 57% restantes são, na maioria,
gente das divisões de baixo: a base só cobre as primeiras divisões de 31 países.

REGRA de sempre: clube só entra numa liga se tiver escudo oficial. O que não tem
escudo é ignorado, não inventado.

Uso:  python3 tools/transfermarkt.py [pasta-do-archive]
"""
import collections
import csv
import difflib
import json
import os
import re
import sys
import unicodedata

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQ = os.path.join(RAIZ, 'public', 'players.json')
LOGOS = os.path.join(RAIZ, 'public', 'logos.json')
TABELA = os.path.join(RAIZ, 'tools', 'ligas_reais.json')
EUROPA = os.path.join(RAIZ, 'tools', 'europa_2026.json')
SAIDA_LIGAS = os.path.join(RAIZ, 'tools', 'transfermarkt_ligas.json')
SAIDA_ORDEM = os.path.join(RAIZ, 'tools', 'transfermarkt_ordem.json')
SAIDA_REF = os.path.join(RAIZ, 'tools', 'referencia_overall.json')
PADRAO = os.path.expanduser('~/Downloads/archive')
ANO = 2026

# competition_id do Transfermarkt -> liga no jogo. Só primeiras divisões.
# O Brasil fica de fora: a Série A tem os 704 jogadores reais do .docx do Gustavo.
LIGAS = {
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
    'AUS1': 'Austrália — Liga',
}

RUIDO = set('fc sc cf ac ad ud cd rc rcd sd sv vfl vfb tsg sk jk fk kv krc kaa rsc afc osc '
            'ssc ss us as ca cs ec se aa gd cp hnk nk gnk ofk pfk bsc sfc club clube de da do '
            'the balompie calcio futebol futbol football kulubu'.split())
ESTRANHAS = str.maketrans({'ø': 'o', 'Ø': 'o', 'ß': 's', 'đ': 'd', 'ł': 'l',
                           'æ': 'a', 'ð': 'd'})


def sem_acento(t):
    return unicodedata.normalize('NFD', t.translate(ESTRANHAS)).encode('ascii', 'ignore').decode()


def nucleo(t):
    ws = [w for w in re.split(r'[^a-z0-9]+', sem_acento(t).lower())
          if w and w not in RUIDO and not w.isdigit()]
    return ''.join(ws)


def partes(nome):
    return [p for p in re.split(r'[^a-z]+', sem_acento(nome).lower()) if p]


def chave_jogador(nome):
    """Sobrenome + inicial do primeiro nome. É o que "E. Haaland" e "Erling
    Haaland" têm em comum — as duas bases escrevem o resto de outro jeito."""
    ps = partes(nome)
    return (ps[-1], ps[0][0]) if ps else None


def ano_nascimento(reg):
    s = (reg.get('date_of_birth') or '')[:4]
    return int(s) if s.isdigit() else None


def main():
    origem = sys.argv[1] if len(sys.argv) > 1 else PADRAO
    if not os.path.isdir(origem):
        print(f'{origem} não existe — pulei o enriquecimento do Transfermarkt')
        return 0
    csv.field_size_limit(10 ** 9)

    logos = json.load(open(LOGOS, encoding='utf-8')) if os.path.exists(LOGOS) else {}
    por_nucleo = {}
    for s in logos:
        n = nucleo(s.replace('-', ' '))
        if n:
            por_nucleo.setdefault(n, s)
    chaves = list(por_nucleo)

    def escudo_de(nome):
        """Escudo do clube, ou None. Sem escudo, o clube não entra — regra do projeto."""
        k = nucleo(nome)
        if k in por_nucleo:
            return por_nucleo[k]
        melhor, ponto = None, 0.0
        for k2 in chaves:
            if (len(k) >= 5 and k in k2) or (len(k2) >= 5 and k2 in k):
                r = 0.90
            else:
                r = difflib.SequenceMatcher(None, k, k2).ratio()
            if r > ponto:
                melhor, ponto = k2, r
        return por_nucleo[melhor] if ponto >= 0.86 else None

    # ------------------------------------------------------- jogadores, uma vez
    # A coluna total_market_value do clubs.csv vem VAZIA nos 796 clubes, então o valor
    # do elenco é somado aqui, a partir dos jogadores. Só conta quem está na temporada
    # atual: o arquivo guarda todo mundo que já passou pelo clube, e sem o filtro o
    # Frank Lampard e o Richard Wright ainda contariam pelo Manchester City.
    ATUAL = '2025'
    linhas = list(csv.DictReader(open(os.path.join(origem, 'players.csv'), encoding='utf-8')))
    valor_do_elenco = collections.Counter()
    for r in linhas:
        if r.get('last_season') != ATUAL:
            continue
        try:
            valor_do_elenco[r.get('current_club_id')] += int(r.get('market_value_in_eur') or 0)
        except ValueError:
            pass

    # ---------------------------------------------------- 1. ordem das ligas
    por_liga = collections.defaultdict(list)
    for r in csv.DictReader(open(os.path.join(origem, 'clubs.csv'), encoding='utf-8')):
        liga = LIGAS.get(r.get('domestic_competition_id'))
        # clube que não joga a temporada atual é história (Wigan na Premier League)
        if not liga or r.get('last_season') != ATUAL:
            continue
        por_liga[liga].append((valor_do_elenco.get(r['club_id'], 0), r['name']))

    ligas_saida, sem_escudo = {}, []
    for liga, clubes in por_liga.items():
        clubes.sort(reverse=True)          # mais valioso primeiro
        itens = []
        for _v, nome in clubes:
            slug = escudo_de(nome)
            if slug:
                itens.append([nome, slug])
            else:
                sem_escudo.append(f'{nome} ({liga})')
        if itens:
            ligas_saida[liga] = itens
    json.dump(ligas_saida, open(SAIDA_LIGAS, 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    # A ORDEM é o que vale desta base; a COMPOSIÇÃO continua vindo do pack europeu,
    # que é da temporada 2026/27 (esta base é da 2025/26). Por isso a saída de ordem
    # é só uma lista de escudos: o ligas_reais.py reordena o que já tem, sem trocar
    # ninguém de liga.
    json.dump({k: [s for _n, s in v] for k, v in ligas_saida.items()},
              open(SAIDA_ORDEM, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'ordem por valor de mercado real gravada para {len(ligas_saida)} ligas '
          f'em {SAIDA_LIGAS}')
    print(f'   {len(sem_escudo)} clubes do Transfermarkt ficaram de fora por não ter escudo')

    # -------------------------------------------- 2. valor de mercado real
    tm = collections.defaultdict(list)
    for r in linhas:
        k = chave_jogador(r['name'])
        if k:
            tm[k].append(r)

    dados = json.load(open(ARQ, encoding='utf-8'))

    def candidatos(p):
        cands = tm.get(chave_jogador(p[0]) or ('', ''), [])
        if len(cands) > 1:
            # a idade desempata; se não resolver, o jogador fica como está
            # mesma correção: o SoFIFA está 1 a 2 anos atrás do Transfermarkt
            cands = [r for r in cands if ano_nascimento(r)
                     and -1 <= ((ANO - ano_nascimento(r)) - p[4]) <= 3]
        return cands

    # Cada ficha do Transfermarkt vale por UM jogador do jogo. Sem isso o "M. Salah"
    # do Bengaluru FC, na Índia, herdava os € 22 milhões do Mohamed Salah: os dois têm
    # o mesmo sobrenome e a mesma inicial. Duas passadas — primeiro quem está no clube
    # certo, e só depois o resto, sobre as fichas que sobraram.
    ja_tem, fichas_gastas, valores = set(), set(), {}
    todos = [(c, p) for l in dados['leagues'] for c in l['clubs'] for p in c['players']]
    for passada in (1, 2):
        for c, p in todos:
            if id(p) in ja_tem:
                continue
            cands = candidatos(p)
            if len(cands) != 1:
                continue
            ficha = cands[0]
            if id(ficha) in fichas_gastas:
                continue
            mesmo_clube = nucleo(ficha.get('current_club_name') or '') == nucleo(c['n'])
            if passada == 1 and not mesmo_clube:
                continue
            ja_tem.add(id(p)); fichas_gastas.add(id(ficha))
            try:
                valores[id(p)] = int(ficha.get('market_value_in_eur') or 0)
            except ValueError:
                valores[id(p)] = 0

    total = len(todos)
    casados = mudou_valor = 0
    for _c, p in todos:
        if id(p) not in valores:
            continue
        casados += 1
        valor = valores[id(p)]
        if valor > 0 and valor != p[5]:
            p[5] = valor
            mudou_valor += 1

    # Referência limpa para quem precisar derivar overall: só jogadores que têm o valor
    # DE VERDADE (Transfermarkt) junto do overall do SoFIFA. Misturar com quem ficou
    # com o valor do SoFIFA junta duas escalas e infla o resultado — foi assim que o
    # Højlund saiu com 84 sendo que o Šeško, mais caro, tem 80.
    ref = [[p[5], p[4], p[2]] for _c, p in todos
           if id(p) in valores and valores[id(p)] >= 200000 and 16 <= p[4] <= 40]
    json.dump(ref, open(SAIDA_REF, 'w'), separators=(',', ':'))
    print(f'   {len(ref)} jogadores de referência (valor real + overall) em {SAIDA_REF}')

    json.dump(dados, open(ARQ, 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))
    print(f'jogadores: {casados}/{total} casados ({casados * 100 // total}%), '
          f'{mudou_valor} receberam o valor de mercado real')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
