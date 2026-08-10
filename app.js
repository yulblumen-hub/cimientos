/* ============================================================
   Cimientos — lógica
   ------------------------------------------------------------
   Toda la persistencia pasa por el objeto `db` de más abajo.
   Es el único lugar que toca el almacenamiento: cuando pasemos
   a Supabase multiusuario, se reemplaza ese bloque y nada más.
   ============================================================ */

/* ============================================================
   1. CAPA DE DATOS
   ============================================================ */

const CLAVE = 'cimientos.v1';

const db = {
  datos: null,

  cargar(){
    try{
      const crudo = localStorage.getItem(CLAVE);
      this.datos = crudo ? JSON.parse(crudo) : semilla();
    }catch(e){
      console.warn('No se pudo leer el almacenamiento, arranco de cero', e);
      this.datos = semilla();
    }
    // Migración blanda: si falta alguna colección nueva, la creo.
    const d = this.datos;
    d.pilares  ??= [];
    d.maximas  ??= [];
    d.autores  ??= autoresBase();
    d.dialogos ??= [];
    d.notas    ??= [];
    d.registros ??= [];
    d.config   ??= {};
    d.config.hora    ??= '07:30';
    d.config.notif   ??= false;
    d.config.miNombre ??= 'Yo';
    // de la versión con un solo umbral a la escalera por días
    d.maximas.forEach(m => {
      m.historial ??= Array.from({length: m.resonancias || 0}, (_, i) => {
        const f = new Date(); f.setDate(f.getDate() - (m.resonancias - i));
        return fechaISO(f);
      });
      m.resonancias = m.historial.length;
      delete m.estado;
    });
    this.guardar();
    return d;
  },

  guardar(){
    try{
      localStorage.setItem(CLAVE, JSON.stringify(this.datos));
    }catch(e){
      avisar('No pude guardar (almacenamiento lleno)');
    }
  },

  reset(){
    this.datos = semilla();
    this.guardar();
  }
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/* ============================================================
   2. SEMILLA
   Un punto de partida, no un dogma. Todo se edita y se borra.
   ============================================================ */

function semilla(){
  const P = (nombre, color, definicion) => ({ id:uid(), nombre, color, definicion, orden:0 });

  const humildad = P('Humildad',  '#7a8b6f', 'Escuchar más de lo que hablo. Que el mérito lo cuente otro.');
  const foco     = P('Foco',      '#b4622f', 'Elijo poco y lo llevo hasta el final. Lo demás espera su turno.');
  const energia  = P('Energía',   '#c1922f', 'Las ganas del momento son un recurso: se pudren si no las uso hoy.');
  const intencion= P('Intención', '#5f7d8c', 'Estar donde estoy, con quien estoy. Vincularme a propósito, no por inercia.');
  const gente    = P('Ser buena gente', '#9b5f72', 'Que mi trato no dependa de lo que la otra persona me puede dar.');

  const pilares = [humildad, foco, energia, intencion, gente];
  pilares.forEach((p,i) => p.orden = i);

  const M = (texto, pilar, fuente='') => ({
    id:uid(), texto, fuente, pilarId:pilar.id,
    favorita:false, resonancias:0, historial:[],
    creada:new Date().toISOString(), ultimaVista:null
  });

  const maximas = [
    // La tesis de esta app. Arranca como favorita: vuelve seguido a propósito.
    { ...M('Tu futuro lo construye lo que repetís, no lo que querés.', foco), favorita:true },

    M('Escuchá como si el otro supiera algo que vos todavía no.', humildad),
    M('El que sabe, no necesita avisarlo.', humildad),
    M('Si te elogian, agradecé y volvé al trabajo.', humildad),
    M('Nunca es lo que hace el otro lo que te daña, sino tu juicio sobre eso.', humildad, 'Marco Aurelio'),
    M('Preguntá antes de suponer. Casi siempre estabas suponiendo mal.', humildad),

    M('Una cosa por vez, hasta el final.', foco),
    M('Decir que no es la forma más rápida de proteger un sí.', foco),
    M('No tenemos poco tiempo: perdemos mucho.', foco, 'Séneca'),
    M('Terminar es una habilidad, no una consecuencia.', foco),
    M('Lo que no está agendado, no existe.', foco),

    M('Las ganas no se esperan, se provocan: empezá y aparecen.', energia),
    M('El impulso de hoy no sobrevive hasta mañana. Usalo ahora.', energia),
    M('Movete primero, entendé después.', energia),
    M('Descansar también es parte del trabajo.', energia),

    M('Estar donde estoy, con quien estoy.', intencion),
    M('Preguntá una cosa más de la que te sale preguntar.', intencion),
    M('El vínculo no se mantiene solo: mandá el mensaje.', intencion),
    M('La gente olvida el argumento y recuerda el trato.', intencion),

    M('Tratá igual al que no te puede devolver nada.', gente),
    M('Entre tener razón y cuidar el vínculo, casi siempre conviene el vínculo.', gente),
    M('Dejá los lugares mejor de como los encontraste.', gente),
    M('Hacé lo correcto sobre todo cuando no te ve nadie.', gente),

    M('Tenés poder sobre tu mente, no sobre los hechos de afuera. Date cuenta de eso y vas a encontrar fuerza.', humildad, 'Marco Aurelio'),
    M('No son los hechos los que perturban, sino la opinión sobre los hechos.', humildad, 'Epicteto')
  ];

  return {
    version: 1,
    pilares,
    maximas,
    autores: autoresBase(),
    dialogos: [],
    notas: [],
    registros: [],
    config: {
      focoPilarId: foco.id,
      focoSemana: semanaISO(new Date()),
      miNombre: 'Yo',
      umbral: 12,
      hora: '07:30',
      notif: false,
      hoy: null                // { fecha, maximaId }
    }
  };
}

/* ------------------------------------------------------------
   Fichas de autor.
   Corto y concreto: años, qué pensaba, qué enseñó. El texto largo
   queda detrás de "Ver completo" y no molesta a nadie.
   Los autores que sumes vos arrancan sin ficha y la escribís a mano.
   ------------------------------------------------------------ */

function autoresBase(){
  return [
    {
      id: uid(),
      nombre: 'Marco Aurelio',
      anios: '121 – 180 d.C.',
      identidad: 'Emperador romano y filósofo estoico.',
      pensaba: 'Que casi nada de lo que te pasa está bajo tu control, salvo el juicio que hacés sobre eso. Escribía de noche, en campaña militar, para sí mismo: nunca pensó en publicarlo.',
      enseno: 'A separar el hecho de la opinión sobre el hecho. Y que el poder no te exime de nada: gobernó el imperio más grande de su época repitiéndose que era mortal y reemplazable.',
      completo: 'Gobernó Roma entre el 161 y el 180 d.C., casi siempre en guerra y con una peste encima. En los ratos libres de las campañas del Danubio escribió, en griego, unos cuadernos sueltos que hoy llamamos "Meditaciones".\n\nNo son un tratado ni un libro para nadie: son notas para acordarse de cómo comportarse al día siguiente. Vuelve una y otra vez sobre lo mismo, como quien se corrige. Por eso funcionan tan bien como máximas: ya estaban escritas para ser repetidas.\n\nLe tocó la posición donde el ego se descontrola —hombre más poderoso del mundo conocido— y usó la escritura justamente para no creérsela.'
    },
    {
      id: uid(),
      nombre: 'Séneca',
      anios: '4 a.C. – 65 d.C.',
      identidad: 'Filósofo, dramaturgo y consejero político romano.',
      pensaba: 'Que la vida no es corta: la hacemos corta. El problema no es cuánto tiempo tenés, sino en qué se te va sin que lo decidas vos.',
      enseno: 'A tratar el tiempo como lo único verdaderamente propio. Somos celosos con la plata y las cosas, y regalamos las horas a cualquiera que las pida.',
      completo: 'Nació en Córdoba, en la Hispania romana. Fue tutor de Nerón y después su asesor, en el gobierno de uno de los emperadores más brutales de la historia. En el año 65 lo acusaron de conspirar y Nerón lo obligó a suicidarse.\n\nSu texto más conocido sobre esto, "Sobre la brevedad de la vida", es una carta a un amigo que se queja de no tener tiempo.\n\nVale saber la contradicción, porque hace más honesta la lectura: predicaba indiferencia frente a la riqueza siendo uno de los hombres más ricos de Roma. Sus enemigos se lo marcaron en vida. Que la idea sea buena no significa que quien la dijo la haya cumplido — y eso también es parte de la lección.'
    },
    {
      id: uid(),
      nombre: 'Epicteto',
      anios: 'c. 50 – 135 d.C.',
      identidad: 'Nació esclavo y terminó siendo maestro de filosofía.',
      pensaba: 'Que la libertad no depende de tu situación sino de dónde ponés el deseo. Si querés cosas que no controlás, vas a vivir esclavizado aunque seas libre.',
      enseno: 'La dicotomía del control: hay cosas que dependen de vos (tu juicio, tu intención, tu reacción) y cosas que no (tu cuerpo, tu reputación, los demás). Confundirlas es la fuente de casi todo el sufrimiento.',
      completo: 'Nació esclavo en Frigia, en la actual Turquía. Era rengo; según la tradición, por un maltrato de su amo. Ya liberado, fundó una escuela en Nicópolis, Grecia.\n\nNunca escribió una línea. Todo lo que se conserva son apuntes que tomó su alumno Arriano: los "Discursos" y el "Enquiridión" (que quiere decir, literalmente, manual de mano — pensado para llevarlo encima).\n\nEs el que más lejos llevó la idea, porque la probó en el peor lugar posible: si alguien podía decir que las circunstancias determinan la vida de uno, era él.'
    }
  ];
}

/* ============================================================
   3. UTILIDADES
   ============================================================ */

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function fechaISO(d = new Date()){
  const z = new Date(d.getTime() - d.getTimezoneOffset()*60000);
  return z.toISOString().slice(0,10);
}

function semanaISO(d){
  const t = new Date(d.getTime());
  t.setHours(0,0,0,0);
  t.setDate(t.getDate() + 4 - (t.getDay() || 7));
  const ene1 = new Date(t.getFullYear(), 0, 1);
  return t.getFullYear() + '-S' + String(Math.ceil(((t - ene1)/86400000 + 1)/7)).padStart(2,'0');
}

const DIAS  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function fechaLarga(d = new Date()){
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

function fechaCorta(iso){
  const hoy = fechaISO();
  if (iso === hoy) return 'Hoy';
  const ayer = new Date(); ayer.setDate(ayer.getDate()-1);
  if (iso === fechaISO(ayer)) return 'Ayer';
  const [a,m,dd] = iso.split('-').map(Number);
  const d = new Date(a, m-1, dd);
  return `${DIAS[d.getDay()]} ${dd} de ${MESES[m-1]}`;
}

/* ------------------------------------------------------------
   La escalera.
   Un principio no se declara: se gana volviendo. Por eso el grado
   no se elige a mano, sale de cuántos DÍAS DISTINTOS volviste a
   la frase — una marca por día, no más. 365 es, literalmente, un
   año volviendo. Recién ahí es un cimiento.
   ------------------------------------------------------------ */

const GRADOS = [
  { min:0,   clave:'nueva',     nombre:'Nueva' },
  { min:1,   clave:'practica',  nombre:'En práctica' },
  { min:12,  clave:'marcada',   nombre:'Marcada' },
  { min:30,  clave:'arraigada', nombre:'Arraigada' },
  { min:90,  clave:'sostenida', nombre:'Sostenida' },
  { min:365, clave:'cimiento',  nombre:'Cimiento' }
];

// Cuántos días distintos volviste a esta frase.
const diasDe = m => (m.historial?.length ?? m.resonancias ?? 0);

const gradoDe = m => {
  const n = diasDe(m);
  let g = GRADOS[0];
  for (const x of GRADOS) if (n >= x.min) g = x;
  return g;
};

const proximoGrado = m => GRADOS.find(x => x.min > diasDe(m)) || null;

// Un grado "entra al manifiesto" a partir del tercer escalón.
const enManifiesto = m => diasDe(m) >= 12;
const esCimiento   = m => diasDe(m) >= 365;

const marcadaHoy = m => (m.historial || []).includes(fechaISO());

// "Puntos lejanos": un punto por cada día que volviste. Los hitos
// (12, 30, 90, 365) quedan marcados. Ver la repetición acumulada es
// la única prueba honesta de que la frase se está volviendo tuya.
function pistaDePuntos(m, limite = 0){
  const h = m.historial || [];
  if (!h.length) return '';
  const desde = (limite && h.length > limite) ? h.length - limite : 0;
  const hitos = new Set(GRADOS.filter(g => g.min > 1).map(g => g.min));

  const puntos = h.slice(desde).map((_, i) =>
    `<i class="${hitos.has(desde + i + 1) ? 'p hito' : 'p'}"></i>`).join('');

  return `<div class="puntos">${desde ? `<span class="p-mas">+${desde}</span>` : ''}${puntos}</div>`;
}

function lineaDeGrado(m){
  const g = gradoDe(m), p = proximoGrado(m), n = diasDe(m);
  if (!n) return 'Todavía no la marcaste ningún día';
  const dias = `${n} ${n === 1 ? 'día' : 'días'}`;
  return p ? `${g.nombre} · ${dias} · faltan ${p.min - n} para ${p.nombre}` : `${g.nombre} · ${dias}`;
}

// Los autores se buscan por nombre, no por id: así una máxima que escribís
// con la fuente "Séneca" encuentra la ficha sola, sin tener que enlazar nada.
const normal = s => String(s ?? '').trim().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const autorDe = nombre => nombre
  ? db.datos.autores.find(a => normal(a.nombre) === normal(nombre))
  : null;

const tieneFicha = a => !!(a && (a.pensaba || a.enseno || a.completo || a.anios || a.identidad));

const pilarDe    = id => db.datos.pilares.find(p => p.id === id);
const maximaDe   = id => db.datos.maximas.find(m => m.id === id);
const colorDe    = id => pilarDe(id)?.color || '#8a837a';

let toastTimer;
function avisar(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

function vibrar(ms = 12){
  if (navigator.vibrate) navigator.vibrate(ms);
}

/* ============================================================
   4. ELECCIÓN DE LA MÁXIMA DEL DÍA
   Rotación ponderada. La idea: lo que estás trabajando vuelve
   seguido, lo que ya es cimiento aparece de vez en cuando para
   no perderse, y lo recién visto se aparta unos días.
   ============================================================ */

function pesoDe(m){
  const cfg = db.datos.config;
  let peso = 1;

  const n = diasDe(m);
  if (n === 0) peso *= 1.6;                    // todavía sin estrenar
  else if (n < 30) peso *= 2.6;                // en plena práctica: vuelve seguido
  else if (n < 90) peso *= 1.7;
  else if (n < 365) peso *= 1.0;
  else peso *= 0.55;                           // ya es parte tuya, asoma de vez en cuando

  if (m.favorita) peso *= 2.4;
  if (cfg.focoPilarId && m.pilarId === cfg.focoPilarId) peso *= 3;

  // enfriamiento: si la viste hace poco, casi no vuelve
  if (m.ultimaVista){
    const dias = (Date.now() - new Date(m.ultimaVista).getTime()) / 86400000;
    if (dias < 2)      peso *= 0.04;
    else if (dias < 7) peso *= 0.25;
    else if (dias < 14) peso *= 0.7;
  }
  return Math.max(peso, 0.01);
}

function elegirMaxima(excluirId = null){
  const pool = db.datos.maximas.filter(m => m.id !== excluirId);
  if (!pool.length) return null;

  const pesos = pool.map(pesoDe);
  const total = pesos.reduce((a,b) => a+b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++){
    r -= pesos[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

function maximaDeHoy(){
  const cfg = db.datos.config;
  const hoy = fechaISO();

  if (cfg.hoy?.fecha === hoy){
    const m = maximaDe(cfg.hoy.maximaId);
    if (m) return m;
  }
  const m = elegirMaxima();
  if (!m) return null;

  cfg.hoy = { fecha: hoy, maximaId: m.id };
  m.ultimaVista = new Date().toISOString();
  db.guardar();
  return m;
}

/* ============================================================
   5. ESTADO DE LA VISTA
   ============================================================ */

let vista = 'hoy';
let filtroEstado = 'todas';
let filtroPilar = null;
let textoBusqueda = '';

function ir(v){
  vista = v;
  $$('#app .view').forEach(s => s.hidden = s.dataset.view !== v);
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.goto === v));
  window.scrollTo(0, 0);
  render();
}

function render(){
  if (vista === 'hoy')        renderHoy();
  if (vista === 'pilares')    renderPilares();
  if (vista === 'maximas')    renderMaximas();
  if (vista === 'diario')     renderDiario();
  if (vista === 'manifiesto') renderManifiesto();
  if (vista === 'ajustes')    renderAjustes();
}

/* ============================================================
   6. VISTA — HOY
   ============================================================ */

function renderHoy(){
  const cfg = db.datos.config;
  $('#hoyFecha').textContent = fechaLarga();

  // chip de foco de la semana
  const foco = pilarDe(cfg.focoPilarId);
  const chip = $('#btnFoco');
  chip.innerHTML = foco
    ? `<i style="--c:${esc(foco.color)}"></i>Semana: ${esc(foco.nombre)}`
    : `<i></i>Elegir foco`;

  const m = maximaDeHoy();
  const stage = $('#maximaStage');

  if (!m){
    stage.style.removeProperty('--c');
    $('#maximaPilar').textContent = '';
    $('#maximaTexto').textContent = 'Todavía no cargaste ninguna máxima.';
    $('#maximaTexto').className = 'maxima-texto larga';
    $('#maximaFuente').textContent = '';
    $('#maximaProgreso').innerHTML = '';
    $('#cierreDia').hidden = true;
    return;
  }
  $('#cierreDia').hidden = false;

  const p = pilarDe(m.pilarId);
  stage.style.setProperty('--c', p?.color || 'var(--texto-3)');
  $('#maximaPilar').textContent = p?.nombre || 'Sin pilar';

  const txt = $('#maximaTexto');
  txt.textContent = m.texto;
  txt.className = 'maxima-texto' + (m.texto.length > 78 ? ' larga' : '');

  $('#maximaFuente').innerHTML = m.fuente
    ? `— <button type="button" class="autor-link" data-autor="${esc(m.fuente)}">${esc(m.fuente)}</button>`
    : '';

  // progreso hacia cimiento
  const prog = $('#maximaProgreso');
  prog.innerHTML =
    `<span class="grado-linea">${esc(lineaDeGrado(m))}</span>` + pistaDePuntos(m, 60);

  $('#accFav').classList.toggle('activa', m.favorita);
  $('#accFav .acc-ico').textContent = m.favorita ? '★' : '☆';
  $('#accFav').style.setProperty('--c', p?.color || '');

  // cierre del día
  const reg = db.datos.registros.find(r => r.fecha === fechaISO());
  const opts = $('.cierre-opts'), hecho = $('.cierre-hecho');
  if (reg){
    opts.hidden = true; hecho.hidden = false;
    const t = { si:'Sí, la practicaste.', medias:'A medias.', no:'Hoy no. Mañana de nuevo.' };
    $('#cierreHechoTxt').textContent = t[reg.practica];
  }else{
    opts.hidden = false; hecho.hidden = true;
  }

  $('#racha').textContent = textoRacha();
}

function textoRacha(){
  const set = new Set(db.datos.registros.map(r => r.fecha));
  let n = 0;
  const d = new Date();
  if (!set.has(fechaISO(d))) d.setDate(d.getDate() - 1);   // el día de hoy todavía puede cerrarse
  while (set.has(fechaISO(d))){ n++; d.setDate(d.getDate() - 1); }

  const enMf = db.datos.maximas.filter(enManifiesto).length;
  const partes = [];
  if (n > 0) partes.push(n === 1 ? '1 día seguido' : `${n} días seguidos`);
  if (enMf > 0) partes.push(`${enMf} en tu manifiesto`);
  return partes.join('  ·  ');
}

// Sumar una resonancia y, si corresponde, graduar la frase a cimiento.
// La usan tanto Hoy como la constelación.
function sumarResonancia(m){
  if (!m) return false;

  m.historial ??= [];
  // Una marca por día. Si no, el número no significa nada.
  if (marcadaHoy(m)){
    avisar('Ya la marcaste hoy. Volvé mañana.');
    return false;
  }

  const antes = gradoDe(m);
  m.historial.push(fechaISO());
  m.resonancias = m.historial.length;
  const ahora = gradoDe(m);
  const subio = ahora.clave !== antes.clave;

  db.guardar();
  vibrar(subio ? 40 : 12);

  if (subio){
    avisar(ahora.clave === 'cimiento'
      ? '◆ Un año volviendo. Ahora sí es un cimiento.'
      : `↑ ${ahora.nombre} · ${diasDe(m)} días`);
  }else{
    const p = proximoGrado(m);
    avisar(p ? `Anotado. ${p.min - diasDe(m)} para ${p.nombre}.` : 'Anotado.');
  }
  return subio;
}

function resonar(){
  const m = maximaDe(db.datos.config.hoy?.maximaId);
  if (!m) return;
  sumarResonancia(m);

  const btn = $('#accResono');
  btn.classList.remove('pulso'); void btn.offsetWidth; btn.classList.add('pulso');
  renderHoy();
}

/* ============================================================
   7. VISTA — PILARES
   ============================================================ */

function renderPilares(){
  const cont = $('#pilaresLista');
  const cfg = db.datos.config;
  const ps = [...db.datos.pilares].sort((a,b) => a.orden - b.orden);

  if (!ps.length){
    cont.innerHTML = `<div class="vacio">Todavía no hay pilares.<br>Empezá por uno.</div>`;
    return;
  }

  cont.innerHTML = ps.map(p => {
    const ms = db.datos.maximas.filter(m => m.pilarId === p.id);
    const cim = ms.filter(enManifiesto).length;
    const esFoco = p.id === cfg.focoPilarId;
    return `
      <article class="pilar-card${esFoco ? ' es-foco' : ''}" data-pilar="${p.id}" style="--c:${esc(p.color)}">
        <div class="pilar-nombre">
          ${esc(p.nombre)}
          ${esFoco ? '<span class="tag-foco">Esta semana</span>' : ''}
        </div>
        <p class="pilar-def${p.definicion ? '' : ' vacia'}">${
          p.definicion ? esc(p.definicion) : 'Todavía no escribiste qué significa esto para vos.'
        }</p>
        <div class="pilar-meta">
          <span><b>${ms.length}</b> ${ms.length === 1 ? 'máxima' : 'máximas'}</span>
          <span><b>${cim}</b> en el manifiesto</span>
        </div>
      </article>`;
  }).join('');
}

/* ============================================================
   8. VISTA — MÁXIMAS
   ============================================================ */

function renderMaximas(){
  // filtros de pilar
  $('#filtrosPilar').innerHTML =
    `<button type="button" class="f${filtroPilar ? '' : ' on'}" data-pilar="">Todos</button>` +
    [...db.datos.pilares].sort((a,b)=>a.orden-b.orden).map(p =>
      `<button type="button" class="f${filtroPilar === p.id ? ' on' : ''}"
        data-pilar="${p.id}" style="--c:${esc(p.color)}">${esc(p.nombre)}</button>`
    ).join('');

  $$('#filtrosEstado .f').forEach(b => b.classList.toggle('on', b.dataset.estado === filtroEstado));

  const q = textoBusqueda.trim().toLowerCase();
  let lista = db.datos.maximas.filter(m => {
    if (filtroPilar && m.pilarId !== filtroPilar) return false;
    if (filtroEstado === 'fav' && !m.favorita) return false;
    if (filtroEstado === 'manifiesto' && !enManifiesto(m)) return false;
    if (GRADOS.some(g => g.clave === filtroEstado) && gradoDe(m).clave !== filtroEstado) return false;
    if (q && !(m.texto + ' ' + m.fuente).toLowerCase().includes(q)) return false;
    return true;
  });

  lista.sort((a,b) =>
    (b.favorita - a.favorita) ||
    (diasDe(b) - diasDe(a)) ||
    a.texto.localeCompare(b.texto)
  );

  const cont = $('#maximasLista');
  if (!lista.length){
    cont.innerHTML = `<div class="vacio">Nada por acá.</div>`;
    return;
  }

  cont.innerHTML = lista.map(m => {
    const p = pilarDe(m.pilarId);
    return `
      <article class="mx" data-maxima="${m.id}" style="--c:${esc(p?.color || 'var(--texto-3)')}">
        <div class="mx-txt">${esc(m.texto)}</div>
        <div class="mx-pie">
          ${m.favorita ? '<span class="mx-fav">★</span>' : ''}
          <span class="mx-estado ${gradoDe(m).clave}">${esc(gradoDe(m).nombre)}</span>
          <span>${esc(p?.nombre || 'Sin pilar')}</span>
          ${m.fuente ? `<span>· ${esc(m.fuente)}</span>` : ''}
          ${diasDe(m) ? `<span>· ${diasDe(m)} d</span>` : ''}
        </div>
      </article>`;
  }).join('');
}

/* ============================================================
   8b. CONVERSACIONES
   ------------------------------------------------------------
   Pegás la charla entera y la app se queda con lo que vale.
   Reconoce el formato de exportación de WhatsApp y también el
   simple "Nombre: mensaje". Lo que es puro relleno —"jeje", "xD",
   "dale"— queda desmarcado de entrada, pero se puede rescatar.
   ============================================================ */

const RELLENO = /^(ja+j?a+|je+j?e+|ji+ji+|xd+|k?dale|ok(ey)?|listo|genial|gracias|de nada|si+|no+|yeah|yes|claro|obvio|jaja+|buenas?|hola|chau|besos|abrazo|👍|❤️|😂|🙌|\+1|👌|ah+|oh+|uh+|mmm+|bien|joya|tal cual|exacto|totalmente)[!.…\s]*$/i;

// Una línea "vale" si dice algo: ni muy corta, ni una reacción suelta.
const valeLaPena = t => {
  const s = t.trim();
  if (s.length < 32) return false;
  if (RELLENO.test(s)) return false;
  if (!/\s/.test(s)) return false;           // una sola palabra
  return true;
};

function parsearChat(crudo, persona){
  const yo = db.datos.config.miNombre || 'Yo';
  const lineas = [];

  // 1) Exportación de WhatsApp:  8/8/26, 10:41 p. m. - Nombre: mensaje
  const reExport = /^\s*\[?\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?\s*m\.?)?\]?\s*[-–]?\s*([^:\n]{1,40}):\s*([\s\S]*)$/i;
  // 2) Simple:  Nombre: mensaje
  const reSimple = /^\s*([^:\n]{1,40}):\s*([\s\S]*)$/;

  for (const bruta of crudo.split(/\r?\n/)){
    const l = bruta.trim();
    if (!l) continue;

    let quien = null, texto = null;
    const m1 = l.match(reExport);
    const m2 = m1 ? null : l.match(reSimple);
    const m = m1 || m2;

    if (m){
      quien = m[1].trim();
      texto = m[2].trim();
    }else if (lineas.length){
      // continuación de un mensaje de varias líneas
      lineas[lineas.length - 1].texto += ' ' + l;
      continue;
    }else{
      quien = persona || 'Otro';
      texto = l;
    }
    if (!texto) continue;

    const mio = normal(quien) === normal(yo) || /^(yo|yul|t[uú]|me)$/i.test(quien);
    lineas.push({
      id: uid(),
      quien: mio ? 'yo' : 'otro',
      nombre: mio ? yo : quien,
      texto,
      elegida: valeLaPena(texto)
    });
  }
  return lineas;
}

/* ---------- alta / importación ---------- */

function nuevoDialogo(){
  abrirSheet(`
    <h3>Nueva conversación</h3>
    <div class="campo">
      <label>Con quién</label>
      <input type="text" id="dPersona" placeholder="Nombre de la persona">
    </div>
    <div class="campo">
      <label>Pegá la conversación</label>
      <textarea id="dCrudo" rows="7" placeholder="Copiá el chat y pegalo acá tal cual. También podés escribirlo a mano como&#10;&#10;Fran: lo que dijo&#10;Yo: lo que contesté"></textarea>
    </div>
    <p class="nota-tec" style="margin-bottom:18px">
      Después elegís qué líneas se guardan. El relleno —“jeje”, “dale”, “xD”— viene desmarcado solo.
    </p>
    <div class="sheet-acciones">
      <button type="button" class="btn-primario" id="dLeer">Leer la conversación</button>
    </div>
  `, cuerpo => {
    $('#dLeer', cuerpo).onclick = () => {
      const persona = $('#dPersona', cuerpo).value.trim();
      const crudo = $('#dCrudo', cuerpo).value;
      if (!persona) return avisar('Falta el nombre');
      if (!crudo.trim()) return avisar('Pegá la conversación');

      const lineas = parsearChat(crudo, persona);
      if (!lineas.length) return avisar('No pude leer ninguna línea');
      cerrarSheet();
      setTimeout(() => elegirLineas(persona, lineas), 180);
    };
  });
}

function elegirLineas(persona, lineas){
  const pintar = () => lineas.map(l => `
    <div class="lin ${l.quien} ${l.elegida ? 'si' : 'no'}" data-linea="${l.id}">
      <div class="lin-quien">${esc(l.quien === 'yo' ? (db.datos.config.miNombre || 'Yo') : persona)}</div>
      <div class="lin-txt">${esc(l.texto)}</div>
      <div class="lin-tic">${l.elegida ? '✓' : ''}</div>
    </div>`).join('');

  abrirSheet(`
    <h3>Qué te llevás</h3>
    <p class="view-sub" style="margin-top:-10px">
      Tocá para incluir o descartar. Ya marqué lo que parece tener sustancia.
    </p>
    <div class="lineas" id="dLineas">${pintar()}</div>
    <div class="sheet-acciones">
      <button type="button" class="btn-primario" id="dGuardar"></button>
    </div>
  `, cuerpo => {
    const btn = $('#dGuardar', cuerpo);
    const refrescar = () => {
      const n = lineas.filter(l => l.elegida).length;
      btn.textContent = n ? `Guardar ${n} ${n === 1 ? 'línea' : 'líneas'}` : 'No guardar nada';
    };
    refrescar();

    $('#dLineas', cuerpo).addEventListener('click', ev => {
      const el = ev.target.closest('[data-linea]');
      if (!el) return;
      const l = lineas.find(x => x.id === el.dataset.linea);
      l.elegida = !l.elegida;
      el.classList.toggle('si', l.elegida);
      el.classList.toggle('no', !l.elegida);
      el.querySelector('.lin-tic').textContent = l.elegida ? '✓' : '';
      refrescar();
    });

    btn.onclick = () => {
      const elegidas = lineas.filter(l => l.elegida)
        .map(({id, quien, nombre, texto}) => ({ id, quien, nombre, texto }));
      if (!elegidas.length) return avisar('No marcaste ninguna');

      const d = { id:uid(), persona, fecha:new Date().toISOString(), lineas:elegidas };
      db.datos.dialogos.push(d);
      db.guardar(); cerrarSheet(); render();
      setTimeout(() => verDialogo(d.id), 180);
    };
  });
}

/* ---------- ver una conversación ---------- */

function verDialogo(id){
  const d = db.datos.dialogos.find(x => x.id === id);
  if (!d) return;

  abrirSheet(`
    <h3>${esc(d.persona)}</h3>
    <div class="autor-anios">${esc(fechaCorta(d.fecha.slice(0,10)))}</div>
    <p class="view-sub" style="margin-top:12px">Tocá una línea para rescatarla como máxima. Va a entrar a la constelación con esa persona como autor.</p>

    <div class="chat">
      ${d.lineas.map(l => `
        <div class="burbuja ${l.quien}" data-linea="${l.id}">
          <div class="bur-quien">${esc(l.nombre)}</div>
          <div class="bur-txt">${esc(l.texto)}</div>
        </div>`).join('')}
    </div>

    <div class="sheet-acciones">
      <button type="button" class="btn-borrar" id="dBorrar">Borrar conversación</button>
      <button type="button" class="btn-sec" id="dSumar" style="flex:1">+ Agregar línea</button>
    </div>
  `, cuerpo => {
    $('.chat', cuerpo).addEventListener('click', ev => {
      const b = ev.target.closest('[data-linea]');
      if (!b) return;
      const l = d.lineas.find(x => x.id === b.dataset.linea);
      cerrarSheet();
      setTimeout(() => editarMaxima(null, { texto:l.texto, fuente:l.nombre }), 180);
    });

    $('#dSumar', cuerpo).onclick = () => {
      cerrarSheet();
      setTimeout(() => agregarLinea(d.id), 180);
    };

    $('#dBorrar', cuerpo).onclick = () => {
      if (!confirm(`¿Borrar la conversación con ${d.persona}?`)) return;
      db.datos.dialogos = db.datos.dialogos.filter(x => x.id !== d.id);
      db.guardar(); cerrarSheet(); render();
    };
  });
}

function agregarLinea(id){
  const d = db.datos.dialogos.find(x => x.id === id);
  if (!d) return;
  const yo = db.datos.config.miNombre || 'Yo';
  let quien = 'otro';

  abrirSheet(`
    <h3>Agregar línea</h3>
    <div class="campo">
      <label>Quién lo dijo</label>
      <div class="pick-estado">
        <button type="button" data-quien="otro" class="on">${esc(d.persona)}</button>
        <button type="button" data-quien="yo">${esc(yo)}</button>
      </div>
    </div>
    <div class="campo">
      <label>Qué dijo</label>
      <textarea id="lTexto" rows="4"></textarea>
    </div>
    <div class="sheet-acciones">
      <button type="button" class="btn-primario" id="lGuardar">Guardar</button>
    </div>
  `, cuerpo => {
    cuerpo.addEventListener('click', ev => {
      const b = ev.target.closest('[data-quien]');
      if (!b) return;
      quien = b.dataset.quien;
      $$('[data-quien]', cuerpo).forEach(x => x.classList.toggle('on', x === b));
    });
    $('#lGuardar', cuerpo).onclick = () => {
      const texto = $('#lTexto', cuerpo).value.trim();
      if (!texto) return avisar('Escribí algo');
      d.lineas.push({ id:uid(), quien, nombre: quien === 'yo' ? yo : d.persona, texto });
      db.guardar(); cerrarSheet(); render();
      setTimeout(() => verDialogo(d.id), 180);
    };
  });
}

/* ============================================================
   9. VISTA — DIARIO
   ============================================================ */

let segDiario = 'notas';

function renderDiario(){
  const cont = $('#diarioLista');
  $$('#segDiario button').forEach(b => b.classList.toggle('on', b.dataset.seg === segDiario));
  $('#btnAgregarDiario').textContent = segDiario === 'notas' ? '+ Nota' : '+ Conversación';
  $('#diarioSub').textContent = segDiario === 'notas'
    ? 'Acá la frase se vuelve tuya: pegala contra un hecho real.'
    : 'Lo que se dijo, y quién lo dijo. Lo bueno de una charla no se te tiene que perder.';

  if (segDiario === 'dialogos') return renderDialogos(cont);

  const notas = [...db.datos.notas].sort((a,b) => b.fecha.localeCompare(a.fecha));

  if (!notas.length){
    cont.innerHTML = `<div class="vacio">Todavía no escribiste nada.<br>Una línea alcanza.</div>`;
    return;
  }

  const grupos = {};
  notas.forEach(n => {
    const dia = n.fecha.slice(0,10);
    (grupos[dia] ??= []).push(n);
  });

  cont.innerHTML = Object.keys(grupos).sort().reverse().map(dia => `
    <div class="dia-grupo">
      <div class="dia-fecha">${esc(fechaCorta(dia))}</div>
      ${grupos[dia].map(n => {
        const m = n.maximaId ? maximaDe(n.maximaId) : null;
        const p = m ? pilarDe(m.pilarId) : (n.pilarId ? pilarDe(n.pilarId) : null);
        return `
          <article class="nota" data-nota="${n.id}">
            ${m ? `<div class="nota-ancla" style="--c:${esc(p?.color || '')}">${esc(m.texto)}</div>` : ''}
            ${n.autor ? `<div class="nota-ancla nota-ancla-autor">Sobre ${esc(n.autor)}</div>` : ''}
            <div class="nota-txt">${esc(n.texto)}</div>
          </article>`;
      }).join('')}
    </div>`).join('');
}

function renderDialogos(cont){
  const ds = [...db.datos.dialogos].sort((a,b) => b.fecha.localeCompare(a.fecha));

  if (!ds.length){
    cont.innerHTML = `<div class="vacio">Ninguna conversación guardada.<br>Pegá un chat y quedate con lo bueno.</div>`;
    return;
  }

  cont.innerHTML = ds.map(d => {
    const ultima = d.lineas[d.lineas.length - 1];
    return `
      <article class="dlg" data-dialogo="${d.id}">
        <div class="dlg-cab">
          <span class="dlg-persona">${esc(d.persona)}</span>
          <span class="dlg-fecha">${esc(fechaCorta(d.fecha.slice(0,10)))}</span>
        </div>
        ${ultima ? `<div class="dlg-ultima">${esc(recortar(ultima.texto, 110))}</div>` : ''}
        <div class="dlg-meta">${d.lineas.length} ${d.lineas.length === 1 ? 'línea guardada' : 'líneas guardadas'}</div>
      </article>`;
  }).join('');
}

/* ============================================================
   10. VISTA — MANIFIESTO
   ============================================================ */

function textoManifiesto(){
  const lineas = [];
  [...db.datos.pilares].sort((a,b)=>a.orden-b.orden).forEach(p => {
    const cs = db.datos.maximas.filter(m => m.pilarId === p.id && enManifiesto(m));
    if (!cs.length && !p.definicion) return;
    lineas.push(p.nombre.toUpperCase());
    if (p.definicion) lineas.push(p.definicion);
    cs.forEach(m => lineas.push('— ' + m.texto));
    lineas.push('');
  });
  return lineas.join('\n').trim();
}

function renderManifiesto(){
  const cont = $('#manifiestoBody');
  const conCimientos = db.datos.maximas.some(enManifiesto);

  if (!conCimientos){
    cont.innerHTML = `
      <div class="mf-vacio">
        <p>Tu manifiesto está en blanco, y está bien.</p>
        <small>Cada día que una frase te resuene, marcala en Hoy. A los 12 días
        distintos entra acá sola, y de ahí sigue subiendo: 30, 90, 365.
        Recién al año de volver a ella es un cimiento de verdad.</small>
      </div>`;
    return;
  }

  cont.innerHTML = [...db.datos.pilares].sort((a,b)=>a.orden-b.orden).map(p => {
    const cs = db.datos.maximas.filter(m => m.pilarId === p.id && enManifiesto(m))
                               .sort((a,b) => diasDe(b) - diasDe(a));
    if (!cs.length) return '';
    return `
      <section class="mf-bloque" style="--c:${esc(p.color)}">
        <div class="mf-pilar">${esc(p.nombre)}</div>
        ${p.definicion ? `<p class="mf-def">${esc(p.definicion)}</p>` : ''}
        ${cs.map(m => `<div class="mf-frase${esCimiento(m) ? ' es-cimiento' : ''}">
          ${esc(m.texto)}<span class="mf-grado">${esc(gradoDe(m).nombre)} · ${diasDe(m)} d</span>
        </div>`).join('')}
      </section>`;
  }).join('');
}

/* ============================================================
   11. VISTA — AJUSTES
   ============================================================ */

function renderAjustes(){
  const cfg = db.datos.config;
  $('#setNotif').checked = !!cfg.notif;
  $('#setHora').value = cfg.hora;
  $('#setMiNombre').value = cfg.miNombre || '';

  const est = $('#notifEstado');
  if (!('Notification' in window)){
    est.textContent = 'Este navegador no soporta notificaciones.';
  }else if (Notification.permission === 'denied'){
    est.textContent = 'Bloqueaste las notificaciones. Habilitalas desde los ajustes del navegador.';
  }else{
    est.textContent = 'En iPhone hace falta agregar la app a la pantalla de inicio (Compartir → Agregar a inicio) para que el aviso funcione.';
  }
}

/* ============================================================
   12. HOJA MODAL
   ============================================================ */

function abrirSheet(html, montar){
  $('#sheetCuerpo').innerHTML = html;
  $('#sheet').hidden = false;
  document.body.style.overflow = 'hidden';
  montar?.($('#sheetCuerpo'));
}

function cerrarSheet(){
  $('#sheet').hidden = true;
  $('#sheetCuerpo').innerHTML = '';
  document.body.style.overflow = '';
}

const opcionesPilar = (sel) =>
  `<div class="pick-pilar">` +
  [...db.datos.pilares].sort((a,b)=>a.orden-b.orden).map(p =>
    `<button type="button" data-pick-pilar="${p.id}" class="${p.id === sel ? 'on' : ''}"
       style="--c:${esc(p.color)}">${esc(p.nombre)}</button>`).join('') +
  `</div>`;

/* ---------- editor de máxima ---------- */

function editarMaxima(id, previo = null){
  const m = id ? maximaDe(id) : null;
  let pilarSel = m?.pilarId || db.datos.config.focoPilarId || db.datos.pilares[0]?.id;
  const texto0  = m?.texto  ?? previo?.texto  ?? '';
  const fuente0 = m?.fuente ?? previo?.fuente ?? '';

  abrirSheet(`
    <h3>${m ? 'Editar máxima' : previo ? 'Rescatar esta frase' : 'Nueva máxima'}</h3>
    <div class="campo">
      <label>La frase</label>
      <textarea id="fTexto" rows="3" placeholder="Escribila como querés recordarla…">${esc(texto0)}</textarea>
    </div>
    <div class="campo">
      <label>De quién es (opcional)</label>
      <input type="text" id="fFuente" value="${esc(fuente0)}" placeholder="Un autor, un amigo, vos">
    </div>
    <div class="campo">
      <label>Pilar</label>
      ${opcionesPilar(pilarSel)}
    </div>
    ${m ? `<p class="nota-tec" style="margin:-4px 0 18px">
      ${esc(lineaDeGrado(m))}. El grado no se elige: se gana volviendo, un día por vez.
    </p>` : ''}
    <div class="sheet-acciones">
      ${m ? '<button type="button" class="btn-borrar" id="fBorrar">Borrar</button>' : ''}
      <button type="button" class="btn-primario" id="fGuardar">Guardar</button>
    </div>
  `, cuerpo => {
    cuerpo.addEventListener('click', ev => {
      const bp = ev.target.closest('[data-pick-pilar]');
      if (bp){
        pilarSel = bp.dataset.pickPilar;
        $$('[data-pick-pilar]', cuerpo).forEach(b => b.classList.toggle('on', b === bp));
      }
    });

    $('#fGuardar', cuerpo).onclick = () => {
      const texto = $('#fTexto', cuerpo).value.trim();
      if (!texto) return avisar('Falta la frase');
      const fuente = $('#fFuente', cuerpo).value.trim();

      if (m){
        Object.assign(m, { texto, fuente, pilarId:pilarSel });
      }else{
        db.datos.maximas.push({
          id:uid(), texto, fuente, pilarId:pilarSel,
          favorita:false, resonancias:0, historial:[],
          creada:new Date().toISOString(), ultimaVista:null
        });
      }
      db.guardar(); cerrarSheet(); render();
      avisar(m ? 'Guardado' : 'Sumada a tus máximas');
    };

    const bb = $('#fBorrar', cuerpo);
    if (bb) bb.onclick = () => {
      if (!confirm('¿Borrar esta máxima?')) return;
      db.datos.maximas = db.datos.maximas.filter(x => x.id !== m.id);
      db.datos.notas.forEach(n => { if (n.maximaId === m.id) n.maximaId = null; });
      if (db.datos.config.hoy?.maximaId === m.id) db.datos.config.hoy = null;
      db.guardar(); cerrarSheet(); render();
    };
  });
}

/* ---------- ficha de máxima ---------- */

function verMaxima(id){
  const m = maximaDe(id);
  if (!m) return;
  const p = pilarDe(m.pilarId);
  const notas = db.datos.notas.filter(n => n.maximaId === m.id)
                              .sort((a,b) => b.fecha.localeCompare(a.fecha));

  abrirSheet(`
    <div class="sheet-cita" style="--c:${esc(p?.color || '')}">${esc(m.texto)}</div>
    <div class="mx-pie" style="margin:-8px 0 20px">
      <span class="mx-estado ${gradoDe(m).clave}" style="--c:${esc(p?.color || '')}">${esc(gradoDe(m).nombre)}</span>
      <span>${esc(p?.nombre || 'Sin pilar')}</span>
      ${m.fuente ? `<span>· <button type="button" class="autor-link" data-autor="${esc(m.fuente)}">${esc(m.fuente)}</button></span>` : ''}
    </div>

    <div class="campo">
      <label>Tu repetición</label>
      <p class="grado-linea" style="margin:0 0 10px">${esc(lineaDeGrado(m))}</p>
      ${pistaDePuntos(m) || '<p class="nota-tec" style="margin:0">Ningún día todavía.</p>'}
    </div>

    <div class="sheet-acciones" style="margin-top:0">
      <button type="button" class="btn-primario" id="vFav">${m.favorita ? '★ Quitar de favoritas' : '☆ Marcar favorita'}</button>
      <button type="button" class="btn-sec" id="vEditar">Editar</button>
    </div>

    <div class="campo" style="margin-top:26px">
      <label>Escribir sobre esta frase</label>
      <textarea id="vNota" rows="3" placeholder="¿Dónde la usaste hoy? ¿Dónde te faltó?"></textarea>
      <button type="button" class="btn-primario" id="vGuardarNota" style="margin-top:10px;width:100%">Guardar nota</button>
    </div>

    ${notas.length ? `
      <div class="campo">
        <label>Lo que ya escribiste</label>
        ${notas.map(n => `
          <div class="nota" style="cursor:default">
            <div class="mx-pie" style="margin:0 0 6px">${esc(fechaCorta(n.fecha.slice(0,10)))}</div>
            <div class="nota-txt">${esc(n.texto)}</div>
          </div>`).join('')}
      </div>` : ''}
  `, cuerpo => {
    $('#vFav', cuerpo).onclick = () => {
      m.favorita = !m.favorita; db.guardar(); vibrar();
      cerrarSheet(); render(); avisar(m.favorita ? '★ Favorita' : 'Sacada de favoritas');
    };
    $('#vEditar', cuerpo).onclick = () => { cerrarSheet(); setTimeout(() => editarMaxima(m.id), 180); };
    $('#vGuardarNota', cuerpo).onclick = () => {
      const t = $('#vNota', cuerpo).value.trim();
      if (!t) return avisar('Escribí algo primero');
      db.datos.notas.push({ id:uid(), texto:t, maximaId:m.id, pilarId:m.pilarId, fecha:new Date().toISOString() });
      db.guardar(); cerrarSheet(); render(); avisar('Anotado en tu diario');
    };
  });
}

/* ---------- ficha de autor ---------- */

const parrafos = t => String(t || '').split(/\n\s*\n/)
  .filter(Boolean).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

function verAutor(nombre){
  if (!nombre) return;
  const a = autorDe(nombre);
  const conFicha = tieneFicha(a);

  const dichas = db.datos.maximas.filter(m => normal(m.fuente) === normal(nombre));
  const comentarios = db.datos.notas.filter(n => normal(n.autor) === normal(nombre))
                                    .sort((x,y) => y.fecha.localeCompare(x.fecha));

  abrirSheet(`
    <div class="autor-cab">
      <h3>${esc(nombre)}</h3>
      ${a?.anios ? `<div class="autor-anios">${esc(a.anios)}</div>` : ''}
      ${a?.identidad ? `<p class="autor-ident">${esc(a.identidad)}</p>` : ''}
    </div>

    ${conFicha ? `
      ${a.pensaba ? `<div class="autor-bloque">
        <label>Qué pensaba</label><p>${esc(a.pensaba)}</p></div>` : ''}
      ${a.enseno ? `<div class="autor-bloque">
        <label>Qué enseñó</label><p>${esc(a.enseno)}</p></div>` : ''}

      ${a.completo ? `
        <button type="button" class="ver-completo" id="aVerMas">Ver completo ↓</button>
        <div class="autor-largo" id="aLargo" hidden>${parrafos(a.completo)}</div>` : ''}
    ` : `
      <div class="mf-vacio" style="margin-bottom:20px">
        <p>Todavía no escribiste quién es.</p>
        <small>Un par de líneas alcanzan: cuándo vivió, qué pensaba, qué te dejó.</small>
      </div>
    `}

    ${dichas.length > 1 ? `
      <div class="autor-bloque">
        <label>Otras suyas que tenés</label>
        ${dichas.map(m => `<div class="autor-frase" data-ir-maxima="${m.id}">${esc(m.texto)}</div>`).join('')}
      </div>` : ''}

    <div class="campo" style="margin-top:24px">
      <label>Qué pensás vos</label>
      <textarea id="aComentario" rows="3" placeholder="¿Coincidís? ¿Te choca algo? Escribilo como te sale."></textarea>
      <button type="button" class="btn-primario" id="aGuardarCom" style="margin-top:10px;width:100%">Guardar comentario</button>
    </div>

    ${comentarios.length ? `
      <div class="campo">
        <label>Lo que fuiste pensando (${comentarios.length})</label>
        ${comentarios.map(n => `
          <div class="nota" style="cursor:default">
            <div class="mx-pie" style="margin:0 0 6px">${esc(fechaCorta(n.fecha.slice(0,10)))}</div>
            <div class="nota-txt">${esc(n.texto)}</div>
          </div>`).join('')}
      </div>` : ''}

    <div class="sheet-acciones">
      <button type="button" class="btn-sec" id="aEditar" style="flex:1">
        ${conFicha ? 'Editar la ficha' : 'Escribir quién es'}
      </button>
    </div>
  `, cuerpo => {
    const vm = $('#aVerMas', cuerpo);
    if (vm) vm.onclick = () => {
      const largo = $('#aLargo', cuerpo);
      largo.hidden = !largo.hidden;
      vm.textContent = largo.hidden ? 'Ver completo ↓' : 'Ver menos ↑';
    };

    $('#aGuardarCom', cuerpo).onclick = () => {
      const t = $('#aComentario', cuerpo).value.trim();
      if (!t) return avisar('Escribí algo primero');
      db.datos.notas.push({
        id:uid(), texto:t, maximaId:null, pilarId:null,
        autor:nombre, fecha:new Date().toISOString()
      });
      db.guardar(); cerrarSheet(); render(); avisar('Guardado en tu diario');
    };

    $('#aEditar', cuerpo).onclick = () => { cerrarSheet(); setTimeout(() => editarAutor(nombre), 180); };

    cuerpo.addEventListener('click', ev => {
      const f = ev.target.closest('[data-ir-maxima]');
      if (f){ cerrarSheet(); setTimeout(() => verMaxima(f.dataset.irMaxima), 180); }
    });
  });
}

function editarAutor(nombre){
  const a = autorDe(nombre);

  abrirSheet(`
    <h3>${esc(nombre)}</h3>
    <p class="view-sub" style="margin-top:-10px">Corto y concreto. Lo largo va al final y queda escondido hasta que alguien lo pida.</p>
    <div class="campo">
      <label>Cuándo vivió</label>
      <input type="text" id="aAnios" value="${esc(a?.anios || '')}" placeholder="1912 – 1990, o simplemente: hoy">
    </div>
    <div class="campo">
      <label>Quién fue, en una línea</label>
      <input type="text" id="aIdent" value="${esc(a?.identidad || '')}" placeholder="Mi viejo. / Física y escritora.">
    </div>
    <div class="campo">
      <label>Qué pensaba</label>
      <textarea id="aPensaba" rows="3" placeholder="La idea de fondo, en dos o tres frases.">${esc(a?.pensaba || '')}</textarea>
    </div>
    <div class="campo">
      <label>Qué enseñó</label>
      <textarea id="aEnseno" rows="3" placeholder="Lo que te llevás vos de esa persona.">${esc(a?.enseno || '')}</textarea>
    </div>
    <div class="campo">
      <label>Completo (opcional)</label>
      <textarea id="aCompleto" rows="6" placeholder="Todo lo que quieras. Esto solo se ve si tocás “Ver completo”.">${esc(a?.completo || '')}</textarea>
    </div>
    <div class="sheet-acciones">
      <button type="button" class="btn-primario" id="aGuardar">Guardar</button>
    </div>
  `, cuerpo => {
    $('#aGuardar', cuerpo).onclick = () => {
      const campos = {
        anios:     $('#aAnios', cuerpo).value.trim(),
        identidad: $('#aIdent', cuerpo).value.trim(),
        pensaba:   $('#aPensaba', cuerpo).value.trim(),
        enseno:    $('#aEnseno', cuerpo).value.trim(),
        completo:  $('#aCompleto', cuerpo).value.trim()
      };
      if (a) Object.assign(a, campos);
      else db.datos.autores.push({ id:uid(), nombre, ...campos });

      db.guardar(); cerrarSheet(); render();
      setTimeout(() => verAutor(nombre), 180);
    };
  });
}

/* ---------- editor de pilar ---------- */

const PALETA = ['#7a8b6f','#b4622f','#c1922f','#5f7d8c','#9b5f72','#6f7a8b','#8b7a6f','#4f7a63','#8a5f9b','#a8503f'];

function editarPilar(id){
  const p = id ? pilarDe(id) : null;
  let color = p?.color || PALETA[db.datos.pilares.length % PALETA.length];
  const esFoco = p && p.id === db.datos.config.focoPilarId;

  abrirSheet(`
    <h3>${p ? 'Pilar' : 'Nuevo pilar'}</h3>
    <div class="campo">
      <label>Nombre</label>
      <input type="text" id="pNombre" value="${esc(p?.nombre || '')}" placeholder="Humildad, Foco, Coraje…">
    </div>
    <div class="campo">
      <label>Qué significa esto para vos</label>
      <textarea id="pDef" rows="3" placeholder="Definilo con tus palabras. Esto va a ir al manifiesto.">${esc(p?.definicion || '')}</textarea>
    </div>
    <div class="campo">
      <label>Color</label>
      <div class="pick-pilar" id="pColores">
        ${PALETA.map(c => `<button type="button" data-color="${c}" class="${c === color ? 'on' : ''}"
          style="--c:${c};background:${c};border-color:${c};width:34px;height:34px;padding:0;opacity:${c === color ? 1 : .42}"></button>`).join('')}
      </div>
    </div>
    ${p ? `<div class="sheet-acciones" style="margin-bottom:4px">
      <button type="button" class="btn-sec" id="pFoco" style="flex:1">${esFoco ? '◉ Es tu foco de la semana' : 'Hacerlo foco de la semana'}</button>
    </div>` : ''}
    <div class="sheet-acciones">
      ${p ? '<button type="button" class="btn-borrar" id="pBorrar">Borrar</button>' : ''}
      <button type="button" class="btn-primario" id="pGuardar">Guardar</button>
    </div>
  `, cuerpo => {
    $('#pColores', cuerpo).addEventListener('click', ev => {
      const b = ev.target.closest('[data-color]');
      if (!b) return;
      color = b.dataset.color;
      $$('[data-color]', cuerpo).forEach(x => x.style.opacity = x === b ? 1 : .42);
    });

    const bf = $('#pFoco', cuerpo);
    if (bf) bf.onclick = () => {
      db.datos.config.focoPilarId = esFoco ? null : p.id;
      db.datos.config.focoSemana = semanaISO(new Date());
      db.guardar(); cerrarSheet(); render();
      avisar(esFoco ? 'Sin foco esta semana' : `Foco: ${p.nombre}`);
    };

    $('#pGuardar', cuerpo).onclick = () => {
      const nombre = $('#pNombre', cuerpo).value.trim();
      if (!nombre) return avisar('Falta el nombre');
      const definicion = $('#pDef', cuerpo).value.trim();
      if (p){
        Object.assign(p, { nombre, definicion, color });
      }else{
        db.datos.pilares.push({ id:uid(), nombre, definicion, color, orden:db.datos.pilares.length });
      }
      db.guardar(); cerrarSheet(); render(); avisar('Guardado');
    };

    const bb = $('#pBorrar', cuerpo);
    if (bb) bb.onclick = () => {
      const n = db.datos.maximas.filter(m => m.pilarId === p.id).length;
      if (!confirm(n
        ? `Este pilar tiene ${n} máxima(s). Se van a quedar sin pilar. ¿Borrar igual?`
        : '¿Borrar este pilar?')) return;
      db.datos.pilares = db.datos.pilares.filter(x => x.id !== p.id);
      db.datos.maximas.forEach(m => { if (m.pilarId === p.id) m.pilarId = null; });
      if (db.datos.config.focoPilarId === p.id) db.datos.config.focoPilarId = null;
      db.guardar(); cerrarSheet(); render();
    };
  });
}

/* ---------- editor de nota ---------- */

function editarNota(id){
  const n = id ? db.datos.notas.find(x => x.id === id) : null;
  let maximaSel = n?.maximaId || null;

  const listaMx = [...db.datos.maximas]
    .sort((a,b) => a.texto.localeCompare(b.texto))
    .map(m => `<option value="${m.id}" ${m.id === maximaSel ? 'selected' : ''}>${esc(m.texto.slice(0,70))}</option>`)
    .join('');

  abrirSheet(`
    <h3>${n ? 'Nota' : 'Nueva nota'}</h3>
    <div class="campo">
      <label>Qué pasó</label>
      <textarea id="nTexto" rows="5" placeholder="Un hecho concreto de hoy.">${esc(n?.texto || '')}</textarea>
    </div>
    <div class="campo">
      <label>Atada a una máxima (opcional)</label>
      <select id="nMaxima">
        <option value="">— ninguna —</option>
        ${listaMx}
      </select>
    </div>
    <div class="sheet-acciones">
      ${n ? '<button type="button" class="btn-borrar" id="nBorrar">Borrar</button>' : ''}
      <button type="button" class="btn-primario" id="nGuardar">Guardar</button>
    </div>
  `, cuerpo => {
    $('#nGuardar', cuerpo).onclick = () => {
      const texto = $('#nTexto', cuerpo).value.trim();
      if (!texto) return avisar('Escribí algo');
      const mid = $('#nMaxima', cuerpo).value || null;
      const pid = mid ? maximaDe(mid)?.pilarId : null;
      if (n){
        Object.assign(n, { texto, maximaId:mid, pilarId:pid });
      }else{
        db.datos.notas.push({ id:uid(), texto, maximaId:mid, pilarId:pid, fecha:new Date().toISOString() });
      }
      db.guardar(); cerrarSheet(); render(); avisar('Guardado');
    };
    const bb = $('#nBorrar', cuerpo);
    if (bb) bb.onclick = () => {
      if (!confirm('¿Borrar esta nota?')) return;
      db.datos.notas = db.datos.notas.filter(x => x.id !== n.id);
      db.guardar(); cerrarSheet(); render();
    };
  });
}

/* ---------- elegir foco de la semana ---------- */

function elegirFoco(){
  const actual = db.datos.config.focoPilarId;
  abrirSheet(`
    <h3>Foco de la semana</h3>
    <p class="view-sub" style="margin-top:-8px">
      Elegí un solo pilar. Durante la semana las máximas de ese pilar
      van a aparecer mucho más seguido en Hoy.
    </p>
    ${opcionesPilar(actual)}
    <div class="sheet-acciones">
      <button type="button" class="btn-sec" id="sinFoco" style="flex:1">Sin foco</button>
    </div>
  `, cuerpo => {
    cuerpo.addEventListener('click', ev => {
      const b = ev.target.closest('[data-pick-pilar]');
      if (!b) return;
      db.datos.config.focoPilarId = b.dataset.pickPilar;
      db.datos.config.focoSemana = semanaISO(new Date());
      db.datos.config.hoy = null;                   // rehacer la elección con el nuevo sesgo
      db.guardar(); cerrarSheet(); render();
      avisar(`Foco: ${pilarDe(db.datos.config.focoPilarId).nombre}`);
    });
    $('#sinFoco', cuerpo).onclick = () => {
      db.datos.config.focoPilarId = null;
      db.guardar(); cerrarSheet(); render();
    };
  });
}

/* ============================================================
   13. RECORDATORIO DE LA MAÑANA
   ------------------------------------------------------------
   Una PWA no puede programar una alarma del sistema. Lo que sí
   podemos: pedir permiso, y disparar el aviso cuando el momento
   llega estando la app viva o el service worker despierto. En
   Android instalada anda bien; en iPhone hay que agregarla a la
   pantalla de inicio. Si querés garantía total, después le
   enchufamos Web Push desde Supabase.
   ============================================================ */

let timerNotif = null;

async function pedirPermiso(){
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

function programarNotif(){
  clearTimeout(timerNotif);
  const cfg = db.datos.config;
  if (!cfg.notif || Notification?.permission !== 'granted') return;

  const [h, mi] = cfg.hora.split(':').map(Number);
  const ahora = new Date();
  const objetivo = new Date();
  objetivo.setHours(h, mi, 0, 0);
  if (objetivo <= ahora) objetivo.setDate(objetivo.getDate() + 1);

  const ms = Math.min(objetivo - ahora, 2147483000);
  timerNotif = setTimeout(() => { dispararNotif(); programarNotif(); }, ms);
}

async function dispararNotif(){
  const cfg = db.datos.config;
  const hoy = fechaISO();
  if (cfg.ultimoAviso === hoy) return;

  const m = maximaDeHoy();
  if (!m) return;
  cfg.ultimoAviso = hoy;
  db.guardar();

  const cuerpo = m.texto + (m.fuente ? `\n— ${m.fuente}` : '');
  try{
    const reg = await navigator.serviceWorker?.ready;
    if (reg) reg.showNotification('Buen día', { body:cuerpo, icon:'icons/icon-192.png', badge:'icons/icon-192.png', tag:'cimientos-diario' });
    else new Notification('Buen día', { body:cuerpo, icon:'icons/icon-192.png' });
  }catch(e){ /* sin drama: el ritual sigue siendo abrir la app */ }
}

// Si la app estuvo cerrada y se abre pasada la hora, mostramos el aviso igual.
function chequeoAlAbrir(){
  const cfg = db.datos.config;
  if (!cfg.notif || Notification?.permission !== 'granted') return;
  const [h, mi] = cfg.hora.split(':').map(Number);
  const ahora = new Date();
  const objetivo = new Date(); objetivo.setHours(h, mi, 0, 0);
  if (ahora >= objetivo && cfg.ultimoAviso !== fechaISO()) dispararNotif();
}

/* ============================================================
   14. RESPALDO
   ============================================================ */

function exportar(){
  const blob = new Blob([JSON.stringify(db.datos, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cimientos-${fechaISO()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  avisar('Respaldo descargado');
}

function importar(archivo){
  const lector = new FileReader();
  lector.onload = () => {
    try{
      const d = JSON.parse(lector.result);
      if (!Array.isArray(d.pilares) || !Array.isArray(d.maximas)) throw new Error('formato');
      if (!confirm('Esto reemplaza todo lo que tenés ahora. ¿Seguimos?')) return;

      d.notas     ??= [];
      d.registros ??= [];
      d.config    ??= {};
      d.config.hora    ??= '07:30';
      d.config.notif   ??= false;
      d.config.miNombre ??= 'Yo';

      db.datos = d;
      db.guardar();
      ir('hoy'); avisar('Importado');
    }catch(e){ avisar('El archivo no es un respaldo válido'); }
  };
  lector.readAsText(archivo);
}

/* ============================================================
   14b. CONSTELACIÓN
   ------------------------------------------------------------
   Las frases dejan de ser una lista y pasan a ser un lugar.
   Cada pilar es una región; las frases del mismo pilar quedan
   unidas por hilos tenues y las que comparten autor por un hilo
   propio. Los cimientos brillan. Se arrastra para navegar y la
   cámara sigue con inercia, para que se sienta flotar y no saltar.
   ============================================================ */

const cosmos = {
  activo:false, lienzo:null, ctx:null, raf:null,
  W:0, H:0, dpr:1, t:0,
  cam:{ x:0, y:0, vx:0, vy:0 },
  nodos:[], nucleos:[], estrellas:[],
  sel:null, arrastrando:false,

  abrir(){
    this.lienzo = $('#cosmosLienzo');
    this.ctx = this.lienzo.getContext('2d');
    this.construir();
    $('#cosmos').hidden = false;
    document.body.style.overflow = 'hidden';
    this.activo = true;
    this.medir();

    // arrancamos mirando la región del pilar de la semana
    const foco = this.nucleos.find(n => n.id === db.datos.config.focoPilarId) || this.nucleos[0];
    this.cam.x = foco ? foco.x : 0;
    this.cam.y = foco ? foco.y : 0;
    this.cam.vx = this.cam.vy = 0;

    this.seleccionar(null);
    const pista = $('#cosmosPista');
    pista.classList.remove('ida');
    setTimeout(() => pista.classList.add('ida'), 4200);

    this.loop();
  },

  cerrar(){
    this.activo = false;
    cancelAnimationFrame(this.raf);
    $('#cosmos').hidden = true;
    document.body.style.overflow = '';
    render();
  },

  medir(){
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = this.lienzo.clientWidth;
    this.H = this.lienzo.clientHeight;
    this.lienzo.width  = this.W * this.dpr;
    this.lienzo.height = this.H * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  },

  // Reparte los pilares en un anillo y las frases alrededor del suyo,
  // con una espiral de ángulo áureo para que no se amontonen.
  construir(){
    const ps = [...db.datos.pilares].sort((a,b) => a.orden - b.orden);
    // Las regiones tienen que quedar lo bastante cerca para que desde una
    // se intuyan las vecinas: si no, no se siente un ecosistema sino islas.
    const R = 215 + ps.length * 17;
    const AUREO = Math.PI * (3 - Math.sqrt(5));

    this.nucleos = ps.map((p, i) => {
      const ang = (i / Math.max(ps.length,1)) * Math.PI * 2 - Math.PI/2;
      return { id:p.id, nombre:p.nombre, color:p.color, x:Math.cos(ang)*R, y:Math.sin(ang)*R };
    });

    const porPilar = {};
    this.nodos = db.datos.maximas.map(m => {
      const n = this.nucleos.find(x => x.id === m.pilarId);
      const k = m.pilarId || '_';
      const i = (porPilar[k] = (porPilar[k] ?? 0) + 1) - 1;
      const rad = 68 + Math.sqrt(i) * 36;   // 68 deja libre el centro para el rótulo
      const ang = i * AUREO;
      return {
        m,
        color: n?.color || '#8a8a99',
        bx: (n ? n.x : 0) + Math.cos(ang) * rad,
        by: (n ? n.y : 0) + Math.sin(ang) * rad,
        fase: Math.random() * Math.PI * 2,
        amp: 4 + Math.random() * 7,
        vel: 0.10 + Math.random() * 0.16,
        x:0, y:0, sx:0, sy:0
      };
    });

    this.estrellas = Array.from({length:220}, () => ({
      x:(Math.random()-.5) * 2600,
      y:(Math.random()-.5) * 2600,
      r:Math.random() * 1.2 + .3,
      a:Math.random() * .55 + .25
    }));
  },

  radioDe(nd){
    const m = nd.m;
    const n = diasDe(m);
    let r = 3.2 + Math.min(n, 365) ** 0.42 * 0.62;   // crece rápido al principio y después se calma
    if (m.favorita) r += 1.2;
    return r;
  },

  alfaDe(nd){
    const n = diasDe(nd.m);
    return n >= 365 ? 1 : n >= 90 ? .92 : n >= 12 ? .82 : n > 0 ? .7 : .55;
  },

  // ¿qué frases se muestran con el texto siempre a la vista?
  rotulada(nd){
    return enManifiesto(nd.m) || nd.m.favorita || nd === this.sel;
  },

  seleccionar(nd){
    this.sel = nd;
    const carta = $('#cosmosCarta');
    if (!nd){ carta.hidden = true; return; }

    const m = nd.m;
    const p = pilarDe(m.pilarId);
    carta.hidden = false;
    carta.style.setProperty('--c', nd.color);
    $('#ccPilar').textContent = p?.nombre || 'Sin pilar';
    $('#ccTexto').textContent = m.texto;

    const partes = [gradoDe(m).nombre];
    if (m.fuente) partes.push(m.fuente);
    if (diasDe(m)) partes.push(`${diasDe(m)} días`);
    if (m.favorita) partes.push('★');
    $('#ccPie').textContent = partes.join('   ·   ');
    vibrar(8);
  },

  enPantalla(nd){
    nd.sx = (nd.x - this.cam.x) + this.W/2;
    nd.sy = (nd.y - this.cam.y) + this.H/2;
  },

  golpe(px, py){
    let mejor = null, mejorD = 26;
    for (const nd of this.nodos){
      const d = Math.hypot(nd.sx - px, nd.sy - py);
      if (d < mejorD){ mejorD = d; mejor = nd; }
    }
    return mejor;
  },

  loop(){
    if (!this.activo) return;
    this.t += 1/60;
    const { ctx, W, H } = this;

    // inercia de la cámara
    if (!this.arrastrando){
      this.cam.x += this.cam.vx; this.cam.y += this.cam.vy;
      this.cam.vx *= 0.94; this.cam.vy *= 0.94;
      if (Math.abs(this.cam.vx) < 0.02) this.cam.vx = 0;
      if (Math.abs(this.cam.vy) < 0.02) this.cam.vy = 0;
    }

    ctx.clearRect(0, 0, W, H);

    // fondo de estrellas, con parallax para dar profundidad
    for (const e of this.estrellas){
      const sx = (e.x - this.cam.x * 0.34) + W/2;
      const sy = (e.y - this.cam.y * 0.34) + H/2;
      if (sx < -20 || sx > W+20 || sy < -20 || sy > H+20) continue;
      ctx.beginPath();
      ctx.arc(sx, sy, e.r, 0, 7);
      ctx.fillStyle = `rgba(255,255,255,${e.a * (0.6 + 0.4*Math.sin(this.t*0.5 + e.x))})`;
      ctx.fill();
    }

    // posición flotante de cada nodo
    for (const nd of this.nodos){
      nd.x = nd.bx + Math.cos(this.t * nd.vel + nd.fase) * nd.amp;
      nd.y = nd.by + Math.sin(this.t * nd.vel * 0.83 + nd.fase) * nd.amp;
      this.enPantalla(nd);
    }

    // hilos: mismo pilar (tenue) y mismo autor (más marcado)
    for (let i = 0; i < this.nodos.length; i++){
      for (let j = i+1; j < this.nodos.length; j++){
        const a = this.nodos[i], b = this.nodos[j];
        const mismoPilar = a.m.pilarId && a.m.pilarId === b.m.pilarId;
        const mismoAutor = a.m.fuente && normal(a.m.fuente) === normal(b.m.fuente);
        if (!mismoPilar && !mismoAutor) continue;

        const d = Math.hypot(a.sx - b.sx, a.sy - b.sy);
        if (d > 230) continue;
        if (Math.max(a.sx,b.sx) < -40 || Math.min(a.sx,b.sx) > W+40) continue;

        const cerca = 1 - d/230;
        const tocado = this.sel && (a === this.sel || b === this.sel);
        let alfa = (mismoAutor ? 0.20 : 0.075) * cerca;
        if (tocado) alfa = Math.min(0.6, alfa * 4.5 + 0.14);

        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.strokeStyle = hexA(tocado ? (this.sel.color) : (mismoAutor ? '#cbb994' : a.color), alfa);
        ctx.lineWidth = mismoAutor ? 1 : 0.7;
        if (mismoAutor && !tocado) ctx.setLineDash([2,5]); else ctx.setLineDash([]);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    // núcleo de cada pilar: el nombre de la región
    for (const n of this.nucleos){
      const sx = (n.x - this.cam.x) + W/2;
      const sy = (n.y - this.cam.y) + H/2;
      if (sx < -160 || sx > W+160 || sy < -80 || sy > H+80) continue;

      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 190);
      g.addColorStop(0, hexA(n.color, 0.18));
      g.addColorStop(1, hexA(n.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy, 190, 0, 7); ctx.fill();

      // el nombre de la región es fondo, no contenido: tiene que leerse
      // sin competir con las frases
      ctx.font = '600 9.5px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = hexA(n.color, 0.5);
      ctx.fillText(n.nombre.toUpperCase().split('').join(' '), sx, sy + 3);
    }

    // nodos
    for (const nd of this.nodos){
      if (nd.sx < -60 || nd.sx > W+60 || nd.sy < -60 || nd.sy > H+60) continue;
      const r = this.radioDe(nd);
      const a = this.alfaDe(nd);

      if (enManifiesto(nd.m) || nd === this.sel){
        const g = ctx.createRadialGradient(nd.sx, nd.sy, 0, nd.sx, nd.sy, r*4.5);
        g.addColorStop(0, hexA(nd.color, .34));
        g.addColorStop(1, hexA(nd.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(nd.sx, nd.sy, r*4.5, 0, 7); ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(nd.sx, nd.sy, r, 0, 7);
      ctx.fillStyle = hexA(nd.color, a);
      ctx.fill();

      if (nd === this.sel){
        const pulso = r + 7 + Math.sin(this.t*2.6) * 2.4;
        ctx.beginPath(); ctx.arc(nd.sx, nd.sy, pulso, 0, 7);
        ctx.strokeStyle = hexA(nd.color, .75);
        ctx.lineWidth = 1.2; ctx.stroke();
      }

      if (this.rotulada(nd)){
        ctx.font = '11px -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(240,235,227,${nd === this.sel ? .92 : .42})`;
        ctx.fillText(recortar(nd.m.texto, 30), nd.sx, nd.sy + r + 15);
      }
    }

    this.raf = requestAnimationFrame(() => this.loop());
  }
};

const hexA = (hex, a) => {
  const h = String(hex).replace('#','');
  const n = parseInt(h.length === 3 ? h.split('').map(c=>c+c).join('') : h, 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
};

const recortar = (s, n) => s.length > n ? s.slice(0, n-1).trimEnd() + '…' : s;

function cablearCosmos(){
  const lienzo = $('#cosmosLienzo');
  let px = 0, py = 0, movido = 0, t0 = 0;

  lienzo.addEventListener('pointerdown', ev => {
    cosmos.arrastrando = true;
    lienzo.classList.add('agarrando');
    try{ lienzo.setPointerCapture(ev.pointerId); }catch(e){ /* algunos navegadores lo rechazan */ }
    px = ev.clientX; py = ev.clientY; movido = 0; t0 = Date.now();
    cosmos.cam.vx = cosmos.cam.vy = 0;
  });

  lienzo.addEventListener('pointermove', ev => {
    if (!cosmos.arrastrando) return;
    const dx = ev.clientX - px, dy = ev.clientY - py;
    px = ev.clientX; py = ev.clientY;
    movido += Math.abs(dx) + Math.abs(dy);
    cosmos.cam.x -= dx; cosmos.cam.y -= dy;
    cosmos.cam.vx = -dx; cosmos.cam.vy = -dy;
  });

  const soltar = ev => {
    if (!cosmos.arrastrando) return;
    cosmos.arrastrando = false;
    lienzo.classList.remove('agarrando');

    // poco movimiento y rápido: fue un toque, no un arrastre
    if (movido < 8 && Date.now() - t0 < 400){
      cosmos.cam.vx = cosmos.cam.vy = 0;
      const r = lienzo.getBoundingClientRect();
      cosmos.seleccionar(cosmos.golpe(ev.clientX - r.left, ev.clientY - r.top));
      $('#cosmosPista').classList.add('ida');
    }
  };
  lienzo.addEventListener('pointerup', soltar);
  lienzo.addEventListener('pointercancel', soltar);

  $('#btnCosmos').onclick = () => cosmos.abrir();
  $('#cosmosSalir').onclick = () => cosmos.cerrar();

  $('#ccResono').onclick = () => {
    if (!cosmos.sel) return;
    sumarResonancia(cosmos.sel.m);
    cosmos.seleccionar(cosmos.sel);
  };
  $('#ccAbrir').onclick = () => {
    if (!cosmos.sel) return;
    const id = cosmos.sel.m.id;
    cosmos.cerrar();
    setTimeout(() => verMaxima(id), 180);
  };

  window.addEventListener('resize', () => { if (cosmos.activo) cosmos.medir(); });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && cosmos.activo) cosmos.cerrar();
  });
}

/* ============================================================
   15. CABLEADO
   ============================================================ */

function cablear(){
  // navegación
  $('#nav').addEventListener('click', ev => {
    const b = ev.target.closest('[data-goto]');
    if (b) ir(b.dataset.goto);
  });

  // ---- HOY ----
  $('#accResono').onclick   = resonar;
  $('#accFav').onclick      = () => {
    const m = maximaDe(db.datos.config.hoy?.maximaId); if (!m) return;
    m.favorita = !m.favorita; db.guardar(); vibrar();
    const b = $('#accFav'); b.classList.remove('pulso'); void b.offsetWidth; b.classList.add('pulso');
    renderHoy(); avisar(m.favorita ? '★ Favorita' : 'Sacada de favoritas');
  };
  $('#accEscribir').onclick = () => {
    const m = maximaDe(db.datos.config.hoy?.maximaId);
    m ? verMaxima(m.id) : editarNota();
  };
  $('#accOtra').onclick = () => {
    const actual = db.datos.config.hoy?.maximaId;
    const otra = elegirMaxima(actual);
    if (!otra) return;
    db.datos.config.hoy = { fecha:fechaISO(), maximaId:otra.id };
    otra.ultimaVista = new Date().toISOString();
    db.guardar(); renderHoy();
  };
  $('#btnFoco').onclick = elegirFoco;

  $('.cierre-opts').addEventListener('click', ev => {
    const b = ev.target.closest('[data-practica]');
    if (!b) return;
    const hoy = fechaISO();
    db.datos.registros = db.datos.registros.filter(r => r.fecha !== hoy);
    db.datos.registros.push({ fecha:hoy, maximaId:db.datos.config.hoy?.maximaId, practica:b.dataset.practica });
    db.guardar(); vibrar(); renderHoy();
  });
  $('#cierreDeshacer').onclick = () => {
    db.datos.registros = db.datos.registros.filter(r => r.fecha !== fechaISO());
    db.guardar(); renderHoy();
  };

  // ---- PILARES ----
  $('#btnNuevoPilar').onclick = () => editarPilar();
  $('#pilaresLista').addEventListener('click', ev => {
    const c = ev.target.closest('[data-pilar]');
    if (c) editarPilar(c.dataset.pilar);
  });

  // ---- MÁXIMAS ----
  $('#btnNuevaMaxima').onclick = () => editarMaxima();
  $('#buscar').addEventListener('input', e => { textoBusqueda = e.target.value; renderMaximas(); });
  $('#filtrosEstado').addEventListener('click', ev => {
    const b = ev.target.closest('[data-estado]');
    if (!b) return;
    filtroEstado = b.dataset.estado; renderMaximas();
  });
  $('#filtrosPilar').addEventListener('click', ev => {
    const b = ev.target.closest('[data-pilar]');
    if (!b) return;
    filtroPilar = b.dataset.pilar || null; renderMaximas();
  });
  $('#maximasLista').addEventListener('click', ev => {
    const c = ev.target.closest('[data-maxima]');
    if (c) verMaxima(c.dataset.maxima);
  });

  // ---- DIARIO ----
  $('#btnAgregarDiario').onclick = () => segDiario === 'notas' ? editarNota() : nuevoDialogo();
  $('#segDiario').addEventListener('click', ev => {
    const b = ev.target.closest('[data-seg]');
    if (!b) return;
    segDiario = b.dataset.seg; renderDiario();
  });
  $('#diarioLista').addEventListener('click', ev => {
    const d = ev.target.closest('[data-dialogo]');
    if (d) return verDialogo(d.dataset.dialogo);
    const c = ev.target.closest('[data-nota]');
    if (c) editarNota(c.dataset.nota);
  });

  // ---- MANIFIESTO ----
  $('#btnCompartir').onclick = async () => {
    const t = textoManifiesto();
    if (!t) return avisar('Todavía no hay cimientos');
    try{ await navigator.clipboard.writeText(t); avisar('Copiado'); }
    catch(e){ avisar('No pude copiar'); }
  };

  // ---- AJUSTES ----
  $('#setNotif').onchange = async e => {
    if (e.target.checked){
      const ok = await pedirPermiso();
      if (!ok){ e.target.checked = false; renderAjustes(); return avisar('No diste permiso de notificaciones'); }
    }
    db.datos.config.notif = e.target.checked;
    db.guardar(); programarNotif(); renderAjustes();
  };
  $('#setHora').onchange = e => {
    db.datos.config.hora = e.target.value || '07:30';
    db.guardar(); programarNotif();
  };
  $('#setMiNombre').onchange = e => {
    db.datos.config.miNombre = e.target.value.trim() || 'Yo';
    e.target.value = db.datos.config.miNombre; db.guardar();
  };
  $('#btnExportar').onclick = exportar;
  $('#btnImportar').onclick = () => $('#fileImportar').click();
  $('#fileImportar').onchange = e => { if (e.target.files[0]) importar(e.target.files[0]); e.target.value = ''; };
  $('#btnReset').onclick = () => {
    if (!confirm('Se borra todo: pilares, máximas, notas. ¿Seguro?')) return;
    if (!confirm('En serio, no hay vuelta atrás. ¿Confirmás?')) return;
    db.reset(); ir('hoy'); avisar('Todo de cero');
  };

  // acceso a ajustes desde el título de Hoy
  $('#hoyFecha').onclick = () => ir('ajustes');

  // ---- AUTORES ----
  // Delegación global: el nombre del autor es tocable esté donde esté
  // (en Hoy o dentro de una hoja ya abierta).
  document.addEventListener('click', ev => {
    const a = ev.target.closest('.autor-link');
    if (!a) return;
    ev.preventDefault(); ev.stopPropagation();
    const nombre = a.dataset.autor;
    if (!$('#sheet').hidden){ cerrarSheet(); setTimeout(() => verAutor(nombre), 180); }
    else verAutor(nombre);
  });

  // ---- SHEET ----
  $('#sheet').addEventListener('click', ev => {
    if (ev.target.closest('[data-cerrar]')) cerrarSheet();
  });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && !$('#sheet').hidden) cerrarSheet();
  });

  // al volver a la app: ¿cambió el día?
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    chequeoAlAbrir();
    if (db.datos.config.hoy && db.datos.config.hoy.fecha !== fechaISO()) render();
  });
}

/* ============================================================
   16. ARRANQUE
   ============================================================ */

db.cargar();

// El foco es semanal: si cambió la semana, avisamos para reelegir.
(function chequeoSemana(){
  const cfg = db.datos.config;
  const s = semanaISO(new Date());
  if (cfg.focoPilarId && cfg.focoSemana && cfg.focoSemana !== s){
    cfg.focoVencido = true;
    cfg.focoSemana = s;
    db.guardar();
  }
})();

cablear();
cablearCosmos();
ir('hoy');
programarNotif();
chequeoAlAbrir();

if (db.datos.config.focoVencido){
  db.datos.config.focoVencido = false; db.guardar();
  setTimeout(() => avisar('Semana nueva: ¿seguís con el mismo foco?'), 900);
}

if ('serviceWorker' in navigator){
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
