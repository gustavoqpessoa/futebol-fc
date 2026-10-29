#!/usr/bin/env python3
"""
relatorio_escudos.py — QUEM AINDA ESTÁ SEM O ESCUDO DE VERDADE.

O jogo desenha um brasão nas cores do clube quando não tem o escudo oficial.
Funciona, mas não é a mesma coisa. Este relatório diz exatamente onde isso
acontece, para dar para atacar liga por liga em vez de no escuro.

Uso:  python3 tools/relatorio_escudos.py            (resumo na tela)
      python3 tools/relatorio_escudos.py --arquivo  (grava no Desktop também)
"""
import collections
import json
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(RAIZ, 'public')


def main():
    dados = json.load(open(os.path.join(PUB, 'players.json'), encoding='utf-8'))
    mapa = json.load(open(os.path.join(PUB, 'mapa_logos.json'), encoding='utf-8'))
    logos = json.load(open(os.path.join(PUB, 'logos.json'), encoding='utf-8'))

    total = com = 0
    por_divisao = collections.Counter()
    por_divisao_total = collections.Counter()
    sem_por_liga = {}

    for lg in sorted(dados['leagues'], key=lambda l: (l['country'], l.get('tier', 1))):
        t = lg.get('tier', 1)
        faltam = []
        for cl in lg['clubs']:
            total += 1
            por_divisao_total[t] += 1
            slug = mapa.get(cl['n'])
            if slug and slug in logos:
                com += 1
            else:
                faltam.append(cl['n'])
                por_divisao[t] += 1
        if faltam:
            sem_por_liga[(lg['country'], t, lg['name'])] = (faltam, len(lg['clubs']))

    print(f'{total} clubes no jogo')
    print(f'{com} com escudo oficial ({com / total * 100:.0f}%)')
    print(f'{total - com} com o brasão desenhado pelo jogo')
    print()
    print('por divisão (sem escudo / total):')
    for t in sorted(por_divisao_total):
        print(f'  {t}ª: {por_divisao[t]:4d} de {por_divisao_total[t]:4d}')

    if '--arquivo' in sys.argv:
        saida = os.path.expanduser('~/Desktop/CLUBES SEM ESCUDO.txt')
        linhas = ['CLUBES SEM ESCUDO REAL — Company Football', '',
                  f'{total} clubes. {com} com escudo oficial, {total - com} com o brasão desenhado.', '']
        for (pais, t, nome), (faltam, n) in sem_por_liga.items():
            linhas.append(f'{pais} — {nome}  ({len(faltam)} de {n})')
            linhas += [f'   {c}' for c in sorted(faltam)]
            linhas.append('')
        open(saida, 'w', encoding='utf-8').write('\n'.join(linhas))
        print(f'\ngravado em {saida}')


if __name__ == '__main__':
    main()
