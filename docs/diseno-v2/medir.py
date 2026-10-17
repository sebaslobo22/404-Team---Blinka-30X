"""Medidor local de legibilidad. No envía texto a ningún servicio.
Estimación de sílabas por núcleos vocálicos: puede errar en nombres y préstamos.
"""
from pathlib import Path
import json,re
root=Path(__file__).parent

def silabas(p):
    p=p.lower()
    p=re.sub(r'([qg])u([eiéí])',r'\1\2',p)
    p=p.replace('h','')
    total=0
    for g in re.findall(r'[aeiouáéíóúü]+',p):
        i=0
        while i<len(g):
            total+=1
            if i+2<len(g) and g[i] in 'iuü' and g[i+1] in 'aeoáéó' and g[i+2] in 'iuü':i+=3
            elif i+1<len(g) and g[i] not in 'íú' and g[i+1] not in 'íú' and not (g[i] in 'aeoáéó' and g[i+1] in 'aeoáéó'):i+=2
            else:i+=1
    return max(1,total)

if __name__=='__main__':
    rows=json.loads((root/'auditoria.json').read_text())
    result=[]
    for r in rows:
        if r['zoom']!=1:continue
        texto=r['texto']
        palabras=re.findall(r'[a-záéíóúüñ]+',texto.lower())
        frases=[p for p in re.split(r'[.!?]+|\n+',texto) if re.search(r'[a-záéíóúüñ]',p,re.I)]
        n=len(palabras);sy=sum(map(silabas,palabras));f=len(frases)
        score=206.84-60*sy/n-1.02*n/max(1,f)
        result.append({'ruta':r['nombre'],'palabras':n,'silabas_estimadas':sy,'frases':f,'Fernandez_Huerta_estimado':round(score,2),'metodo':'206.84 - 60*(silabas/palabras) - 1.02*(palabras/frases)','texto':texto})
        print(r['nombre'],round(score,2),n,'palabras',f,'frases')
    (root/'legibilidad.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
