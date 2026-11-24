-- Pruebas de las reglas de seguridad de supabase.sql. Pegar completo en Supabase > SQL Editor y correr.
-- No deja datos: crea dos usuarios de prueba y al final deshace todo (rollback).
-- Bien: termina mostrando "PRUEBAS OK". Mal: se detiene con un error que empieza con "FALLA:".
-- Córrelo después de cada cambio al SQL.

begin;

-- Preparación (como administrador de la base): un vendedor sin aprobar (a1) y uno aprobado (a2), con un producto.
insert into numeros_aprobados values ('12345678'), ('87654321');
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'prueba-nuevo@segheria.test',
   '{"nombre_negocio":"Prueba nuevo","tipo":"Otros","whatsapp":"12345678"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'prueba-aprobado@segheria.test',
   '{"nombre_negocio":"Prueba aprobado","tipo":"Otros","whatsapp":"87654321"}');
insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000a3', true), ('00000000-0000-0000-0000-0000000000a4', true);
update profiles set aprobado = false where id = '00000000-0000-0000-0000-0000000000a1'; -- las cuentas nacen aprobadas; a1 simula una aprobación quitada
insert into productos (id, vendedor, negocio, nombre) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2',
   (select id from negocios where dueno = '00000000-0000-0000-0000-0000000000a2'), 'Producto de prueba');
-- Negocios de prueba guardados para usarlos luego sin permiso de leerlos: el de a1 (sin aprobar) y el de a2.
select set_config('prueba.neg1', (select id::text from negocios where dueno = '00000000-0000-0000-0000-0000000000a1'), true),
       set_config('prueba.neg2', (select id::text from negocios where dueno = '00000000-0000-0000-0000-0000000000a2'), true);
insert into storage.objects (bucket_id, name) values ('productos', '00000000-0000-0000-0000-0000000000a2/foto.webp');

-- 1. Un vendedor sin aprobar no publica productos ni sube fotos.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$ begin
  begin
    insert into productos (nombre, negocio) values ('No debería entrar', current_setting('prueba.neg1')::uuid);
    raise exception 'FALLA: un vendedor sin aprobar publicó un producto';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects (bucket_id, name) values ('productos', '00000000-0000-0000-0000-0000000000a1/x.webp');
    raise exception 'FALLA: un vendedor sin aprobar subió una foto';
  exception when insufficient_privilege then null; end;
  -- La regla de borrar usa la misma condición que la de ver: si no ve la foto ajena, tampoco la puede borrar.
  if exists (select 1 from storage.objects where name = '00000000-0000-0000-0000-0000000000a2/foto.webp') then
    raise exception 'FALLA: un vendedor ve los archivos de la carpeta de otro';
  end if;
end $$;

-- 2. Un vendedor aprobado publica, pero no puede tocar "creado" (para quedar siempre de primero).
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
do $$ begin
  insert into productos (nombre, negocio) values ('Publicación normal', current_setting('prueba.neg2')::uuid); -- si esto falla, el vendedor aprobado no puede publicar
  if (select tipo from productos where nombre = 'Publicación normal') is distinct from 'Otros' then
    raise exception 'FALLA: un producto sin tipo no tomó el tipo de su negocio';
  end if;
  insert into productos (nombre, tipo, negocio) values ('Con su propio tipo', 'Mascotas', current_setting('prueba.neg2')::uuid); -- si esto falla, no se puede elegir el tipo
  if not exists (select 1 from storage.objects where name = '00000000-0000-0000-0000-0000000000a2/foto.webp') then
    raise exception 'FALLA: un vendedor no ve sus propias fotos, así que no podrá borrar las viejas';
  end if;
  begin
    insert into productos (nombre, negocio) values ('En negocio ajeno', current_setting('prueba.neg1')::uuid);
    raise exception 'FALLA: un vendedor publicó en el negocio de otro';
  exception when insufficient_privilege then null; end;
  insert into negocios (nombre, tipo) values ('Segundo negocio', 'Mascotas'); -- una cuenta puede tener varios negocios
  begin
    update negocios set dueno = '00000000-0000-0000-0000-0000000000a1' where nombre = 'Segundo negocio';
    raise exception 'FALLA: un vendedor cambió el dueño de su negocio';
  exception when insufficient_privilege then null; end;
  begin
    insert into productos (nombre, creado, negocio) values ('Truco', '2099-01-01', current_setting('prueba.neg2')::uuid);
    raise exception 'FALLA: un vendedor eligió la fecha "creado" al publicar';
  exception when insufficient_privilege then null; end;
  begin
    update productos set creado = '2099-01-01' where id = '00000000-0000-0000-0000-0000000000b1';
    raise exception 'FALLA: un vendedor cambió la fecha "creado" de su producto';
  exception when insufficient_privilege then null; end;
end $$;

-- 3. Los reportes de un producto se cortan en 20; la lista de números no se lee desde el sitio; un número fuera de la lista no se registra.
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  begin
    perform * from numeros_aprobados;
    raise exception 'FALLA: el público puede leer la lista de números aprobados';
  exception when insufficient_privilege then null; end;
  for i in 1..25 loop
    insert into reportes (producto, motivo) values ('00000000-0000-0000-0000-0000000000b1', 'Reporte de prueba');
  end loop;
end $$;

-- 4. WhatsApp: sin código no se ve; con el código correcto sí; el código malo se corta a los 10 intentos.
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  begin
    perform whatsapp from profiles;
    raise exception 'FALLA: el público puede leer el WhatsApp';
  exception when insufficient_privilege then null; end;
  begin
    perform * from contactos();
    raise exception 'FALLA: el público llamó a contactos()';
  exception when insufficient_privilege then null; end;
end $$;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
do $$ begin
  if (select count(*) from contactos() where id <> '00000000-0000-0000-0000-0000000000a3') > 0 then
    raise exception 'FALLA: alguien sin código ve el contacto de otros';
  end if;
  begin
    perform codigo from acceso;
    raise exception 'FALLA: se puede leer el código de entrada';
  exception when insufficient_privilege then null; end;
  for i in 1..10 loop
    if entrar_con_codigo('codigo-malo') then raise exception 'FALLA: un código malo entró'; end if;
  end loop;
  begin
    perform entrar_con_codigo('codigo-malo');
    raise exception 'FALLA: no se cortaron los intentos';
  exception when raise_exception then
    if sqlerrm like 'FALLA%' then raise; end if;
  end;
end $$;

reset role;
select set_config('prueba.codigo', (select codigo from acceso), true); -- usa tu código real, sin cambiarlo
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}';
do $$ begin
  if not entrar_con_codigo(' ' || upper(current_setting('prueba.codigo')) || ' ') then raise exception 'FALLA: el código bueno no entró'; end if;
  if not es_condomino() then raise exception 'FALLA: quien puso el código no es condómino'; end if;
  if not exists (select 1 from contactos() where id = '00000000-0000-0000-0000-0000000000a2' and whatsapp = '87654321') then
    raise exception 'FALLA: un condómino no ve el contacto de un vendedor aprobado';
  end if;
  if exists (select 1 from contactos() where id = '00000000-0000-0000-0000-0000000000a1') then
    raise exception 'FALLA: un condómino ve el contacto de un vendedor sin aprobar';
  end if;
end $$;

reset role;
do $$ begin
  begin
    insert into auth.users (id, email, raw_user_meta_data) values
      ('00000000-0000-0000-0000-0000000000a5', 'fuera-de-lista@segheria.test', '{"nombre_negocio":"Fuera","tipo":"Otros","whatsapp":"11111111"}');
    raise exception 'FALLA: se registró un número que no está en la lista';
  exception when raise_exception then
    if sqlerrm like 'FALLA%' then raise; end if;
  end;
  if (select count(*) from reportes where producto = '00000000-0000-0000-0000-0000000000b1') <> 20 then
    raise exception 'FALLA: el límite de 20 reportes por producto no funciona';
  end if;
end $$;

rollback;
select 'PRUEBAS OK' as resultado;
