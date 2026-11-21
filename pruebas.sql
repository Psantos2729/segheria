-- Pruebas de las reglas de seguridad de supabase.sql. Pegar completo en Supabase > SQL Editor y correr.
-- No deja datos: crea dos usuarios de prueba y al final deshace todo (rollback).
-- Bien: termina mostrando "PRUEBAS OK". Mal: se detiene con un error que empieza con "FALLA:".
-- Córrelo después de cada cambio al SQL.

begin;

-- Preparación (como administrador de la base): un vendedor nuevo (a1) y uno aprobado (a2), con un producto.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'prueba-nuevo@segheria.test',
   '{"nombre_negocio":"Prueba nuevo","tipo":"Otros","torre":"1","apto":"101","whatsapp":"12345678"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'prueba-aprobado@segheria.test',
   '{"nombre_negocio":"Prueba aprobado","tipo":"Otros","torre":"2","apto":"202","whatsapp":"87654321"}');
insert into auth.users (id, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000a3', true), ('00000000-0000-0000-0000-0000000000a4', true);
update profiles set aprobado = true where id = '00000000-0000-0000-0000-0000000000a2';
insert into productos (id, vendedor, nombre) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'Producto de prueba');
insert into storage.objects (bucket_id, name) values ('productos', '00000000-0000-0000-0000-0000000000a2/foto.webp');

-- 1. Un vendedor sin aprobar no publica productos ni sube fotos.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$ begin
  begin
    insert into productos (nombre) values ('No debería entrar');
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
  insert into productos (nombre) values ('Publicación normal'); -- si esto falla, el vendedor aprobado no puede publicar
  if (select tipo from productos where nombre = 'Publicación normal') is distinct from 'Otros' then
    raise exception 'FALLA: un producto sin tipo no tomó el tipo de su negocio';
  end if;
  insert into productos (nombre, tipo) values ('Con su propio tipo', 'Mascotas'); -- si esto falla, no se puede elegir el tipo
  if not exists (select 1 from storage.objects where name = '00000000-0000-0000-0000-0000000000a2/foto.webp') then
    raise exception 'FALLA: un vendedor no ve sus propias fotos, así que no podrá borrar las viejas';
  end if;
  begin
    insert into productos (nombre, creado) values ('Truco', '2099-01-01');
    raise exception 'FALLA: un vendedor eligió la fecha "creado" al publicar';
  exception when insufficient_privilege then null; end;
  begin
    update productos set creado = '2099-01-01' where id = '00000000-0000-0000-0000-0000000000b1';
    raise exception 'FALLA: un vendedor cambió la fecha "creado" de su producto';
  exception when insufficient_privilege then null; end;
end $$;

-- 3. El público no ve el apartamento, y los reportes de un producto se cortan en 20.
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  begin
    perform apto from profiles;
    raise exception 'FALLA: el público puede leer el apartamento';
  exception when insufficient_privilege then null; end;
  for i in 1..25 loop
    insert into reportes (producto, motivo) values ('00000000-0000-0000-0000-0000000000b1', 'Reporte de prueba');
  end loop;
end $$;

-- 4. Torre y WhatsApp: sin código no se ven; con el código correcto sí; el código malo se corta a los 10 intentos.
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  begin
    perform torre from profiles;
    raise exception 'FALLA: el público puede leer la torre';
  exception when insufficient_privilege then null; end;
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
  if (select count(*) from reportes where producto = '00000000-0000-0000-0000-0000000000b1') <> 20 then
    raise exception 'FALLA: el límite de 20 reportes por producto no funciona';
  end if;
end $$;

rollback;
select 'PRUEBAS OK' as resultado;
