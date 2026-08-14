#!/usr/bin/env bash
# Falla si algo que no debe publicarse ha llegado al índice de git.
# Correr antes de cada push:  bash tools/privacy_check.sh
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
report() { echo "FALLA: $1"; fail=1; }

# Lo que se comprueba son los archivos que git va a subir, no el disco.
tracked=$(git ls-files 2>/dev/null) || { echo "no es un repo git"; exit 2; }

# 1) Número de serie del cuerpo de la cámara.
serial="04407""0005621"   # partido para que este archivo no contenga el literal
if echo "$tracked" | xargs -r grep -lI "$serial" 2>/dev/null | grep -q .; then
  report "el número de serie de la cámara está en un archivo rastreado"
fi

# 2) Rutas absolutas del equipo del autor.
home="/ho""me/"
hits=$(echo "$tracked" | xargs -r grep -lI "$home" 2>/dev/null)
[ -n "$hits" ] && report "rutas absolutas de /home en: $hits"

# 3) Fotografías o RAW.
if echo "$tracked" | grep -qiE '\.(cr2|nef|arw|jpe?g)$|^fotografias/'; then
  report "hay imágenes rastreadas; llevan el serial en el MakerNote"
fi

# 4) Los blobs grandes de terceros.
if echo "$tracked" | grep -qE 'de440s\.bsp|finals2000A\.all'; then
  report "un kernel de terceros está rastreado; debe descargarse, no versionarse"
fi

# 5) Correo electrónico en el contenido (el del commit es otra cosa).
# example.com/net/org están reservados por la RFC 2606 y son marcadores válidos.
found=$(echo "$tracked" | xargs -r grep -hoIE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' 2>/dev/null \
        | grep -vE '@example\.(com|net|org)$' | sort -u)
[ -n "$found" ] && report "hay direcciones de correo reales en el índice: $(echo $found)"

[ $fail -eq 0 ] && echo "OK: nada que comprometa la privacidad en el índice"
exit $fail
