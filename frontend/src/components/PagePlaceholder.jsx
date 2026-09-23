// Contenido temporal para páginas cuya historia de usuario aún no se implementa.
export default function PagePlaceholder({ title, hu, description, children }) {
  return (
    <section>
      <h1>{title}</h1>
      <div className="placeholder">
        <strong>{hu}</strong> — pendiente de implementar.
        <p>{description}</p>
      </div>
      {children && <div className="page-actions">{children}</div>}
    </section>
  )
}
