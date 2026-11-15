import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useOportunidades } from '../hooks/useOportunidades'
import { ETAPAS, formatoFecha, formatoMonto } from '../constants/crm'
import { tonoEtapa } from '../constants/estilos'

const mensajeDelServidor = (error, porDefecto) =>
  error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || porDefecto

// Vista pipeline (HU 4.1): una columna por etapa de venta. Las tarjetas se arrastran entre
// columnas para cambiar la etapa; el selector de cada tarjeta hace lo mismo sin arrastrar.
export default function Pipeline() {
  const { oportunidades, cargando, error, actualizar } = useOportunidades()
  const [arrastrando, setArrastrando] = useState(null)
  const [columnaDestino, setColumnaDestino] = useState(null)

  const mover = async (id, etapa) => {
    const oportunidad = oportunidades.find((o) => o.id === id)
    if (!oportunidad || oportunidad.etapa === etapa) return
    try {
      await actualizar(id, { etapa })
    } catch (err) {
      alert(mensajeDelServidor(err, 'No se pudo mover la oportunidad'))
    }
  }

  const soltar = (etapa) => (e) => {
    e.preventDefault()
    setColumnaDestino(null)
    const id = e.dataTransfer.getData('text/plain')
    if (id) mover(id, etapa)
  }

  const suma = (lista) => lista.reduce((total, o) => total + Number(o.valor_estimado || 0), 0)
  const abiertas = oportunidades.filter((o) => o.etapa !== 'Ganada' && o.etapa !== 'Perdida')
  const ganadas = oportunidades.filter((o) => o.etapa === 'Ganada')

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1>Pipeline de ventas</h1>
          <p className="subtitulo">Arrastra una tarjeta para cambiarla de etapa.</p>
        </div>
        <Link to="/app/oportunidades" className="btn btn-outline">Ver lista y crear</Link>
      </div>

      {error && <p role="alert" className="alerta alerta-error">{error}</p>}

      {cargando ? (
        <p className="texto-suave">Cargando pipeline…</p>
      ) : (
        <>
          <div className="kpis">
            <section className="kpi">
              <h2 className="kpi-titulo">Oportunidades abiertas</h2>
              <p className="kpi-valor">{abiertas.length}</p>
            </section>
            <section className="kpi">
              <h2 className="kpi-titulo">Monto en juego</h2>
              <p className="kpi-valor">{formatoMonto(suma(abiertas))}</p>
            </section>
            <section className="kpi">
              <h2 className="kpi-titulo">Ganado</h2>
              <p className="kpi-valor">{formatoMonto(suma(ganadas))}</p>
              <p className="kpi-nota">{ganadas.length} {ganadas.length === 1 ? 'oportunidad ganada' : 'oportunidades ganadas'}</p>
            </section>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-3 xl:grid-cols-5 items-start">
            {ETAPAS.map((etapa) => {
              const tarjetas = oportunidades.filter((o) => o.etapa === etapa.valor)
              return (
                <section
                  key={etapa.valor}
                  aria-label={`Etapa ${etapa.valor}`}
                  onDragOver={(e) => { e.preventDefault(); setColumnaDestino(etapa.valor) }}
                  onDragLeave={() => setColumnaDestino((actual) => (actual === etapa.valor ? null : actual))}
                  onDrop={soltar(etapa.valor)}
                  className={`columna ${tonoEtapa(etapa.valor)}${columnaDestino === etapa.valor ? ' columna-destino' : ''}`}
                >
                  <header className="columna-encabezado">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="columna-titulo">{etapa.valor}</h2>
                      <span className="columna-conteo">{tarjetas.length}</span>
                    </div>
                    <p className="columna-total cifra">{formatoMonto(suma(tarjetas))}</p>
                  </header>

                  <div className="space-y-2">
                    {tarjetas.length === 0 && <p className="vacio">Sin oportunidades</p>}
                    {tarjetas.map((o) => (
                      <article
                        key={o.id}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.setData('text/plain', o.id); setArrastrando(o.id) }}
                        onDragEnd={() => { setArrastrando(null); setColumnaDestino(null) }}
                        className={`ficha-op${arrastrando === o.id ? ' arrastrando' : ''}`}
                      >
                        <h3 className="ficha-op-titulo">{o.nombre_oportunidad}</h3>
                        <p className="ficha-op-sub">
                          {o.contactos ? `${o.contactos.nombre} ${o.contactos.apellido ?? ''}` : '—'}
                          {o.contactos?.empresa_cliente ? ` · ${o.contactos.empresa_cliente}` : ''}
                        </p>
                        <p className="cifra mt-1">{formatoMonto(o.valor_estimado)}</p>
                        <p className="ficha-op-pie">
                          {o.responsable?.full_name || o.responsable?.email || 'Sin responsable'} · cierre {formatoFecha(o.fecha_cierre_prevista)}
                        </p>
                        <select
                          aria-label={`Mover ${o.nombre_oportunidad} a otra etapa`}
                          value={o.etapa}
                          onChange={(e) => mover(o.id, e.target.value)}
                          className="input input-chico mt-2"
                        >
                          {ETAPAS.map((e) => <option key={e.valor} value={e.valor}>{e.valor}</option>)}
                        </select>
                      </article>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}