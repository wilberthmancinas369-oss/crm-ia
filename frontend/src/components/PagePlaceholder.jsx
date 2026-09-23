// Contenido temporal para páginas cuya historia de usuario aún no se implementa.
export default function PagePlaceholder({ title, hu, description, children }) {
  return (
    <section>
      <h1 className=" ">{title}</h1>
      <div className="placeholder">
        <strong>{hu}</strong> — pendiente de implementar.
        {/*podemos usar clases para agregar propiedades de css sin usar archivos aparte*/}
        <p className=" text-red-400">{description}</p>
      </div>
      {children && <div className="page-actions">{children}</div>}
    </section>
  )
}
