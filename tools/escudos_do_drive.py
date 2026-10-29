#!/usr/bin/env python3
"""
escudos_do_drive.py — IMPORTA OS ESCUDOS QUE O GUSTAVO MONTOU.

Ele montou à mão o que eu não consegui automaticamente: uma pasta por liga, um
PNG por clube, com o NOME EXATO do clube no arquivo. Isso resolve a parte mais
frágil do que eu tinha feito antes — o casamento por semelhança de nome, que
sempre corre o risco de pôr o escudo de um clube em outro.

Como nome exato não deixa dúvida, o escudo dele GANHA do que eu tinha casado
sozinho, mesmo quando o clube já tinha escudo.

Entrada: ~/Google Drive/Meu Drive/Escudos/<Liga>/<Nome do Clube>.png
Saída:   public/logos.json e public/mapa_logos.json

Uso:  python3 tools/escudos_do_drive.py [--aplicar]
"""
import base64
import glob
import io
import json
import os
import re
import sys
import unicodedata

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(RAIZ, 'public')
PASTA = os.path.expanduser('~/Google Drive/Meu Drive/Escudos')
LADO = 128
APLICAR = '--aplicar' in sys.argv


def chave(nome):
    """A mesma normalização dos dois lados: acento fora, só letra e número.

    O macOS guarda o nome do arquivo em NFD (o 'é' vira 'e' + acento solto),
    e o dataset está em NFC. Sem normalizar, 'Atlético' do arquivo nunca
    encontraria o 'Atlético' do jogo.
    """
    t = unicodedata.normalize('NFC', str(nome))
    t = ''.join(c for c in unicodedata.normalize('NFD', t)
                if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', '', t.lower())


def slug(nome):
    t = unicodedata.normalize('NFC', str(nome))
    t = ''.join(c for c in unicodedata.normalize('NFD', t)
                if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')


def main():
    if not os.path.isdir(PASTA):
        print(f'não achei a pasta: {PASTA}')
        return
    dados = json.load(open(os.path.join(PUB, 'players.json'), encoding='utf-8'))
    mapa = json.load(open(os.path.join(PUB, 'mapa_logos.json'), encoding='utf-8'))
    logos = json.load(open(os.path.join(PUB, 'logos.json'), encoding='utf-8'))

    # todos os clubes do jogo, pela chave normalizada
    doJogo = {}
    for lg in dados['leagues']:
        for cl in lg['clubs']:
            doJogo.setdefault(chave(cl['n']), []).append(cl['n'])

    arquivos = sorted(glob.glob(os.path.join(PASTA, '**', '*.png'), recursive=True))
    print(f'{len(arquivos)} escudos na pasta, {len(doJogo)} clubes no jogo\n')

    novos, trocados, semDono, erros = 0, 0, [], 0
    for f in arquivos:
        nomeArq = os.path.splitext(os.path.basename(f))[0]
        k = chave(nomeArq)
        donos = doJogo.get(k)
        if not donos:
            semDono.append(nomeArq)
            continue
        try:
            im = Image.open(f).convert('RGBA')
            im.thumbnail((LADO, LADO), Image.LANCZOS)
            buf = io.BytesIO()
            im.save(buf, 'WEBP', quality=86, method=6)
            uri = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')
        except Exception as e:
            erros += 1
            continue
        sl = slug(nomeArq)
        jaTinha = any(mapa.get(d) in logos for d in donos)
        logos[sl] = uri
        for d in donos:
            mapa[d] = sl
        if jaTinha:
            trocados += 1
        else:
            novos += 1

    print(f'{novos} clubes ganharam escudo')
    print(f'{trocados} tiveram o escudo trocado pelo da pasta (nome exato ganha do meu palpite)')
    if erros:
        print(f'{erros} arquivos não deram para ler')
    if semDono:
        print(f'\n{len(semDono)} arquivos sem clube correspondente no jogo:')
        for n in semDono[:20]:
            print(f'   {n}')
        if len(semDono) > 20:
            print(f'   ... e mais {len(semDono) - 20}')

    if APLICAR:
        json.dump(mapa, open(os.path.join(PUB, 'mapa_logos.json'), 'w', encoding='utf-8'),
                  ensure_ascii=False, separators=(',', ':'))
        json.dump(logos, open(os.path.join(PUB, 'logos.json'), 'w', encoding='utf-8'),
                  separators=(',', ':'))
        mb = os.path.getsize(os.path.join(PUB, 'logos.json')) / 1024 / 1024
        print(f'\ngravado. logos.json: {mb:.1f} MB')
    else:
        print('\n(nada gravado — rode com --aplicar)')


if __name__ == '__main__':
    main()
