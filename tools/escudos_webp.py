#!/usr/bin/env python3
"""
escudos_webp.py — O MESMO ESCUDO, OCUPANDO MUITO MENOS.

Depois de casar os escudos que faltavam, o logos.json foi para 25 MB e o jogo
de 1 clique passaria de 30 MB — pesado demais para abrir. O desenho não precisa
mudar: PNG é um formato antigo para isso. Em WebP o mesmo escudo, no mesmo
tamanho, ocupa uma fração, e qualquer navegador de hoje abre.

Uso:  python3 tools/escudos_webp.py
"""
import base64
import io
import json
import os

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQ = os.path.join(RAIZ, 'public', 'logos.json')


def main():
    logos = json.load(open(ARQ, encoding='utf-8'))
    antes = os.path.getsize(ARQ) / 1024 / 1024
    novos, pulados = {}, 0

    for i, (slug, uri) in enumerate(logos.items()):
        if uri.startswith('data:image/webp'):
            novos[slug] = uri
            continue
        try:
            cru = base64.b64decode(uri.split(',', 1)[1])
            im = Image.open(io.BytesIO(cru)).convert('RGBA')
            saida = io.BytesIO()
            # o escudo tem bordas e letras finas: 'method 6' custa tempo de máquina
            # mas é o que mantém a borda limpa no tamanho pequeno
            im.save(saida, 'WEBP', quality=86, method=6)
            dados = saida.getvalue()
            # se por algum motivo o webp ficar maior, mantém o original
            novos[slug] = ('data:image/webp;base64,' + base64.b64encode(dados).decode('ascii')
                           if len(dados) < len(cru) else uri)
        except Exception:
            novos[slug] = uri
            pulados += 1
        if (i + 1) % 200 == 0:
            print(f'  {i + 1} escudos convertidos', flush=True)

    json.dump(novos, open(ARQ, 'w', encoding='utf-8'), separators=(',', ':'))
    depois = os.path.getsize(ARQ) / 1024 / 1024
    print(f'\n{len(novos)} escudos. {antes:.1f} MB -> {depois:.1f} MB'
          f'  ({(1 - depois / antes) * 100:.0f}% menor)')
    if pulados:
        print(f'{pulados} ficaram como estavam (não deu para converter)')


if __name__ == '__main__':
    main()
