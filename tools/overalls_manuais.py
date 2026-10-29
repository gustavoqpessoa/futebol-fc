#!/usr/bin/env python3
"""overalls_manuais.py — a revisão do Gustavo tem a última palavra.

Ele abriu a Série A e corrigiu jogador por jogador: "tinha jogadores totalmente
desconhecidos, meninos da base com um overall muito grande, e outros meninos da base
com potencial pequeno".

As correções ficam em tools/overalls_manuais.json e são aplicadas AQUI, no fim do
pipeline, sobre o players.json pronto. Tem de ser no fim: sete dos jogadores que ele
corrigiu nem existem na base do SoFIFA — entram no meio do caminho, vindos do
Transfermarkt, e uma correção aplicada antes não os alcançaria.

Roda sozinho no pipeline. Para acrescentar correções, use tools/aplicar_overalls.py
com o CSV revisado.
"""
import json
import os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQ = os.path.join(RAIZ, 'public', 'players.json')
MANUAL = os.path.join(RAIZ, 'tools', 'overalls_manuais.json')


def main():
    if not os.path.exists(MANUAL):
        print('sem correções manuais')
        return
    correcoes = json.load(open(MANUAL, encoding='utf-8'))
    dados = json.load(open(ARQ, encoding='utf-8'))

    # O POTENCIAL DE QUEM JÁ PASSOU DOS 26. Roda ANTES das correções abaixo: a
    # revisão do Gustavo manda em tudo, e ele pediu potencial 80 para o Leozinho,
    # de 27 anos. Roda aqui no fim do pipeline porque teto_jovens mexe no overall
    # e o potencial voltava a subir acima do que a idade permite. O Gustavo, vendo um
    # ponta de 31 anos com "pode chegar a 81": "se o cara passou dos trinta,
    # provavelmente ele não vai mais evoluir".
    margem = lambda i: 0 if i >= 32 else 1 if i >= 30 else 3 if i >= 28 else 5 if i >= 26 else None
    velhos = 0
    for liga in dados['leagues']:
        for c in liga['clubs']:
            for p in c['players']:
                m = margem(p[4])
                if m is not None and p[3] > p[2] + m:
                    p[3] = p[2] + m
                    velhos += 1
    print(f'{velhos} potenciais de veterano puxados para perto do overall')


    achados, faltando = 0, []
    usadas = set()
    for liga in dados['leagues']:
        for c in liga['clubs']:
            for p in c['players']:
                d = correcoes.get(f"{c['n']}|{p[0]}")
                if not d:
                    continue
                if 'overall' in d:
                    p[2] = d['overall']
                # o potencial nunca fica abaixo do overall
                if 'potencial' in d:
                    p[3] = max(p[2], d['potencial'])
                elif p[3] < p[2]:
                    p[3] = p[2]
                achados += 1
                usadas.add(f"{c['n']}|{p[0]}")
    faltando = [k for k in correcoes if k not in usadas]

    json.dump(dados, open(ARQ, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(f'{achados} correção(ões) do Gustavo aplicadas'
          + (f'; {len(faltando)} não acharam o jogador: ' + ', '.join(faltando[:4]) if faltando else ''))


if __name__ == '__main__':
    main()
