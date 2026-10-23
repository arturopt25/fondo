# Plan final: Avatares y facturas adjuntas con S3/Floci

## Principios del plan

- Un solo bucket: `fondo-local-files`.
- Prefijos: `avatars/<userId>/<uuid>.<ext>` y `tenants/<tenantId>/transactions/<transactionId>/<uuid>.<ext>`, donde `ext` proviene del magic bytes detectado (`jpg`, `png`, `webp` o `pdf`).
- Nunca se guardan URLs absolutas en la base de datos; solo la `storageKey`.
- Las descargas usan URLs presignadas de 5 minutos.
- `TransactionAttachment` tiene RLS forzada (`ENABLE` + `FORCE`) con política por `tenantId`.
- Los uploads se hacen con `@fastify/multipart` como streams, así que no se toca `http-hardening.ts`.
- Se empieza por `/me/avatar` como prueba de concepto antes de tocar transacciones.
- Floci solo se conecta por variables de entorno; `docker-compose.yml` del proyecto no cambia.

---

## Decisiones aprobadas

| # | Decisión | Valor elegido |
|---|---|---|
| 1 | Bucket | Un solo bucket: `fondo-local-files`, con prefijos `avatars/` y `tenants/<tenantId>/transactions/<transactionId>/`. |
| 2 | Subida de factura | En dos pasos: primero crear la transacción (JSON, sin cambios), luego `POST /transactions/:id/attachments` (multipart). |
| 3 | Descargas | URLs presignadas con expiración corta (5 min). Privadas. Para el avatar se guarda la `storageKey` en BD y se resuelve la URL al devolver el perfil. |
| 4 | Límites | 5 MB para facturas, 2 MB para avatares. Avatar: JPG/PNG/WebP. Factura: JPG/PNG/PDF. Validación de extensión, MIME y magic bytes en servidor. |
| 5 | Cantidad de adjuntos | Varias facturas por transacción, máximo 5. |

---

## Correcciones aprobadas

1. **Avatar: solo `POST /me/avatar` escribe `User.image`.**
   - `PATCH /me/profile` no acepta el campo `image`.
   - `getMe` distingue una `storageKey` propia de una URL externa (por ejemplo, login social) y solo firma las keys propias.
   - Las URLs externas se devuelven tal cual.

2. **Borrado de adjunto: orden y tolerancia a fallo de S3.**
   - Primero se elimina el registro en la base de datos.
   - Luego se elimina el objeto de S3.
   - Si la eliminación en S3 falla, se loguea el error y no se lanza excepción; la operación de BD ya se completó.

3. **Compensación en subida.**
   - Si el `INSERT` en la base de datos falla después de que el objeto ya se subió a S3, se borra el objeto de S3 como compensación.

4. **Tests e2e sin depender de Floci.**
   - Los tests e2e usan un `StorageService` falso (in-memory o stub).
   - Se deja una prueba de integración opcional contra Floci, aislada y deshabilitada por defecto.

5. **Migración siguiendo el patrón RLS existente.**
   - Se copia el patrón de `20261022000000_rls_app_role`.
   - Se usan los nombres de tabla y variables GUC exactos.
   - No se hace `GRANT` de secuencia.

6. **Archivo mayor al límite.**
   - Se responde `413 Payload Too Large` con un mensaje claro, nunca `500`.

7. **Nombre de tabla de adjuntos.**
   - `TransactionAttachment` usa el nombre PascalCase del modelo.
   - No se usa `@@map`; las tablas propias del dominio siguen el patrón PascalCase.
   - Solo las tablas de Better Auth (`user`, `session`, `account`, `verification`) usan snake_case.

8. **Payload estricto de perfil.**
   - `PATCH /me/profile` rechaza campos desconocidos, incluido `image`, con `400`.
   - `SettingsPage.tsx` y `packages/shared-types/src/me.ts` no envían `image` en ese PATCH.

---

## Fase 0: Dependencias y configuración local

**Estado: completada**

### Archivos que cambian

- `pnpm-workspace.yaml` → añadir al `catalog:`:
  - `@aws-sdk/client-s3`
  - `@aws-sdk/s3-request-presigner`
  - `@fastify/multipart`
  - `file-type`
- `apps/api/package.json` → añadir las mismas dependencias con `catalog:`.
- `apps/api/.env.example` → añadir:
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
- `apps/api/src/core/config/app-config.ts` → validar y exponer estas variables en `AppConfig`.

### Comandos manuales de Floci

```bash
floci start
eval "$(floci env)"
aws s3 mb s3://fondo-local-files
```

### Criterios de verificación

- `pnpm install` termina sin errores.
- `floci doctor` muestra todos los checks OK.
- El bucket `fondo-local-files` aparece en Floci UI.

---

## Fase 1: Módulo de almacenamiento

**Estado: completada**

### Archivos nuevos

- `apps/api/src/core/storage/storage.types.ts`
  - Interfaces: `UploadedFile`, `StorageConfig`, `AllowedFileType`.
- `apps/api/src/core/storage/storage.config.ts`
  - Carga de variables S3 desde `AppConfig`.
- `apps/api/src/core/storage/storage.service.ts`
  - `S3Client` con endpoint, credenciales y `forcePathStyle`.
  - `upload(key, body, contentType)`.
  - `delete(key)`.
  - `getSignedDownloadUrl(key, expiresInSeconds)`.
  - `validateFile(buffer, options)`:
    - extensión permitida,
    - MIME declarado vs detectado,
    - magic bytes con `file-type`,
    - tamaño máximo.
  - `generateKey(prefix, extension)`.
- `apps/api/src/core/storage/storage.module.ts`
  - Registra `StorageService`.
  - Configura `@fastify/multipart` con `limits: { fileSize: 5MB, files: 5 }`.

### Archivos que cambian

- `apps/api/src/app.module.ts` → importar `StorageModule`.

### Criterios de verificación

- Tests unitarios del `StorageService` pasan con un cliente S3 mockeado.
- Validación rechaza un `.exe` renombrado a `.jpg`.
- Validación acepta PNG/JPG/PDF/WebP reales.
- Un archivo mayor al límite devuelve `413 Payload Too Large` con mensaje claro.

---

## Fase 2: Prueba de concepto `/me/avatar`

**Estado: completada**

### Backend

#### Archivos que cambian

- `apps/api/src/core/me/me.controller.ts`
  - Añadir `POST /me/avatar`:
    ```ts
    @Post("avatar")
    @Throttle(API_UPLOAD_THROTTLE)
    async uploadAvatar(@Req() request: FastifyRequest, @RequestUser() user: CurrentUser)
    ```
- `apps/api/src/core/me/me.service.ts`
  - `uploadAvatar(userId, file)`:
    1. Valida tipo JPG/PNG/WebP y tamaño máximo 2 MB.
    2. Genera key: `avatars/<userId>/<uuid>.<ext>`.
    3. Sube a S3.
    4. Guarda la `storageKey` en `User.image`.
  - `getMe(userId)`:
    - Si `user.image` es una `storageKey` propia (no comienza con `http`), genera presigned URL de 5 min.
    - Si es una URL externa (login social), se devuelve tal cual.
    - Si es `null`, se devuelve `null`.
  - `updateProfile` ya no acepta ni persiste `image`.
- `packages/shared-types/src/me.ts`
  - Eliminar `image` de `updateProfileSchema`.
  - Añadir `uploadAvatarResponseSchema` con `imageUrl: string`.
- `apps/api/src/core/config/rate-limits.ts`
  - Añadir `API_UPLOAD_THROTTLE` (por ejemplo, 10 peticiones por minuto).

### Frontend

#### Archivos que cambian

- `apps/web/src/modules/settings/me-hooks.ts`
  - Añadir `useUploadAvatarMutation`.
- `apps/web/src/modules/settings/SettingsPage.tsx`
  - Añadir `FileInput` de Mantine.
  - Preview con `URL.createObjectURL`.
  - Flujo: seleccionar archivo → subir a `/me/avatar` → recibir URL → invalidar query `me`.
  - El formulario de perfil solo edita `name`.

### Criterios de verificación

- El usuario puede subir un avatar desde Settings.
- Al recargar la página, el avatar sigue visible.
- En Floci UI aparece un objeto bajo `fondo-local-files/avatars/<userId>/`.
- Un archivo que no sea imagen es rechazado antes de subirse.
- `PATCH /me/profile` con `image` es rechazado por validación.
- Un avatar mayor a 2 MB devuelve `413`.

---

## Fase 3: `TransactionAttachment` con RLS

**Estado: completada**

### Base de datos

#### Archivos que cambian

- `packages/db/prisma/schema.prisma`
  ```prisma
  model TransactionAttachment {
    id            String   @id @default(uuid()) @db.Uuid
    tenantId      String   @db.Uuid
    transactionId String   @db.Uuid
    storageKey    String   @db.VarChar(512)
    originalName  String   @db.VarChar(255)
    contentType   String   @db.VarChar(128)
    sizeBytes     Int
    createdAt     DateTime @default(now())

    tenant      Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
    transaction Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)

    @@index([tenantId])
    @@index([transactionId])
    @@map("transaction_attachment")
  }
  ```
- Nueva migración en `packages/db/prisma/migrations/YYYYMMDDHHMMSS_add_transaction_attachments/migration.sql`
  - `CREATE TABLE "TransactionAttachment"` con los mismos tipos y nombres que Prisma generaría.
  - Claves foráneas a `Tenant` y `Transaction` con `ON DELETE CASCADE`.
  - Índices.
  - `GRANT SELECT, INSERT, UPDATE, DELETE ON "TransactionAttachment" TO fondo_app`.
  - **No se hace `GRANT USAGE` de secuencia** (siguiendo la corrección aprobada).
  - `ALTER TABLE "TransactionAttachment" ENABLE ROW LEVEL SECURITY`.
  - `ALTER TABLE "TransactionAttachment" FORCE ROW LEVEL SECURITY`.
  - `CREATE POLICY tenant_isolation` usando `current_setting('app.tenant_id', true)`.

### Criterios de verificación

- `pnpm --filter @fondo/db db:migrate` aplica la migración sin errores.
- `floci doctor` sigue OK.
- `adminPrisma` puede ver todas las filas.
- Un cliente que use `APP_DATABASE_URL` y no setee `app.tenant_id` no ve filas ajenas.

---

## Fase 4: Endpoints de adjuntos de transacción

**Estado: completada**

### Backend

#### Archivos que cambian

- `packages/shared-types/src/finance.ts`
  - `attachmentSchema`, `attachmentListResponseSchema`.
- `apps/api/src/core/finance/transactions.controller.ts`
  - `POST /transactions/:id/attachments` → subir factura.
  - `GET /transactions/:id/attachments` → listar.
  - `DELETE /transactions/:id/attachments/:attachmentId` → eliminar.
  - Todos los endpoints de escritura usan `@Throttle(API_UPLOAD_THROTTLE)`.
- `apps/api/src/core/finance/transactions.service.ts`
  - `addAttachment(tenantId, userId, transactionId, file)`:
    1. Verifica que la transacción existe en el tenant.
    2. Verifica que no haya más de 5 adjuntos.
    3. Valida JPG/PNG/PDF y tamaño máximo 5 MB.
    4. Genera key: `tenants/<tenantId>/transactions/<transactionId>/<uuid>.<ext>`.
    5. Sube a S3.
    6. Intenta crear registro en `TransactionAttachment`.
    7. Si el `INSERT` falla, borra el objeto de S3 y relanza el error.
  - `listAttachments(tenantId, userId, transactionId)`:
    1. Verifica que la transacción pertenece al tenant.
    2. Lista adjuntos.
    3. Devuelve presigned URLs de 5 min.
  - `deleteAttachment(tenantId, userId, transactionId, attachmentId)`:
    1. Verifica que la transacción pertenece al tenant.
    2. Obtiene y borra el registro de `TransactionAttachment`.
    3. Intenta borrar el objeto de S3.
    4. Si S3 falla, loguea el error; la respuesta sigue siendo exitosa.

### Criterios de verificación

- Se puede subir hasta 5 facturas por transacción.
- La sexta es rechazada con error claro.
- Listar adjuntos devuelve URLs presignadas válidas.
- Eliminar un adjunto borra el objeto de Floci UI.
- No se puede subir una factura a una transacción de otro tenant (404).
- Si el INSERT falla tras subir a S3, no queda objeto huérfano.
- Una factura mayor a 5 MB devuelve `413`.

---

## Fase 5: Frontend de adjuntos

**Estado: completada**

### Archivos que cambian

- `apps/web/src/modules/finance/transactions-hooks.ts`
  - Añadir `useCreateAttachmentMutation`, `useDeleteAttachmentMutation`, `useTransactionAttachmentsQuery`.
- `apps/web/src/modules/finance/TransactionsPage.tsx`
  - Añadir `FileInput` en el formulario de ingreso/gasto.
  - Flujo en dos pasos:
    1. Crear transacción como hoy.
    2. En `onSuccess`, si hay archivo, subir adjunto con `transaction.id`.
  - Mostrar lista de adjuntos en la fila de la transacción o en un modal.
  - Botón de eliminar adjunto.

### Criterios de verificación

- Usuario crea un gasto con factura adjunta.
- La transacción aparece en la lista.
- El adjunto se puede descargar con la URL presignada.
- El adjunto se puede eliminar.

---

## Fase 6: Tests e2e de seguridad y RLS

**Estado: completada**

### Principios

- Los tests e2e usan un `StorageService` falso para no depender de Floci.
- Se deja una prueba de integración opcional contra Floci, marcada con `.skip` o similar, para ejecutar manualmente.

### Archivos nuevos

- `apps/api/test/e2e/avatar.e2e.test.ts`
  - Subir avatar.
  - Verificar que `me` devuelve URL presignada.
  - Rechazar archivo no imagen.
  - Verificar que `PATCH /me/profile` no acepta `image`.
  - Verificar límite de tamaño (413).
- `apps/api/test/e2e/attachments.e2e.test.ts`
  - CRUD de adjuntos.
  - Cross-tenant: usuario B intenta listar/descargar/borrar adjunto de usuario A → 404.
  - Límite de 5 adjuntos.
  - Rechazo de tipo MIME y magic bytes.
  - Límite de tamaño (413).
  - Verificación bajo rol `fondo_app` (`APP_DATABASE_URL`) de aislamiento RLS.
- `apps/api/test/e2e/storage.integration.test.ts` *(nuevo, deshabilitado por defecto)*
  - Prueba real contra Floci, solo para ejecutar manualmente.

### Criterios de verificación

- `pnpm --filter @fondo/api test:e2e` pasa completamente con el storage falso.
- Los tests cross-tenant demuestran que no se filtran datos entre tenants.
- La prueba opcional contra Floci funciona cuando se habilita manualmente.

---

## Fase 7: Documentación manual de Floci

**Estado: completada**

### Archivos nuevos o que cambian

- Sección nueva en `README.md` o archivo `docs/floci.md`:
  - Instalación de `floci` y AWS CLI.
  - `floci start && eval "$(floci env)"`.
  - `aws s3 mb s3://fondo-local-files`.
  - Variables de entorno del API.
  - Cómo ver objetos en Floci UI en `http://localhost:4566/_floci/ui`.

### Criterios de verificación

- Cualquier persona del equipo puede seguir la guía y ver los archivos subidos en Floci UI.

---

## Resumen de archivos a modificar

### Backend

- `pnpm-workspace.yaml`
- `apps/api/package.json`
- `apps/api/.env.example`
- `apps/api/src/app.module.ts`
- `apps/api/src/core/config/app-config.ts`
- `apps/api/src/core/config/rate-limits.ts`
- `apps/api/src/core/storage/storage.types.ts` *(nuevo)*
- `apps/api/src/core/storage/storage.config.ts` *(nuevo)*
- `apps/api/src/core/storage/storage.service.ts` *(nuevo)*
- `apps/api/src/core/storage/storage.module.ts` *(nuevo)*
- `apps/api/src/core/me/me.controller.ts`
- `apps/api/src/core/me/me.service.ts`
- `apps/api/src/core/finance/transactions.controller.ts`
- `apps/api/src/core/finance/transactions.service.ts`
- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/...add_transaction_attachments/migration.sql` *(nuevo)*

### Frontend

- `packages/shared-types/src/me.ts`
- `packages/shared-types/src/finance.ts`
- `apps/web/src/modules/settings/SettingsPage.tsx`
- `apps/web/src/modules/settings/me-hooks.ts`
- `apps/web/src/modules/finance/TransactionsPage.tsx`
- `apps/web/src/modules/finance/transactions-hooks.ts`

### Tests

- `apps/api/test/e2e/avatar.e2e.test.ts` *(nuevo)*
- `apps/api/test/e2e/attachments.e2e.test.ts` *(nuevo)*
- `apps/api/test/e2e/storage.integration.test.ts` *(nuevo, opcional)*

### Documentación

- `README.md` o `docs/floci.md`

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| `@fastify/multipart` no funciona como se espera con NestJS. | Fase 2 es solo `/me/avatar`; si falla, se ajusta antes de tocar transacciones. |
| `bodyLimit` de 1 MB en `http-hardening.ts` bloquea uploads. | Multipart usa streams, no el body parser; no se modifica `http-hardening.ts`. |
| URLs presignadas locales usan hostname interno de Docker. | Se configura `AWS_ENDPOINT_URL` y `forcePathStyle` para que apunten a `localhost:4566`. |
| RLS de `TransactionAttachment` no se aplica correctamente. | Migración con `FORCE ROW LEVEL SECURITY` + tests e2e bajo `APP_DATABASE_URL`. |
| Borrar adjunto no limpia S3. | `deleteAttachment` elimina el objeto después del registro; si S3 falla, se loguea. |
| Subida parcial deja objeto huérfano en S3. | Si el INSERT falla tras subir, se borra el objeto de S3 como compensación. |
| Producción requiere cambios de código. | No: solo cambian variables de entorno y el bucket real. |

---

## Nota sobre borrado de transacciones

El proyecto no borra físicamente transacciones; usa `reversesId`. Por eso:

- El borrado de S3 se implementa para adjuntos (`DELETE /transactions/:id/attachments/:attachmentId`).
- Si en el futuro se añade un hard-delete de transacciones, se reutilizará el método de limpieza de adjuntos de esa transacción antes del `DELETE` en cascada.
