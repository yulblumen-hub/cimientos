# Cimientos

Los principios que elegís repetir hasta que se vuelven tuyos.

App independiente. **No comparte nada con Mis Finanzas**: otra carpeta, otros
datos, otro hosting.

---

## La idea

Tres capas:

| Capa | Qué es |
|---|---|
| **Pilares** | Tus valores raíz. Pocos (3–7). Cada uno con una definición escrita por vos. |
| **Máximas** | Las frases. Cada una cuelga de un pilar y sube por la escalera. |
| **Autores** | Quién la dijo: años, qué pensaba, qué enseñó. Y tus comentarios sobre esa persona. |
| **Diario** | Notas atadas a una máxima, y **conversaciones** con gente puntual. |

### La escalera

```
Nueva → En práctica (1) → Marcada (12) → Arraigada (30) → Sostenida (90) → Cimiento (365)
```

Cuenta **días distintos, no toques**: una marca por día y se acabó. Desde
*Marcada* la frase entra al manifiesto; cimiento de verdad es solo la que te
acompañó un año entero.

Por eso el grado **no se puede elegir a mano**. Un principio no se declara: se
gana volviendo. Cada día marcado deja un punto, y los hitos quedan señalados —
la repetición se ve acumulada, no como un número suelto.

### Constelación

Las frases también se navegan como un espacio. Cada pilar es una región, las
del mismo pilar quedan unidas por hilos, las que comparten autor por un hilo
propio, y las que más volviste brillan más grande. Se arrastra para moverse.

### Conversaciones

Pegás un chat entero y la app se queda con lo que vale: reconoce el formato de
WhatsApp, descarta sola el relleno ("jeje", "dale", "xD") y vos confirmás. Una
línea que te pegó se rescata como máxima con esa persona de autor — y entra a
la constelación atada a ella.

### Rituales

- **Mañana** — una sola máxima, pantalla limpia. La elección es ponderada:
  lo que estás practicando vuelve seguido, lo que ya es cimiento aparece de
  vez en cuando para no perderse, y lo que viste hace poco se aparta unos días.
- **Noche** — una pregunta: *¿la practicaste?* Sí / a medias / no.
- **Foco de la semana** — elegís un pilar y sus frases salen 3× más seguido.

---

## Estructura

```
index.html              vistas (Hoy, Pilares, Máximas, Diario, Manifiesto, Ajustes)
styles.css              serif para las frases, sans para la interfaz; claro y oscuro
app.js                  toda la lógica
  └── const db          ÚNICO punto que toca el almacenamiento
manifest.webmanifest    para instalarla en el celular
sw.js                   caché del caparazón: abre offline y al instante
supabase-cimientos.sql  listo para el día que quieras multiusuario
```

Sin build, sin dependencias, sin `npm install`. Se abre y anda.

---

## Los datos

Hoy: **localStorage**, en el dispositivo. No sale nada a ningún servidor.
Hacé *Ajustes → Exportar respaldo* cada tanto (baja un `.json`).

Cuando quieras login y sincronización entre celu y compu, corré
`supabase-cimientos.sql` en un proyecto de Supabase **propio de esta app** y
reemplazá el objeto `db` de `app.js`. Es el único bloque que hay que tocar:
todo el resto de la app le pide los datos a `db` y no sabe de dónde salen.

---

## Publicada

**https://yulblumen-hub.github.io/cimientos/**

Repo: `yulblumen-hub/cimientos`, en GitHub Pages. Gratis, ilimitado, **cero
créditos** (a diferencia de Netlify, que cobra por deploy).

Para publicar un cambio, desde esta carpeta:

```bash
cd /Users/yul/Downloads/cimientos && git add -A && git commit -m "que cambió" && git push
```

Tarda ~1 minuto en verse. No hay que arrastrar carpetas ni tocar nada más.

### Cada persona, su propia copia

El link se puede compartir con quien sea. Como los datos viven en el navegador
de cada uno, cada persona que lo abre arranca con su copia en blanco: sus
pilares, sus máximas, su manifiesto. Nadie ve lo del otro y nada se cruza.

El límite: sin login, los datos de cada quien están atados a ese navegador. Si
cambia de teléfono o borra los datos del navegador, se pierden (por eso está
*Exportar respaldo*). Para que cada persona pueda entrar con su cuenta desde
donde sea, ver la sección de arriba sobre `supabase-cimientos.sql`.

En el celular: abrís la URL → **Compartir → Agregar a inicio**. Queda como
una app nativa, con ícono, y ahí funcionan las notificaciones en iPhone.

---

## El recordatorio de la mañana

Una PWA no puede programar una alarma del sistema operativo. Lo que hace la
app es pedir permiso de notificaciones y disparar el aviso cuando llega la
hora, si el service worker está despierto; y si abrís la app más tarde, te lo
muestra igual.

- **Android, instalada**: anda bien.
- **iPhone**: hay que agregarla a la pantalla de inicio, y aun así iOS es
  irregular con las notificaciones de PWA.
- **Garantía total**: hace falta Web Push desde un servidor. Se puede armar
  gratis con una Edge Function de Supabase + cron. Es el paso siguiente si el
  hábito prende.

Alternativa sin infraestructura, en iPhone: **Atajos → Automatización →
Hora del día → Abrir app (Cimientos)**. Cero código y no falla nunca.
