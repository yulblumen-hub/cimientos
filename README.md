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
| **Máximas** | Las frases. Cada una cuelga de un pilar y tiene un estado que evoluciona. |
| **Diario** | Notas cortas atadas a una máxima. Ahí la frase se pega a un hecho real. |

Y el ciclo que hace que calen:

```
Nueva  ──"me resonó"──▶  En práctica  ──12 veces──▶  Cimiento  ──▶  Manifiesto
```

Nada se vuelve cimiento porque te gustó una vez. Se vuelve cimiento porque
volviste a elegirlo doce días distintos. El **Manifiesto** se escribe solo con
lo que sobrevivió a esa prueba.

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

## Publicarla (sin gastar créditos)

Es un sitio estático puro, así que **GitHub Pages** alcanza y es gratis e
ilimitado. A diferencia de Netlify, no consume créditos por deploy.

Una sola vez:

1. Creá un repo en GitHub (puede ser privado; Pages necesita público en el
   plan gratuito, o privado con Pro).
2. Desde esta carpeta:

```bash
cd /Users/yul/Downloads/cimientos && git init && git add -A && git commit -m "Cimientos v1"
```

3. Conectalo y subilo:

```bash
git remote add origin git@github.com:TU_USUARIO/cimientos.git && git branch -M main && git push -u origin main
```

4. En el repo: **Settings → Pages → Branch: `main` / root → Save**.

Desde ahí, cada `git push` publica solo. Sin límites, sin créditos.

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
