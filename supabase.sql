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

-- ---------- Versión 2: agotado, varias fotos, editar, límite, reportes ----------
alter table productos add column agotado boolean not null default false;
alter table productos add column imagenes text[] not null default '{}' check (cardinality(imagenes) <= 4);
update productos set imagenes = array[imagen] where imagen is not null;
alter table productos drop column imagen;

grant update (nombre, descripcion, precio, imagenes, agotado) on productos to authenticated;
create policy "editar lo propio" on productos for update using (vendedor = auth.uid()) with check (vendedor = auth.uid());

-- Máximo 20 productos por vendedor.
create function limite_productos() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from productos where vendedor = new.vendedor) >= 20 then
    raise exception 'Llegaste al límite de 20 productos.';
  end if;
  return new;
end $$;
create trigger limite before insert on productos for each row execute function limite_productos();

-- Reportes: cualquiera puede enviar uno; solo el administrador los lee.
create table reportes (
  id uuid primary key default gen_random_uuid(),
  producto uuid not null references productos on delete cascade,
  motivo text not null check (length(motivo) between 3 and 300),
  creado timestamptz not null default now()
);
alter table reportes enable row level security;
grant insert on reportes to anon, authenticated;
create policy "cualquiera reporta" on reportes for insert with check (true);

create function admin_reportes() returns table (id uuid, producto uuid, producto_nombre text, negocio text, whatsapp text, motivo text, creado timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not es_admin() then raise exception 'no autorizado'; end if;
  return query select r.id, r.producto, p.nombre, f.nombre_negocio, f.whatsapp, r.motivo, r.creado
    from reportes r join productos p on p.id = r.producto join profiles f on f.id = p.vendedor order by r.creado desc;
end $$;

-- borrar = true elimina el producto (y sus reportes); false solo descarta el reporte.
create function admin_resolver(rid uuid, borrar boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not es_admin() then raise exception 'no autorizado'; end if;
  if borrar then delete from productos where id = (select producto from reportes where id = rid);
  else delete from reportes where id = rid; end if;
end $$;

revoke execute on function admin_reportes(), admin_resolver(uuid, boolean) from public, anon;
grant execute on function admin_reportes(), admin_resolver(uuid, boolean) to authenticated;

-- ---------- Versión 3: seguridad (si ya corriste lo anterior, pega y corre solo desde aquí) ----------
-- Fotos: solo imágenes webp de hasta 2 MB, y solo vendedores aprobados pueden subir (el sitio ya reduce cada foto a webp).
update storage.buckets set file_size_limit = 2097152, allowed_mime_types = '{image/webp}' where id = 'productos';
drop policy "subir foto a tu carpeta" on storage.objects;
create policy "subir foto a tu carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles where id = auth.uid() and aprobado));

-- Productos: el vendedor solo escribe las columnas del formulario. Así no puede poner "creado" en el futuro
-- para quedar siempre de primero. Quitar el permiso de tabla también quita los de columna, por eso se vuelven a dar.
revoke insert, update on productos from authenticated;
grant insert (nombre, descripcion, precio, imagenes, agotado) on productos to authenticated;
grant update (nombre, descripcion, precio, imagenes, agotado) on productos to authenticated;

-- Reportes: máximo 20 por producto. Los de más se descartan sin error, para que nadie llene el panel de administración.
create function limite_reportes() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from reportes where producto = new.producto) >= 20 then return null; end if;
  return new;
end $$;
create trigger limite_r before insert on reportes for each row execute function limite_reportes();

-- ---------- Versión 4: borrar fotos viejas (si ya corriste lo anterior, pega y corre solo desde aquí) ----------
-- Al cambiar las fotos de un producto o borrarlo, el sitio borra los archivos viejos del vendedor.
-- Borrar desde la API de Storage pide permiso de ver y de borrar, y cada quien solo toca su propia carpeta.
create policy "ver tus fotos" on storage.objects for select to authenticated
  using (bucket_id = 'productos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "borrar tus fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'productos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Versión 5: tipo por producto (si ya corriste lo anterior, pega y corre solo desde aquí) ----------
-- Un negocio de "Comida y postres" puede vender también algo de "Hogar y decoración".
-- El tipo del perfil queda como el principal del negocio y es el valor por defecto de cada producto.
alter table productos add column tipo text;
update productos p set tipo = f.tipo from profiles f where f.id = p.vendedor;

-- Si llega un producto sin tipo (por ejemplo, desde una versión vieja del sitio guardada en el navegador), toma el del negocio.
create function tipo_por_defecto() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.tipo is null then new.tipo := (select tipo from profiles where id = new.vendedor); end if;
  return new;
end $$;
create trigger tipo_defecto before insert on productos for each row execute function tipo_por_defecto();
alter table productos alter column tipo set not null;

grant insert (tipo), update (tipo) on productos to authenticated;

-- ---------- Versión 6: fotos JPEG desde iPhone (si ya corriste lo anterior, pega y corre solo desde aquí) ----------
-- Safari no sabe crear webp, así que desde el iPhone las fotos se suben en JPEG (también reducidas a 900px).
update storage.buckets set allowed_mime_types = '{image/webp,image/jpeg}' where id = 'productos';
