-- =========================================================
-- 1. Lista blanca de usuarios
-- =========================================================
create table public.usuarios_permitidos (
  email text primary key
);

insert into public.usuarios_permitidos (email) values
  ('felipet27@gmail.com'),
  ('profejohana109@gmail.com'),
  ('johanak109@gmail.com');

alter table public.usuarios_permitidos enable row level security;
-- Sin políticas: nadie la lee ni la modifica desde el cliente.

create or replace function public.es_usuario_permitido()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios_permitidos
    where email = lower(auth.jwt() ->> 'email')
  );
$$;

-- =========================================================
-- 2. Boletas
-- =========================================================
create table public.boletas (
  numero          smallint primary key check (numero between 0 and 99),
  estado          text not null default 'libre'
                    check (estado in ('libre', 'comprometida')),
  pagada          boolean not null default false,
  nombre          text,
  celular         text,
  notas           text,
  comprometida_en timestamptz,
  actualizado_por text,
  actualizado_en  timestamptz not null default now(),
  constraint boleta_coherente check (
    (estado = 'libre' and nombre is null and celular is null
       and notas is null and pagada = false and comprometida_en is null)
    or
    (estado = 'comprometida' and nombre is not null and celular is not null)
  )
);

-- Sembrar las 100 boletas
insert into public.boletas (numero)
select generate_series(0, 99);

-- Auditoría mínima automática
create or replace function public.tg_boletas_auditoria()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en  := now();
  new.actualizado_por := lower(auth.jwt() ->> 'email');
  return new;
end;
$$;

create trigger boletas_auditoria
before update on public.boletas
for each row execute function public.tg_boletas_auditoria();

-- RLS: solo lectura y actualización para usuarios permitidos.
alter table public.boletas enable row level security;

create policy "leer boletas" on public.boletas
  for select using (public.es_usuario_permitido());

create policy "actualizar boletas" on public.boletas
  for update using (public.es_usuario_permitido())
  with check (public.es_usuario_permitido());

-- =========================================================
-- 3. Operaciones atómicas (evitan doble venta)
-- =========================================================
create or replace function public.comprometer_boleta(
  p_numero  smallint,
  p_nombre  text,
  p_celular text,
  p_notas   text,
  p_pagada  boolean
)
returns public.boletas
language plpgsql
security invoker
as $$
declare
  v_boleta public.boletas;
begin
  update public.boletas
     set estado          = 'comprometida',
         nombre          = trim(p_nombre),
         celular         = regexp_replace(p_celular, '\D', '', 'g'),
         notas           = nullif(trim(p_notas), ''),
         pagada          = coalesce(p_pagada, false),
         comprometida_en = now()
   where numero = p_numero
     and estado = 'libre'
  returning * into v_boleta;

  if not found then
    raise exception 'La boleta % ya no está libre', lpad(p_numero::text, 2, '0');
  end if;

  return v_boleta;
end;
$$;

create or replace function public.liberar_boleta(p_numero smallint)
returns public.boletas
language plpgsql
security invoker
as $$
declare
  v_boleta public.boletas;
begin
  update public.boletas
     set estado = 'libre', pagada = false,
         nombre = null, celular = null, notas = null,
         comprometida_en = null
   where numero = p_numero
     and estado = 'comprometida'
  returning * into v_boleta;

  if not found then
    raise exception 'La boleta % no está comprometida', lpad(p_numero::text, 2, '0');
  end if;

  return v_boleta;
end;
$$;

-- =========================================================
-- 4. Realtime
-- =========================================================
alter publication supabase_realtime add table public.boletas;
