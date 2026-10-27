-- HU-14: eliminar un grupo vacío y cancelar sus invitaciones pendientes en una sola transacción.
-- Requiere: hu9_invitaciones_canceladas.sql (estado 'cancelada'). Se puede correr más de una vez.
-- Devuelve cuántas invitaciones pendientes se cancelaron.
create or replace function eliminar_grupo(p_group_id uuid, p_company_id uuid)
returns integer
language plpgsql
as $$
declare
  v_canceladas integer;
begin
  -- Bloquea el grupo: si alguien acepta una invitación al mismo tiempo, espera a que termine esto
  perform 1 from groups where id = p_group_id and company_id = p_company_id for update;
  if not found then
    raise exception 'GRUPO_NO_ENCONTRADO';
  end if;

  -- Regla elegida: solo se elimina si no tiene miembros
  if exists (
    select 1 from user_group_role
    where group_id = p_group_id and company_id = p_company_id
  ) then
    raise exception 'GRUPO_CON_MIEMBROS';
  end if;

  -- Protección extra para no perder datos del CRM ligados al grupo
  if exists (select 1 from contactos where group_id = p_group_id and company_id = p_company_id)
     or exists (select 1 from oportunidades where group_id = p_group_id and company_id = p_company_id) then
    raise exception 'GRUPO_CON_DATOS';
  end if;

  -- Los enlaces de las invitaciones pendientes dejan de servir
  update invitations
     set status = 'cancelada'
   where group_id = p_group_id
     and company_id = p_company_id
     and status = 'pendiente';
  get diagnostics v_canceladas = row_count;

  delete from groups where id = p_group_id and company_id = p_company_id;

  return v_canceladas;
end;
$$;

-- Solo el backend (service role) debe poder llamarla
revoke execute on function eliminar_grupo(uuid, uuid) from public, anon, authenticated;
grant execute on function eliminar_grupo(uuid, uuid) to service_role;