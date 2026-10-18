'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as TeclaReact } from 'react';
import { Ic } from '../ui/iconos';
import { CLAVE_PASO_TOUR, EVENTO_ABRIR, puedeAbrirseSola, reclamarPrimeraVisita } from './estado';
import './bienvenida.css';

// Bienvenida de primera visita. Distinta del recorrido guiado (app/tour): este panel presenta a Pulso y sus canales;
// el recorrido enseña las pantallas. Se abre sola una vez; después, desde "Bienvenida" en la barra o en el menú.

const local = (): Storage | null => { try { return window.localStorage; } catch { return null; } };
const enCurso = (): boolean => { try { return window.sessionStorage.getItem(CLAVE_PASO_TOUR) !== null; } catch { return false; } };

export interface PropsBienvenida {
  /** Lo calcula el layout con lecturaEnVivoActiva: sin lectura en vivo, /probar no existe. */
  vivoDisponible: boolean;
  /** Enlace del bot (NEXT_PUBLIC_TELEGRAM_BOT_URL), ya validado. */
  telegramUrl: string | null;
  /** Buzón del equipo (NEXT_PUBLIC_GMAIL_BUZON), ya validado. */
  buzon: string | null;
}

export function Bienvenida({ vivoDisponible, telegramUrl, buzon }: PropsBienvenida) {
  const router = useRouter();
  const dialogo = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const sinDevolverFoco = useRef(false);
  const [abierta, setAbierta] = useState(false);
  const [camino, setCamino] = useState<'inicio' | 'finanzas'>('inicio');

  const abrir = useCallback(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setCamino('inicio');
    setAbierta(true);
  }, []);
  const cerrar = useCallback(() => setAbierta(false), []);

  // Primera visita: una sola vez, y nunca encima del recorrido ni del enlace del jurado.
  useEffect(() => {
    const ruta = window.location.pathname, busqueda = window.location.search;
    if (!puedeAbrirseSola({ ruta, busqueda, tourEnCurso: enCurso() })) {
      // El jurado entra por el recorrido: se marca como vista para no interrumpirlo después.
      if (!ruta.startsWith('/team')) reclamarPrimeraVisita(local());
      return;
    }
    if (reclamarPrimeraVisita(local())) abrir();
  }, [abrir]);

  useEffect(() => {
    // Si alguien lanza el recorrido con la bienvenida abierta, ella se aparta: nunca quedan dos capas.
    const alTour = () => { if (dialogo.current?.open) sinDevolverFoco.current = true; setAbierta(false); };
    window.addEventListener(EVENTO_ABRIR, abrir);
    window.addEventListener('tour:abrir', alTour);
    return () => { window.removeEventListener(EVENTO_ABRIR, abrir); window.removeEventListener('tour:abrir', alTour); };
  }, [abrir]);

  // El estado manda; el <dialog> modal deja inerte el resto de la página.
  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierta && !d.open) { try { d.showModal(); } catch { d.setAttribute('open', ''); } }
    if (!abierta && d.open) d.close();
  }, [abierta]);

  // Escape (cancel) y cualquier otro cierre del diálogo pasan por aquí.
  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    const alCerrar = () => {
      setAbierta(false);
      if (sinDevolverFoco.current) { sinDevolverFoco.current = false; return; }
      const o = opener.current;
      if (o && o.isConnected && o !== document.body) o.focus();
    };
    d.addEventListener('close', alCerrar);
    return () => d.removeEventListener('close', alCerrar);
  }, []);

  // Al cambiar de camino, el foco va al título nuevo para que el lector de pantalla lo anuncie.
  useEffect(() => { if (abierta) dialogo.current?.querySelector<HTMLElement>('[data-bienvenida-titulo]')?.focus(); }, [abierta, camino]);

  // Tab y Shift+Tab dan la vuelta dentro del panel.
  function atrapar(e: TeclaReact<HTMLDialogElement>) {
    if (e.key !== 'Tab') return;
    const f = Array.from(dialogo.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') ?? []).filter((x) => x.offsetParent !== null);
    if (f.length === 0) return;
    const primero = f[0]!, ultimo = f[f.length - 1]!;
    if (e.shiftKey && (document.activeElement === primero || !dialogo.current?.contains(document.activeElement))) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  }

  function soyJurado() {
    sinDevolverFoco.current = true;
    setAbierta(false);
    requestAnimationFrame(() => window.dispatchEvent(new Event('tour:abrir')));
  }
  function irAlInicio() { setAbierta(false); router.push('/'); }

  return (
    <dialog ref={dialogo} className="bienvenida" aria-labelledby="bienvenida-titulo" onKeyDown={atrapar}>
      {abierta ? <div className="bienvenida-interior">
        <div className="bienvenida-cerrar"><button type="button" className="btn btn-texto" onClick={cerrar}><Ic nombre="x" size={20} />Cerrar</button></div>
        <svg className="bienvenida-pulso" viewBox="0 0 240 48" aria-hidden="true" focusable="false">
          <path pathLength={1} d="M2 26h70l8-14 10 26 11-34 10 30 7-8h120" />
        </svg>
        {camino === 'inicio' ? <>
          <h2 id="bienvenida-titulo" tabIndex={-1} data-bienvenida-titulo>Hola, soy Pulso</h2>
          <p className="bienvenida-frase">Leo tus facturas, decido con tus reglas y te pido permiso cuando algo se sale. Nunca muevo dinero.</p>
          <div className="bienvenida-caminos">
            <button type="button" className="btn" onClick={() => setCamino('finanzas')}><Ic nombre="monedas" size={24} />Soy de finanzas</button>
            <button type="button" className="btn btn-primario" onClick={soyJurado}><Ic nombre="recorrido" size={24} />Soy jurado: 3 minutos</button>
          </div>
        </> : <>
          <h2 id="bienvenida-titulo" tabIndex={-1} data-bienvenida-titulo>Así te ayudo</h2>
          <ol className="bienvenida-puntos">
            <li><Ic nombre="ojos" size={24} /><span><strong>Leo cada factura dos veces.</strong> Dos modelos de empresas distintas la leen; si no coinciden en monto, moneda, beneficiario o cuenta, te pregunto.</span></li>
            <li><Ic nombre="reglas" size={24} /><span><strong>Tus reglas deciden, no la IA.</strong> Pago lo que las cumple todas, freno lo que rompe una y te pregunto lo dudoso.</span></li>
            <li><Ic nombre="huella" size={24} /><span><strong>Todo queda explicado y registrado.</strong> Cada decisión dice por qué y entra a un registro donde cualquier cambio se nota.</span></li>
          </ol>
          <div className="bienvenida-caminos">
            <button type="button" className="btn" onClick={() => setCamino('inicio')}><Ic nombre="volver" size={24} />Atrás</button>
            <button type="button" className="btn btn-primario" onClick={irAlInicio}><Ic nombre="decisiones" size={24} />Ir al inicio</button>
          </div>
        </>}

        <section className="bienvenida-canales" aria-labelledby="bienvenida-canales-titulo">
          <h3 id="bienvenida-canales-titulo">Conecta tus canales</h3>
          <ul className="bienvenida-tarjetas">
            <li className="tarjeta">
              <p className="titulo-ic"><Ic nombre="chat" size={24} /><strong>Telegram</strong></p>
              <p>Escríbele al bot y crea tu empresa con /start.</p>
              {telegramUrl ? <a href={telegramUrl} target="_blank" rel="noopener noreferrer">Abrir el bot<span className="sr-only"> (se abre en otra pestaña)</span></a> : <p className="tenue">Pídele el enlace del bot al equipo.</p>}
            </li>
            <li className="tarjeta">
              <p className="titulo-ic"><Ic nombre="correo" size={24} /><strong>Correo</strong></p>
              <p>Reenvía la factura al buzón del equipo.</p>
              {buzon ? <a className="corto" href={`mailto:${buzon}`}>{buzon}</a> : <p className="tenue">Pídele la dirección del buzón al equipo.</p>}
            </li>
            <li className="tarjeta">
              <p className="titulo-ic"><Ic nombre="documento" size={24} /><strong>Subir una factura</strong></p>
              <p>Una foto o un PDF, desde el teléfono o la computadora.</p>
              {vivoDisponible ? <Link href="/probar" onClick={cerrar}>Subir mi factura</Link> : <p className="tenue">Disponible en el despliegue con lectura en vivo.</p>}
            </li>
          </ul>
          <p className="tenue bienvenida-nota">Lo que entra por estos canales nunca se paga solo: te lo pregunto o lo freno.</p>
        </section>
      </div> : null}
    </dialog>
  );
}

/** Botón para volver a ver la bienvenida (pie de la barra y menú móvil). */
export function abrirBienvenida() { window.dispatchEvent(new Event(EVENTO_ABRIR)); }
