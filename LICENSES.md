# Qué licencia cubre qué

El repositorio mezcla software, texto científico y datos, y cada cosa lleva la
licencia que le corresponde.

| Parte | Licencia | Archivo |
|---|---|---|
| Código de `src/` y `tools/` | **AGPL-3.0-only** | [`LICENSE`](LICENSE) |
| Manuscrito, figuras y documentación: `paper/`, `figs/`, `out/`, `docs/`, `*.md` | **CC BY-SA 4.0** | [`LICENSE-DOCS`](LICENSE-DOCS) |
| Datos derivados de `data/` producidos por este proyecto | **CC BY-SA 4.0** | [`LICENSE-DOCS`](LICENSE-DOCS) |
| Datos de terceros | Los suyos propios, sin relicenciar | [`THIRD-PARTY-DATA.md`](THIRD-PARTY-DATA.md) |

Cada módulo de `src/` lleva su cabecera con `SPDX-License-Identifier:
AGPL-3.0-only`.

## Por qué AGPL y no GPL

El proyecto apunta a convertirse en una plataforma web donde cualquiera pueda
simular la seguridad de un eclipse en su ubicación. La GPL-3.0 se activa al
distribuir el software; quien lo monta como servicio en red nunca distribuye
nada, así que no debe publicar sus cambios. La sección 13 de la AGPL cierra esa
puerta: si alguien ofrece una versión modificada a través de la red, tiene que
poner el código a disposición de sus usuarios.

Se ha elegido `AGPL-3.0-only` y no `or later`, para que las versiones futuras
que publique la Free Software Foundation no se apliquen automáticamente.

## Por qué CC BY-SA y no CC BY-NC

El repositorio nació bajo CC BY-NC 4.0. La cláusula no comercial tenía tres
problemas: dejaba el proyecto fuera de la definición de código abierto,
impedía que GitHub mostrara siquiera la licencia, y ahuyentaba a cualquier
contribuyente con un empleo. CC BY-SA 4.0 mantiene el copyleft sobre el texto,
obliga a compartir las obras derivadas en los mismos términos y es compatible
con un ecosistema de ciencia abierta.

## Qué significa en la práctica

**Puedes** usar, estudiar, modificar y redistribuir todo esto, también con fines
comerciales.

**Debes**, si distribuyes una versión modificada del código o la ofreces como
servicio en red, publicar el código completo bajo AGPL-3.0. Si redistribuyes el
texto o las figuras, modificados o no, atribuir la autoría y mantener CC BY-SA.

**No puedes** construir una capa cerrada encima y venderla sin publicar el
código, ni relicenciar el trabajo bajo términos propietarios.

## Uso comercial bajo otras condiciones

Si necesitas integrar este proyecto en un producto cerrado, el titular puede
ofrecer una licencia distinta. Escríbele a través de una incidencia del
repositorio.

Esa posibilidad depende de que el titular conserve los derechos sobre todo el
código, y por eso cada contribución exige firmar [`CLA.md`](CLA.md).

## Cambio de licencia del 14 de agosto de 2026

Las dos primeras publicaciones del repositorio salieron bajo CC BY-NC 4.0. El
titular era la única persona con derechos sobre el código y no se había
fusionado ninguna aportación externa, de modo que el cambio no requirió el
consentimiento de nadie. Quien hubiese obtenido una copia bajo CC BY-NC 4.0
conserva los derechos que aquella licencia le concedió sobre esa copia, porque
las licencias de Creative Commons son irrevocables.
