import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useOportunidades } from '../hooks/useOportunidades'
import { ETAPAS, formatoFecha, formatoMonto } from '../constants/crm'

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

  const abiertas = oportunidades.filter((o) => o.etapa !== 'Ganada' && o.etapa !== 'Perdida')
  const totalAbierto = abiertas.reduce((suma, o) => suma + Number(o.valor_estimado || 0), 0)

  return (
    <div className="p-6 space-y-6">
      <div className="border-b pb-4 border-gray-200 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pipeline de ventas</h1>
          <p className="text-sm text-gray-500">
            {abiertas.length} {abiertas.length === 1 ? 'oportunidad abierta' : 'oportunidades abiertas'} por {formatoMonto(totalAbierto)}.
            Arrastra una tarjeta para cambiarla de etapa.
          </p>
        </div>
        <Link to="/app/oportunidades" className="btn btn-secondary">Ver lista y crear</Link>
      </div>

      {error && <p role="alert" className="p-3 rounded-md text-sm bg-red-100 text-red-800">{error}</p>}

      {cargando ? (
        <p className="text-gray-500">Cargando pipeline…</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3 xl:grid-cols-5 items-start">
          {ETAPAS.map((etapa) => {
            const tarjetas = oportunidades.filter((o) => o.etapa === etapa.valor)
            const total = tarjetas.reduce((suma, o) => suma + Number(o.valor_estimado || 0), 0)
            return (
              <section
                key={etapa.valor}
                aria-label={`Etapa ${etapa.valor}`}
                onDragOver={(e) => { e.preventDefault(); setColumnaDestino(etapa.valor) }}
                onDragLeave={() => setColumnaDestino((actual) => (actual === etapa.valor ? null : actual))}
                onDrop={soltar(etapa.valor)}
                className={`rounded-lg p-3 min-h-40 border-2 transition ${etapa.columna} ${
                  columnaDestino === etapa.valor ? 'border-blue-400' : 'border-transparent'
                }`}
              >
                <header className="mb-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-800">{etapa.valor}</h2>
                    <span className="text-xs font-semibold text-gray-500">{tarjetas.length}</span>
                  </div>
                  <p className="text-xs text-gray-600">{formatoMonto(total)}</p>
                </header>

                <div className="space-y-2">
                  {tarjetas.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Sin oportunidades</p>}
                  {tarjetas.map((o) => (
                    <article
                      key={o.id}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', o.id); setArrastrando(o.id) }}
                      onDragEnd={() => { setArrastrando(null); setColumnaDestino(null) }}
                      className={`bg-white rounded-md border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing space-y-1 ${
                        arrastrando === o.id ? 'opacity-50' : ''
                      }`}
                    >
                      <h3 className="text-sm font-semibold text-gray-800">{o.nombre_oportunidad}</h3>
                      <p className="text-xs text-gray-500">
                        {o.contactos ? `${o.contactos.nombre} ${o.contactos.apellido ?? ''}` : '—'}
                        {o.contactos?.empresa_cliente ? ` · ${o.contactos.empresa_cliente}` : ''}
                      </p>
                      <p className="text-sm font-bold text-emerald-700">{formatoMonto(o.valor_estimado)}</p>
                      <p className="text-[11px] text-gray-500">
                        {o.responsable?.full_name || o.responsable?.email || 'Sin responsable'} · cierre {formatoFecha(o.fecha_cierre_prevista)}
                      </p>
                      <select
                        aria-label={`Mover ${o.nombre_oportunidad} a otra etapa`}
                        value={o.etapa}
                        onChange={(e) => mover(o.id, e.target.value)}
                        className="mt-1 w-full border border-gray-200 rounded text-xs p-1 bg-gray-50"
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
      )}
    </div>
  )
}
