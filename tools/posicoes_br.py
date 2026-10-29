#!/usr/bin/env python3
"""
posicoes_br.py — tira a POSIÇÃO DETALHADA de cada jogador do documento do usuário.

O Elencos_Brasileirao.docx traz a posição real de cada um (DC, DL, DR, DM, MC, AM,
LW, RW, ST). O pipeline antigo jogava tudo em cinco grupos (G/Z/L/M/A) e a informação
se perdia: lateral-esquerdo e lateral-direito viravam o mesmo "L", volante e meia
ofensivo viravam o mesmo "M", ponta e centroavante viravam o mesmo "A".

Aqui essa informação volta como um campo extra no jogador (índice 9), sem mexer em
nada que já existe. Quem não está no documento (o resto do mundo, que veio do SoFIFA)
recebe o que dá para deduzir do pé e da elegibilidade — ver database.js.

Uso:  python3 tools/posicoes_br.py
"""
import json
import os
import re
import unicodedata
import zipfile
from collections import Counter, defaultdict


def nucleo(t):
    """Nome comparável: sem acento, sem pontuação, sem as siglas de sempre."""
    t = unicodedata.normalize('NFD', t or '').encode('ascii', 'ignore').decode().lower()
    ruido = {'fc', 'sc', 'ec', 'ac', 'cr', 'se', 'aa', 'clube', 'club', 'de', 'do', 'da'}
    return ''.join(w for w in re.split(r'[^a-z0-9]+', t) if w and w not in ruido)

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCX = os.path.join(RAIZ, 'tools', 'Elencos_Brasileirao.docx')
ARQ = os.path.join(RAIZ, 'public', 'players.json')

# posição do documento -> sigla no jogo
MAPA = {
    'GK': 'GOL', 'Goleiro': 'GOL',
    'DC': 'ZAG', 'Zagueiro': 'ZAG',
    'DL': 'LE', 'DR': 'LD',
    'DM': 'VOL',
    'MC': 'MC', 'Meio-campista': 'MC', 'ML': 'MC', 'MR': 'MC',
    'AM': 'MEI',
    'LW': 'PE', 'RW': 'PD',
    'ST': 'ATA', 'Atacante': 'ATA',
}
# a que grupo do motor cada sigla pertence
GRUPO = {'GOL': 'G', 'ZAG': 'Z', 'LE': 'L', 'LD': 'L',
         'VOL': 'M', 'MC': 'M', 'MEI': 'M', 'PE': 'A', 'PD': 'A', 'ATA': 'A'}


def ler_documento():
    z = zipfile.ZipFile(DOCX)
    xml = re.sub(r'</w:p>', '\n', z.read('word/document.xml').decode('utf-8'))
    linhas = [l.strip() for l in re.sub(r'<[^>]+>', '', xml).split('\n') if l.strip()]

    jogadores, clube, i = {}, None, 0
    cabecalhos = {'Jogador', 'Idade', 'Posição', 'País',
                  'Elencos — Brasileirão', 'Jogador · Idade · Posição · País'}
    while i < len(linhas):
        l = linhas[i]
        m = re.match(r'^(.+?)\s*\(\d+ jogadores\)$', l)
        if m:
            clube = m.group(1).strip()
            i += 1
            continue
        if l in cabecalhos:
            i += 1
            continue
        if i + 3 < len(linhas) and re.match(r'^\d{1,2}$', linhas[i + 1]):
            nome, pos = l, linhas[i + 2]
            partes = [x.strip() for x in pos.split('/')]
            # "MC/DM" é volante: no Brasil quem joga de meio-campo E de primeiro
            # homem é volante, não meia. O DM manda sobre o MC.
            if 'DM' in partes:
                sigla = 'VOL'
            else:
                sigla = MAPA.get(partes[0])
            if sigla:
                # Chave é CLUBE + nome. Só o nome não serve: existem três
                # Matheuzinhos no futebol brasileiro e o do Corinthians é
                # lateral-direito, mas o último lido sobrescrevia os outros e
                # ele acabava escalado de meia.
                jogadores[(nucleo(clube), nome)] = sigla
            i += 4
            continue
        i += 1
    return jogadores


def main():
    detalhe = ler_documento()
    print(f'{len(detalhe)} jogadores lidos do documento')

    # Quem tem nome único no documento inteiro pode ser casado só pelo nome; quem
    # se repete (Matheuzinho, Vitinha, Rodrigo) SÓ casa com o clube certo.
    por_nome = defaultdict(set)
    for (_clube, nome), sigla in detalhe.items():
        por_nome[nome].add(sigla)
    unicos = {n: list(s)[0] for n, s in por_nome.items() if len(s) == 1
              and sum(1 for (c, x) in detalhe if x == n) == 1}
    repetidos = sorted(n for n in por_nome if n not in unicos)
    if repetidos:
        print(f'{len(repetidos)} nome(s) aparecem em mais de um clube e só casam '
              f'com o clube certo: {", ".join(repetidos[:8])}'
              + (' ...' if len(repetidos) > 8 else ''))

    with open(ARQ, encoding='utf-8') as f:
        dados = json.load(f)

    achou = trocou_grupo = 0
    contagem = Counter()
    for liga in dados['leagues']:
        if liga.get('country') != 'Brasil':
            continue
        for clube in liga['clubs']:
            chave_clube = nucleo(clube['n'])
            for p in clube['players']:
                sigla = detalhe.get((chave_clube, p[0])) or unicos.get(p[0])
                if not sigla:
                    continue
                achou += 1
                contagem[sigla] += 1
                while len(p) < 10:
                    p.append(None)
                p[9] = sigla
                # o documento manda: se o grupo estiver diferente, o grupo se ajusta
                g = GRUPO[sigla]
                if p[1] != g:
                    p[1] = g
                    trocou_grupo += 1

    print(f'{achou} jogadores receberam posição detalhada '
          f'({trocou_grupo} tiveram o grupo corrigido pelo documento)')
    print('distribuição:', dict(contagem.most_common()))

    with open(ARQ, 'w', encoding='utf-8') as f:
        json.dump(dados, f, ensure_ascii=False, separators=(',', ':'))
    print(f'gravado em {ARQ}')


if __name__ == '__main__':
    main()
