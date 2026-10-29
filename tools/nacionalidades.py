#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
nacionalidades.py — de que país é cada jogador.

O Gustavo pediu: "algo bem importante, saber qual a nacionalidade do jogador".
O jogo não tinha esse dado em lugar nenhum. Duas fontes, nesta ordem:

  1. O Elencos_Brasileirao.docx dele, que traz o país de cada brasileiro.
  2. O players.csv do Transfermarkt (Kaggle), para o resto do mundo.

Em qualquer uma das duas o casamento é por CLUBE + nome. Só o nome não serve:
tem três Matheuzinhos e dois Vitinhas, e quem casa só pelo nome troca a
nacionalidade de um pelo do outro.

Grava no índice 10 do jogador. Sem fonte confiável, fica vazio — inventar a
nacionalidade de alguém é pior do que não mostrar nada.
"""
import csv
import json
import os
import re
import sys
import unicodedata
import zipfile
from collections import Counter, defaultdict

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCX = os.path.join(RAIZ, 'tools', 'Elencos_Brasileirao.docx')
ARQ = os.path.join(RAIZ, 'public', 'players.json')
CSV = os.path.expanduser('~/Downloads/archive/players.csv')

# Como o país chega em inglês no Transfermarkt e em português no jogo.
PT = {
    'Brazil': 'Brasil', 'Argentina': 'Argentina', 'Portugal': 'Portugal', 'Spain': 'Espanha',
    'France': 'França', 'England': 'Inglaterra', 'Germany': 'Alemanha', 'Italy': 'Itália',
    'Netherlands': 'Holanda', 'Belgium': 'Bélgica', 'Uruguay': 'Uruguai', 'Chile': 'Chile',
    'Colombia': 'Colômbia', 'Peru': 'Peru', 'Ecuador': 'Equador', 'Bolivia': 'Bolívia',
    'Venezuela': 'Venezuela', 'Paraguay': 'Paraguai', 'Mexico': 'México', 'United States': 'Estados Unidos',
    'Canada': 'Canadá', 'Japan': 'Japão', 'Korea, South': 'Coreia do Sul', 'South Korea': 'Coreia do Sul',
    'China': 'China', 'Australia': 'Austrália', 'New Zealand': 'Nova Zelândia', 'Turkey': 'Turquia',
    'Russia': 'Rússia', 'Ukraine': 'Ucrânia', 'Poland': 'Polônia', 'Croatia': 'Croácia',
    'Serbia': 'Sérvia', 'Greece': 'Grécia', 'Switzerland': 'Suíça', 'Austria': 'Áustria',
    'Denmark': 'Dinamarca', 'Sweden': 'Suécia', 'Norway': 'Noruega', 'Finland': 'Finlândia',
    'Scotland': 'Escócia', 'Wales': 'País de Gales', 'Ireland': 'Irlanda', 'Czech Republic': 'República Tcheca',
    'Czechia': 'República Tcheca', 'Romania': 'Romênia', 'Hungary': 'Hungria', 'Bulgaria': 'Bulgária',
    'Israel': 'Israel', 'Cyprus': 'Chipre', 'Morocco': 'Marrocos', 'Algeria': 'Argélia',
    'Tunisia': 'Tunísia', 'Egypt': 'Egito', 'Nigeria': 'Nigéria', 'Ghana': 'Gana',
    'Senegal': 'Senegal', 'Cameroon': 'Camarões', 'Ivory Coast': 'Costa do Marfim',
    "Cote d'Ivoire": 'Costa do Marfim', 'Mali': 'Mali', 'South Africa': 'África do Sul',
    'Saudi Arabia': 'Arábia Saudita', 'United Arab Emirates': 'Emirados Árabes Unidos',
    'India': 'Índia', 'Iran': 'Irã', 'Iraq': 'Iraque', 'Nepal': 'Nepal',
    'Slovakia': 'Eslováquia', 'Slovenia': 'Eslovênia', 'Bosnia-Herzegovina': 'Bósnia',
    'Albania': 'Albânia', 'North Macedonia': 'Macedônia do Norte', 'Montenegro': 'Montenegro',
    'Kosovo': 'Kosovo', 'Georgia': 'Geórgia', 'Armenia': 'Armênia', 'Iceland': 'Islândia',
    'Northern Ireland': 'Irlanda do Norte', 'Costa Rica': 'Costa Rica', 'Panama': 'Panamá',
    'Honduras': 'Honduras', 'Jamaica': 'Jamaica', 'Guinea': 'Guiné', 'Congo': 'Congo',
    'DR Congo': 'Congo', 'Angola': 'Angola', 'Cape Verde': 'Cabo Verde', 'Gabon': 'Gabão',
    'Burkina Faso': 'Burkina Faso', 'Zambia': 'Zâmbia', 'Kenya': 'Quênia', 'Uganda': 'Uganda',
    'Zimbabwe': 'Zimbábue', 'Mozambique': 'Moçambique', 'Guinea-Bissau': 'Guiné-Bissau',
}


def abreviado(nome):
    """'Michael Olise' -> 'm|olise'. É como o jogo escreve o nome do estrangeiro."""
    partes = [x for x in re.split(r'\s+', (nome or '').strip()) if x]
    if len(partes) < 2:
        return None
    ini = nucleo(partes[0])[:1]
    sobre = nucleo(partes[-1])
    return f'{ini}|{sobre}' if ini and sobre else None


def nucleo(t):
    t = unicodedata.normalize('NFD', t or '').encode('ascii', 'ignore').decode().lower()
    ruido = {'fc', 'sc', 'ec', 'ac', 'cr', 'se', 'aa', 'cf', 'ca', 'clube', 'club',
             'de', 'do', 'da', 'the', 'sport', 'esporte', 'futebol', 'football'}
    return ''.join(w for w in re.split(r'[^a-z0-9]+', t) if w and w not in ruido)


def do_documento():
    """{(clube, nome): país} do docx do Gustavo."""
    if not os.path.exists(DOCX):
        return {}
    z = zipfile.ZipFile(DOCX)
    xml = re.sub(r'</w:p>', '\n', z.read('word/document.xml').decode('utf-8'))
    linhas = [l.strip() for l in re.sub(r'<[^>]+>', '', xml).split('\n') if l.strip()]
    fora, clube, i = {}, None, 0
    cab = {'Jogador', 'Idade', 'Posição', 'País', 'Elencos — Brasileirão',
           'Jogador · Idade · Posição · País'}
    while i < len(linhas):
        m = re.match(r'^(.+?)\s*\(\d+ jogadores\)$', linhas[i])
        if m:
            clube = m.group(1).strip(); i += 1; continue
        if linhas[i] in cab:
            i += 1; continue
        # nome / idade / posição / país
        if i + 3 < len(linhas) and re.match(r'^\d{1,2}$', linhas[i + 1]):
            pais = linhas[i + 3].strip()
            if clube and pais and not re.match(r'^\d', pais):
                fora[(nucleo(clube), linhas[i])] = pais
            i += 4; continue
        i += 1
    return fora


def paises_das_competicoes():
    """competition_id -> país da competição, em português."""
    arq = os.path.join(os.path.dirname(CSV), 'competitions.csv')
    if not os.path.exists(arq):
        return {}
    fora = {}
    with open(arq, encoding='utf-8') as f:
        for r in csv.DictReader(f):
            cid = (r.get('competition_id') or '').strip()
            pais = (r.get('country_name') or '').strip()
            if cid and pais:
                fora[cid] = PT.get(pais, pais)
    return fora


def do_transfermarkt():
    """Duas chaves: (clube, nome) e (PAÍS DA LIGA, nome).

    Casar clube com clube quase não funciona — o jogo diz "Corinthians" e o
    Transfermarkt diz "Sport Club Corinthians Paulista", e a cobertura ficou em
    6%. Casar só pelo nome erra em Rodrigo, Danilo e companhia. O meio do
    caminho é casar dentro do MESMO PAÍS: dois Rodrigos no mundo é comum, dois
    Rodrigos no mesmo campeonato é raro — e quando acontece, a chave é
    descartada em vez de chutar.
    """
    if not os.path.exists(CSV):
        print(f'(sem {CSV} — só o documento do Gustavo será usado)')
        return {}, {}, set(), {}
    porcomp = paises_das_competicoes()
    GLOBAL = defaultdict(set)
    por_clube = {}
    por_pais = defaultdict(set)
    existe = set()   # todo nome que existe no futebol de verdade, para separar dos gerados
    with open(CSV, encoding='utf-8') as f:
        for r in csv.DictReader(f):
            pais = (r.get('country_of_citizenship') or '').strip()
            nome = (r.get('name') or '').strip()
            if not pais or not nome:
                continue
            pais = PT.get(pais, pais)
            existe.add(nucleo(nome))
            ab = abreviado(nome)
            if ab:
                existe.add(ab)
            clube = (r.get('current_club_name') or '').strip()
            if clube:
                por_clube[(nucleo(clube), nome)] = pais
            # "I. Traoré" do Leverkusen não estava batendo: o clube atual dele no
            # Transfermarkt é outro, e a chave por país olhava a liga do TM, não a do
            # jogo. Esta é a rede de segurança: inicial + sobrenome, no mundo todo,
            # e só quando não há dois jogadores assim com nacionalidades diferentes.
            ch_global = abreviado(nome)
            if ch_global:
                GLOBAL[ch_global].add(pais)
            liga = porcomp.get((r.get('current_club_domestic_competition_id') or '').strip())
            if liga:
                por_pais[(liga, nucleo(nome))].add(pais)
                # O jogo guarda "M. Olise" e o Transfermarkt guarda "Michael Olise".
                # Sem esta chave — país + sobrenome + inicial do primeiro nome — a
                # cobertura ficava em 7%, porque quase nenhum nome batia inteiro.
                ch = abreviado(nome)
                if ch:
                    por_pais[(liga, ch)].add(pais)
    # quem tem duas nacionalidades diferentes com o mesmo nome no mesmo país sai fora
    ambiguos = sum(1 for v in por_pais.values() if len(v) > 1)
    limpo = {k: list(v)[0] for k, v in por_pais.items() if len(v) == 1}
    print(f'{len(limpo)} nomes únicos dentro do próprio país ({ambiguos} descartados por ambiguidade)')
    return por_clube, limpo, existe, {k: list(v)[0] for k, v in GLOBAL.items() if len(v) == 1}


def indexar(d):
    """Índices auxiliares: por (clube, núcleo do nome) e por nome único no mundo."""
    por_clube = {(c, nucleo(n)): p for (c, n), p in d.items()}
    conta = defaultdict(set)
    for (_c, n), p in d.items():
        conta[nucleo(n)].add(p)
    unicos = {n: list(v)[0] for n, v in conta.items() if len(v) == 1}
    # SOBRENOME + INICIAL, quando é único no mundo inteiro. O jogo escreve
    # "I. Traoré" e o Transfermarkt escreve "Ibrahim Traoré": sem esta chave, 3 mil
    # jogadores REAIS ficavam sem bandeira só por causa do nome abreviado.
    porAbrev = defaultdict(set)
    for (_c, n), p in d.items():
        ps = [x for x in re.split(r'[^a-z]+', nucleo(n).lower()) if x]
        if len(ps) > 1:
            porAbrev[f'{ps[0][0]}|{ps[-1]}'].add(p)
    abrev_unicos = {k: list(v)[0] for k, v in porAbrev.items() if len(v) == 1}
    # e a mesma chave DENTRO do clube, que é onde ela quase nunca é ambígua
    por_clube_abrev = {}
    for (c, n), p in d.items():
        ps = [x for x in re.split(r'[^a-z]+', nucleo(n).lower()) if x]
        if len(ps) > 1:
            por_clube_abrev[(c, f'{ps[0][0]}|{ps[-1]}')] = p
    return por_clube, unicos, abrev_unicos, por_clube_abrev


def main():
    doc = do_documento()
    tm, tm_pais, nomes_reais, tm_global = do_transfermarkt()
    print(f'{len(doc)} jogadores com país no documento, {len(tm)} no Transfermarkt')

    doc_clube, doc_unico, doc_abrev, doc_cabrev = indexar(doc)
    tm_clube, tm_unico, tm_abrev, tm_cabrev = indexar(tm)

    with open(ARQ, encoding='utf-8') as f:
        dados = json.load(f)

    de = Counter()
    total = 0
    for liga in dados['leagues']:
        pais_liga = liga.get('country')
        for clube in liga['clubs']:
            ck = nucleo(clube['n'])
            for p in clube['players']:
                total += 1
                nk = nucleo(p[0])
                # da fonte mais específica para a mais frouxa
                # "M. Olise" vira 'm|olise' para bater com "Michael Olise"
                m = re.match(r'^([A-Za-zÀ-ÿ])\.\s*(.+)$', p[0].strip())
                abrev = f'{nucleo(m.group(1))}|{nucleo(m.group(2)).lower()}' if m else None
                pais = (doc_clube.get((ck, nk))            # documento, clube certo
                        or tm_clube.get((ck, nk))          # TM, clube certo
                        or tm_pais.get((pais_liga, nk))    # TM, mesmo país da liga
                        or (abrev and tm_pais.get((pais_liga, abrev)))
                        or doc_unico.get(nk)               # nome único no documento
                        or tm_unico.get(nk)                # nome único no TM inteiro
                        or (abrev and (doc_cabrev.get((ck, abrev)) or tm_cabrev.get((ck, abrev))
                                       or doc_abrev.get(abrev) or tm_abrev.get(abrev)
                                       or tm_global.get(abrev))))
                if not pais and nk not in nomes_reais and (not abrev or abrev not in nomes_reais):
                    # Nome que não existe no futebol de verdade: é um dos jogadores
                    # gerados para preencher elenco. Aí a nacionalidade do país do
                    # clube é coerente — não estou inventando o dado de uma pessoa
                    # real, estou completando alguém que já é fictício inteiro.
                    pais = pais_liga
                    de['gerado'] += 1
                while len(p) < 11:
                    p.append(None)
                p[10] = pais
                de['achou' if pais else 'sem fonte'] += 1

    with open(ARQ, 'w', encoding='utf-8') as f:
        json.dump(dados, f, ensure_ascii=False, separators=(',', ':'))
    achou = de['achou']
    print(f'{achou}/{total} jogadores com nacionalidade ({achou * 100 // max(1, total)}%): '
          f"{achou - de['gerado']} de fonte real e {de['gerado']} pelo país do clube "
          f'(jogadores gerados). '
          f"{de['sem fonte']} nomes reais ficaram sem — melhor vazio do que inventado")


if __name__ == '__main__':
    main()
