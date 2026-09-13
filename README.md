# DieselP2P

> **Conectamos el combustible con quienes producen Bolivia.**
>
> Menos intermediación. Más transparencia. Mejor distribución.

**MVP DEMO — DATOS SIMULADOS.** Todos los nombres, coordenadas, precios, volúmenes y operaciones de este proyecto son ficticios y existen solo para demostrar el concepto y la tecnología.

---

## 1. El problema

El problema que DieselP2P ataca no es únicamente "no hay diésel". Es que **la oferta y la demanda están fragmentadas** y existe poca visibilidad sobre:

- dónde está disponible el combustible,
- quién lo necesita,
- qué combinación de ofertas resulta más eficiente,
- cuál es el costo logístico real.

El diésel es un insumo transversal a la agricultura, la cosecha, el procesamiento, el transporte y la distribución. Cada ineficiencia de asignación termina trasladándose al precio de los alimentos.

## 2. La solución

Un **mercado inteligente de combustible productivo** que conecta oferta y demanda mediante un motor de matching.

El diferenciador central: **una demanda no tiene por qué ser cubierta por un solo proveedor.**

```
Demanda      10.000 L
Oferta A      7.000 L
Oferta B      3.000 L
MATCH        10.000 L   ·   Score 94/100
```

El motor también resuelve combinaciones de tres o más ofertas (5.000 + 3.000 + 2.000) y coberturas parciales, optimizando **costo total** (combustible + logística), no solo precio por litro.

## 3. Arquitectura

```
                    ┌──────────────────────┐
                    │        REACT         │
                    │  TypeScript · Vite   │
                    └──────────┬───────────┘
                               │
                    ┌──────────┴───────────┐
                    ▼                      ▼
             ┌─────────────┐       ┌─────────────┐
             │  SUPABASE   │       │   NODE.JS   │
             │ PostgreSQL  │       │   EXPRESS   │
             │ Auth · RLS  │       │  Matching   │
             │ Storage     │       │  Anomalías  │
             │             │       │  Impacto    │
             └─────────────┘       └──────┬──────┘
                                          ▼
                                  ┌────────────────┐
                                  │ OpenStreetMap  │
                                  │    Leaflet     │
                                  └────────────────┘
```

La lógica de negocio vive en el backend Node.js (motor de matching, costos, anomalías, impacto). Supabase aporta PostgreSQL, autenticación y RLS. El frontend no contiene lógica de negocio duplicada.

**Modo demo sin credenciales:** si no configuras Supabase, la API levanta con un *store en memoria* precargado con el seed. La demo completa funciona sin base de datos externa.

### Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, React Router, TanStack Query, Recharts, Lucide, qrcode.react, Sonner |
| Mapas | OpenStreetMap + Leaflet + React Leaflet (sin Google Maps) |
| Backend | Node.js, TypeScript, Express 5, Zod |
| Datos | Supabase (PostgreSQL, Auth, RLS) o store en memoria |

## 4. Estructura

```
dieselp2p/
├── backend/
│   └── src/
│       ├── controllers/      # rutas HTTP por dominio
│       ├── services/
│       │   ├── matchingEngine.ts   # combinación multi-proveedor + score
│       │   ├── costEngine.ts       # costo total y ahorro estimado
│       │   ├── anomalyEngine.ts    # patrones de riesgo simulados
│       │   ├── impactEngine.ts     # métricas de dashboard e impacto
│       │   ├── operationsService.ts# confirmación, transporte, trazabilidad
│       │   └── queryService.ts     # vistas enriquecidas
│       ├── data/             # store (memoria/Supabase) + seed
│       ├── middleware/       # auth por rol, manejo de errores
│       └── server.ts
├── frontend/
│   └── src/
│       ├── components/       # ui/, map/, domain/
│       ├── pages/            # public/, producer/, supplier/, carrier/, admin/, shared/
│       ├── hooks/            # useAuth, queries (TanStack)
│       ├── lib/              # api, supabase, format
│       └── types/
└── supabase/
    ├── migrations/0001_schema.sql
    └── seed.sql              # generado desde el seed del backend
```

## 5. Instalación y ejecución

Requisitos: Node.js 20+ y npm.

```bash
git clone <tu-repo> dieselp2p
cd dieselp2p
npm run install:all
```

Copia las variables de entorno:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Levanta todo con un solo comando:

```bash
npm run dev          # API en :4000 y app en :5173
npm run dev:host     # igual, pero accesible desde la red local
```

El script instala las dependencias si faltan, espera a que la API responda antes de abrir el frontend, libera los puertos si quedó una instancia previa y muestra las URLs listas para usar. **Ctrl+C detiene ambos procesos** sin dejar nada suelto.

Si prefieres controlarlos por separado, en dos terminales:

```bash
npm run dev:backend     # http://localhost:4000/api
npm run dev:frontend    # http://localhost:5173
```

### Si algo se queda colgado

```bash
npm run stop    # mata cualquier proceso de DieselP2P que haya quedado vivo
npm run dev     # y vuelve a levantar todo
```

Nada reinicia los servidores automáticamente: son procesos de desarrollo atados a la terminal donde los lanzaste. Si cierras esa terminal, se detienen. Para dejarlos corriendo de forma independiente usa `nohup npm run dev > dieselp2p.log 2>&1 &` y detén con `npm run stop`.

Abre **http://localhost:5173** y entra con cualquiera de los cuatro roles demo. No hace falta configurar Supabase para la demostración.

### Abrir la demo desde otro dispositivo

Para probar en un celular o mostrarla desde el portátil de un compañero en la misma red:

```bash
npm run dev:frontend:host    # expone Vite en la red local
```

Vite imprime una línea **Network** con la dirección a usar, por ejemplo `http://10.10.174.135:5173/`. El backend acepta automáticamente orígenes de la red local; si quieres restringirlo, pon `ALLOW_LAN_ORIGINS=false` y añade el origen exacto a `CORS_ORIGINS`.

El reenvío de puertos de VS Code no funciona con la compilación de código abierto (Code - OSS), porque el servicio de túneles es un componente propietario que esa compilación no incluye. Usa `--host` en la red local, o un túnel público como `cloudflared tunnel --url http://localhost:5173` si necesitas compartirla fuera de tu red.

### Comandos útiles

```bash
npm run build        # build de backend y frontend
npm run typecheck    # TypeScript estricto en ambos proyectos
npm run test:flow    # verifica el flujo end-to-end contra la API
npm run seed:sql     # regenera supabase/seed.sql desde el seed del backend
```

## 6. Configurar Supabase (opcional)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta `supabase/migrations/0001_schema.sql` (tablas, índices y políticas RLS).
3. Ejecuta `supabase/seed.sql` para cargar los datos simulados.
4. Completa las variables:

```bash
# backend/.env
SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>   # SOLO en el backend

# frontend/.env
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>              # clave pública
```

5. Reinicia el backend. El arranque imprime `Store: supabase`.

La *service role key* nunca debe llegar al frontend. El navegador solo usa la *anon key*, limitada por RLS.

## 7. Variables de entorno

**backend/.env**

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | `4000` | Puerto de la API |
| `SUPABASE_URL` | — | URL del proyecto. Vacío ⇒ store en memoria |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Clave privada, solo backend |
| `DEMO_MODE` | `true` | Habilita el login demo por rol |
| `FORCE_MEMORY_STORE` | `false` | Fuerza el store en memoria |
| `CORS_ORIGINS` | `http://localhost:5173,…` | Orígenes permitidos |
| `ALLOW_LAN_ORIGINS` | `true` | Acepta orígenes de la red local (`vite --host`). Ponlo en `false` en producción |
| `COST_PER_KM` | `12` | Costo logístico ficticio por km |
| `BASE_TRIP_COST` | `150` | Costo fijo ficticio por viaje |
| `REFERENCE_PRICE_PER_LITER` | `4.15` | Precio de referencia ficticio (base del ahorro) |
| `TRUCK_CAPACITY_LITERS` | `10000` | Capacidad típica de cisterna |
| `MAX_RADIUS_KM` | `350` | Radio máximo de búsqueda |
| `MAX_SUPPLIERS_PER_MATCH` | `4` | Máximo de ofertas combinadas |

**frontend/.env**

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL de Supabase. Vacío ⇒ solo login demo |
| `VITE_SUPABASE_ANON_KEY` | Clave pública de Supabase |
| `VITE_API_URL` | URL del backend. Vacío en desarrollo (proxy de Vite) |

## 8. Usuarios demo

El login demo genera un token efímero asociado a un perfil ficticio. **No hay contraseñas.**

| Rol | Cuenta ficticia | Organización |
|---|---|---|
| Productor | `demo.producer@dieselp2p.demo` | Asociación Agrícola Santa Cruz |
| Proveedor | `demo.supplier@dieselp2p.demo` | Combustibles del Norte SRL |
| Transportista | `demo.carrier@dieselp2p.demo` | Logística Oriente |
| Administrador | `demo.admin@dieselp2p.demo` | DieselP2P |

## 9. Flujo de demo (7 pasos)

1. **Productor** → entra como *Asociación Agrícola Santa Cruz* y abre **Nueva demanda**.
2. Publica **10.000 L**, Santa Cruz, actividad Agricultura, fecha requerida `2026-09-20`.
3. El motor muestra la secuencia de búsqueda y devuelve **7.000 L + 3.000 L = 10.000 L**, score **94/100**, con desglose de costos y ahorro estimado.
4. El **mapa** dibuja las dos rutas proveedor → productor.
5. Confirma el match, se crea la operación y asigna a **Logística Oriente**.
6. La operación **D2P-2026-0000XX** muestra el **QR de trazabilidad**. El transportista actualiza el estado a *En tránsito* y *Entregada* desde su panel; para no cambiar de usuario durante la presentación, usa **Simular siguiente paso** (ver abajo).
7. **Administrador** → el dashboard refleja el incremento en litros conectados, operaciones y ahorro estimado; **Impacto** muestra la cadena hasta la canasta familiar.

### Simular siguiente paso

Cada paso logístico lo ejecuta un actor distinto: el transportista inicia el tránsito y confirma la entrega. Si presentas la demo con un solo usuario, la operación parecería quedarse detenida en *Transporte asignado*.

El detalle de cada operación incluye un panel que indica **qué falta, quién lo haría en una operación real** y un botón **Simular siguiente paso** que lo ejecuta:

```
Creada → (asigna transportista) → Transporte asignado
       → (inicia tránsito)      → En tránsito
       → (confirma entrega)     → Entregada   ·   la demanda queda COMPLETED
```

Está disponible para el productor, el transportista y el administrador, y solo funciona con `DEMO_MODE=true`. Si no asignaste transportista manualmente, el primer paso elige automáticamente el más cercano con capacidad suficiente.

Casos preparados en el seed:

- **Caso principal:** 10.000 L → 7.000 + 3.000.
- **Caso alternativo:** *Agro Cotoca*, 10.000 L → 5.000 + 3.000 + 2.000.
- **Caso de anomalía:** *Distribuidora Oriente Alimentos* solicita 20.000 L frente a un histórico de ~1.500 L (risk score 82) y publica 3 solicitudes en pocas horas.

> Si repites el flujo varias veces, las ofertas del seed se van consumiendo. Entra como administrador y usa **Reiniciar datos demo** (o reinicia el backend) para restaurar el caso 7.000 + 3.000.

## 10. Motor de matching

`backend/src/services/matchingEngine.ts`

1. **Candidatas:** filtra ofertas activas, de proveedores verificados, disponibles antes de la fecha requerida y dentro del radio máximo. Calcula distancia por carretera aproximada (haversine × 1,18) y un costo unitario efectivo.
2. **Combinatoria acotada:** explora subconjuntos de hasta `MAX_SUPPLIERS_PER_MATCH` ofertas sobre las mejores candidatas, descartando combinaciones con ofertas redundantes.
3. **Asignación:** dentro de cada subconjunto reparte litros de la oferta más barata a la más cara hasta cubrir la demanda.
4. **Selección:** ordena por cobertura, luego costo total, luego score. Devuelve la mejor propuesta y hasta tres alternativas.

### Score (0 a 100)

| Componente | Peso | Criterio |
|---|---|---|
| Disponibilidad | 35 | Porcentaje del volumen cubierto a tiempo |
| Distancia | 25 | Promedio ponderado por litros (25 pts hasta 20 km, 0 a 250 km) |
| Precio | 20 | Precio promedio vs. precio objetivo |
| Volumen | 10 | Penaliza la fragmentación en muchas ofertas |
| Tiempo | 10 | Distancia máxima y holgura de fechas |

Cada match incluye una explicación en lenguaje natural de por qué se recomienda esa combinación.

### Costo y ahorro

```
Costo total = costo del combustible + costo logístico
costo logístico = BASE_TRIP_COST + distancia_km × COST_PER_KM
```

El **ahorro estimado** compara ese costo total contra un escenario de referencia no optimizado (precio de referencia por litro y un proveedor promedio sin información de cercanía). Siempre se etiqueta como *estimado* porque los datos son ficticios.

## 11. Detección de anomalías

`backend/src/services/anomalyEngine.ts` evalúa patrones sobre los datos simulados:

| Tipo | Regla |
|---|---|
| `UNUSUAL_VOLUME` | Solicitud ≥ 3× el promedio histórico y ≥ 5.000 L |
| `FREQUENT_REQUESTS` | 3 o más solicitudes en 6 horas |
| `MULTIPLE_LOCATIONS` | Demandas en 3+ puntos separados por más de 100 km en 7 días |
| `RAPID_RESALE_PATTERN` | 3 operaciones en 72 h con volumen acumulado > 2× el patrón histórico |

Cada evento tiene un **risk score** de 0 a 100 y estados `OPEN`, `REVIEWED`, `DISMISSED`. El administrador revisa y resuelve. No existe funcionalidad para ocultar o facilitar reventa.

## 12. API

Todas las rutas cuelgan de `/api`. La autenticación usa `Authorization: Bearer <token>`.

| Método | Ruta | Rol |
|---|---|---|
| `GET` | `/health`, `/config` | público |
| `POST` | `/auth/demo-login`, `/auth/logout` | público |
| `GET` `PATCH` | `/profile` | autenticado |
| `GET` `POST` | `/demands` | productor, proveedor (compatibles), admin |
| `GET` `PATCH` | `/demands/:id` | según rol |
| `GET` `POST` | `/offers` | proveedor, admin |
| `GET` `PATCH` | `/offers/:id` | proveedor, admin |
| `POST` | `/matching/find` | productor, admin |
| `GET` | `/matches`, `/matches/:id` | autenticado |
| `POST` | `/matches/:id/confirm` | productor, admin |
| `GET` `POST` | `/transport`, `/carriers` | según rol |
| `PATCH` | `/transport/:id/status` | transportista, admin |
| `GET` | `/operations`, `/operations/:id` | según rol |
| `GET` | `/operations/verify/:token` | público (QR) |
| `POST` | `/operations/:id/simulate-next` | productor, transportista, admin (solo demo) |
| `PATCH` | `/operations/:id` | admin |
| `GET` `PATCH` | `/anomalies`, `/anomalies/:id` | admin |
| `POST` | `/anomalies/scan` | admin |
| `GET` | `/analytics/dashboard`, `/analytics/impact`, `/analytics/me` | autenticado |
| `GET` `PATCH` | `/users`, `/users/:id` | admin |
| `GET` | `/map` | autenticado |
| `POST` | `/demo/reset` | admin |

## 13. Modelo de datos

`profiles`, `producer_profiles`, `supplier_profiles`, `carrier_profiles`, `demands`, `offers`, `matches`, **`match_items`**, `transport_orders`, `operations`, `anomaly_events`.

`match_items` es la tabla que hace posible el matching multi-proveedor: un `match` agrupa varias filas, cada una con su oferta, litros asignados, distancia, costo de transporte y subtotal.

## 14. Seguridad

- Validación de todas las entradas con Zod.
- Autenticación por token y autorización por rol en cada ruta.
- CORS restringido por lista de orígenes.
- Secretos solo en variables de entorno; la *service role key* nunca sale del backend.
- Row Level Security activa en todas las tablas de Supabase.
- Manejo centralizado de errores, sin filtrar trazas en producción.

## 15. Deployment

**Frontend (Vercel o Netlify)**

```bash
# Build command
npm run build
# Output directory
dist
```
Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (URL pública del backend). Configura el *rewrite* de SPA a `index.html`.

**Backend (Render, Railway o equivalente)**

```bash
# Build
npm install && npm run build
# Start
npm start
```
Variables: las de `backend/.env.example`. Añade el dominio del frontend a `CORS_ORIGINS`.

**Base de datos:** Supabase, con `0001_schema.sql` y `seed.sql` ya ejecutados.

## 16. Alcance y límites

DieselP2P es una **simulación tecnológica de operaciones legalmente autorizadas**. El MVP deliberadamente **no** implementa:

- compra real de combustible ni pagos o integración bancaria,
- integración con sistemas gubernamentales reales,
- scraping de estaciones de servicio ni automatización de adquisición,
- ningún mecanismo para evadir controles o facilitar comercialización irregular.

La propuesta no es resolver por sí sola la crisis nacional de combustible, sino **reducir ineficiencias de información, asignación y logística mediante tecnología**, dejando la arquitectura preparada para integraciones futuras con proveedores autorizados.

```
OFERTA + DEMANDA → MATCHING → LOGÍSTICA → TRAZABILIDAD → EFICIENCIA → CADENA ALIMENTARIA
```
