import type { Metadata } from 'next';
import Link from 'next/link';
import Tarjeta from '../ui/Tarjeta';
import { Ic } from '../ui/iconos';
import { ICONO_REGLA, RIESGO } from '../ui/mapa-iconos';
import { BotonTema, Revelar } from './Cliente';
import './conoce.css';

export const metadata: Metadata = {
  title: 'Pulso: pulso firme en cada pago',
  description: 'Pulso lee facturas con IA y decide PAGAR, FRENAR o ESCALAR con las reglas de tu empresa. Una persona revisa solo lo dudoso. Nunca mueve dinero. Datos de demo ficticios.',
};

const TELEGRAM = 'https://t.me/pulso404_dev_bot';
const CODIGO = 'https://github.com/sebaslobo22/404-Team---Blinka-30X';

const DOLORES = [
  { icono: 'duplicado', frase: 'Esa ya la pagamos, creo.' },
  { icono: 'banco-reloj', frase: 'Cambió de cuenta, ¿verdad?' },
  { icono: 'huella', frase: 'No sé quién aprobó esto.' },
] as const;

const PASOS = [
  { icono: 'documento', titulo: '1. La factura llega', apoyo: 'PDF, foto, correo, chat o Telegram.' },
  { icono: 'ojos', titulo: '2. Dos IA la leen', apoyo: 'Cada una por separado. Si no coinciden, pasa a una persona.' },
  { icono: 'reglas', titulo: '3. Tus reglas deciden', apoyo: 'Escritas en código. Dan PAGAR, FRENAR o ESCALAR.' },
  { icono: 'persona', titulo: '4. Una persona aprueba', apoyo: 'Solo lo escalado.' },
] as const;

const CANALES = [
  { icono: 'documento', texto: 'PDF con texto' },
  { icono: 'imagen', texto: 'Foto o captura' },
  { icono: 'correo', texto: 'Correo' },
  { icono: 'chat', texto: 'Chat' },
  { icono: 'agente', texto: 'Bot de Telegram' },
] as const;

const AUN_NO = [
  'No conecta tu banco.',
  'No mueve dinero.',
  'No recibe lotes CSV de entrada.',
  'No ofrece anticipos.',
  'PDF escaneado: siempre pasa a una persona.',
] as const;

const PREGUNTAS: { p: string; r: string }[] = [
  { p: '¿Puedo confiar en una IA con mis pagos?', r: 'La IA lee y explica. No decide. Decide tu regla, escrita en código. Ante la duda, pasa a una persona.' },
  { p: '¿Y si se equivoca al leer?', r: 'Dos modelos leen la factura por separado. Si no coinciden, o uno falla, pasa a una persona.' },
  { p: '¿Mueve dinero?', r: 'No. Su salida es una instrucción de pago que otro sistema, o una persona, ejecutaría.' },
  { p: '¿Quién pone las reglas?', r: 'Tu empresa. Son ocho reglas, de R1 a R8, con tus límites, proveedores y presupuestos. Están en código, no en el criterio de un modelo.' },
  { p: '¿Qué pasa si una factura trae instrucciones ocultas?', r: 'El texto de una factura es un dato, nunca una orden. Pulso no la obedece y la pasa a una persona.' },
  { p: '¿Qué NO hace hoy?', r: 'No conecta tu banco, no mueve dinero, no recibe lotes CSV de entrada, no ofrece anticipos y no resuelve solo un PDF escaneado.' },
  { p: '¿Qué datos usa la demo?', r: 'Datos ficticios de una empresa de ejemplo, Aurora Cloud, con 18 facturas. Las lecturas de IA son reales y quedaron grabadas.' },
  { p: '¿Qué es un registro encadenado?', r: 'Cada decisión se anota sin borrar lo anterior. Cada entrada guarda una huella de la previa. Si alguien toca una, la cadena deja de cuadrar y se nota. Puedes comprobarlo en el registro.' },
  { p: '¿Es un producto terminado?', r: 'No. Es un prototipo del hackathon. Las cifras y los límites están arriba, tal como se midieron.' },
];

function Captura({ base, ancho, alto, alt, prioridad }: { base: string; ancho: number; alto: number; alt: string; prioridad?: boolean }) {
  const comun = { width: ancho, height: alto, alt, decoding: 'async' as const, loading: prioridad ? ('eager' as const) : ('lazy' as const) };
  return <figure className="cn-captura">
    <img className="cap-claro" src={`/conoce/${base}-claro.png`} {...comun} />
    <img className="cap-oscuro" src={`/conoce/${base}-oscuro.png`} {...comun} />
    <figcaption>Captura real de Pulso. Datos ficticios (Aurora Cloud).</figcaption>
  </figure>;
}

export default function Conoce() {
  return (
    <div className="conoce">
      <Revelar />
      <header className="cn-nav">
        <Link className="cn-marca" href="/conoce"><Ic nombre="pulso" size={28} />Pulso</Link>
        <nav aria-label="Secciones de esta página">
          <a href="#como">Cómo funciona</a>
          <a href="#pruebas">Pruebas</a>
          <a href="#preguntas">Preguntas</a>
        </nav>
      </header>

      <section className="cn-hero" aria-labelledby="t-hero">
        <div className="cn-hero-texto">
          <p className="cn-kicker">Para fundadores y finanzas de startups con equipo en LatAm</p>
          <h1 id="t-hero">Las facturas llegan por todos lados. Pulso decide cuáles pagar, frenar o escalar.</h1>
          <p className="cn-lead">Lee PDF, fotos, correos y chats con IA. Aplica las reglas que define tu empresa. Una persona revisa solo lo dudoso. Nunca mueve dinero.</p>
          <div className="cn-acciones">
            <Link className="btn btn-primario" href="/"><Ic nombre="flecha-salida" size={20} />Ver cómo Pulso decide una factura</Link>
            <a className="btn" href={TELEGRAM} target="_blank" rel="noopener noreferrer"><Ic nombre="chat" size={20} />Probar por Telegram</a>
            <a className="btn btn-texto" href={CODIGO} target="_blank" rel="noopener noreferrer"><Ic nombre="codigo" size={20} />Ver el código</a>
          </div>
          <p className="cn-nota">Nunca mueve dinero. Datos de demo ficticios (Aurora Cloud).</p>
        </div>
        <Captura base="factura-f016" ancho={1000} alto={720} prioridad alt="Pantalla de Pulso con la factura F-016 de un proveedor ficticio. Pulso la pasa a una persona porque la factura intenta dar órdenes, y muestra el paso de la factura a la decisión." />
      </section>

      <section className="cn-seccion" aria-labelledby="t-problema" data-revela>
        <h2 id="t-problema">Hoy: una factura por chat y un pago de memoria.</h2>
        <p className="cn-rotulo">Si esto te suena. Frases redactadas por el equipo, no son citas.</p>
        <ul className="rejilla-tarjetas cn-rejilla3">
          {DOLORES.map((d) => <li key={d.frase}><Tarjeta variante="base" icono={d.icono} titulo={`"${d.frase}"`} /></li>)}
        </ul>
        <p>Lo que cuesta: pagar dos veces, pagar a una cuenta que cambió hace horas, pagar más de lo acordado y no poder explicar quién lo aprobó.</p>
        <p><a href="#como">Ver cómo se resuelve</a></p>
      </section>

      <section id="como" className="cn-seccion" aria-labelledby="t-como" data-revela>
        <h2 id="t-como">Cuatro pasos. Tú pones las reglas.</h2>
        <ol className="rejilla-tarjetas cn-rejilla4">
          {PASOS.map((p) => <li key={p.titulo}><Tarjeta variante="etapa" icono={p.icono} titulo={p.titulo} encabezado apoyo={p.apoyo} /></li>)}
        </ol>
        <ul className="rejilla-tarjetas cn-rejilla3 cn-decisiones">
          <li><Tarjeta variante="riesgo" tono="pagar" icono="check-circulo" titulo="PAGAR" encabezado ayuda="pagadas" apoyo="Cumple todas tus reglas. Queda lista la instrucción de pago." /></li>
          <li><Tarjeta variante="riesgo" tono="frenar" icono="mano" titulo="FRENAR" encabezado ayuda="frenadas" apoyo="Rompe una regla. No tiene botón de aprobar." /></li>
          <li><Tarjeta variante="riesgo" tono="escalar" icono="campana" titulo="ESCALAR" encabezado ayuda="te-necesitan" apoyo="Hay duda. Una persona decide y deja una nota." /></li>
        </ul>
        <details className="cn-plegable">
          <summary>Ver las ocho reglas (R1 a R8)</summary>
          <ul className="cn-reglas">
            {Array.from({ length: 8 }, (_, i) => `R${i + 1}`).map((r) => <li key={r}><Ic nombre={ICONO_REGLA[r]!} size={20} /><span><strong>{r}</strong> {RIESGO[r]!.etiqueta}</span></li>)}
          </ul>
        </details>
        <p><Link href="/facturas/F-016">Ver una factura decidida paso a paso</Link></p>
      </section>

      <section id="pruebas" className="cn-seccion" aria-labelledby="t-pruebas" data-revela>
        <h2 id="t-pruebas">Medido con facturas que el equipo no había visto.</h2>
        <ul className="rejilla-tarjetas cn-rejilla4">
          <li><Tarjeta variante="indicador" icono="check-circulo" titulo="Sin persona, set ciego 2" cifra="25 de 30 (83,3 %)" grande apoyo="Set armado por otra persona y congelado antes de ver resultados." /></li>
          <li><Tarjeta variante="indicador" icono="escudo-check" titulo="Pagos indebidos" cifra="0" grande apoyo="En ese set, en 10 documentos ciegos y en 62 filas externas." /></li>
          <li><Tarjeta variante="indicador" icono="tabla" titulo="Set de desarrollo" cifra="8 de 18 (44,4 %)" grande apoyo="Lo diseñamos nosotros. Por eso no lo usamos como medida." /></li>
          <li><Tarjeta variante="indicador" icono="lista-check" titulo="Pruebas automáticas" cifra="728" grande apoyo="Y 37 escenarios en Telegram, sin mover un dólar." /></li>
        </ul>
        <p>Cero pagos indebidos es lo medido hasta hoy, no una garantía.</p>
        <details className="cn-plegable">
          <summary>Cómo lo medimos</summary>
          <p>Un set ciego es un grupo de facturas que no usamos para ajustar las reglas. Cuenta como resuelta sin persona toda factura que Pulso decide PAGAR o FRENAR sin pedir ayuda. Las ESCALAR esperan a una persona. El método y los resultados están en el repositorio público.</p>
        </details>
        <p><a href={CODIGO} target="_blank" rel="noopener noreferrer">Ver el método y el repositorio</a></p>
      </section>

      <section className="cn-seccion" aria-labelledby="t-seguridad" data-revela>
        <h2 id="t-seguridad">Actúa cuando es seguro. Pregunta cuando no.</h2>
        <div className="cn-dos">
          <div>
            <p>La IA lee y explica. Tu regla decide. Nunca mueve dinero. Lo frenado no tiene botón de aprobar. Lo escalado lo aprueba una persona, con confirmación y nota.</p>
            <p>El texto de una factura es un dato, nunca una orden. Cada decisión queda en un registro encadenado que puedes verificar y que delata si alguien lo toca.</p>
            <ul className="cn-sellos">
              <li className="cn-sello"><Ic nombre="reglas" size={20} />Decidido por regla</li>
              <li className="cn-sello"><Ic nombre="ojos" size={20} />Lectura de IA</li>
              <li className="cn-sello"><Ic nombre="persona" size={20} />Aprobado por persona</li>
            </ul>
            <details className="cn-plegable">
              <summary>Detalle técnico</summary>
              <p>Registro encadenado: cada entrada guarda el hash de la anterior, así que cambiar una rompe la cadena. También hay un servidor MCP para conectar agentes.</p>
            </details>
            <p><Link className="btn btn-primario" href="/registro"><Ic nombre="registro" size={20} />Intenta romper el registro</Link></p>
          </div>
          <Captura base="registro" ancho={1000} alto={720} alt="Pantalla de registro de Pulso con la cadena de decisiones y el botón para verificar que nadie la manipuló." />
        </div>
      </section>

      <section className="cn-seccion" aria-labelledby="t-canales" data-revela>
        <h2 id="t-canales">Funciona donde ya te llegan las facturas.</h2>
        <ul className="cn-canales">
          {CANALES.map((c) => <li key={c.texto}><Ic nombre={c.icono} size={24} />{c.texto}</li>)}
        </ul>
        <div className="cn-aunno" role="group" aria-labelledby="t-aunno">
          <h3 id="t-aunno">Todavía no</h3>
          <ul>
            {AUN_NO.map((t) => <li key={t}><Ic nombre="x" size={20} />{t}</li>)}
          </ul>
        </div>
        <p><a href={TELEGRAM} target="_blank" rel="noopener noreferrer">Probar por Telegram</a></p>
      </section>

      <section className="cn-seccion cn-oferta" aria-labelledby="t-oferta" data-revela>
        <h2 id="t-oferta">Pruébalo con facturas de ejemplo. Sin conectar tu banco.</h2>
        <p>Recorre la demo en dos minutos. Mándale una factura de ejemplo al bot. Verifica el registro. Nunca mueve dinero.</p>
        <div className="cn-acciones">
          <Link className="btn btn-primario" href="/"><Ic nombre="flecha-salida" size={20} />Ver cómo Pulso decide una factura</Link>
          <a className="btn" href={TELEGRAM} target="_blank" rel="noopener noreferrer"><Ic nombre="chat" size={20} />Probar por Telegram</a>
          <a className="btn btn-texto" href={CODIGO} target="_blank" rel="noopener noreferrer"><Ic nombre="codigo" size={20} />Ver el código</a>
        </div>
        <details className="cn-plegable">
          <summary>Cuánto cuesta revisar a mano</summary>
          <p>Tiempo hoy = facturas al mes × minutos por factura ÷ 60 × costo por hora de quien las revisa.</p>
          <p>Con Pulso es la misma cuenta, pero solo con las facturas que llegan a una persona. En nuestro set ciego 2, 5 de 30 no se resolvieron sin persona. Tu mezcla puede ser distinta.</p>
          <p>Ejemplo de juguete, no son datos de nadie: 100 facturas × 6 minutos ÷ 60 × 10 por hora = 100 al mes en revisión manual.</p>
          <p>No incluye el tiempo de configurar tus reglas. Pagar dos veces cuesta el monto de la factura otra vez.</p>
        </details>
      </section>

      <section id="preguntas" className="cn-seccion" aria-labelledby="t-faq" data-revela>
        <h2 id="t-faq">Preguntas, las incómodas primero</h2>
        <div className="cn-faq">
          {PREGUNTAS.map((q) => <details key={q.p}><summary>{q.p}</summary><p>{q.r}</p></details>)}
        </div>
      </section>

      <footer className="cn-pie">
        <p className="cn-lema">Pulso firme en cada pago.</p>
        <p>Hecho por el Equipo 404 para el reto Blinka del Hackathon 30X. <a href={CODIGO} target="_blank" rel="noopener noreferrer">Repositorio</a> · <a href={TELEGRAM} target="_blank" rel="noopener noreferrer">Contacto por Telegram</a></p>
        <p>Pulso no es una entidad financiera y no mueve dinero. Los datos de la demo son ficticios.</p>
        <BotonTema />
      </footer>
    </div>
  );
}
