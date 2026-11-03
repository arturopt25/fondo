# Despliegue gratuito

Esta guía describe el despliegue personal de Fondo con costo cero usando:

- Vercel Hobby para `apps/web`.
- Render Free para `apps/api` con Docker.
- Neon Free para PostgreSQL.
- Cloudflare R2 para avatares y adjuntos.
- GitHub Actions para CI y migraciones.

Los límites y condiciones de los planes gratuitos pueden cambiar. Confirma los
límites actuales en los paneles de cada proveedor antes de usar este entorno
como producción crítica.

## Archivos de despliegue

- `render.yaml`: Blueprint del servicio Docker de Render.
- `vercel.json`: configuración de Vercel para el monorepo con Root Directory en
  la raíz.
- `.github/workflows/migrate.yml`: migraciones posteriores a un CI exitoso en
  `main`.
- `apps/api/Dockerfile`: imagen de producción de la API.

El paquete real del frontend es `@fondo/web`, definido en
`apps/web/package.json`.

## Primer despliegue

1. Crear Neon, R2 y los secretos de GitHub descritos abajo.
2. Ejecutar las migraciones contra Neon. Para el primer despliegue se puede
   usar `workflow_dispatch` en `Deploy migrations`, después de configurar el
   environment `production` y `NEON_DIRECT_URL`.
3. Crear el Blueprint de Render desde `render.yaml`, completar las variables
   marcadas con `sync: false` y comprobar
   `https://<servicio>.onrender.com/api/v1/health`.
4. Crear el proyecto de Vercel importando el repositorio con **Root Directory**
   igual a la raíz del monorepo. Configurar las variables `VITE_API_URL` y
   `VITE_AUTH_URL` y desplegar el frontend.
5. Actualizar `WEB_ORIGIN` en Render con la URL exacta de Vercel, sin `/` final,
   y redesplegar la API. Si se usan previews, añadir cada origen exacto
   separado por comas.
6. Ejecutar el checklist post-deploy.

Las migraciones se ejecutan antes de que Render termine de desplegar la nueva
imagen. Por eso cada migración debe ser compatible hacia atrás: primero añadir
campos o estructuras compatibles, desplegar la aplicación que los usa y solo
después eliminar lo antiguo en otra migración.

## Neon

1. Crear un proyecto y una base de datos en Neon Free.
2. Identificar el nombre real de la base de datos y el rol propietario que Neon
   muestra en la conexión directa. Ese rol se reserva para migraciones y
   administración; no debe usarse como usuario de runtime porque puede tener
   `BYPASSRLS`.
3. Crear el rol de runtime **por SQL**, antes de ejecutar las migraciones. No
   crees `fondo_app` con la CLI ni con la consola de Neon: esos canales pueden
   asignarle `BYPASSRLS`, lo que desactiva el aislamiento RLS. La migración
   `20261022000000_rls_app_role` también crea este rol de forma condicional con
   `DO $$ ... IF NOT EXISTS`; si el rol ya existe, no cambia su contraseña.
   Ejecuta el siguiente bloque en el SQL Editor como propietario de la base:

   ```sql
   DO $$
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fondo_app') THEN
       CREATE ROLE fondo_app
         WITH LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD '<generated-password>';
     END IF;
   END
   $$;

   DO $$
   BEGIN
     EXECUTE format('GRANT CONNECT ON DATABASE %I TO fondo_app', current_database());
   END
   $$;
   GRANT USAGE ON SCHEMA public TO fondo_app;
   ```

   Sustituye `<generated-password>` por una contraseña aleatoria antes de
   ejecutar el bloque. Nunca guardes esa contraseña en el repositorio.
4. Si la migración creó el rol con su password provisional, rótalo
   inmediatamente después de ejecutar las migraciones:

   ```sql
   ALTER ROLE fondo_app WITH PASSWORD '<new-generated-password>';
   ```

   La contraseña `change-me` de la migración nunca debe quedar en producción.
5. Ejecutar la consulta de verificación:

   ```sql
   SELECT rolname, rolsuper, rolbypassrls
   FROM pg_roles
   WHERE rolname IN ('fondo_app', current_user);
   ```

   Para `fondo_app`, el resultado esperado es `rolsuper = f` y
   `rolbypassrls = f`. Si `current_user` es el rol propietario, debe usarse
   solamente para migraciones, no en `APP_DATABASE_URL`.
6. Copiar la **URL directa** de Neon para `NEON_DIRECT_URL`. Debe usar el rol
   propietario, apuntar a la conexión directa (sin `-pooler`) y terminar con
   `sslmode=require`.
7. Copiar la **URL pooler** usando el usuario `fondo_app` para
   `DATABASE_URL` y `APP_DATABASE_URL` en Render, también con
   `sslmode=require`. El pooler reduce el riesgo de agotar conexiones desde el
   servicio gratuito.
8. No guardar ninguna de estas URLs en el repositorio.

La URL directa se usa únicamente para `prisma migrate deploy` en GitHub Actions.
La aplicación en Render usa `APP_DATABASE_URL` para Prisma en runtime. El código
también exige `DATABASE_URL` porque Prisma y Better Auth lo validan al iniciar;
en Render ambas variables deben estar configuradas y deben usar el usuario
`fondo_app` a través del pooler. Para un entorno simple, pueden tener el mismo
valor.

### Verificar RLS

`FORCE ROW LEVEL SECURITY` no tiene efecto si la tabla no tiene RLS habilitado.
La migración `20261103120000_enable_rls_policies` habilita RLS en las tablas que
ya tienen políticas. Si la base se creó antes de esa migración, aplica las
migraciones con el workflow normal (`Deploy migrations`) o con
`pnpm --filter @fondo/db db:deploy` usando la URL directa del propietario.

Después, ejecuta en el SQL Editor:

```sql
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity, count(p.policyname) AS policies
FROM pg_class c
LEFT JOIN pg_policies p ON p.tablename = c.relname AND p.schemaname = 'public'
WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
GROUP BY 1, 2, 3
ORDER BY 1;
```

Resultado esperado: todas las tablas con al menos una política deben mostrar
`relrowsecurity = true`. `ServiceDefinition`, `ServiceCapabilityDefinition`,
`UserSettings`, `_prisma_migrations` y las tablas de Better Auth no tienen
políticas y pueden permanecer con `relrowsecurity = false`.

Si la migración no se aplica por el workflow, el equivalente manual es:

```sql
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Budget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinancialAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ledger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServiceCapabilitySelection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServiceSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TransactionEntry" ENABLE ROW LEVEL SECURITY;
```

Antes de habilitar RLS, confirma que `fondo_app` sigue con
`rolbypassrls = false`. Si el rol tiene `BYPASSRLS`, RLS no aislará nada.

## Cloudflare R2

1. Crear un bucket privado, por ejemplo `fondo-prod-files`.
2. Crear un token de API R2 con permisos **Object Read & Write** solamente sobre
   ese bucket.
3. Copiar el endpoint S3 del formato
   `https://<account-id>.r2.cloudflarestorage.com`.
4. Configurar en Render:
   - `AWS_ENDPOINT_URL`: endpoint S3 de R2.
   - `AWS_REGION`: `auto`.
   - `AWS_ACCESS_KEY_ID`: Access Key ID del token.
   - `AWS_SECRET_ACCESS_KEY`: Secret Access Key del token.
   - `S3_BUCKET_NAME`: nombre del bucket.
   - `S3_FORCE_PATH_STYLE`: `true`.
5. Mantener el bucket privado. La API genera URLs presignadas para descargar
   avatares y adjuntos.

Los uploads actuales pasan por la API, no directamente del navegador a R2, por
lo que no necesitan CORS de R2. Si en el futuro se implementan uploads directos
con URLs presignadas, agregar una política CORS al bucket con:

- Allowed origins: la URL exacta de Vercel, sin `/` final.
- Allowed methods: `PUT`, `GET`, `HEAD`.
- Allowed headers: `Content-Type`, `Content-Length`.

## Render

1. Confirmar que `render.yaml` apunta al repositorio
   `https://github.com/arturopt25/fondo`.
2. Crear el Blueprint desde el repositorio.
3. Confirmar el servicio `fondo-api` con:
   - Runtime: Docker.
   - Plan: `free`.
   - Branch: `main`.
   - Auto deploy: `checksPass`, para esperar los checks de GitHub antes de
     desplegar.
   - Health check: `/api/v1/health`.
4. Completar las variables `sync: false`.
5. No crear un servicio Postgres de Render. La base de datos es Neon.

Render inyecta `PORT` para el web service. La API escucha
`process.env.PORT` en `0.0.0.0`; la imagen expone el puerto coherente con el
valor habitual de Render (`10000`).

El plan Free puede suspender el servicio después de aproximadamente 15 minutos
sin tráfico y el primer request posterior puede tardar cerca de un minuto.
Como alternativa opcional, se puede configurar un monitor externo gratuito como
UptimeRobot apuntando a `/api/v1/health`. No se incluye un workflow de
keep-alive de GitHub Actions porque los jobs se redondean a minutos y podrían
superar el límite mensual de repositorios privados.

## Vercel

Crear el proyecto con **Root Directory** en la raíz del monorepo. La
configuración queda así:

- Package manager: pnpm, detectado desde `packageManager` en el `package.json`.
- Build command: `pnpm --filter @fondo/web build`.
- Output directory: `apps/web/dist`.
- Package construido: `@fondo/web`.
- `VITE_API_URL`: `https://<servicio>.onrender.com/api/v1`.
- `VITE_AUTH_URL`: `https://<servicio>.onrender.com/api/v1/auth` (el frontend sí
  incluye el `basePath` de Better Auth).

Las variables `VITE_*` se incorporan durante el build del frontend. Cambiarlas
requiere un nuevo deploy/build en Vercel; no basta con reiniciar el navegador.

`vercel.json` contiene el rewrite de todas las rutas a `/index.html`, necesario
para React Router, y el header `X-Frame-Options: DENY`.

Si se cambia Root Directory a `apps/web`, el comando sería normalmente
`pnpm build`, el output sería `dist` y `vercel.json` tendría que moverse a ese
directorio o replicarse allí. El plan implementado asume la raíz del monorepo.

## GitHub Actions y migraciones

1. En GitHub crear un environment llamado `production`.
2. Dentro de ese environment, crear el secret `NEON_DIRECT_URL`.
3. Guardar una URL directa de Neon con `sslmode=require`.
4. El workflow `Deploy migrations` se ejecuta cuando el workflow llamado `CI`
   termina exitosamente sobre `main`. También se puede ejecutar manualmente
   con `workflow_dispatch`.
5. El workflow lee la versión de pnpm desde `packageManager` en el
   `package.json` y usa Node.js 24, igual que `ci.yml`.

El workflow no contiene credenciales ni modifica `ci.yml`.

## Cookies y CORS

La API ya usa los orígenes exactos de `WEB_ORIGIN` para CORS con
`credentials: true`, y Better Auth los utiliza como `trustedOrigins`. Los
wildcards no están permitidos; se pueden indicar varios orígenes separados por
comas, por ejemplo:

```text
https://fondo-web.vercel.app,https://fondo-web-git-main-example.vercel.app
```

Mientras frontend y API estén en dominios distintos de Vercel y Render,
configurar `COOKIE_CROSS_SITE=true`. Esto habilita cookies `SameSite=None` y
`Secure`.

Safari y otros navegadores pueden bloquear cookies de terceros incluso con
`Secure`, dependiendo de sus políticas de privacidad. La solución robusta es
usar un dominio propio con subdominios, por ejemplo:

- `app.example.com` en Vercel.
- `api.example.com` en Render.

Cuando se migre a esos subdominios se puede configurar
`COOKIE_CROSS_SITE=false` para volver a `SameSite=Lax`, sin cambiar el código.

`BETTER_AUTH_URL` debe ser el origen público de la API, sin el sufijo
`/api/v1/auth`, porque el código agrega `basePath: /api/v1/auth`.
Por ejemplo, en Render debe ser `https://fondo-api.onrender.com`. En cambio,
`VITE_AUTH_URL` sí debe ser `https://fondo-api.onrender.com/api/v1/auth`.

## Variables de entorno

Generar el secreto de Better Auth con:

```bash
openssl rand -base64 32
```

| Variable | Plataforma | Valor o generación |
|---|---|---|
| `DATABASE_URL` | Render | URL pooler de Neon usando el rol `fondo_app`, con `sslmode=require`. |
| `APP_DATABASE_URL` | Render | URL pooler de Neon usando el rol `fondo_app`, con `sslmode=require`; puede ser igual a `DATABASE_URL`. |
| `NEON_DIRECT_URL` | GitHub environment `production` | URL directa de Neon usando el rol propietario, con `sslmode=require`; solo para migraciones. |
| `BETTER_AUTH_SECRET` | Render | Salida de `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | Render | Origen de Render, por ejemplo `https://fondo-api.onrender.com`. |
| `WEB_ORIGIN` | Render | URL exacta de Vercel, sin `/` final; varios orígenes separados por coma. |
| `COOKIE_CROSS_SITE` | Render | `true` para Vercel + Render; `false` con subdominios propios. |
| `AWS_ENDPOINT_URL` | Render | `https://<account-id>.r2.cloudflarestorage.com`. |
| `AWS_REGION` | Render | `auto`. |
| `AWS_ACCESS_KEY_ID` | Render | Access Key ID del token R2. |
| `AWS_SECRET_ACCESS_KEY` | Render | Secret Access Key del token R2. |
| `S3_BUCKET_NAME` | Render | Nombre del bucket R2. |
| `S3_FORCE_PATH_STYLE` | Render | `true`. |
| `S3_PRESIGN_EXPIRY_SECONDS` | Render | `300`. |
| `S3_MAX_FILE_SIZE_BYTES` | Render | `5242880`. |
| `S3_AVATAR_MAX_FILE_SIZE_BYTES` | Render | `2097152`. |
| `VITE_API_URL` | Vercel | `https://<servicio>.onrender.com/api/v1`. |
| `VITE_AUTH_URL` | Vercel | `https://<servicio>.onrender.com/api/v1/auth`; incluye el `basePath` del backend. |

No poner credenciales, contraseñas ni URLs privadas de servicios en
`render.yaml`, `vercel.json`, workflows ni en este documento. La URL pública del
repositorio en `render.yaml` sí debe ser la URL canónica del repositorio.

## Checklist post-deploy

- `GET https://<servicio>.onrender.com/api/v1/health` devuelve `2xx`.
- El registro crea usuario, tenant, membership, settings y categorías por
  defecto.
- El login funciona desde el dominio de Vercel.
- La sesión persiste después de recargar el frontend.
- Subir un avatar funciona y la imagen aparece desde R2 mediante URL firmada.
- Crear una transacción no produce errores CORS.
- Las migraciones aparecen aplicadas en Neon.
- Se prueba un request después del cold start de Render Free.
- Se verifica el comportamiento en al menos un navegador con restricciones de
  cookies de terceros, especialmente Safari si se usa ese navegador.
