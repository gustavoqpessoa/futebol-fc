#!/usr/bin/env python3
"""
nomes_gerados.py — quem foi INVENTADO pelo gerador ganha nome do próprio país.

O Gustavo, olhando a base do Bolton: "os jogadores se chamam Murilo Alves, Wesley
Peixoto, Caio Pinto — só que eles são ingleses". A base do jogo eu já consertei; o
resto do mundo tinha o mesmo problema por outro caminho: o gerador antigo encheu 337
elencos com um vocabulário fixo (Léo, Ivan, Pablo + Costa, Kovac, Suárez), e esses
elencos foram parar em clubes reais — o 1860 Munich jogava com Léo Suárez e Pablo
Kovac.

REGRA DE SEGURANÇA: só renomeia jogador de clube cujo elenco é QUASE TODO gerado
(70% ou mais). Assim nenhum jogador de verdade é tocado — o Flamengo tem Léo Pereira,
que existe, e o clube fica de fora porque o resto do elenco é real.

Uso:  python3 tools/nomes_gerados.py
"""
import json
import os
import random
from collections import Counter

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQ = os.path.join(RAIZ, 'public', 'players.json')
NOMES = json.load(open(os.path.join(RAIZ, 'tools', 'nomes_paises.json'), encoding='utf-8'))
FAMILIAS = NOMES['_familias']
DE_FAMILIA = NOMES['_familia_do_pais']
REPETE = 150          # nome que aparece tanto assim no mundo é vocabulário de gerador
MAIORIA = 0.7


def baldes(pais):
    if pais in NOMES and not str(pais).startswith('_'):
        return NOMES[pais]
    return FAMILIAS.get(DE_FAMILIA.get(pais, ''), FAMILIAS['anglo'])


def main():
    random.seed(20260910)
    dados = json.load(open(ARQ, encoding='utf-8'))
    nomes = [p[0] for l in dados['leagues'] for c in l['clubs'] for p in c['players']
             if '.' not in p[0]]
    pri = Counter(n.split()[0] for n in nomes)
    sob = Counter(n.split()[-1] for n in nomes if len(n.split()) > 1)

    def gerado(n):
        ps = n.split()
        return len(ps) == 2 and '.' not in n and pri[ps[0]] >= REPETE and sob[ps[-1]] >= REPETE

    trocados = clubes = 0
    for liga in dados['leagues']:
        pais = liga.get('country')
        p_nomes, s_nomes = baldes(pais)
        for clube in liga['clubs']:
            alvos = [p for p in clube['players'] if gerado(p[0])]
            if not alvos or len(alvos) / max(1, len(clube['players'])) < MAIORIA:
                continue
            clubes += 1
            usados = {p[0] for p in clube['players']}
            for p in alvos:
                for _ in range(12):
                    novo = f'{random.choice(p_nomes)} {random.choice(s_nomes)}'
                    if novo not in usados:
                        break
                usados.add(novo)
                p[0] = novo
                trocados += 1

    # DOIS JOGADORES COM O MESMO NOME NO MESMO ELENCO. Aconteciam 380 casos: na hora
    # de escalar apareciam dois 'Jonas Weber' e não dava para saber qual era qual.
    repetidos = 0
    for liga in dados['leagues']:
        pais = liga.get('country')
        p_nomes, s_nomes = baldes(pais)
        for clube in liga['clubs']:
            vistos = set()
            for p in clube['players']:
                if p[0] not in vistos:
                    vistos.add(p[0])
                    continue
                for _ in range(20):
                    novo = f'{random.choice(p_nomes)} {random.choice(s_nomes)}'
                    if novo not in vistos:
                        break
                vistos.add(novo)
                p[0] = novo
                repetidos += 1
    print(f'{repetidos} jogadores com nome repetido no proprio elenco foram renomeados')

    json.dump(dados, open(ARQ, 'w', encoding='utf-8'), ensure_ascii=False,
              separators=(',', ':'))
    print(f'{trocados} jogadores inventados ganharam nome do país, em {clubes} elencos')


if __name__ == '__main__':
    main()
