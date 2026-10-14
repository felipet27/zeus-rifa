# Especificación — App de gestión de Rifa (00–99)

> Documento base para el desarrollo. Las decisiones tomadas por defecto (no confirmadas explícitamente) están marcadas con **[Decisión]** para que se puedan ajustar.

---

## 1. Resumen

**Causa:** la rifa se hace para pagar la operación de **Zeus**, el perro de la foto. Lo que quede después de pagar el premio se destina a su operación.

Aplicación web privada para administrar una rifa de **100 boletas (00 a 99)**. Solo dos personas pueden ingresar. A medida que las boletas se comprometen, se va descubriendo por partes una imagen (la foto de un perro), y esa imagen se puede **descargar como PNG** para compartirla por redes o WhatsApp mostrando qué números siguen disponibles.

### Datos de la rifa

| Campo | Valor |
|---|---|
| Cantidad de boletas | 100 (00–99), un número por boleta |
| Valor de la boleta | $20.000 COP |
| Premio | $800.000 COP |
| Fecha del sorteo | Viernes 30 de octubre de 2026 |
| Mecánica | Dos últimas cifras de la **Lotería de Medellín** |
| Responsable | Felipe Tangarife — 317 378 0801 |
| Recaudo máximo posible | $2.000.000 COP |

---

## 2. Stack

| Capa | Tecnología |
|---|---|
| Frontend + backend | **Next.js 15** (App Router) + **TypeScript** |
| Estilos | **Tailwind CSS** (diseño mobile-first) |
| Base de datos | **Supabase** (PostgreSQL) |
| Autenticación | **Supabase Auth**: Google OAuth + correo/contraseña |
| Tiempo real | **Supabase Realtime** sobre la tabla `boletas` |
| Cliente Supabase | `@supabase/ssr` + `@supabase/supabase-js` |
| Generación de imagen | **Canvas API** nativa del navegador (sin librerías) |
| Despliegue | **Vercel** (plan Hobby) |

Por qué este stack:
- Vercel aloja Next.js de forma nativa.
- Supabase resuelve la autenticación y la base de datos, y permite aplicar la restricción de acceso **en la base de datos** (RLS), no solo en la interfaz.
- Con Realtime, si un usuario compromete una boleta, el otro ve el cambio al instante. Esto evita vender el mismo número dos veces.

---

## 3. Autenticación y acceso

### 3.1 Usuarios permitidos

Solo estos correos pueden usar la aplicación:

- `felipet27@gmail.com`
- `profejohana109@gmail.com`

Ambos tienen **exactamente los mismos permisos**.

### 3.2 Métodos de inicio de sesión

1. **Google** (OAuth).
2. **Correo y contraseña**. Las cuentas se crean manualmente desde el panel de Supabase. **No hay registro público.**

### 3.3 Defensa en capas

El login con Google permite que *cualquier* cuenta de Google se autentique, así que la restricción se aplica en varios niveles:

1. **Tabla `usuarios_permitidos`** con los dos correos (lista blanca).
2. **RLS en todas las tablas**: solo se permite leer o escribir si el correo del JWT está en la lista blanca. Esta es la barrera real.
3. **Auth Hook "Before User Created"** en Supabase: rechaza la creación de cualquier usuario cuyo correo no esté en la lista. *(Verificar la firma actual del hook en la documentación de Supabase al implementarlo.)*
4. **Middleware de Next.js**: si hay sesión pero el correo no está permitido, cierra la sesión y redirige a `/login?error=no-autorizado`.
5. En el panel de Supabase: **desactivar "Allow new users to sign up"** para correo/contraseña.

### 3.4 Flujo

- `/login`: botón "Continuar con Google" y formulario de correo/contraseña.
- `/auth/callback`: intercambia el código OAuth por la sesión.
- Toda ruta distinta de `/login` y `/auth/*` requiere sesión válida y correo permitido.
- Botón "Cerrar sesión" en la barra de navegación.

---

## 4. Modelo de datos

### 4.1 Estados de una boleta

```
LIBRE ──comprometer──▶ COMPROMETIDA (pagada = false)  "Debe"
                          │      ▲
                 marcar   │      │ marcar
                 pagada   ▼      │ no pagada
                      COMPROMETIDA (pagada = true)   "Pagada"

COMPROMETIDA ──liberar──▶ LIBRE   (se borran comprador, celular, notas y pago)
```

- Pago binario: **pagada** o **debe**. No hay abonos parciales.
- Una boleta comprometida **se puede liberar**, siempre pidiendo confirmación.

### 4.2 Script SQL (ejecutar en el SQL Editor de Supabase)

```sql
-- =========================================================
-- 1. Lista blanca de usuarios
-- =========================================================
create table public.usuarios_permitidos (
  email text primary key
);

insert into public.usuarios_permitidos (email) values
  ('felipet27@gmail.com'),
  ('profejohana109@gmail.com');

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
  -- Coherencia: si está libre, no tiene datos de comprador
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
-- No hay INSERT ni DELETE desde el cliente: las 100 filas son fijas.
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
security invoker   -- respeta RLS
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
```

> Las ediciones de nombre, celular, notas y pago se hacen con un `update` normal desde el cliente (RLS lo protege). Comprometer y liberar **siempre** pasan por las funciones RPC.

---

## 5. Módulos

La navegación es una barra inferior en celular y una barra superior en escritorio, con 3 pestañas más un acceso de búsqueda:

**Libres** · **Comprometidas** · **Tablero** · 🔍 **Buscar**

El ícono de búsqueda está siempre visible en la barra (ver 5.4).

### 5.1 Módulo 1 — Boletas libres (`/libres`)

- Cuadrícula de los números libres, siempre con dos dígitos (`00`, `07`, `42`…).
- Contador arriba: "**N boletas libres**".
- Buscador rápido por número.
- Al tocar un número se abre un **modal "Comprometer boleta XX"** con:
  - **Nombre** (obligatorio).
  - **Celular** (obligatorio). Se valida como celular colombiano: 10 dígitos que empiezan por 3. Se aceptan espacios o guiones y se guarda solo con dígitos.
  - **Notas** (opcional, texto libre).
  - **¿Ya pagó?** Interruptor, por defecto *No* (= Debe).
  - Botones: *Cancelar* / *Comprometer*.
- Si la RPC falla porque la boleta ya no está libre, se muestra el aviso "*Esta boleta acaba de ser tomada*" y la lista se refresca.
- **[Decisión]** Al comprometer, se muestra un toast de confirmación y el número desaparece de la lista.

### 5.2 Módulo 2 — Boletas comprometidas (`/comprometidas`)

#### Totales (parte superior)

| Indicador | Cálculo |
|---|---|
| Vendidas | boletas comprometidas / 100 |
| Pagadas | conteo y valor (`pagadas × $20.000`) |
| Por cobrar (Debe) | conteo y valor (`debe × $20.000`) |
| Recaudado | `pagadas × $20.000` |
| Libres | `100 − comprometidas` |
| **Para la operación de Zeus** | `recaudado − $800.000`. Si es negativo, muestra "Faltan $X para cubrir el premio"; si es positivo, muestra "$X para la operación de Zeus" con un ícono ❤️ |
| Potencial para Zeus | `$2.000.000 − $800.000 = $1.200.000` si se venden todas |

- Barra de progreso: boletas vendidas sobre 100.
- Formato de moneda: `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`.

#### Lista

- Filtros con chips: **Todas** · **Pagadas** · **Debe**.
- Buscador por número, nombre o celular.
- **[Decisión]** Orden por número ascendente.
- Cada fila muestra el número, el nombre, el celular (en formato `317 378 0801`), una etiqueta de estado (**Pagada** en verde, **Debe** en ámbar) y un ícono si tiene notas.
- Acciones por boleta:
  - **Cambiar estado de pago** con un toque (Pagada ↔ Debe).
  - **Editar** nombre, celular y notas.
  - **Liberar**, con diálogo de confirmación: "*¿Liberar la boleta XX de [Nombre]? Se borrarán sus datos.*"

### 5.3 Módulo 3 — Tablero 00–99 (`/tablero`)

#### Vista en la app

- Cuadrícula de **10 × 10** superpuesta sobre la foto del perro.
- **Mapeo en orden**: el número `n` ocupa la fila `floor(n / 10)` y la columna `n % 10`.
  - `00` queda arriba a la izquierda, `09` arriba a la derecha y `99` abajo a la derecha.
- **Casilla comprometida** (pagada o debe): muestra el pedazo correspondiente de la foto.
- **Casilla libre**: fondo gris claro o blanco con el número grande y centrado.
- **[Decisión]** Solo dentro de la app, cada casilla comprometida lleva una marca pequeña en la esquina (punto verde si está pagada, ámbar si debe) para identificarla rápido. Esa marca **no** aparece en la imagen descargable.
- Al tocar una casilla:
  - Si está libre, abre el mismo modal de "Comprometer".
  - Si está comprometida, muestra un resumen con nombre y estado, y botones para *Editar*, *Cambiar pago* y *Liberar*.
- Se actualiza en tiempo real.
- **Regla de sincronía:** el tablero **no guarda estado propio**. Cada casilla se pinta exclusivamente a partir del campo `estado` de su boleta:
  - Si una boleta comprometida se **libera** (desde cualquier módulo: Comprometidas, Buscar o el propio Tablero), su casilla vuelve inmediatamente a gris con su número, tanto en la app como en la próxima imagen descargada.
  - Si se compromete de nuevo, vuelve a mostrar su pedazo del perro.
  - Cambiar entre Pagada y Debe **no** afecta la foto, solo la marca de color de la app.

#### Recorte de la imagen

- La foto es **vertical** (relación aprox. 1336 × 2576 px, ≈ 0,52). **[Decisión]** Se conserva la proporción original para no cortar ni la cabeza ni las patas del perro, así que las casillas son rectángulos verticales, no cuadrados.
- Cada casilla toma de la foto la región `(col × anchoFoto/10, fila × altoFoto/10, anchoFoto/10, altoFoto/10)`.
- En la vista web se puede hacer con un `div` por casilla usando `background-image`, `background-size: 1000% 1000%` y `background-position` calculado. En la descarga se hace con `drawImage` en Canvas.
- La foto se guarda en `public/perro.jpg`. **[Decisión]** Se optimiza a ~1080 px de ancho y calidad 85.

#### Imagen descargable (botón "Descargar imagen")

Se genera en el navegador con **Canvas API** y se descarga como `rifa-AAAA-MM-DD-HHmm.png`.

Composición (ancho 1080 px, fondo blanco):

```
┌────────────────────────────────────┐
│         ⚡ RIFA POR ZEUS ⚡          │  ← encabezado
│   Ayúdanos a pagar su operación     │
│          Premio $800.000            │
│   Boleta $20.000 · Juega viernes    │
│   30 de octubre · Lotería de Medellín│
│        (dos últimas cifras)          │
├────────────────────────────────────┤
│                                    │
│   Cuadrícula 10×10:                │
│   - comprometida → pedazo del perro│
│   - libre → gris claro + número    │
│                                    │
├────────────────────────────────────┤
│  Quedan N números disponibles       │
│  Responsable: Felipe Tangarife      │
│  Celular / WhatsApp: 317 378 0801   │  ← pie
└────────────────────────────────────┘
```

- Líneas de cuadrícula finas y blancas entre casillas para que se vea el "rompecabezas".
- Números de las casillas libres en negrita, gris oscuro y de tamaño legible en celular.
- Título "RIFA POR ZEUS" y subtítulo con la causa. Ambos se cambian desde la configuración.
- Colores según la sección 6.1: encabezado sobre Carbón Zeus con el título en Rayo dorado y el subtítulo en Buganvilla.
- En móviles con soporte, se usa `navigator.share` con el archivo para compartirlo directo a WhatsApp. Si no hay soporte, se descarga normal.
- La imagen **no incluye** nombres ni celulares de compradores.

### 5.4 Buscar (`/buscar`)

Búsqueda global sobre las **100 boletas**, sin importar su estado. Sirve para resolver rápido preguntas como "¿qué número tiene Juan?", "¿el 47 está libre?" o "¿quién debe todavía?".

#### Campo de búsqueda

- Un solo campo, con foco automático al abrir la página, y búsqueda instantánea mientras se escribe (debounce de ~200 ms, filtrado en memoria porque son solo 100 registros).
- Detección automática del tipo de búsqueda:
  - **Solo dígitos, 1 o 2 caracteres** (`7`, `07`, `47`): busca por **número exacto** (`7` y `07` encuentran la boleta 07).
  - **Solo dígitos, 3 o más caracteres**: busca por **celular** (coincidencia parcial).
  - **Texto**: busca por **nombre** y **notas**. La búsqueda es parcial, ignora mayúsculas y **tildes** (`jose` encuentra "José", `peña` encuentra "Pena"). Para esto se normaliza con `normalize('NFD').replace(/\p{Diacritic}/gu, '')`.
- Si la persona tiene varias boletas, aparecen todas, con el total de boletas y el valor que debe en conjunto (ej. "Juan Pérez — 3 boletas · debe $40.000").

#### Filtros (chips combinables con la búsqueda)

- **Estado:** Todas · Libres · Comprometidas · Pagadas · Debe.
- **Orden:** Número ↑ · Nombre A–Z · Más recientes (por `comprometida_en`).
- **[Decisión]** Los filtros activos se reflejan en la URL (`/buscar?q=juan&estado=debe`) para que funcionen el botón "atrás" y la recarga de la página.
- Botón "Limpiar filtros".

#### Resultados

- Cada tarjeta muestra el número, el estado (Libre / Pagada / Debe) y, si está comprometida, el nombre, el celular y las notas.
- Acciones directas desde el resultado, iguales a las de los otros módulos:
  - Libre → *Comprometer*.
  - Comprometida → *Cambiar pago* · *Editar* · *Liberar* (con confirmación).
- Cualquier acción aquí se refleja al instante en Libres, Comprometidas, Tablero y totales, porque todo sale del mismo `useBoletas`.
- Sin resultados: mensaje "*No hay boletas que coincidan*" con un botón para limpiar la búsqueda.

#### Implementación

- `src/app/(app)/buscar/page.tsx`
- `src/lib/busqueda.ts`: funciones puras `normalizar(texto)`, `detectarTipo(query)` y `filtrarBoletas(boletas, query, filtros)`, con pruebas unitarias.
- **[Decisión]** Las acciones de boleta (comprometer, editar, cambiar pago, liberar) se extraen a un componente `AccionesBoleta.tsx` para reutilizarlo en Comprometidas, Tablero y Buscar.

---

## 6. Configuración centralizada

`src/config/rifa.ts`

```ts
export const RIFA = {
  titulo: 'RIFA POR ZEUS',
  causa: 'Ayúdanos a pagar su operación',
  nombrePerro: 'Zeus',
  valorBoleta: 20_000,
  premio: 800_000,
  totalBoletas: 100,
  fechaSorteo: '2026-10-30',
  fechaSorteoTexto: 'viernes 30 de octubre',
  loteria: 'Lotería de Medellín',
  mecanica: 'dos últimas cifras',
  responsable: 'Felipe Tangarife',
  celularResponsable: '3173780801',
  imagen: '/perro.jpg',
} as const;
```

Ningún valor de la rifa debe quedar escrito directamente en los componentes.

### 6.1 Identidad visual

Los colores salen de la foto de Zeus (pelaje negro, plantas del jardín, buganvillas fucsia) y de su nombre: Zeus es el dios del rayo.

| Token | Hex | Uso |
|---|---|---|
| `zeus` (Carbón Zeus) | `#1F1F23` | Textos principales, barra de navegación, encabezado de la imagen |
| `rayo` (Rayo dorado) | `#F4B400` | Botón principal, barra de progreso, ícono ⚡, pestaña activa |
| `buganvilla` | `#C2185B` | Acento emocional: mensaje de la causa, indicador "Para la operación de Zeus" |
| `fondo` (Crema) | `#FAF8F3` | Fondo general de la app |
| `superficie` | `#FFFFFF` | Tarjetas, modales |
| `libre` | `#E7E5E0` | Casillas libres del tablero |
| `libre-texto` | `#5F5F5F` | Número en casillas libres |
| `pagada` | `#2E8B57` | Etiqueta y marca "Pagada" |
| `debe` | `#E8590C` | Etiqueta y marca "Debe" (naranja, distinto del dorado para no confundirse) |
| `peligro` | `#C62828` | Botón "Liberar", errores |
| `borde` | `#E2DED6` | Bordes y divisores |

Reglas:
- Los botones dorados llevan texto **Carbón Zeus**, no blanco, para cumplir contraste AA.
- Las etiquetas de estado usan fondo suave (el color al 12 % de opacidad) y texto en el color pleno.
- Tipografía: **Inter** (Google Fonts). Números del tablero en peso 700 con `font-variant-numeric: tabular-nums`.
- **[Decisión]** Solo modo claro, para que se vea igual en ambos celulares y coincida con la imagen descargable.
- Los tokens se definen en `tailwind.config.ts` (`theme.extend.colors`) y se reutilizan en `generarImagen.ts`, para que la app y el PNG usen exactamente los mismos colores.

---

## 7. Estructura del proyecto

```
rifa-app/
├── public/
│   └── perro.jpg
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # redirige a /tablero
│   │   ├── login/page.tsx
│   │   ├── auth/callback/route.ts
│   │   └── (app)/
│   │       ├── layout.tsx           # navegación + guard
│   │       ├── libres/page.tsx
│   │       ├── comprometidas/page.tsx
│   │       ├── tablero/page.tsx
│   │       └── buscar/page.tsx
│   ├── components/
│   │   ├── ComprometerModal.tsx
│   │   ├── EditarBoletaModal.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── Totales.tsx
│   │   ├── TableroGrid.tsx
│   │   ├── AccionesBoleta.tsx
│   │   └── Navbar.tsx
│   ├── hooks/
│   │   └── useBoletas.ts            # carga inicial + suscripción Realtime
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── generarImagen.ts         # Canvas → PNG
│   │   ├── busqueda.ts              # normalizar, detectar tipo, filtrar
│   │   ├── formato.ts               # COP, número 2 dígitos, celular
│   │   └── validaciones.ts
│   ├── config/rifa.ts
│   └── types/boleta.ts
├── supabase/
│   └── schema.sql                   # script de la sección 4.2
├── middleware.ts
├── .env.local.example
└── README.md
```

### Tipo principal

```ts
export type Boleta = {
  numero: number;              // 0–99
  estado: 'libre' | 'comprometida';
  pagada: boolean;
  nombre: string | null;
  celular: string | null;
  notas: string | null;
  comprometida_en: string | null;
  actualizado_por: string | null;
  actualizado_en: string;
};
```

### Hook de datos (`useBoletas`)

- Carga las 100 boletas una sola vez.
- Se suscribe a `postgres_changes` (evento `UPDATE`) sobre `public.boletas` y reemplaza la boleta afectada en el estado local.
- Los tres módulos consumen la misma fuente, así que todo queda sincronizado.

---

## 8. Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

No se usa la `service_role` key en el frontend.

---

## 9. Configuración y despliegue

### Supabase
1. Crear el proyecto (región sugerida: `us-east-1`, la más cercana a Colombia disponible).
2. Ejecutar `supabase/schema.sql`.
3. **Authentication → Providers → Google**: activar y pegar el Client ID y el Secret de Google Cloud Console.
4. **Authentication → Providers → Email**: activar y **desactivar el registro público**.
5. Crear manualmente los dos usuarios de correo/contraseña (Authentication → Users → Add user).
6. Configurar el **Before User Created hook** con la lista blanca.
7. **URL Configuration**: Site URL = dominio de Vercel. En Redirect URLs agregar `https://<dominio>/auth/callback` y `http://localhost:3000/auth/callback`.

### Google Cloud Console
1. Crear las credenciales OAuth (aplicación web).
2. URI de redirección autorizada: `https://<proyecto>.supabase.co/auth/v1/callback`.

### Vercel
1. Importar el repositorio de GitHub.
2. Configurar las dos variables de entorno.
3. Desplegar.

---

## 10. Requisitos no funcionales

- **Mobile-first**: se usará principalmente desde el celular. Los botones deben medir al menos 44 px de alto.
- Idioma: español (Colombia). Fechas en formato `es-CO`, zona horaria `America/Bogota`.
- Todo número de boleta se muestra **siempre con dos dígitos**.
- Estados de carga y de error visibles. Toasts para confirmar acciones.
- Toda acción destructiva (liberar) pide confirmación.
- Sin datos de compradores en la imagen descargable.

---

## 11. Criterios de aceptación

- [ ] Solo `felipet27@gmail.com` y `profejohana109@gmail.com` pueden entrar, tanto con Google como con correo y contraseña.
- [ ] Una cuenta de Google ajena queda bloqueada y no puede leer datos, ni siquiera llamando a la API directamente.
- [ ] Al comprometer una boleta, desaparece de *Libres*, aparece en *Comprometidas* y su casilla del tablero muestra el pedazo del perro.
- [ ] Si los dos usuarios intentan comprometer el mismo número al mismo tiempo, solo uno lo logra y el otro ve un aviso claro.
- [ ] Los cambios de un usuario se ven en la pantalla del otro sin recargar.
- [ ] Cambiar entre Pagada y Debe actualiza los totales al instante.
- [ ] Al liberar una boleta desde cualquier módulo, se borran sus datos, vuelve a *Libres* y su casilla del tablero (y de la imagen descargable) muestra otra vez el número en gris.
- [ ] En *Buscar*, escribir `7` o `07` muestra la boleta 07, y escribir `jose` encuentra a "José".
- [ ] En *Buscar*, los filtros de estado se combinan con el texto (ej. "juan" + "Debe").
- [ ] Una persona con varias boletas aparece con todas sus boletas y el total que debe.
- [ ] La imagen descargada incluye encabezado, cuadrícula (perro parcial + números libres) y pie con el responsable.
- [ ] Con las 100 boletas comprometidas, la imagen muestra al perro completo.
- [ ] Los totales cuadran: `pagadas + debe + libres = 100`.

---

## 12. Fuera de alcance

- Pagos en línea.
- Abonos parciales.
- Mensajes o recordatorios por WhatsApp.
- Registro del ganador después del sorteo.
- Vista pública sin login.
- Exportar a Excel.

---

## 13. Plan sugerido (el sorteo es el 30 de octubre)

| Fase | Entregable |
|---|---|
| 1 | Supabase (schema, auth, hook) + Next.js con login y middleware |
| 2 | `useBoletas` + módulo Libres + modal Comprometer |
| 3 | Módulo Comprometidas + totales + Buscar |
| 4 | Tablero con la imagen + descarga PNG |
| 5 | Despliegue en Vercel + pruebas con los dos usuarios en celular |
