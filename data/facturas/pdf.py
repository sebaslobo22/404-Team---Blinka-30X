"""Escribe un PDF de una pagina con capa de texto real (Helvetica, WinAnsi), sin dependencias.

Uso: python3 pdf.py salida.pdf lineas.json
lineas.json: lista de {"texto": str, "tam": int, "negrita": bool, "oculto": bool}.
"oculto" dibuja el texto en blanco (invisible a la vista, presente en la capa de texto): sirve para
simular instrucciones escondidas dentro de una factura.
"""
import json
import sys
import zlib

salida, ruta = sys.argv[1], sys.argv[2]
lineas = json.load(open(ruta, encoding="utf-8"))


def esc(s):
    b = s.encode("cp1252", errors="replace")
    out = []
    for c in b:
        if c in (0x28, 0x29, 0x5C):
            out.append("\\" + chr(c))
        elif c < 32 or c > 126:
            out.append("\\%03o" % c)
        else:
            out.append(chr(c))
    return "".join(out)


y = 790
cont = ["0 0 0 rg 0.6 g 50 800 495 0.8 re f 0 g"]
for l in lineas:
    tam = l.get("tam", 12)
    fuente = "/F2" if l.get("negrita") else "/F1"
    color = "1 1 1 rg" if l.get("oculto") else "0 0 0 rg"
    y -= tam + 12
    cont.append(f"BT {fuente} {tam} Tf {color} 56 {y} Td ({esc(l['texto'])}) Tj ET")
flujo = zlib.compress("\n".join(cont).encode("latin1"))

objs = [
    b"<< /Type /Catalog /Pages 2 0 R >>",
    b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    b"<< /Length %d /Filter /FlateDecode >>\nstream\n" % len(flujo) + flujo + b"\nendstream",
]
pdf = bytearray(b"%PDF-1.4\n")
pos = []
for i, o in enumerate(objs, 1):
    pos.append(len(pdf))
    pdf += b"%d 0 obj\n" % i + o + b"\nendobj\n"
xref = len(pdf)
pdf += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1)
for p in pos:
    pdf += b"%010d 00000 n \n" % p
pdf += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, xref)
open(salida, "wb").write(bytes(pdf))
