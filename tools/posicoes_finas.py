#!/usr/bin/env python3
"""
posicoes_finas.py — todo jogador com a posição CERTA, e nenhum elenco capenga.

O Gustavo pegou o Bolton na League One e não conseguiu jogar:

    "Eu acho que todos os jogadores, se colocou como lateral direito. No mercado
     também só tem lateral direito. Não tem lateral esquerdo, ou não tem ponta
     esquerda, só tem ponta direita."

Ele estava certo, e o motivo era este: 60% dos jogadores do mundo não têm posição
fina no `players.json` (só o grupo G/Z/L/M/A). O jogo então DEDUZIA a sigla pelo pé
— canhoto virava LE, destro virava LD — e o dado de pé é quase todo 'R': dos 3.560
laterais sem sigla, 3.449 eram destros. Resultado: 97% dos laterais do mundo eram
laterais-direitos e a ponta-esquerda praticamente não existia.

O que este script faz, nesta ordem:

1. PROCURA A POSIÇÃO DE VERDADE no archive do Transfermarkt (`players.csv`, 50 mil
   jogadores com `sub_position` e `foot`). Casa por sobrenome + inicial dentro do
   mesmo clube; sem clube, só aceita se o nome for único no mundo.
2. O QUE SOBRA é distribuído DENTRO DO CLUBE, para o elenco fechar: os laterais são
   metade de cada lado, o ataque vira ponta-esquerda, ponta-direita e centroavante,
   e o meio vira volante, meia-central e meia-atacante. Não é chute sobre a pessoa —
   é a composição de um elenco de futebol, que é o que faltava.
3. COMPLETA O ELENCO CURTO. 209 clubes tinham menos de 20 jogadores e o Bolton tinha
   19, sem um lateral-esquerdo sequer: não dava para escalar 4-4-2 sem alguém fora de
   posição. Todo clube passa a ter no mínimo dois goleiros, quatro zagueiros, dois de
   cada lado, e 22 jogadores no total.

Uso:  python3 tools/posicoes_finas.py [pasta-do-archive]
"""
import csv
import json
import os
import random
import re
import sys
import unicodedata
from collections import Counter, defaultdict

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQ = os.path.join(RAIZ, 'public', 'players.json')
ARCHIVE = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Downloads/archive')

SUBPOS = {
    'Goalkeeper': 'GOL', 'Centre-Back': 'ZAG', 'Left-Back': 'LE', 'Right-Back': 'LD',
    'Defensive Midfield': 'VOL', 'Central Midfield': 'MC', 'Attacking Midfield': 'MEI',
    'Left Midfield': 'MEI', 'Right Midfield': 'MEI',
    'Left Winger': 'PE', 'Right Winger': 'PD',
    'Centre-Forward': 'ATA', 'Second Striker': 'ATA',
}
# Em que grupo do jogo cada sigla cabe. Uma sigla do TM que não bate com o grupo que
# o jogador já tem no jogo é IGNORADA: trocar o grupo mudaria o elenco inteiro de
# lugar, e o grupo veio do SoFIFA, que também é fonte real.
GRUPO_DA_SIGLA = {'GOL': 'G', 'ZAG': 'Z', 'LE': 'L', 'LD': 'L',
                  'VOL': 'M', 'MC': 'M', 'MEI': 'M', 'PE': 'A', 'PD': 'A', 'ATA': 'A'}
# Como um elenco se divide dentro de cada grupo, quando não há dado real.
REPARTE = {'G': ['GOL'], 'Z': ['ZAG'], 'L': ['LE', 'LD'],
           'M': ['VOL', 'MC', 'MEI'], 'A': ['PE', 'ATA', 'PD', 'ATA']}
# O mínimo para escalar qualquer formação sem ninguém improvisado.
MINIMO = {'GOL': 2, 'ZAG': 4, 'LE': 2, 'LD': 2, 'VOL': 2, 'MC': 2, 'MEI': 1,
          'PE': 1, 'PD': 1, 'ATA': 2}
ELENCO_MINIMO = 22

# Nome de gente vem do país do clube (tools/nomes_paises.json). Antes todo jogador
# criado saía com nome brasileiro, em qualquer canto do mundo.
NOMES = json.load(open(os.path.join(RAIZ, 'tools', 'nomes_paises.json'), encoding='utf-8'))
FAMILIAS = NOMES['_familias']
DE_FAMILIA = NOMES['_familia_do_pais']


def baldes(pais):
    if pais in NOMES and not str(pais).startswith('_'):
        return NOMES[pais]
    return FAMILIAS.get(DE_FAMILIA.get(pais, ''), FAMILIAS['anglo'])


def sem_acento(t):
    return unicodedata.normalize('NFD', str(t)).encode('ascii', 'ignore').decode()


def chave(nome):
    """Sobrenome + inicial: o que "M. Conway" e "Matthew Conway" têm em comum."""
    ps = [p for p in re.split(r'[^a-z]+', sem_acento(nome).lower()) if p]
    return (ps[-1], ps[0][0]) if ps else None


def nucleo_clube(n):
    ruido = {'fc', 'afc', 'cf', 'sc', 'ac', 'club', 'de', 'do', 'da', 'the', 'united',
             'city', 'town', 'wanderers', 'rovers', 'athletic', 'albion'}
    ws = [w for w in re.split(r'[^a-z0-9]+', sem_acento(n).lower()) if w and w not in ruido]
    return ''.join(ws)


def carregar_archive():
    """(sobrenome, inicial) -> lista de (nucleo do clube, sigla, pé)."""
    caminho = os.path.join(ARCHIVE, 'players.csv')
    if not os.path.exists(caminho):
        print(f'archive não encontrado em {ARCHIVE} — sigo só com a repartição por elenco')
        return {}
    idx = defaultdict(list)
    with open(caminho, encoding='utf-8') as f:
        for r in csv.DictReader(f):
            sigla = SUBPOS.get((r.get('sub_position') or '').strip())
            if not sigla:
                continue
            k = chave(r.get('name') or '')
            if not k:
                continue
            pe = (r.get('foot') or '').strip().lower()
            idx[k].append((nucleo_clube(r.get('current_club_name') or ''), sigla,
                           'L' if pe == 'left' else 'R' if pe == 'right' else None))
    return idx


def novo_jogador(sigla, media, pais):
    grupo = GRUPO_DA_SIGLA[sigla]
    idade = 19 + random.randrange(13)
    ovr = max(40, min(82, int(random.gauss(media - 2, 4))))
    pot = min(88, ovr + random.randrange(2, 11))
    val = int(ovr * ovr * 140)
    pe = 'L' if sigla in ('LE', 'PE') and random.random() < 0.7 else 'R'
    pri, sob = baldes(pais)
    return [f'{random.choice(pri)} {random.choice(sob)}', grupo, ovr, pot, idade,
            val, int(val * 0.012), pe, grupo, sigla, pais]


def main():
    random.seed(20260910)
    dados = json.load(open(ARQ, encoding='utf-8'))
    idx = carregar_archive()

    do_tm = repartidos = criados = 0
    clubes_completados = 0

    for liga in dados['leagues']:
        pais = liga.get('country')
        forcas = sorted(p[2] for c in liga['clubs'] for p in c['players']) or [60]
        media_liga = forcas[len(forcas) // 2]

        for clube in liga['clubs']:
            nc = nucleo_clube(clube.get('n', ''))
            faltando = []

            # 1. a posição de verdade, do Transfermarkt
            for p in clube['players']:
                while len(p) < 11:
                    p.append(None)
                if p[9]:
                    continue
                cands = idx.get(chave(p[0]) or ('', ''), [])
                iguais = [c for c in cands if c[0] and c[0] == nc]
                # sem clube batendo, só aceito nome que é único no mundo inteiro
                escolha = iguais[0] if iguais else (cands[0] if len(cands) == 1 else None)
                if escolha and GRUPO_DA_SIGLA.get(escolha[1]) == p[1]:
                    p[9] = escolha[1]
                    if escolha[2]:
                        p[7] = escolha[2]
                    do_tm += 1
                else:
                    faltando.append(p)

            # 2. o resto reparte dentro do elenco, para o time fechar
            tem = Counter(p[9] for p in clube['players'] if p[9])
            por_grupo = defaultdict(list)
            for p in faltando:
                por_grupo[p[1]].append(p)
            for grupo, lista in por_grupo.items():
                opcoes = REPARTE.get(grupo, ['MC'])
                # os mais fortes escolhem primeiro a vaga mais vazia do elenco
                lista.sort(key=lambda p: -p[2])
                for p in lista:
                    sigla = min(opcoes, key=lambda s: (tem[s] / max(1, MINIMO.get(s, 1)), s))
                    p[9] = sigla
                    tem[sigla] += 1
                    if sigla in ('LE', 'PE') and random.random() < 0.7:
                        p[7] = 'L'
                    repartidos += 1

            # 3. elenco curto vira elenco jogável
            antes = len(clube['players'])
            for sigla, quantos in MINIMO.items():
                while tem[sigla] < quantos:
                    clube['players'].append(novo_jogador(sigla, media_liga, pais))
                    tem[sigla] += 1
                    criados += 1
            while len(clube['players']) < ELENCO_MINIMO:
                sigla = min(MINIMO, key=lambda s: tem[s] / max(1, MINIMO[s]))
                clube['players'].append(novo_jogador(sigla, media_liga, pais))
                tem[sigla] += 1
                criados += 1
            if len(clube['players']) > antes:
                clubes_completados += 1

    total = sum(len(c['players']) for l in dados['leagues'] for c in l['clubs'])
    # o meta é o número que a tela inicial mostra; sem isto ele fica no valor de antes
    dados.setdefault('meta', {})['players'] = total
    json.dump(dados, open(ARQ, 'w', encoding='utf-8'), ensure_ascii=False,
              separators=(',', ':'))

    c = Counter(p[9] for l in dados['leagues'] for c2 in l['clubs'] for p in c2['players'])
    print(f'{do_tm} posições vieram do Transfermarkt, {repartidos} repartidas dentro do elenco')
    print(f'{criados} jogadores criados para completar {clubes_completados} elencos curtos '
          f'({total} jogadores no total)')
    print('   ' + '  '.join(f'{k} {v}' for k, v in sorted(c.items())))


if __name__ == '__main__':
    main()
