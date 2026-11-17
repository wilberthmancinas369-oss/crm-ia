export function Cargando({ children }) {
  return <p role="status" className="texto-suave estado-cargando">{children}</p>;
}

export function ErrorCarga({ children, onReintentar, onCerrar }) {
  return (
    <div className="alerta alerta-error entrada-crm">
      <p role="alert">{children}</p>
      {(onReintentar || onCerrar) && <div className="mt-2 flex flex-wrap gap-2">
        {onReintentar && <button type="button" className="btn btn-sm" onClick={onReintentar}>Reintentar</button>}
        {onCerrar && <button type="button" className="btn btn-outline btn-sm" onClick={onCerrar}>Cerrar</button>}
      </div>}
    </div>
  );
}
