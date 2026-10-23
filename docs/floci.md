# Desarrollo local con Floci

Fondo usa Floci como emulador local de AWS para probar almacenamiento S3 sin
credenciales reales ni una cuenta AWS. El proyecto no modifica su
`docker-compose.yml`; Floci se ejecuta como un servicio independiente.

## Requisitos

- Docker o Podman en ejecución.
- `floci` instalado.
- AWS CLI instalado.
- El proyecto con sus archivos `.env` configurados.

Verifica las herramientas:

```bash
docker --version
floci version
aws --version
```

## Iniciar Floci

En una terminal de desarrollo:

```bash
floci start
eval "$(floci env)"
export AWS_PAGER=""
```

Comprueba el estado:

```bash
floci status
floci doctor
```

Las variables esperadas son credenciales ficticias y un endpoint local:

```text
AWS_ENDPOINT_URL=http://localhost.floci.io:4566
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_DEFAULT_REGION=us-east-1
```

Comprueba la conexión:

```bash
aws sts get-caller-identity
```

La cuenta `000000000000` confirma que la petición llegó a Floci, no a AWS.

## Crear el bucket

El backend usa un único bucket:

```bash
aws s3 mb s3://fondo-local-files
```

Si ya existe, comprueba que esté disponible:

```bash
aws s3 ls s3://fondo-local-files
```

La estructura lógica de objetos es:

```text
avatars/<userId>/<uuid>.<ext>
tenants/<tenantId>/transactions/<transactionId>/<uuid>.<ext>
```

La extensión solo se obtiene de los magic bytes detectados por el backend.
El nombre original se conserva únicamente como metadato de la factura.

## Variables del API

En `apps/api/.env` deben estar configuradas estas variables:

```bash
AWS_ENDPOINT_URL=http://localhost:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
S3_BUCKET_NAME=fondo-local-files
S3_FORCE_PATH_STYLE=true
S3_PRESIGN_EXPIRY_SECONDS=300
S3_MAX_FILE_SIZE_BYTES=5242880
S3_AVATAR_MAX_FILE_SIZE_BYTES=2097152
```

Ejecuta el API desde la misma terminal donde cargaste `floci env`, o usa el
archivo de entorno del API:

```bash
pnpm dev
```

## Probar un avatar

1. Abre Fondo en `http://localhost:5173`.
2. Inicia sesión.
3. Ve a Settings y selecciona una imagen JPG, PNG o WebP.
4. Pulsa `Subir foto`.
5. Comprueba el bucket desde la consola web o AWS CLI:

```bash
aws s3 ls s3://fondo-local-files --recursive
```

La aplicación guarda la `storageKey` en `User.image` y devuelve una URL
presignada temporal al consultar `GET /api/v1/me`.

## Probar una factura

1. Crea un gasto o ingreso desde la página de transacciones.
2. Selecciona una factura JPG, PNG o PDF.
3. Guarda el movimiento.
4. La transacción se crea primero como JSON.
5. El frontend sube después la factura como multipart.
6. Abre el icono de adjuntos en la tabla para descargarla o eliminarla.

Comprueba los objetos:

```bash
aws s3 ls s3://fondo-local-files --recursive
```

Las descargas se firman durante 5 minutos y no exponen URLs permanentes en la
base de datos.

## Floci UI

Abre:

```text
http://localhost:4566/_floci/ui
```

La primera visita puede iniciar el contenedor de la consola. En la interfaz:

```text
Storage -> Storage -> fondo-local-files
```

Desde allí puedes inspeccionar los objetos bajo `avatars/` y
`tenants/<tenantId>/transactions/`.

## Tests

Los tests e2e normales usan un storage falso y no necesitan Floci:

```bash
TEST_DATABASE_URL=postgresql://fondo:change-me-locally@localhost:5433/fondo_test \
  pnpm --filter @fondo/api test:e2e
```

La prueba real contra Floci está desactivada por defecto. Para ejecutarla:

```bash
floci start
export RUN_FLOCI_INTEGRATION=1
export FLOCI_INTEGRATION_ENDPOINT="${AWS_ENDPOINT_URL:-http://localhost:4566}"
TEST_DATABASE_URL=postgresql://fondo:change-me-locally@localhost:5433/fondo_test \
  pnpm --filter @fondo/api exec vitest run \
  --config vitest.e2e.config.ts test/e2e/storage.integration.test.ts
```

La prueba solo verifica que el endpoint S3 local responde. Los tests de
comportamiento de Fondo siguen usando el fake para mantenerse deterministas.

## Detener o limpiar

Detener el emulador:

```bash
floci stop
```

Limpiar los recursos del emulador sin detenerlo:

```bash
floci reset
```
