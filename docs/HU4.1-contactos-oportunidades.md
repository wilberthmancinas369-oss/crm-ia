# HU 4.1 · Refinar contactos y oportunidades

## Conceptos

- **Contacto:** una persona con la que la empresa hace o quiere hacer negocios (un cliente o prospecto).
  Guarda quién es, dónde trabaja, cómo localizarla y todo lo que se ha hablado con ella.
- **Oportunidad:** una posible venta concreta con un contacto ("50 licencias para ACME, $80,000").
  Tiene un monto, una fecha estimada de cierre, una etapa y un responsable.
- **Interacción:** cada llamada, correo, reunión o nota con un contacto. Es el historial del contacto;
  puede ligarse además a una oportunidad.
- **Pipeline:** las oportunidades acomodadas por etapa, de izquierda a derecha. Muestra cuánto dinero
  hay en cada etapa y dónde se atoran las ventas.

## Modelo

### Contactos (`contactos`)
| Campo | Nota |
|---|---|
| nombre*, apellido, email, teléfono | |
| `cargo` | Se muestra como **Puesto** |
| `empresa_cliente` | Empresa donde trabaja el contacto |
| `redes_sociales` | JSONB `{ linkedin, facebook, instagram, x, sitio_web }`, URLs completas |
| `group_id` | Grupo dueño (HU-11) |
| Historial | `interacciones` del contacto, más recientes primero, en la ficha del contacto |

Un contacto con oportunidades **no se puede borrar** (409); primero se borran sus oportunidades.

### Oportunidades (`oportunidades`)
| Campo | Nota |
|---|---|
| `nombre_oportunidad`* | |
| `contacto_id`* | **Obligatorio**. La oportunidad toma el grupo del contacto |
| `valor_estimado` | Se muestra como **Monto**; no negativo |
| `fecha_cierre_prevista` | Fecha estimada de cierre |
| `etapa` | Primer contacto → Propuesta → Negociación → Ganada / Perdida |
| `responsable_id` | Quien da seguimiento. Por defecto, quien la crea |
| `probabilidad` | 0–100 % |

### Colaboradores (`oportunidad_colaboradores`)
Otros usuarios que ayudan con una oportunidad además del responsable.

## Reglas

- **Cada empresa solo ve lo suyo** (company_id) y, dentro de ella, Agentes y Jefes solo ven su grupo (HU-11).
- **Responsable:** un Agente crea oportunidades a su nombre. Asignar o reasignar a otra persona requiere el
  permiso `asignarResponsable` (Jefe de Área en su grupo, o Administrador). El responsable debe ser miembro
  del grupo o administrador.
- **Colaboradores:** los agrega o quita el responsable o el Jefe/Admin del grupo; deben ser del grupo.
  Un colaborador puede salirse por su cuenta.
- **Etapa:** cualquiera con acceso a la oportunidad puede moverla de etapa (desde la lista o el pipeline).

## Endpoints nuevos o cambiados

| Endpoint | Cambio |
|---|---|
| `POST /api/oportunidades` | `contacto_id` obligatorio; valida etapa, monto, fecha y responsable |
| `PUT /api/oportunidades/:id` | Cambiar responsable requiere `asignarResponsable` |
| `GET/POST /api/oportunidades/:id/colaboradores`, `DELETE .../:userId` | Nuevos |
| `GET /api/grupos/:id/asignables` | Nuevo: posibles responsables/colaboradores del grupo |
| `POST/PUT /api/contactos` | Acepta `redes_sociales` |
| `GET /api/contactos/:id` | Incluye oportunidades e historial de interacciones ordenado |
| `DELETE /api/contactos/:id` | 409 si el contacto tiene oportunidades |

Migración: `backend/db/migrations/hu4_1_refinar_contactos_oportunidades.sql`.
