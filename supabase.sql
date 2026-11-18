-- Pegar completo en Supabase > SQL Editor. Crea tablas, seguridad (RLS) y bucket de fotos.
-- Después: Authentication > Providers > Email activo. Para aprobar a un vendedor: Table Editor > profiles > aprobado = true.

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  nombre_negocio text not null check (length(nombre_negocio) between 2 and 60),
  tipo text not null,
  torre int not null check (torre between 1 and 6),
  apto text not null check (length(apto) between 1 and 6),
  whatsapp text not null check (whatsapp ~ '^[0-9]{8}$'),
  aprobado boolean not null default false
);

create table productos (
  id uuid primary key default gen_random_uuid(),
  vendedor uuid not null default auth.uid() references profiles on delete cascade,
  nombre text not null check (length(nombre) between 2 and 80),
  descripcion text check (length(descripcion) <= 500),
  precio numeric check (precio >= 0),
  imagen text,
  creado timestamptz not null default now()
);

-- El perfil se crea solo al registrarse, con los datos que manda el formulario. Siempre nace sin aprobar.
create function nuevo_perfil() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, nombre_negocio, tipo, torre, apto, whatsapp)
  values (new.id, new.raw_user_meta_data->>'nombre_negocio', new.raw_user_meta_data->>'tipo',
          (new.raw_user_meta_data->>'torre')::int, new.raw_user_meta_data->>'apto', new.raw_user_meta_data->>'whatsapp');
  return new;
end $$;
create trigger al_registrar after insert on auth.users for each row execute function nuevo_perfil();

alter table profiles enable row level security;
alter table productos enable row level security;

-- El apartamento nunca se muestra al público: solo se concede lectura de las demás columnas.
revoke select on profiles from anon, authenticated;
grant select (id, nombre_negocio, tipo, torre, whatsapp, aprobado) on profiles to anon, authenticated;

create policy "ver perfiles aprobados o el propio" on profiles for select using (aprobado or id = auth.uid());

create policy "ver productos de vendedores aprobados o propios" on productos for select
  using (vendedor = auth.uid() or exists (select 1 from profiles p where p.id = vendedor and p.aprobado));
create policy "publicar solo aprobado" on productos for insert
  with check (vendedor = auth.uid() and exists (select 1 from profiles p where p.id = auth.uid() and p.aprobado));
create policy "borrar lo propio" on productos for delete using (vendedor = auth.uid());

insert into storage.buckets (id, name, public) values ('productos', 'productos', true);
create policy "subir foto a tu carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Permisos de tabla (los proyectos nuevos de Supabase ya no los dan solos). RLS sigue decidiendo qué filas se ven.
grant select on productos to anon, authenticated;
grant insert, delete on productos to authenticated;

-- ---------- Administración (vista #/admin) ----------
-- Tabla de administradores: nadie la puede leer ni escribir desde el sitio, solo las funciones de abajo.
create table admins (id uuid primary key references auth.users on delete cascade);
alter table admins enable row level security;

create function es_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from admins where id = auth.uid()) $$;

create function admin_perfiles() returns table (id uuid, email text, nombre_negocio text, tipo text, torre int, apto text, whatsapp text, aprobado boolean)
language plpgsql security definer set search_path = public as $$
begin
  if not es_admin() then raise exception 'no autorizado'; end if;
  return query select p.id, u.email::text, p.nombre_negocio, p.tipo, p.torre, p.apto, p.whatsapp, p.aprobado
    from profiles p join auth.users u on u.id = p.id order by p.aprobado, p.nombre_negocio;
end $$;

create function admin_aprobar(uid uuid, valor boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not es_admin() then raise exception 'no autorizado'; end if;
  update profiles set aprobado = valor where id = uid;
end $$;

revoke execute on function es_admin(), admin_perfiles(), admin_aprobar(uuid, boolean) from public, anon;
grant execute on function es_admin(), admin_perfiles(), admin_aprobar(uuid, boolean) to authenticated;

-- Hazte administrador: cambia el correo por el tuyo y corre solo esta línea.
-- insert into admins select id from auth.users where email = 'TU_CORREO@gmail.com';
