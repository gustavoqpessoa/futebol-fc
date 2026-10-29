#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
coerencia_overall.py — nota alta demais para o que o jogador vale de verdade.

O Gustavo achou o Young, terceiro goleiro do Sao Paulo, com 82 de overall. Ele
vale 100 mil euros no Transfermarkt: e um garoto reserva, nao um craque. A nota
errada vem da base v39 (SoFIFA), nao do pipeline — e por isso nenhuma correcao
anterior pegou.

O criterio aqui e o valor de mercado REAL, que so existe para quem foi casado
pelo clube certo. Se o jogador e jovem e vale muito pouco para a nota que tem,
a nota desce ate a curva da propria idade dele.

Duas travas para nao estragar o que esta certo:

  * so mexe em quem tem ATE 30 anos. Fabio, do Fluminense, tem 45 anos, e otimo
    e nao vale quase nada — valor baixo em veterano e normal, nao e sinal de
    nada. A regra ignora esse mundo inteiro.
  * so mexe quando a diferenca e GRANDE (9 pontos ou mais). Nota nao e ciencia
    exata e a curva tambem erra; corrigir diferenca pequena seria trocar um
    palpite por outro.
"""
import json
import os
import statistics
from collections import defaultdict

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQ = os.path.join(RAIZ, 'public', 'players.json')
NOME, POS, OVR, POT, IDADE, VAL = 0, 1, 2, 3, 4, 5

IDADE_MAX = 30      # veterano barato e bom e normal; nao e caso desta regra
FOLGA = 9           # so corrige quando a diferenca e gritante
PISO = 45


def faixa(idade):
    return 'ate23' if idade <= 23 else '24a27' if idade <= 27 else '28a31' if idade <= 31 else '32mais'


def main():
    with open(ARQ, encoding='utf-8') as f:
        dados = json.load(f)

    todos = [p for liga in dados['leagues'] for clube in liga['clubs'] for p in clube['players']]

    # Curva valor x overall, por faixa de idade, tirada do proprio jogo. Mediana
    # porque ela aguenta os outliers que estamos justamente procurando.
    por = defaultdict(list)
    for p in todos:
        if p[VAL] and p[VAL] > 0:
            por[(faixa(p[IDADE]), p[OVR])].append(p[VAL])
    med = {k: statistics.median(v) for k, v in por.items() if len(v) >= 20}
    ordem = defaultdict(list)
    for (f, o) in med:
        ordem[f].append(o)
    for f in ordem:
        ordem[f].sort()

    def overall_do_valor(f, valor):
        melhor = ordem[f][0] if ordem[f] else None
        for o in ordem[f]:
            if med[(f, o)] <= valor:
                melhor = o
        return melhor

    mexidos = []
    for liga in dados['leagues']:
        for clube in liga['clubs']:
            for p in clube['players']:
                if p[IDADE] > IDADE_MAX or not p[VAL] or p[VAL] <= 0:
                    continue
                f = faixa(p[IDADE])
                esperado = overall_do_valor(f, p[VAL])
                if esperado is None or p[OVR] - esperado < FOLGA:
                    continue
                # desce ate a curva, mas sem exagerar: metade do caminho ja tira o
                # absurdo e nao aposta tudo numa unica fonte
                novo = max(PISO, int(round((p[OVR] + esperado) / 2)))
                if novo >= p[OVR]:
                    continue
                mexidos.append((p[OVR] - novo, p[NOME], clube['n'], p[OVR], novo, p[VAL], p[IDADE]))
                p[OVR] = novo
                p[POT] = max(novo, min(p[POT], novo + 12))

    # POTENCIAL DE VETERANO. O Gustavo contratou um ponta de 31 anos com 73 de
    # overall e "pode chegar a 81": "se o cara passou de trinta anos, provavelmente
    # ele não vai mais evoluir". É isso mesmo — o potencial vinha do SoFIFA sem olhar
    # a idade. Dos 28 em diante a margem fecha, e dos 32 o teto é o que ele já é.
    def teto_da_idade(idade):
        if idade >= 32: return 0
        if idade >= 30: return 1
        if idade >= 28: return 3
        if idade >= 26: return 5
        return None

    velhos = 0
    for liga in dados['leagues']:
        for clube in liga['clubs']:
            for p in clube['players']:
                margem = teto_da_idade(p[IDADE])
                if margem is None:
                    continue
                limite = p[OVR] + margem
                if p[POT] > limite:
                    p[POT] = limite
                    velhos += 1
    print(f'{velhos} potenciais de jogador de 26 anos ou mais puxados para perto do overall')

    mexidos.sort(reverse=True)
    print(f'{len(mexidos)} jogadores com nota alta demais para o proprio valor de mercado')
    for d, nome, cl, antes, dep, val, idade in mexidos[:12]:
        print(f'  {nome:22} {cl:20} {idade}a  {antes} -> {dep}   (vale € {val/1e6:.2f} mi)')

    with open(ARQ, 'w', encoding='utf-8') as f:
        json.dump(dados, f, ensure_ascii=False, separators=(',', ':'))


if __name__ == '__main__':
    main()
