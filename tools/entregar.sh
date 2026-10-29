#!/bin/sh
# entregar.sh — o arquivo unico do jogo, SEMPRE com o codigo de agora e SEMPRE testado.
#
# Dois perrengues que ja aconteceram e este script existe para evitar:
#  1) o build_single.py so COLA o bundle que esta em dist/: sem "npm run build" antes,
#     ele empacota o dist da ultima vez que alguem rodou (mandei um arquivo de 6 dias
#     atras sem perceber);
#  2) "nao ta abrindo o jogo" — o arquivo ia para a Area de Trabalho sem ninguem nunca
#     ter aberto ele. Agora o Chrome abre o arquivo em headless e o script so entrega
#     se o menu inicial aparecer.
set -e
cd "$(dirname "$0")/.."
npm run build
python3 tools/build_single.py

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [ -x "$CHROME" ]; then
  echo "abrindo o arquivo para conferir..."
  if "$CHROME" --headless=new --disable-gpu --virtual-time-budget=20000 \
      --dump-dom "file://$PWD/COMPANY-FOOTBALL.html" 2>/dev/null | grep -q 'id="btnCareer"'; then
    echo "  ok: o menu inicial apareceu"
  else
    echo "  FALHOU: o arquivo nao abriu — NAO entreguei"
    exit 1
  fi
else
  echo "(sem Chrome para conferir — entregando sem o teste de abertura)"
fi

# copia atomica: o arquivo na Area de Trabalho nunca fica pela metade, nem se o
# Gustavo abrir bem na hora em que eu estou gerando
cp COMPANY-FOOTBALL.html "$HOME/Desktop/.COMPANY FOOTBALL.tmp.html"
mv "$HOME/Desktop/.COMPANY FOOTBALL.tmp.html" "$HOME/Desktop/COMPANY FOOTBALL.html"
echo "pronto: ~/Desktop/COMPANY FOOTBALL.html ($(du -h COMPANY-FOOTBALL.html | cut -f1))"
