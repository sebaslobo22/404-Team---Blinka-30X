"""Dibuja una factura ficticia como imagen con Pillow (ya instalado en esta Mac).

Uso: python3 render.py salida.png|jpg lineas.json [borrosa|fuerte]
lineas.json: lista de {"texto": str, "negrita": bool, "desenfoque": float}.
Con "borrosa", la imagen entera se degrada (desenfoque, reduccion y ruido) y las lineas con
"desenfoque" > 0 quedan ilegibles a proposito.
"""
import json
import random
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

salida, ruta = sys.argv[1], sys.argv[2]
modo = sys.argv[3] if len(sys.argv) > 3 else ""
borrosa = modo in ("borrosa", "fuerte")
fuerte = modo == "fuerte"
lineas = json.load(open(ruta, encoding="utf-8"))

FUENTE = "/System/Library/Fonts/Supplemental/Arial.ttf"
FUENTE_B = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
ANCHO, MARGEN, ALTO_LINEA = 1000, 50, 52
alto = MARGEN * 2 + ALTO_LINEA * len(lineas) + 20

img = Image.new("RGB", (ANCHO, alto), (252, 252, 250))
d = ImageDraw.Draw(img)
d.rectangle([14, 14, ANCHO - 14, alto - 14], outline=(170, 170, 170), width=3)
y = MARGEN
for l in lineas:
    f = ImageFont.truetype(FUENTE_B if l.get("negrita") else FUENTE, 30)
    r = l.get("desenfoque", 0)
    if r:
        capa = Image.new("RGB", (ANCHO, ALTO_LINEA), (252, 252, 250))
        ImageDraw.Draw(capa).text((MARGEN, 6), l["texto"], font=f, fill=(25, 25, 25))
        capa = capa.filter(ImageFilter.GaussianBlur(r))
        img.paste(capa, (0, y - 6))
    else:
        d.text((MARGEN, y), l["texto"], font=f, fill=(25, 25, 25))
    y += ALTO_LINEA

if borrosa:
    random.seed(7)
    img = img.filter(ImageFilter.GaussianBlur(4.2 if fuerte else 2.4))
    f = 4 if fuerte else 2
    img = img.resize((ANCHO // f, alto // f)).resize((ANCHO, alto))
    px = img.load()
    for _ in range(ANCHO * alto // 6):
        x, yy = random.randrange(ANCHO), random.randrange(alto)
        v = random.randint(-28, 28)
        p = px[x, yy]
        px[x, yy] = tuple(max(0, min(255, c + v)) for c in p)

if salida.lower().endswith((".jpg", ".jpeg")):
    img.save(salida, quality=82)
else:
    img.save(salida)
