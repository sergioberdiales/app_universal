# Registro Personal

Documentación técnica de la aplicación web **Registro Personal**.

## Descripción

Registro Personal es una aplicación web estática para llevar el seguimiento de:

- Hábitos diarios con respuestas Sí/No.
- Peso.
- Medicación programada y a demanda.
- Informes semanales.

La aplicación se publica mediante GitHub Pages y utiliza Supabase para la
autenticación y la persistencia de datos.

## Producción

- Aplicación: <https://sergioberdiales.github.io/app_universal/>
- Repositorio: <https://github.com/sergioberdiales/app_universal>
- Rama publicada: `main`
- Backend: proyecto Supabase `App Universal`

GitHub Pages puede tardar unos segundos en reflejar un nuevo commit después de
hacer `git push`.

## Arquitectura

### Frontend

La aplicación no necesita un proceso de compilación. Sus archivos principales
son:

- `index.html`: estructura de la interfaz.
- `styles.css`: estilos.
- `app-20260606b.js`: lógica de negocio, autenticación y acceso a Supabase.
- `pwa.js`: registro del service worker.
- `sw.js`: caché y funcionamiento como PWA.
- `manifest.webmanifest`: configuración de instalación.
- `version.txt`: identificador de la versión publicada.

### Backend

Supabase proporciona:

- Autenticación mediante email y contraseña.
- API REST de PostgREST.
- Base de datos PostgreSQL.
- Row-Level Security (RLS) para aislar los datos de cada usuario.

Las tablas más relevantes para los hábitos son:

- `habits`: definición de los hábitos.
- `habit_checks`: registro diario Sí/No.

Cada fila de `habit_checks` contiene, entre otros, estos campos:

- `user_id`
- `habit_id`
- `log_date`
- `status`, donde `1` significa Sí y `0` significa No.

La combinación `user_id`, `habit_id` y `log_date` debe ser única para poder
actualizar el registro de un día mediante `upsert`.

## Seguridad

Las tablas deben tener RLS habilitado y políticas que permitan a cada usuario
leer y modificar únicamente sus propias filas.

Los scripts relacionados con la configuración de seguridad son:

- `supabase_habit_checks_rls_fix.sql`
- `supabase_rls_repair.sql`
- `supabase_multiuser.sql`

El aviso de Supabase **Table publicly accessible** indica que alguna tabla del
esquema `public` no tiene RLS habilitado. Debe corregirse, aunque no implica
necesariamente que sea la causa de un fallo funcional concreto.

## Despliegue

El despliegue se realiza haciendo commit y push a `main`:

```bash
git add <archivos>
git commit -m "Descripción del cambio"
git push origin main
```

Después se puede comprobar la versión publicada en:

```text
https://sergioberdiales.github.io/app_universal/version.txt
```

## PWA y caché

La aplicación utiliza un service worker. Una versión antigua de `sw.js`
guardaba los scripts con una estrategia *cache first* e ignoraba los parámetros
de consulta. Por ese motivo, añadir `?v=...` a `app.js` no garantizaba que el
navegador descargase el código nuevo.

La solución aplicada fue:

1. Cambiar físicamente el nombre del script a `app-20260606b.js`.
2. Incrementar la caché del service worker a
   `registro-personal-shell-v7`.
3. Usar una estrategia *network first* para scripts, estilos y el manifiesto.
4. Mantener la copia en caché únicamente como alternativa cuando falla la red.

Cuando se publique una modificación importante del frontend, conviene cambiar
el nombre del archivo o actualizar correctamente la versión de caché.

## Incidencia: no se podían marcar hábitos

### Resumen

- Inicio observado: **2 de junio de 2026**.
- Resolución: **6 de junio de 2026**.
- Área afectada: registro Sí/No de hábitos.
- Áreas no afectadas: peso y medicación.
- Estado final: corregido y verificado en producción.

### Síntomas

Al pulsar Sí o No:

- El botón parecía no reaccionar o volvía inmediatamente al estado pendiente.
- El resumen seguía mostrando todos los hábitos como pendientes.
- No aparecía un error permanente en pantalla.
- El resto de módulos seguía funcionando.

### Diagnóstico

Durante la investigación se comprobó lo siguiente:

1. El botón recibía correctamente el evento de clic.
2. La petición de escritura a Supabase terminaba correctamente.
3. La aplicación mostraba temporalmente `Seguimiento guardado.`.
4. Al recargar los hábitos, el registro recién guardado no aparecía.
5. La consulta histórica de `habit_checks` estaba ordenada de más antiguo a
   más reciente.
6. PostgREST devolvía como máximo las primeras **1.000 filas**.

La aplicación ya había acumulado más de 1.000 registros históricos. A partir de
ese punto, las respuestas recientes quedaban fuera del resultado recibido por
el navegador.

### Causa raíz

Las funciones que consultaban `habit_checks` asumían que Supabase devolvería
todas las filas:

```javascript
return apiFetch(url, options);
```

Sin embargo, la API REST aplica un límite máximo por respuesta. Como la consulta
estaba ordenada ascendentemente, se recibían las 1.000 filas más antiguas y se
omitían las nuevas.

El dato se guardaba en la base de datos, pero la interfaz no podía leerlo
después. Esto hacía que pareciera un fallo de escritura.

### Factores que dificultaron el diagnóstico

#### Aviso de RLS

Supabase envió el 2 de junio un aviso de seguridad sobre tablas públicas. Se
revisaron y repararon las políticas RLS. Era una incidencia de seguridad real,
pero no era la causa principal del fallo de los hábitos.

#### Caché antigua de la PWA

El service worker seguía entregando una versión anterior del JavaScript aunque
se añadieran parámetros de versión a la URL. Esto impidió que algunas mejoras
de diagnóstico llegaran inmediatamente al navegador.

#### Mensaje temporal

El mensaje de éxito o error desaparecía después de cinco segundos. Una
comprobación tardía podía dar la impresión de que no había ocurrido nada.

### Solución aplicada

Se creó `apiFetchAllRows`, que solicita los datos en páginas de 1.000 filas:

```javascript
async function apiFetchAllRows(url, options = {}, pageSize = 1000) {
  const rows = [];
  let offset = 0;

  while (true) {
    const pageUrl = new URL(url);
    pageUrl.searchParams.set("limit", String(pageSize));
    pageUrl.searchParams.set("offset", String(offset));

    const page = await apiFetch(pageUrl.toString(), options);
    rows.push(...page);

    if (page.length < pageSize) return rows;
    offset += page.length;
  }
}
```

Esta función se utiliza ahora en:

- `fetchHabitChecksUntil`
- `fetchHabitChecksAll`

También se añadió un orden estable:

```text
log_date.asc,habit_id.asc,id.asc
```

El orden estable evita que una fila pueda cambiar de página cuando varias filas
comparten la misma fecha.

### Cambios complementarios

- Se añadieron manejadores directos a los botones renderizados de hábitos.
- Se incorporó un diagnóstico más detallado de errores de `upsert`.
- Se mantuvo una alternativa que busca la fila y ejecuta `PATCH` o `POST` si el
  `upsert` falla.
- Se corrigió la estrategia de caché de la PWA.
- Se cambió el archivo principal a `app-20260606b.js`.

### Verificación

La corrección se verificó en producción el **6 de junio de 2026**:

1. GitHub Pages cargó `app-20260606b.js`.
2. La aplicación recuperó también las filas posteriores a la número 1.000.
3. El resumen mostró `0 sí, 2 no, 9 pendientes`.
4. `Ejercicio aeróbico` apareció con el botón No activo.
5. Se volvió a guardar el mismo valor.
6. La aplicación mostró `Seguimiento guardado.`.
7. El valor permaneció activo tras la recarga.
8. No aparecieron errores en la consola.

### Commits relacionados

- `f1a11c4`: reparación general de RLS.
- `7b764b0`: reparación mínima de RLS para hábitos.
- `48b8bd0`: mensajes detallados de error al guardar.
- `36e6e3b`: eventos directos en los botones de hábitos.
- `83fde04`: evasión de la caché antigua de la PWA.
- `f5f56d0`: paginación del historial de hábitos y solución definitiva.

## Prevención

Para evitar incidencias similares:

1. Paginar cualquier consulta que pueda superar 1.000 filas.
2. Utilizar un orden total y estable en las consultas paginadas.
3. No asumir que una respuesta HTTP correcta implica que la recarga mostrará el
   dato.
4. Verificar por separado escritura y lectura.
5. Mantener visible el mensaje de diagnóstico durante las pruebas.
6. Actualizar la versión del service worker cuando cambien sus recursos.
7. Comprobar `version.txt` y el nombre del script después de cada despliegue.
8. Revisar periódicamente los avisos de seguridad de Supabase.

## Diagnóstico rápido

Si vuelve a fallar el registro de hábitos:

1. Comprobar si el botón se desactiva durante unos instantes.
2. Confirmar si aparece `Seguimiento guardado.`.
3. Recargar la página y comprobar si el estado permanece.
4. Revisar `version.txt`.
5. Confirmar qué archivo JavaScript carga `index.html`.
6. Revisar errores de red y consola.
7. Consultar directamente en Supabase si existe la fila de `habit_checks`.
8. Verificar las políticas RLS y el límite/paginación de la consulta.

