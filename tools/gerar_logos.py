#!/usr/bin/env python3
"""
gerar_logos.py — transforma os PNGs baixados do football-logos.cc em um arquivo
que o jogo consegue embutir.

Os escudos vêm em pastas por liga, cada uma com 64/128/256/512 px. Usamos o de 64,
que é o tamanho em que o escudo aparece no jogo, e viramos tudo em data URI base64
dentro de um único JSON. Assim o arquivo de 1 clique continua funcionando offline,
sem depender de nenhuma pasta de imagens.

Entrada:  uma pasta com os zips já extraídos (padrão /tmp/logos)
Saída:    public/logos.json  →  { "slug-do-clube": "data:image/png;base64,..." }

Uso:  python3 tools/gerar_logos.py [pasta]
"""
import base64
import json
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, 'public', 'logos.json')
TAMANHO = '64x64'


def main():
    origem = sys.argv[1] if len(sys.argv) > 1 else '/tmp/logos'
    if not os.path.isdir(origem):
        # Os escudos já estão embutidos em public/logos.json, que é versionado. A pasta
        # de origem é descartável: /tmp some ao reiniciar o Mac, e o Gustavo pode
        # apagar os downloads. Sem esta saída silenciosa o pipeline inteiro abortava
        # (set -e) só porque a pasta sumiu.
        print(f'{origem} não existe — mantendo os escudos que já estão em logos.json')
        return

    logos = {}
    por_liga = {}
    for liga in sorted(os.listdir(origem)):
        pasta = os.path.join(origem, liga, TAMANHO)
        if not os.path.isdir(pasta):
            continue
        n = 0
        for arquivo in sorted(os.listdir(pasta)):
            if not arquivo.endswith('.png'):
                continue
            slug = arquivo.replace('.football-logos.cc.png', '').replace('.png', '')
            if slug in logos:
                continue                      # o mesmo clube aparece em várias ligas
            with open(os.path.join(pasta, arquivo), 'rb') as f:
                dados = base64.b64encode(f.read()).decode('ascii')
            logos[slug] = 'data:image/png;base64,' + dados
            n += 1
        if n:
            por_liga[liga] = n

    with open(SAIDA, 'w', encoding='utf-8') as f:
        json.dump(logos, f, separators=(',', ':'))

    mb = os.path.getsize(SAIDA) / 1024 / 1024
    print(f'{len(logos)} escudos gravados em {SAIDA} ({mb:.1f} MB)')
    for liga, n in sorted(por_liga.items(), key=lambda x: -x[1]):
        print(f'   {n:3}  {liga}')


if __name__ == '__main__':
    main()
