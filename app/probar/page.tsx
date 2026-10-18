import Link from 'next/link';
import { lecturaEnVivoActiva } from '../../src/vivo/activa';
import { Ic } from '../ui/iconos';
import Subir from './Subir';
export const dynamic = 'force-dynamic';
export default function Probar() {
  const activa = lecturaEnVivoActiva(process.env);
  return <>
    <header>
      <h1 className="titulo-ic"><Ic nombre="vivo" size={28} />Prueba con tu factura</h1>
      <p>Pulso la lee con dos modelos y decide con las reglas de la empresa. Lo que entra en vivo nunca se paga solo: como máximo va a tu aprobación.</p>
    </header>
    {activa ? <Subir /> : <section className="tarjeta">
      <p className="con-ic"><Ic nombre="info" size={24} /><span>En este enlace la lectura en vivo está apagada: no tiene claves de IA cargadas.</span></p>
      <p><Link className="btn" href="/">Ver las 18 facturas de ejemplo</Link></p>
    </section>}
  </>;
}
