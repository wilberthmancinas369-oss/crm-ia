import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/landing.css'

// HU-18: página de inicio pública. La demostración usa datos ficticios y no llama a la API.

const ETAPAS_DEMO = ['Primer contacto', 'Propuesta', 'Negociación']

const OPORTUNIDADES = [
  {
    id: 'flotilla', nombre: 'Renovación de flotilla', empresa: 'Transportes Sánchez', etapa: 'Negociación', monto: 420000,
    dato: 'Cierra en 3 días',
    razon: 'Es la de mayor monto, cierra esta semana y nadie la ha contactado en 9 días.',
    paso: 'Llama hoy a la gerente de compras y confirma si aceptan la propuesta final antes del viernes.'
  },
  {
    id: 'uniformes', nombre: 'Uniformes escolares', empresa: 'Colegio Pacífico', etapa: 'Propuesta', monto: 85000,
    dato: 'Tarea vencida',
    razon: 'Tiene una tarea vencida: la cotización debió enviarse ayer.',
    paso: 'Envía hoy la cotización pendiente y agenda una llamada para resolver dudas sobre tallas.'
  },
  {
    id: 'computo', nombre: 'Equipo de cómputo', empresa: 'Despacho Ortega', etapa: 'Propuesta', monto: 230000,
    dato: '14 días sin contacto',
    razon: 'Monto alto y 14 días sin seguimiento después de enviar la propuesta.',
    paso: 'Escribe al director para saber si revisó la propuesta y ofrece una demostración del equipo.'
  },
  {
    id: 'clinica', nombre: 'Mantenimiento anual', empresa: 'Clínica Rosarito', etapa: 'Negociación', monto: 150000,
    dato: 'Reunión el jueves',
    razon: 'Va bien: ya tiene una reunión agendada para el jueves.',
    paso: 'Prepara para el jueves dos opciones de pago para cerrar en la reunión.'
  },
  {
    id: 'nomina', nombre: 'Software de nómina', empresa: 'Ferretera del Valle', etapa: 'Primer contacto', monto: 60000,
    dato: 'Contactado ayer',
    razon: 'Se contactó ayer; todavía no necesita seguimiento.',
    paso: 'Espera su respuesta hasta el lunes y, si no llega, envía un caso de éxito de otra ferretería.'
  }
]

const ROLES = [
  {
    id: 'administrador', nombre: 'Administrador', resumen: 'Ve y organiza toda la empresa.',
    puntos: [
      'Crea, renombra y elimina los grupos de trabajo.',
      'Invita personas y decide quién es Jefe de Área o Agente.',
      'Consulta el reporte general con las ventas de todos los grupos.'
    ]
  },
  {
    id: 'jefe', nombre: 'Jefe de Área', resumen: 'Dirige a su grupo, sin ver los demás.',
    puntos: [
      'Asigna y reasigna las tareas y oportunidades de su equipo.',
      'Invita agentes a su grupo y reenvía las invitaciones pendientes.',
      'Revisa el reporte de su grupo para saber quién necesita apoyo.'
    ]
  },
  {
    id: 'agente', nombre: 'Agente', resumen: 'Atiende a sus clientes del día a día.',
    puntos: [
      'Registra contactos, llamadas y reuniones en un solo historial.',
      'Mueve sus oportunidades por las etapas de venta.',
      'Recibe un correo un día antes de que venza una tarea.'
    ]
  }
]

const PASOS = [
  { titulo: 'Registra tu empresa', texto: 'Creas la cuenta en un minuto y quedas como Administrador.' },
  { titulo: 'Arma tus grupos', texto: 'Crea un grupo por área o sucursal e invita a cada persona por correo.' },
  { titulo: 'Empieza a vender', texto: 'Tu equipo registra contactos y oportunidades, y la IA les dice qué atender primero.' }
]

const FUNCIONES = [
  { titulo: 'Historial de cada cliente', texto: 'Llamadas, correos y reuniones quedan ligados al contacto, para que cualquiera retome la conversación.' },
  { titulo: 'Etapas de venta', texto: 'Cada oportunidad avanza de primer contacto a ganada o perdida, con su monto y fecha de cierre.' },
  { titulo: 'Tareas con recordatorio', texto: 'Cada tarea tiene responsable y fecha, y el CRM avisa por correo antes de que venza.' },
  { titulo: 'Búsqueda y filtros', texto: 'Encuentra contactos, oportunidades y tareas por nombre, estado, responsable o vencimiento.' },
  { titulo: 'Reportes por grupo', texto: 'Ventas ganadas, oportunidades abiertas y tareas pendientes de cada equipo.' }
]

const moneda = (n) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
const ORDEN_IA = ['flotilla', 'uniformes', 'computo', 'clinica', 'nomina']
const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Marca() {
  return (
    <span className="lp-marca">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="3" y="6" width="26" height="5" rx="2.5" />
        <rect x="7" y="14" width="18" height="5" rx="2.5" />
        <rect x="11" y="22" width="10" height="5" rx="2.5" className="lp-marca-punta" />
      </svg>
      CRM con IA
    </span>
  )
}

function Ficha({ op, seleccionada, onElegir, posicion }) {
  return (
    <button
      type="button"
      className={`lp-ficha lp-etapa-${ETAPAS_DEMO.indexOf(op.etapa)}`}
      style={{ viewTransitionName: `op-${op.id}` }}
      aria-pressed={seleccionada}
      onClick={() => onElegir(op.id)}
    >
      {posicion && <span className="lp-ficha-pos" aria-label={`Prioridad ${posicion}`}>{posicion}</span>}
      <span className="lp-ficha-cuerpo">
        <span className="lp-ficha-nombre">{op.nombre}</span>
        <span className="lp-ficha-empresa">{op.empresa}</span>
        <span className="lp-ficha-pie">
          <span>{moneda(op.monto)}</span>
          <span className="lp-ficha-dato">{op.dato}</span>
        </span>
        {posicion && <span className="lp-ficha-razon">{op.razon}</span>}
      </span>
    </button>
  )
}

function Demo() {
  const [vista, setVista] = useState('etapas')
  const [elegida, setElegida] = useState('flotilla')
  const temporizador = useRef(null)
  const op = OPORTUNIDADES.find((o) => o.id === elegida)

  const cambiarVista = (siguiente) => {
    const aplicar = () => flushSync(() => setVista(siguiente))
    if (document.startViewTransition && !sinMovimiento()) document.startViewTransition(aplicar)
    else aplicar()
  }

  const priorizar = () => {
    if (vista === 'pensando') return
    if (vista === 'prioridad') return cambiarVista('etapas')
    setVista('pensando')
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => {
      setElegida(ORDEN_IA[0])
      cambiarVista('prioridad')
    }, sinMovimiento() ? 150 : 1100)
  }

  const fichaProps = (o) => ({ op: o, seleccionada: o.id === elegida, onElegir: setElegida })

  return (
    <div className="lp-demo">
      <div className="lp-demo-barra">
        <span className="lp-demo-titulo">Oportunidades abiertas</span>
        <button type="button" className="lp-boton-ia" onClick={priorizar} disabled={vista === 'pensando'}>
          {vista === 'prioridad' ? 'Volver a las etapas' : vista === 'pensando' ? 'Analizando…' : 'Priorizar con IA'}
        </button>
      </div>

      <p className="lp-demo-estado" role="status">
        {vista === 'pensando' && 'Comparando seguimiento, tareas, etapa, monto y fecha de cierre…'}
        {vista === 'prioridad' && 'Así conviene atenderlas hoy. Elige una para ver el siguiente paso.'}
      </p>

      {vista === 'prioridad' ? (
        <ol className="lp-ranking">
          {ORDEN_IA.map((id, i) => (
            <li key={id}><Ficha {...fichaProps(OPORTUNIDADES.find((o) => o.id === id))} posicion={i + 1} /></li>
          ))}
        </ol>
      ) : (
        <div className={`lp-tablero ${vista === 'pensando' ? 'lp-pensando' : ''}`}>
          {ETAPAS_DEMO.map((etapa, i) => (
            <section key={etapa} className="lp-columna" aria-label={etapa}>
              <h3 className={`lp-columna-titulo lp-etapa-${i}`}>{etapa}</h3>
              {OPORTUNIDADES.filter((o) => o.etapa === etapa).map((o) => <Ficha key={o.id} {...fichaProps(o)} />)}
            </section>
          ))}
        </div>
      )}

      <div className="lp-sugerencia" aria-live="polite">
        <span className="lp-sugerencia-de">Siguiente paso sugerido para {op.empresa}</span>
        <p>{op.paso}</p>
      </div>
      <p className="lp-demo-nota">Datos de ejemplo. En tu cuenta, la IA compara hasta 20 oportunidades abiertas de tu equipo.</p>
    </div>
  )
}

function Roles() {
  const [activo, setActivo] = useState(0)
  const pestanas = useRef([])
  const mover = (e) => {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    let siguiente = delta === undefined ? null : (activo + delta + ROLES.length) % ROLES.length
    if (e.key === 'Home') siguiente = 0
    if (e.key === 'End') siguiente = ROLES.length - 1
    if (siguiente === null) return
    e.preventDefault()
    setActivo(siguiente)
    pestanas.current[siguiente]?.focus()
  }
  const rol = ROLES[activo]
  return (
    <div className="lp-roles">
      <div role="tablist" aria-label="Roles" aria-orientation="vertical" className="lp-roles-lista" onKeyDown={mover}>
        {ROLES.map((r, i) => (
          <button
            key={r.id}
            ref={(el) => { pestanas.current[i] = el }}
            role="tab"
            id={`tab-${r.id}`}
            aria-selected={i === activo}
            aria-controls={`panel-${r.id}`}
            tabIndex={i === activo ? 0 : -1}
            className="lp-rol-tab"
            onClick={() => setActivo(i)}
          >
            <span className="lp-rol-nombre">{r.nombre}</span>
            <span className="lp-rol-resumen">{r.resumen}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${rol.id}`} aria-labelledby={`tab-${rol.id}`} className="lp-rol-panel" key={rol.id}>
        <p className="lp-rol-panel-resumen">{rol.resumen}</p>
        <ul>
          {rol.puntos.map((p) => <li key={p}>{p}</li>)}
        </ul>
      </div>
    </div>
  )
}

export default function Landing() {
  const { session } = useAuth()
  const conSesion = Boolean(session)

  return (
    <div className="lp">
      <a href="#contenido" className="lp-saltar">Saltar al contenido</a>
      <header className="lp-cabecera">
        <Link to="/" className="lp-cabecera-marca"><Marca /></Link>
        <nav aria-label="Principal" className="lp-nav">
          <a href="#roles" className="lp-nav-enlace">Roles</a>
          <a href="#como-empezar" className="lp-nav-enlace">Cómo empezar</a>
          {conSesion ? (
            <Link to="/app" className="lp-boton lp-boton-chico">Ir a mi CRM</Link>
          ) : (
            <>
              <Link to="/login" className="lp-nav-enlace">Iniciar sesión</Link>
              <Link to="/registro" className="lp-boton lp-boton-chico">Registrar mi empresa</Link>
            </>
          )}
        </nav>
      </header>

      <main id="contenido">
        <section className="lp-hero" aria-labelledby="lp-titulo">
          <div className="lp-hero-texto">
            <h1 id="lp-titulo">Tu equipo sabe a quién llamar hoy.</h1>
            <p className="lp-hero-sub">
              Guarda tus clientes y oportunidades de venta en un solo lugar, reparte el trabajo entre tus grupos
              y deja que la IA te diga qué atender primero.
            </p>
            <div className="lp-acciones">
              {conSesion ? (
                <Link to="/app" className="lp-boton">Ir a mi CRM</Link>
              ) : (
                <>
                  <Link to="/registro" className="lp-boton">Registrar mi empresa</Link>
                  <Link to="/login" className="lp-boton lp-boton-borde">Iniciar sesión</Link>
                </>
              )}
            </div>
            <p className="lp-hero-pista">Prueba el tablero: toca una oportunidad o pide a la IA que las ordene.</p>
          </div>
          <Demo />
        </section>

        <section id="roles" className="lp-seccion" aria-labelledby="roles-titulo">
          <div className="lp-seccion-encabezado">
            <h2 id="roles-titulo">Cada persona ve lo que le toca</h2>
            <p>Los permisos dependen del rol y del grupo. Un Jefe de Área no ve las ventas de otra sucursal, y un Agente solo modifica su propio trabajo.</p>
          </div>
          <Roles />
        </section>

        <section id="como-empezar" className="lp-seccion lp-seccion-pasos" aria-labelledby="pasos-titulo">
          <div className="lp-seccion-encabezado">
            <h2 id="pasos-titulo">Empieza en tres pasos</h2>
          </div>
          <ol className="lp-pasos">
            {PASOS.map((p) => (
              <li key={p.titulo}>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-seccion" aria-labelledby="funciones-titulo">
          <div className="lp-seccion-encabezado">
            <h2 id="funciones-titulo">Lo que tu equipo usa a diario</h2>
          </div>
          <dl className="lp-funciones">
            {FUNCIONES.map((f) => (
              <div key={f.titulo}>
                <dt>{f.titulo}</dt>
                <dd>{f.texto}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="lp-cierre" aria-labelledby="cierre-titulo">
          <h2 id="cierre-titulo">Registra tu empresa y organiza a tu equipo hoy.</h2>
          <Link to={conSesion ? '/app' : '/registro'} className="lp-boton lp-boton-claro">
            {conSesion ? 'Ir a mi CRM' : 'Registrar mi empresa'}
          </Link>
        </section>
      </main>

      <footer className="lp-pie">
        <Marca />
        <p>Proyecto de Ingeniería de Software, Facultad de Ingeniería, UABC. Equipo Sons of Claude.</p>
      </footer>
    </div>
  )
}
