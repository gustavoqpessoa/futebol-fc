#!/usr/bin/env python3
"""
rename_generic.py — dá nomes de verdade aos clubes inventados.

O gerador antigo preencheu as ligas com poucos times usando um vocabulário
português/espanhol fixo (Serra, Monte, Estrela, Fênix, Lobo + EC/CF/United). O
resultado foi um "Serra Atlético" na República Tcheca e um "Fênix CF" na Finlândia.

Aqui cada clube inventado recebe o nome de uma cidade real do próprio país, com o
prefixo/sufixo típico de lá (FK Ostrava, IF Tampere, Al Sharjah). Clubes reais nunca
são tocados: só entram os que são formados 100% pelo vocabulário do gerador antigo.

Roda depois do rebalance_br.py, sobre o players.json já corrigido.

Uso:  python3 tools/rename_generic.py [--dry]
"""
import json
import os
import random
import sys
from collections import Counter

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQ = os.path.join(RAIZ, 'public', 'players.json')
BANCO = os.path.join(RAIZ, 'tools', 'nomes_clubes.json')

# Quantos países uma palavra precisa aparecer para ser considerada vocabulário do
# gerador: nome real de clube não se repete em 8 países diferentes.
LIMIAR_PAISES = 8

# Palavras do gerador que ficaram logo abaixo do limiar ("Monte" aparece em 7 países,
# não em 8) e por isso escapavam da detecção automática.
EXTRA = {'Monte', 'Vera', 'Águia', 'Fênix', 'Litoral'}

# Clubes reais colocados no país errado pelo pipeline antigo. Não dá para detectar
# isso por regra — "Vizela" é um nome legítimo, só não é sérvio. Acrescente aqui
# conforme for encontrando outros.
FORA_DE_LUGAR = {
    'Sérvia': ['Vizela'],
}


def vocabulario_generico(dados):
    por_palavra = {}
    for liga in dados['leagues']:
        for clube in liga['clubs']:
            for palavra in clube['n'].split():
                por_palavra.setdefault(palavra, set()).add(liga['country'])
    return {p for p, paises in por_palavra.items() if len(paises) >= LIMIAR_PAISES} | EXTRA


def eh_inventado(nome, vocab):
    partes = nome.split()
    return len(partes) >= 2 and all(p in vocab for p in partes)


def nomes_para(pais, banco, quantos, ja_usados, rng):
    b = banco.get(pais) or banco['_padrao']
    combinacoes = []
    for cidade in b['cid']:
        for pre in b['pre']:
            for suf in b['suf']:
                nome = ' '.join(x for x in (pre, cidade, suf) if x).strip()
                if nome and nome not in ja_usados:
                    combinacoes.append(nome)
    # embaralha de forma determinística e prioriza uma cidade por clube
    rng.shuffle(combinacoes)
    escolhidos, cidades_usadas = [], set()
    for nome in combinacoes:
        cidade = next((c for c in b['cid'] if c in nome), nome)
        if cidade in cidades_usadas:
            continue
        cidades_usadas.add(cidade)
        escolhidos.append(nome)
        if len(escolhidos) == quantos:
            return escolhidos
    # se acabaram as cidades, aceita repetir cidade com outro prefixo
    for nome in combinacoes:
        if nome not in escolhidos:
            escolhidos.append(nome)
        if len(escolhidos) == quantos:
            break
    return escolhidos


def main():
    seco = '--dry' in sys.argv
    rng = random.Random(20260815)

    with open(ARQ, encoding='utf-8') as f:
        dados = json.load(f)
    with open(BANCO, encoding='utf-8') as f:
        banco = {k: v for k, v in json.load(f).items() if not k.startswith('_leia')}

    vocab = vocabulario_generico(dados)
    trocados = 0
    sem_banco = Counter()
    exemplos = []

    # nomes já em uso no mundo todo, para não criar duplicata
    usados = {c['n'] for liga in dados['leagues'] for c in liga['clubs']}

    for liga in dados['leagues']:
        pais = liga.get('country', '')
        deslocados = FORA_DE_LUGAR.get(pais, [])
        alvos = [c for c in liga['clubs'] if eh_inventado(c['n'], vocab) or c['n'] in deslocados]
        if not alvos:
            continue
        if pais not in banco:
            sem_banco[pais] += len(alvos)
        novos = nomes_para(pais, banco, len(alvos), usados, rng)
        for clube, novo in zip(alvos, novos):
            if len(exemplos) < 10:
                exemplos.append(f'{pais}: {clube["n"]} -> {novo}')
            usados.discard(clube['n'])
            usados.add(novo)
            clube['n'] = novo
            trocados += 1

    # Nome único por PAÍS, não só por liga: a Copa do Brasil junta as quatro séries e
    # apareciam dois "Santos" na mesma chave, sem como saber qual era qual.
    por_pais = {}
    for liga in dados['leagues']:
        por_pais.setdefault(liga.get('country', ''), []).append(liga)
    # O clube da divisão MAIS ALTA fica com o nome; o repetido da divisão de baixo
    # recebe um nome real do banco do país. Antes eu punha um sufixo "-2", e a tabela
    # ficava cheia de "Santos-2" e "Coritiba-2".
    for pais, ligas in por_pais.items():
        vistos = set()
        for liga in sorted(ligas, key=lambda l: l.get('tier') or 9):
            for clube in liga['clubs']:
                if clube['n'] not in vistos:
                    vistos.add(clube['n'])
                    usados.add(clube['n'])
                    continue
                novo = nomes_para(pais, banco, 1, usados, rng)
                if novo:
                    usados.add(novo[0])
                    vistos.add(novo[0])
                    clube['n'] = novo[0]

    print(f'{trocados} clubes inventados receberam nome de verdade')
    for e in exemplos:
        print('  ', e)
    if sem_banco:
        print(f'\nPaíses sem banco de nomes (usaram o padrão): {dict(sem_banco)}')

    if seco:
        print('(--dry: nada foi gravado)')
        return
    with open(ARQ, 'w', encoding='utf-8') as f:
        json.dump(dados, f, ensure_ascii=False, separators=(',', ':'))
    print(f'gravado em {ARQ}')


if __name__ == '__main__':
    main()
