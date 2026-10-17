// Regresiones de presentación: nunca suponer moneda ni confundir un tope ausente con falta de dinero.
const ts=require('typescript');const fs=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../app/ui/lenguaje.ts'),'utf8');const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});const contexto={exports:{}};vm.runInNewContext(outputText,contexto);const {dinero,motivo,detalleRazon}=contexto.exports;
assert.equal(dinero(160000,'USD'),'USD 1.600');assert.equal(dinero(160000,undefined),'Monto sin leer');assert.equal(dinero(160000,null),'Monto sin leer');assert.equal(dinero(NaN,'USD'),'Monto sin leer');
assert.equal(motivo({resultado:{decision:'FRENAR',razones:[{regla:'R4',efecto:'FRENAR'}],hechos:{presupuesto_configurado:false}}}),'No hay un tope de gasto definido para este cobro.');
assert.equal(motivo({resultado:{decision:'ESCALAR',razones:[{regla:'R6',efecto:'ESCALAR'}],hechos:{acuerdo_encontrado:false}}}),'No encontramos un monto acordado para este cobro.');
assert.equal(detalleRazon({id:'R8',estado:'NO_EVALUADA',cifra:'Sin dato'}),'No se pudo revisar con los datos disponibles.');
assert.equal(detalleRazon({id:'R6',estado:'NO_APLICA',cifra:'No hay acuerdo'}),'Esta revisión no corresponde a esta factura.');
console.log('OK: moneda explícita, montos ausentes, topes ausentes, acuerdo ausente y estados sin evaluar/no aplica.');
