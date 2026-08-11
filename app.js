/* ============================================================
   Cimientos — lógica
   ------------------------------------------------------------
   Toda la persistencia pasa por el objeto `db` de más abajo.
   Es el único lugar que toca el almacenamiento: cuando pasemos
   a Supabase multiusuario, se reemplaza ese bloque y nada más.
   ============================================================ */

/* ============================================================
   0. CONFIGURACIÓN DE SINCRONIZACIÓN
   ------------------------------------------------------------
   Estos dos valores son públicos por diseño (la clave es la
   "publishable", pensada para vivir en el navegador). Lo que
   protege los datos es RLS: cada persona sólo ve su fila.
   Vacíos = la app funciona igual, pero sólo en este dispositivo.
   ============================================================ */

const SUPABASE_URL = 'https://gvaiubytcvevuuirrhpf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_i2JaS0RNbus_z858nCe6sw_EKBDXfqO';

// El proyecto es compartido con Mis Finanzas por decisión del dueño, así que
// la tabla va con prefijo: nada de esta app puede pisar nada de la otra.
const TABLA = 'cimientos_estado';

const HAY_NUBE = !!(SUPABASE_URL && SUPABASE_KEY);

/* ============================================================
   1. CAPA DE DATOS
   ============================================================ */

const CLAVE = 'cimientos.v1';
const CLAVE_RESGUARDO = 'cimientos.v1.resguardo';

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
    d.libros   ??= librosBase();
    d.lecturas ??= [];
    d.dialogos ??= [];
    d.notas    ??= [];
    d.registros ??= [];
    d.config   ??= {};
    d.config.hora    ??= '07:30';
    d.config.notif   ??= false;
    d.config.miNombre ??= 'Yo';
    d.config.tema    ??= 'auto';
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

  // Guardar es siempre local y sincrónico: la app no espera a la red nunca.
  // La subida a la nube va aparte, en diferido.
  guardar(){
    this.datos.actualizado = new Date().toISOString();
    try{
      localStorage.setItem(CLAVE, JSON.stringify(this.datos));
    }catch(e){
      avisar('No pude guardar (almacenamiento lleno)');
    }
    nube.programarSubida();
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
    libros: librosBase(),
    lecturas: [],
    dialogos: [],
    notas: [],
    registros: [],
    config: {
      focoPilarId: foco.id,
      focoSemana: semanaISO(new Date()),
      miNombre: 'Yo',
      tema: 'auto',
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

/* ------------------------------------------------------------
   Lecturas.
   Pocos y buenos, uno por tema. Cada ficha dice de qué va y con
   qué te quedás — no un resumen que te ahorre leerlo, sino lo
   justo para decidir si es tu momento para ese libro.
   ------------------------------------------------------------ */

function librosBase(){
  const L = (pilar, titulo, autor, anio, unaLinea, deQueVa, moraleja) =>
    ({ id:uid(), pilar, titulo, autor, anio, unaLinea, deQueVa, moraleja });

  return [
    // ---------- Humildad ----------
    L('Humildad', 'Meditaciones', 'Marco Aurelio', 'siglo II',
      'El diario privado del hombre más poderoso de su tiempo.',
      'No es un libro: son los cuadernos que escribía de noche, en campaña, para acordarse al día siguiente de cómo comportarse. Vuelve una y otra vez sobre lo mismo, como quien se corrige.',
      'Que el que más motivos tenía para creérsela usó la escritura justamente para no creérsela.'),

    L('Humildad', 'El ego es el enemigo', 'Ryan Holiday', '2016',
      'Contra la voz que te dice que ya llegaste.',
      'Recorre tres momentos —cuando aspirás, cuando tenés éxito y cuando fracasás— y muestra que el ego sabotea en los tres, con casos concretos de gente que se lo comió y de gente que lo esquivó.',
      'El ego no aparece cuando perdés: aparece cuando ganás, y ahí es cuando más caro sale.'),

    L('Humildad', 'Pensar rápido, pensar despacio', 'Daniel Kahneman', '2011',
      'Por qué tu cabeza te miente y ni te enterás.',
      'El premio Nobel de Economía explica los dos modos de pensar: uno rápido, automático e intuitivo, y otro lento y deliberado. La mayoría de nuestros errores vienen de dejar decidir al primero cuando hacía falta el segundo.',
      'Humildad de verdad no es dudar de lo que sabés, es saber que tu intuición tiene fallas sistemáticas y predecibles.'),

    // ---------- Foco ----------
    L('Foco', 'Céntrate (Deep Work)', 'Cal Newport', '2016',
      'La concentración profunda como habilidad escasa.',
      'Argumenta que la capacidad de trabajar concentrado sin distracción se está volviendo rara justo cuando se vuelve más valiosa, y propone rutinas concretas para recuperarla.',
      'Lo que hacés con atención partida no es una versión más lenta del buen trabajo: es otra cosa, peor.'),

    L('Foco', 'Esencialismo', 'Greg McKeown', '2014',
      'Menos cosas, pero mejor.',
      'No es sobre hacer más en menos tiempo, es sobre hacer menos. Distingue entre lo que parece urgente y lo que realmente importa, y trata al “no” como una habilidad que se entrena.',
      'Si no elegís vos en qué gastás tu tiempo, va a elegir otro.'),

    L('Foco', 'Sobre la brevedad de la vida', 'Séneca', 'siglo I',
      'Una carta a un amigo que se queja de no tener tiempo.',
      'Corto y filoso. Sostiene que la vida no es breve: la hacemos breve. Somos avaros con el dinero y regalamos las horas a cualquiera que las pida.',
      'Nadie te va a devolver el tiempo. Es lo único que prestás sin poder cobrarlo.'),

    // ---------- Energía ----------
    L('Energía', 'Hábitos atómicos', 'James Clear', '2018',
      'Cambios de 1% que se acumulan.',
      'El sistema práctico más claro que hay sobre cómo se forma y se rompe un hábito: hacerlo obvio, atractivo, fácil y satisfactorio. Lleno de mecánica aplicable, poca arenga.',
      'No subís al nivel de tus objetivos: caés al nivel de tus sistemas.'),

    L('Energía', 'El poder de los hábitos', 'Charles Duhigg', '2012',
      'Cómo funciona el bucle señal → rutina → recompensa.',
      'Más narrativo que el de Clear: cuenta casos de personas, empresas y hasta ciudades que cambiaron al cambiar un solo hábito clave. Explica el mecanismo antes de darte la receta.',
      'No hace falta rehacerse entero. Un hábito bien elegido arrastra a los demás.'),

    L('Energía', 'Mindset', 'Carol Dweck', '2006',
      'Creer que se puede mejorar, cambia si mejorás.',
      'Investigación de décadas sobre dos formas de pararse frente a la dificultad: creer que las capacidades son fijas o creer que se desarrollan. La diferencia predice qué hacés cuando algo te sale mal.',
      'El talento decide dónde arrancás. Lo que pensás del esfuerzo decide dónde terminás.'),

    // ---------- Intención ----------
    L('Intención', 'Cómo ganar amigos e influir sobre las personas', 'Dale Carnegie', '1936',
      'Viejo, algo naíf, y todavía el mejor del tema.',
      'Reglas simples sobre interés genuino, escuchar y hacer sentir importante al otro. Se le nota la época y a veces suena a manual de vendedor, pero el fondo aguantó noventa años.',
      'A casi nadie le interesa tu opinión tanto como su propia experiencia. Preguntá más.'),

    L('Intención', 'Comunicación no violenta', 'Marshall Rosenberg', '1999',
      'Cómo decir lo difícil sin romper el vínculo.',
      'Un método de cuatro pasos —observación, sentimiento, necesidad, pedido— para hablar de lo que molesta sin acusar. Suena mecánico al leerlo y funciona sorprendentemente bien al usarlo.',
      'Casi todo reproche es una necesidad mal dicha.'),

    L('Intención', 'Los siete hábitos de la gente altamente efectiva', 'Stephen Covey', '1989',
      'El clásico, más profundo de lo que su fama sugiere.',
      'A pesar del título de autoayuda, es un libro sobre carácter antes que sobre técnica. El quinto hábito —buscar primero entender y después ser entendido— vale por todo el resto.',
      'La confianza no se pide ni se declara: se acumula en depósitos chiquitos y se gasta rápido.'),

    // ---------- Ser buena gente ----------
    L('Ser buena gente', 'Dar y recibir', 'Adam Grant', '2013',
      'Los generosos terminan arriba o abajo, nunca en el medio.',
      'Investigación sobre tres formas de vincularse: dar, recibir o equilibrar. Los que más dan aparecen en los dos extremos del éxito, y el libro explica qué separa a unos de otros.',
      'Ser generoso funciona, siempre que no confundas generosidad con no saber decir que no.'),

    L('Ser buena gente', 'El hombre en busca de sentido', 'Viktor Frankl', '1946',
      'Escrito por un psiquiatra que sobrevivió a los campos.',
      'La primera mitad es su testimonio en Auschwitz; la segunda, la terapia que construyó a partir de eso. Es duro, es corto y no tiene una sola línea de autocompasión.',
      'Te pueden sacar todo menos una cosa: elegir tu actitud frente a lo que te toca.'),

    L('Ser buena gente', 'Los dones de la imperfección', 'Brené Brown', '2010',
      'Mostrarte incompleto como forma de conectar.',
      'Investigación sobre vergüenza y vulnerabilidad. Sostiene que la coraza que te protege de que te lastimen es la misma que te impide que te quieran de verdad.',
      'La vulnerabilidad no es debilidad: es la única puerta por la que entra alguien.')
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
  { min:180, clave:'cimiento',  nombre:'Cimiento' }
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
const esCimiento   = m => diasDe(m) >= 180;

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

// Una frase te acompaña CICLO_DIAS días, no uno. Que aparezca y
// desaparezca al otro día no deja que cale.
const CICLO_DIAS = 3;

function diasDesde(iso){
  if (!iso) return Infinity;
  const [a,m,d] = iso.split('-').map(Number);
  return Math.floor((new Date().setHours(0,0,0,0) - new Date(a, m-1, d).getTime()) / 86400000);
}

// En qué día del ciclo estás (1, 2 o 3).
const diaDelCiclo = () => Math.min(CICLO_DIAS, diasDesde(db.datos.config.hoy?.fecha) + 1);

// Cuántas horas faltan para que la frase rote.
function horasParaCambio(){
  const f = db.datos.config.hoy?.fecha;
  if (!f) return Infinity;
  const [a,m,d] = f.split('-').map(Number);
  const fin = new Date(a, m-1, d);
  fin.setDate(fin.getDate() + CICLO_DIAS);
  fin.setHours(0,0,0,0);
  return (fin - Date.now()) / 3600000;
}

const AVISO_HORAS = 12;

function maximaDeHoy(){
  const cfg = db.datos.config;

  if (cfg.hoy && diasDesde(cfg.hoy.fecha) < CICLO_DIAS){
    const m = maximaDe(cfg.hoy.maximaId);
    if (m) return m;
  }
  const m = elegirMaxima(cfg.hoy?.maximaId);
  if (!m) return null;

  cfg.hoy = { fecha: fechaISO(), maximaId: m.id };
  m.ultimaVista = new Date().toISOString();
  db.guardar();
  return m;
}

// Los recomendados también rotan cada ciclo: tres a la vez, no quince.
function librosDelCiclo(){
  const cfg = db.datos.config;
  if (cfg.libros && diasDesde(cfg.libros.fecha) < CICLO_DIAS){
    const bs = cfg.libros.ids.map(libroDe).filter(Boolean);
    if (bs.length) return bs;
  }
  const foco = pilarDe(cfg.focoPilarId);
  const pool = [...db.datos.libros];
  const elegidos = [];

  // uno del pilar de la semana, si hay; el resto al azar sin repetir
  const delFoco = foco && pool.filter(b => normal(b.pilar) === normal(foco.nombre));
  if (delFoco?.length) elegidos.push(delFoco[Math.floor(Math.random()*delFoco.length)]);

  while (elegidos.length < 3 && elegidos.length < pool.length){
    const b = pool[Math.floor(Math.random()*pool.length)];
    if (!elegidos.includes(b)) elegidos.push(b);
  }
  cfg.libros = { fecha: fechaISO(), ids: elegidos.map(b => b.id) };
  db.guardar();
  return elegidos;
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
  if (vista === 'lecturas')   renderLecturas();
  if (vista === 'manifiesto') renderYo();
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
    `<span class="grado-linea">${esc(lineaDeGrado(m))}</span>` + pistaDePuntos(m, 60) +
    `<span class="ciclo">Día ${diaDelCiclo()} de ${CICLO_DIAS} con esta frase</span>`;

  // Aviso antes de que rote, con tiempo para decidir si te la querés quedar.
  const hs = horasParaCambio();
  const aviso = $('#avisoCambio');
  if (hs > 0 && hs <= AVISO_HORAS){
    aviso.hidden = false;
    aviso.innerHTML = `
      <b>En ${Math.max(1, Math.round(hs))} h cambia la frase.</b>
      ${m.favorita
        ? 'Está en favoritas: va a volver seguido.'
        : 'Si te sirvió, dejala en favoritas y vuelve seguido en vez de perderse.'}`;
  }else{
    aviso.hidden = true;
  }

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
      ? '◆ Medio año volviendo. Ahora sí es un cimiento.'
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
   9b. VISTA — LECTURAS
   ------------------------------------------------------------
   Recomendados por pilar, un escritorio con lo que sigue, y el
   historial de lo leído con lo que te dejó cada uno.
   ============================================================ */

let segLecturas = 'reco';

const lecturaDe = libroId => db.datos.lecturas.find(l => l.libroId === libroId);
const libroDe   = id => db.datos.libros.find(b => b.id === id);

function marcarLectura(libroId, estado){
  let l = lecturaDe(libroId);
  if (!l){
    l = { libroId, estado, agregado:new Date().toISOString(), terminado:null, nota:'' };
    db.datos.lecturas.push(l);
  }else{
    l.estado = estado;
  }
  if (estado === 'leido') l.terminado ??= new Date().toISOString();
  if (estado === 'quitar') db.datos.lecturas = db.datos.lecturas.filter(x => x.libroId !== libroId);
  db.guardar();
}

function renderLecturas(){
  $$('#segLecturas button').forEach(b => b.classList.toggle('on', b.dataset.seg === segLecturas));
  const cont = $('#lecturasLista');

  const sub = {
    reco:       'Pocos y buenos, uno por tema. Tocá uno para ver de qué va.',
    escritorio: 'Lo que decidiste leer. Sin fecha ni presión: es una fila, no una deuda.',
    leidos:     'Lo que ya leíste, y con qué te quedaste de cada uno.'
  };
  $('#lecturasSub').textContent = sub[segLecturas];

  const tarjeta = b => {
    const l = lecturaDe(b.id);
    const p = db.datos.pilares.find(x => normal(x.nombre) === normal(b.pilar));
    return `
      <article class="libro" data-libro="${b.id}" style="--c:${esc(p?.color || 'var(--texto-3)')}">
        <div class="libro-pilar">${esc(b.pilar)}</div>
        <div class="libro-titulo">${esc(b.titulo)}</div>
        <div class="libro-autor">${esc(b.autor)} · ${esc(b.anio)}</div>
        <div class="libro-linea">${esc(b.unaLinea)}</div>
        ${l ? `<div class="libro-tag ${l.estado}">${l.estado === 'leido' ? '✓ Leído'
              : l.estado === 'leyendo' ? '◐ Leyéndolo' : '▤ En el escritorio'}</div>` : ''}
      </article>`;
  };

  if (segLecturas === 'reco'){
    const rota = librosDelCiclo();
    const cabecera = `
      <section class="lec-rotacion">
        <div class="lec-titulo">Estos ${CICLO_DIAS} días</div>
        ${rota.map(tarjeta).join('')}
      </section>`;

    const porPilar = {};
    db.datos.libros.forEach(b => (porPilar[b.pilar] ??= []).push(b));
    cont.innerHTML = cabecera + Object.keys(porPilar).map(nombre => {
      const p = db.datos.pilares.find(x => normal(x.nombre) === normal(nombre));
      return `
        <section class="lec-grupo">
          <div class="lec-titulo" style="--c:${esc(p?.color || 'var(--texto-3)')}">${esc(nombre)}</div>
          ${porPilar[nombre].map(tarjeta).join('')}
        </section>`;
    }).join('');
    return;
  }

  const quiero = segLecturas === 'escritorio'
    ? db.datos.lecturas.filter(l => l.estado === 'escritorio' || l.estado === 'leyendo')
    : db.datos.lecturas.filter(l => l.estado === 'leido');

  if (!quiero.length){
    cont.innerHTML = `<div class="vacio">${segLecturas === 'escritorio'
      ? 'El escritorio está vacío.<br>Elegí uno de los recomendados.'
      : 'Todavía no marcaste ninguno como leído.'}</div>`;
    return;
  }

  cont.innerHTML = quiero
    .sort((a,b) => (b.terminado || b.agregado).localeCompare(a.terminado || a.agregado))
    .map(l => {
      const b = libroDe(l.libroId);
      if (!b) return '';
      return tarjeta(b) + (l.nota ? `<div class="libro-nota">${esc(l.nota)}</div>` : '');
    }).join('');
}

function verLibro(id){
  const b = libroDe(id);
  if (!b) return;
  const l = lecturaDe(id);
  const p = db.datos.pilares.find(x => normal(x.nombre) === normal(b.pilar));

  abrirSheet(`
    <div class="autor-cab">
      <h3>${esc(b.titulo)}</h3>
      <div class="autor-anios">${esc(b.autor)} · ${esc(b.anio)}</div>
      <p class="autor-ident">${esc(b.unaLinea)}</p>
    </div>

    <div class="autor-bloque"><label>De qué va</label><p>${esc(b.deQueVa)}</p></div>
    <div class="autor-bloque">
      <label>Con qué te quedás</label>
      <p class="libro-moraleja" style="--c:${esc(p?.color || '')}">${esc(b.moraleja)}</p>
    </div>

    <div class="campo">
      <label>Dónde ponerlo</label>
      <div class="pick-estado" id="libroEstado">
        <button type="button" data-est="escritorio" class="${l?.estado === 'escritorio' ? 'on' : ''}">Escritorio</button>
        <button type="button" data-est="leyendo" class="${l?.estado === 'leyendo' ? 'on' : ''}">Leyéndolo</button>
        <button type="button" data-est="leido" class="${l?.estado === 'leido' ? 'on' : ''}">Leído</button>
      </div>
    </div>

    <div class="campo">
      <label>Qué te dejó</label>
      <textarea id="libroNota" rows="3" placeholder="Una línea tuya, cuando lo termines.">${esc(l?.nota || '')}</textarea>
      <button type="button" class="btn-primario" id="libroGuardar" style="margin-top:10px;width:100%">Guardar</button>
    </div>

    ${l ? `<div class="sheet-acciones">
      <button type="button" class="btn-borrar" id="libroQuitar">Sacarlo de mi lista</button>
    </div>` : ''}
  `, cuerpo => {
    $('#libroEstado', cuerpo).addEventListener('click', ev => {
      const btn = ev.target.closest('[data-est]');
      if (!btn) return;
      $$('[data-est]', cuerpo).forEach(x => x.classList.toggle('on', x === btn));
      marcarLectura(b.id, btn.dataset.est);
      render();
      avisar(btn.dataset.est === 'leido' ? '✓ Sumado a tus leídos' : '▤ En el escritorio');
    });

    $('#libroGuardar', cuerpo).onclick = () => {
      const nota = $('#libroNota', cuerpo).value.trim();
      let x = lecturaDe(b.id);
      if (!x){ marcarLectura(b.id, 'escritorio'); x = lecturaDe(b.id); }
      x.nota = nota;
      db.guardar(); cerrarSheet(); render(); avisar('Guardado');
    };

    const q = $('#libroQuitar', cuerpo);
    if (q) q.onclick = () => {
      marcarLectura(b.id, 'quitar');
      cerrarSheet(); render();
    };
  });
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

/* ------------------------------------------------------------
   EN OBRA
   La respuesta a "¿a dónde van los me resonó?". Van acá: una obra
   que se levanta de abajo hacia arriba. Abajo, lo que ya es
   cimiento; arriba, lo que recién estás colocando. El ancho de
   cada pieza es cuántos días la volviste a elegir.
   ------------------------------------------------------------ */

const DIAS_ACTIVA = 14;

const ultimaMarca = m => (m.historial || []).slice(-1)[0] || null;
const estaActiva  = m => { const u = ultimaMarca(m); return u && diasDesde(u) <= DIAS_ACTIVA; };

function renderObra(){
  const cont = $('#manifiestoBody');
  const ms = db.datos.maximas.filter(m => diasDe(m) > 0);
  const foco = pilarDe(db.datos.config.focoPilarId);

  if (!ms.length){
    cont.innerHTML = `
      <div class="mf-vacio">
        <p>Todavía no colocaste ninguna pieza.</p>
        <small>Cada vez que marcás “me resonó” en Hoy, esa frase aparece acá
        y empieza a subir. Esto es lo que se está construyendo con eso.</small>
      </div>`;
    return;
  }

  const enObra   = ms.filter(m => !esCimiento(m)).length;
  const firmes   = ms.filter(enManifiesto).length;
  const activas  = ms.filter(estaActiva).sort((a,b) => (ultimaMarca(b) || '').localeCompare(ultimaMarca(a) || ''));

  // de arriba (lo que recién colocás) hacia abajo (lo que ya sostiene)
  const orden = ['practica','marcada','arraigada','sostenida','cimiento'];

  const ladrillos = clave => {
    const piezas = ms.filter(m => gradoDe(m).clave === clave);
    if (!piezas.length) return `<div class="capa-vacia">—</div>`;
    return piezas.map(m => {
      const p = pilarDe(m.pilarId);
      // el ancho ES la repetición: una pieza de 400 días ocupa toda la hilada,
      // una de 3 días entra de a dos
      const peso = Math.pow(Math.min(diasDe(m), 180) / 180, 0.4);
      const ancho = (44 + peso * 54).toFixed(1);
      return `<button type="button" class="ladrillo" data-maxima="${m.id}"
        style="--c:${esc(p?.color || 'var(--texto-3)')};width:${ancho}%"
        title="${esc(m.texto)}">
        <span>${esc(recortar(m.texto, 30))}</span>
        <i>${diasDe(m)}d</i>
      </button>`;
    }).join('');
  };

  cont.innerHTML = `
    <div class="obra-stats">
      <div><b>${enObra}</b><span>en obra</span></div>
      <div><b>${firmes}</b><span>en el manifiesto</span></div>
      <div><b>${ms.filter(esCimiento).length}</b><span>cimientos</span></div>
    </div>

    ${foco ? `<p class="obra-foco" style="--c:${esc(foco.color)}">
      Esta semana estás laburando <b>${esc(foco.nombre)}</b>.
    </p>` : ''}

    <div class="obra">
      ${orden.map(clave => {
        const g = GRADOS.find(x => x.clave === clave);
        return `
          <div class="capa capa-${clave}">
            <div class="capa-nombre"><span>${esc(g.nombre)}</span><i>${g.min === 1 ? '1 día' : g.min + ' días'}</i></div>
            <div class="ladrillos">${ladrillos(clave)}</div>
          </div>`;
      }).join('')}
      <div class="obra-suelo">tus cimientos</div>
    </div>

    <div class="obra-activas">
      <div class="lec-titulo" style="--c:var(--texto-3)">Lo que estás laburando ahora</div>
      ${activas.length ? activas.map(m => {
        const p = pilarDe(m.pilarId);
        const g = proximoGrado(m);
        const u = diasDesde(ultimaMarca(m));
        return `
          <article class="mx" data-maxima="${m.id}" style="--c:${esc(p?.color || 'var(--texto-3)')}">
            <div class="mx-txt">${esc(m.texto)}</div>
            <div class="mx-pie">
              <span>${esc(p?.nombre || 'Sin pilar')}</span>
              <span>· ${diasDe(m)} d</span>
              ${g ? `<span>· faltan ${g.min - diasDe(m)} para ${esc(g.nombre)}</span>` : ''}
              <span>· ${u === 0 ? 'marcada hoy' : u === 1 ? 'ayer' : `hace ${u} días`}</span>
            </div>
          </article>`;
      }).join('') : `<p class="nota-tec">Nada en los últimos ${DIAS_ACTIVA} días. Marcá una frase en Hoy y aparece acá.</p>`}
    </div>`;
}

let segYo = 'obra';

function renderYo(){
  $$('#segYo button').forEach(b => b.classList.toggle('on', b.dataset.seg === segYo));
  $('#yoTitulo').textContent = segYo === 'obra' ? 'En obra' : 'Manifiesto';
  $('#btnCompartir').hidden = segYo !== 'manifiesto';
  $('#yoSub').textContent = segYo === 'obra'
    ? 'A dónde van tus “me resonó”. Cada marca coloca una pieza; las de abajo ya sostienen.'
    : 'Esto no lo escribís de una. Se escribe solo, a medida que una frase aguanta la repetición.';
  return segYo === 'obra' ? renderObra() : renderManifiesto();
}

function renderManifiesto(){
  const cont = $('#manifiestoBody');
  const conCimientos = db.datos.maximas.some(enManifiesto);

  if (!conCimientos){
    cont.innerHTML = `
      <div class="mf-vacio">
        <p>Tu manifiesto está en blanco, y está bien.</p>
        <small>Cada día que una frase te resuene, marcala en Hoy. A los 12 días
        distintos entra acá sola, y de ahí sigue subiendo: 30, 90, 180.
        Recién a los seis meses de volver a ella es un cimiento de verdad.</small>
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
  $$('#segTema button').forEach(b => b.classList.toggle('on', b.dataset.tema === (cfg.tema || 'auto')));
  nube.pintar();

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
      <button type="button" class="btn-primario" id="vMeditar">◍ Meditarla</button>
      <button type="button" class="btn-sec" id="vTraer">Traerla a Hoy</button>
    </div>
    <div class="sheet-acciones" style="margin-top:9px">
      <button type="button" class="btn-sec" id="vFav" style="flex:1">${m.favorita ? '★ Quitar de favoritas' : '☆ Marcar favorita'}</button>
      <button type="button" class="btn-sec" id="vEditar">Editar</button>
    </div>
    ${m.meditaciones?.length ? `<p class="nota-tec" style="margin:12px 0 0">
      ${m.meditaciones.length} ${m.meditaciones.length === 1 ? 'sesión' : 'sesiones'} de reposo ·
      ${m.meditaciones.reduce((s,x)=>s+x.minutos,0)} minutos con esta frase.
    </p>` : ''}

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
    $('#vMeditar', cuerpo).onclick = () => { cerrarSheet(); setTimeout(() => reposo.abrir(m), 200); };
    $('#vTraer', cuerpo).onclick = () => {
      db.datos.config.hoy = { fecha:fechaISO(), maximaId:m.id };
      m.ultimaVista = new Date().toISOString();
      db.guardar(); cerrarSheet(); ir('hoy');
      avisar('Es la frase de estos días');
    };
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

// Aviso de rotación: 12 h antes de que la frase cambie.
let timerCambio = null;

function programarAvisoCambio(){
  clearTimeout(timerCambio);
  const hs = horasParaCambio();
  if (!isFinite(hs) || hs <= 0) return;

  const faltan = (hs - AVISO_HORAS) * 3600000;
  if (faltan > 0 && faltan < 2147483000){
    timerCambio = setTimeout(() => { dispararAvisoCambio(); renderHoy(); }, faltan);
  }
}

async function dispararAvisoCambio(){
  const cfg = db.datos.config;
  if (cfg.avisoCambioDe === cfg.hoy?.fecha) return;      // uno por ciclo
  const m = maximaDe(cfg.hoy?.maximaId);
  if (!m) return;
  cfg.avisoCambioDe = cfg.hoy.fecha;
  db.guardar();

  if (!cfg.notif || Notification?.permission !== 'granted') return;
  try{
    const reg = await navigator.serviceWorker?.ready;
    const cuerpo = `“${m.texto}”\n\nEn 12 horas rota. Si te sirvió, dejala en favoritas.`;
    if (reg) reg.showNotification('Mañana cambia la frase', { body:cuerpo, icon:'icons/icon-192.png', tag:'cimientos-rotacion' });
  }catch(e){ /* el aviso en pantalla ya cumplió */ }
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
      d.config.tema    ??= 'auto';

      db.datos = d;
      db.guardar();
      ir('hoy'); avisar('Importado');
    }catch(e){ avisar('El archivo no es un respaldo válido'); }
  };
  lector.readAsText(archivo);
}

/* ============================================================
   13a. REPOSO
   ------------------------------------------------------------
   La otra forma de volver a una frase, sin esperar la rotación.
   Entrás a un cuarto: la frase, una respiración guiada y un
   tiempo. Cuando el temporizador termina, queda marcada — y se
   registra aparte cuánto tiempo le diste, porque no es lo mismo
   tocar un botón que sentarse cinco minutos con ella.

   El sonido se sintetiza acá mismo (dos senos y ruido filtrado):
   nada de archivos externos, así el cuarto funciona sin internet.
   ============================================================ */

const reposo = {
  activo:false, m:null, minutos:5, finEn:0, raf:null, reloj:null, t:0,
  audio:null, nodos:null, sonando:true,
  ctx:null, lienzo:null, contado:false,

  abrir(maxima){
    this.m = maxima;
    if (!this.m) return;
    this.lienzo = $('#reposoFondo');
    this.ctx = this.lienzo.getContext('2d');

    const p = pilarDe(this.m.pilarId);
    $('#reposoTexto').textContent = this.m.texto;
    $('#reposoFuente').textContent = this.m.fuente ? `— ${this.m.fuente}` : (p?.nombre || '');
    this.color = p?.color || '#b9a984';

    $('#reposo').hidden = false;
    $('#reposoAntesala').hidden = false;
    $('#reposoCierre').hidden = true;
    document.body.style.overflow = 'hidden';
    this.activo = true; this.contado = false;
    this.finEn = 0; this.t = 0;
    this.medir();
    this.loop();
  },

  medir(){
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = this.lienzo.clientWidth; this.H = this.lienzo.clientHeight;
    this.lienzo.width = this.W * dpr; this.lienzo.height = this.H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  },

  empezar(){
    $('#reposoAntesala').hidden = true;
    this.finEn = Date.now() + this.minutos * 60000;
    if (this.sonando) this.sonar();
    vibrar(10);

    // El reloj va por su cuenta y contra la hora real. requestAnimationFrame
    // se congela con la pantalla apagada: si el tiempo lo llevara la
    // animación, bloquear el teléfono dejaría el temporizador colgado.
    clearInterval(this.reloj);
    this.reloj = setInterval(() => this.tictac(), 250);
    this.tictac();
  },

  tictac(){
    if (!this.finEn) return;
    const resta = Math.max(0, this.finEn - Date.now());
    const seg = Math.ceil(resta / 1000);
    $('#reposoReloj').textContent = `${Math.floor(seg/60)}:${String(seg%60).padStart(2,'0')}`;
    if (resta <= 0){ clearInterval(this.reloj); this.reloj = null; this.terminar(); }
  },

  cerrar(){
    this.activo = false;
    cancelAnimationFrame(this.raf);
    clearInterval(this.reloj); this.reloj = null;
    this.finEn = 0;
    this.callar();
    $('#reposo').hidden = true;
    document.body.style.overflow = '';
    render();
  },

  /* ---------- sonido ---------- */

  sonar(){
    try{
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const a = new AudioContext();
      this.audio = a;

      const maestro = a.createGain();
      maestro.gain.setValueAtTime(0.0001, a.currentTime);
      maestro.gain.exponentialRampToValueAtTime(0.09, a.currentTime + 4);
      maestro.connect(a.destination);

      // dos senos en quinta, con una desafinación mínima que hace el latido
      const drone = [110, 164.81, 110.4].map(f => {
        const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = a.createGain(); g.gain.value = f === 164.81 ? 0.22 : 0.34;
        o.connect(g); g.connect(maestro); o.start();
        return o;
      });

      // ruido suave, como aire en la habitación
      const largo = a.sampleRate * 4;
      const buffer = a.createBuffer(1, largo, a.sampleRate);
      const datos = buffer.getChannelData(0);
      let ultimo = 0;
      for (let i = 0; i < largo; i++){
        const blanco = Math.random() * 2 - 1;
        ultimo = (ultimo + 0.02 * blanco) / 1.02;   // hacia grave
        datos[i] = ultimo * 3.2;
      }
      const ruido = a.createBufferSource();
      ruido.buffer = buffer; ruido.loop = true;
      const filtro = a.createBiquadFilter();
      filtro.type = 'lowpass'; filtro.frequency.value = 480;
      const gr = a.createGain(); gr.gain.value = 0.5;
      ruido.connect(filtro); filtro.connect(gr); gr.connect(maestro); ruido.start();

      // el filtro se abre y se cierra despacio: da movimiento sin melodía
      const lfo = a.createOscillator(); lfo.frequency.value = 0.05;
      const lfoG = a.createGain(); lfoG.gain.value = 180;
      lfo.connect(lfoG); lfoG.connect(filtro.frequency); lfo.start();

      this.nodos = { maestro, drone, ruido, lfo };
    }catch(e){ /* sin sonido, el cuarto sigue sirviendo */ }
  },

  callar(){
    if (!this.audio) return;
    try{
      const a = this.audio, g = this.nodos?.maestro;
      if (g){
        g.gain.cancelScheduledValues(a.currentTime);
        g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), a.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 1.4);
      }
      setTimeout(() => { try{ a.close(); }catch(e){} }, 1600);
    }catch(e){}
    this.audio = null; this.nodos = null;
  },

  alternarSonido(){
    this.sonando = !this.sonando;
    $('#reposoSonido').classList.toggle('mudo', !this.sonando);
    if (!this.sonando) this.callar();
    else if (this.finEn) this.sonar();
  },

  /* ---------- cierre ---------- */

  terminar(){
    if (this.contado) return;
    this.contado = true;
    this.callar();
    vibrar(60);

    const m = this.m;
    m.meditaciones ??= [];
    m.meditaciones.push({ fecha:new Date().toISOString(), minutos:this.minutos });

    const yaEstaba = marcadaHoy(m);
    const antes = gradoDe(m);
    if (!yaEstaba){
      m.historial ??= [];
      m.historial.push(fechaISO());
      m.resonancias = m.historial.length;
    }
    db.guardar();

    const ahora = gradoDe(m);
    const total = m.meditaciones.reduce((s, x) => s + x.minutos, 0);
    $('#reposoCierreTxt').innerHTML = `
      ${yaEstaba
        ? 'Hoy ya la habías marcado, así que el día no suma de nuevo.'
        : `Queda marcada. Van <b>${diasDe(m)}</b> ${diasDe(m) === 1 ? 'día' : 'días'} con esta frase.`}
      ${ahora.clave !== antes.clave ? `<br><br>Subió a <b>${esc(ahora.nombre)}</b>.` : ''}
      <br><br>Le diste <b>${this.minutos} min</b> de atención sin hacer nada más.
      En total, ${total} ${total === 1 ? 'minuto' : 'minutos'} en ${m.meditaciones.length}
      ${m.meditaciones.length === 1 ? 'sesión' : 'sesiones'}.`;

    $('#reposoCierre').hidden = false;
  },

  /* ---------- pintura ---------- */

  loop(){
    if (!this.activo) return;
    this.t += 1/60;
    const { ctx, W, H } = this;

    ctx.clearRect(0, 0, W, H);

    // manchas de luz muy lentas: el cuarto respira aunque vos no
    const manchas = [
      { x:.30, y:.30, r:.95, c:this.color,  f:0.041, a:.30 },
      { x:.74, y:.64, r:1.05, c:'#4a5a72',  f:0.029, a:.34 },
      { x:.50, y:.92, r:.90, c:'#6b5a72',   f:0.023, a:.26 }
    ];
    for (const s of manchas){
      const dx = Math.sin(this.t * s.f * 6.283) * 0.10;
      const dy = Math.cos(this.t * s.f * 4.9) * 0.08;
      const cx = (s.x + dx) * W, cy = (s.y + dy) * H, r = s.r * Math.max(W, H) * 0.62;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, hexA(s.c, s.a));
      g.addColorStop(1, hexA(s.c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // respiración 4 dentro · 2 sostener · 6 afuera
    if (this.finEn){
      const CICLO = 12;
      const f = (this.t % CICLO);
      let escala, guia;
      if (f < 4){         escala = 0.55 + (f/4) * 0.45;        guia = 'Inhalá'; }
      else if (f < 6){    escala = 1;                          guia = 'Sostené'; }
      else {              escala = 1 - ((f-6)/6) * 0.45;       guia = 'Soltá'; }

      const al = $('.rep-aliento');
      al.querySelector('i').style.transform = `scale(${escala.toFixed(3)})`;
      al.querySelector('b').style.transform = `scale(${(escala*0.94).toFixed(3)})`;
      al.querySelector('b').style.opacity = (0.35 + escala * 0.5).toFixed(2);

      const g = $('#reposoGuia');
      if (g.textContent !== guia) g.textContent = guia;

    }

    this.raf = requestAnimationFrame(() => this.loop());
  }
};

function cablearReposo(){
  $('#reposoMinutos').addEventListener('click', ev => {
    const b = ev.target.closest('[data-min]');
    if (!b) return;
    reposo.minutos = Number(b.dataset.min);
    $$('#reposoMinutos button').forEach(x => x.classList.toggle('on', x === b));
  });
  $('#reposoEmpezar').onclick  = () => reposo.empezar();
  $('#reposoCancelar').onclick = () => reposo.cerrar();
  $('#reposoSalir').onclick    = () => reposo.cerrar();
  $('#reposoListo').onclick    = () => reposo.cerrar();
  $('#reposoSonido').onclick   = () => reposo.alternarSonido();
  window.addEventListener('resize', () => { if (reposo.activo) reposo.medir(); });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && reposo.activo) reposo.cerrar();
  });
  // al volver de la pantalla apagada, poner el reloj al día
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && reposo.activo) reposo.tictac();
  });
}

/* ============================================================
   13b. TEMA
   ------------------------------------------------------------
   "auto" sigue al sistema; el resto manda. Resolvemos en JS y
   estampamos data-tema en <html> para que no haya dos fuentes
   de verdad peleando.
   ============================================================ */

const COLOR_BARRA = { claro:'#f7f4ef', suave:'#1e1b18', oscuro:'#100f0e' };
const mqOscuro = window.matchMedia('(prefers-color-scheme: dark)');

function aplicarTema(){
  const elegido = db.datos.config.tema || 'auto';
  const real = elegido === 'auto' ? (mqOscuro.matches ? 'oscuro' : 'claro') : elegido;
  document.documentElement.setAttribute('data-tema', real);
  $$('meta[name="theme-color"]').forEach(m => m.remove());
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = COLOR_BARRA[real];
  document.head.appendChild(meta);
}

mqOscuro.addEventListener('change', () => {
  if ((db.datos.config.tema || 'auto') === 'auto') aplicarTema();
});

/* ============================================================
   13c. SINCRONIZACIÓN
   ------------------------------------------------------------
   Local-first. El documento entero viaja como un JSON por
   persona, con marca de tiempo: gana el más reciente. Para un
   teléfono y una computadora del mismo dueño alcanza y sobra,
   y evita media app de código de sincronización por tabla.

   Antes de adoptar algo de la nube guardamos lo local en un
   resguardo aparte. Nunca se pisa lo tuyo sin red de contención.
   ============================================================ */

const nube = {
  sb:null, sesion:null, timer:null, subiendo:false, listo:false,

  async iniciar(){
    if (!HAY_NUBE) return this.pintar();
    try{
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      this.sb = createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data } = await this.sb.auth.getSession();
      this.sesion = data.session;
      this.sb.auth.onAuthStateChange((_ev, s) => {
        const entro = !this.sesion && s;
        this.sesion = s;
        this.pintar();
        if (entro) this.bajar();
      });
      this.listo = true;
      this.pintar();
      if (this.sesion) await this.bajar();
    }catch(e){
      console.warn('Sin nube por ahora', e);
      this.pintar();
    }
  },

  get activa(){ return !!(this.sb && this.sesion); },

  async entrar(email){
    if (!this.sb) return avisar('La sincronización todavía no está configurada');
    const { error } = await this.sb.auth.signInWithOtp({
      email,
      options:{ emailRedirectTo: location.origin + location.pathname }
    });
    if (error) return avisar('No pude mandar el mail: ' + error.message);
    avisar('Te mandé un enlace por mail. Abrilo desde este dispositivo.');
  },

  async salir(){
    if (!this.sb) return;
    await this.sb.auth.signOut();
    this.sesion = null;
    this.pintar();
    avisar('Cerraste la sesión. Tus datos siguen acá.');
  },

  // Traer lo de la nube. Sólo adoptamos si es más nuevo que lo local.
  async bajar(){
    if (!this.activa) return;
    try{
      const { data, error } = await this.sb
        .from(TABLA).select('datos, actualizado')
        .eq('user_id', this.sesion.user.id).maybeSingle();
      if (error) throw error;

      const local = db.datos.actualizado || '';
      if (!data){                        // cuenta nueva: sube lo que ya tenías
        await this.subir(true);
        return;
      }
      if ((data.actualizado || '') > local){
        localStorage.setItem(CLAVE_RESGUARDO, JSON.stringify(db.datos));  // red de contención
        db.datos = data.datos;
        db.cargar.call(db);              // normaliza campos que falten
        aplicarTema(); render();
        avisar('Sincronizado');
      }else if (local > (data.actualizado || '')){
        await this.subir(true);
      }
    }catch(e){
      console.warn('No pude bajar', e);
    }
  },

  programarSubida(){
    if (!this.activa) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.subir(), 1500);
  },

  async subir(forzado = false){
    if (!this.activa || (this.subiendo && !forzado)) return;
    this.subiendo = true;
    try{
      const { error } = await this.sb.from(TABLA).upsert({
        user_id: this.sesion.user.id,
        datos: db.datos,
        actualizado: db.datos.actualizado || new Date().toISOString()
      }, { onConflict:'user_id' });
      if (error) throw error;
      this.pintar();
    }catch(e){
      console.warn('No pude subir', e);
    }finally{
      this.subiendo = false;
    }
  },

  pintar(){
    const caja = $('#syncCaja');
    if (!caja) return;

    if (!HAY_NUBE){
      caja.innerHTML = `
        <p class="nota-tec" style="margin:0">
          Todavía sin configurar. Por ahora los datos viven sólo en este
          dispositivo — acordate de exportar un respaldo de vez en cuando.
        </p>`;
      return;
    }

    if (this.activa){
      caja.innerHTML = `
        <div class="sync-estado">
          <i class="sync-punto on"></i>
          <span>Sincronizado</span>
        </div>
        <div class="sync-mail">${esc(this.sesion.user.email || '')}</div>
        <div class="set-botones">
          <button class="btn" id="syncAhora" type="button">Sincronizar ahora</button>
          <button class="btn" id="syncSalir" type="button">Cerrar sesión</button>
        </div>`;
      $('#syncAhora').onclick = async () => { await nube.bajar(); await nube.subir(true); avisar('Al día'); };
      $('#syncSalir').onclick = () => nube.salir();
      return;
    }

    caja.innerHTML = `
      <div class="sync-estado"><i class="sync-punto"></i><span>Sólo en este dispositivo</span></div>
      <p class="nota-tec" style="margin:0 0 12px">
        Poné tu mail y te llega un enlace para entrar. Sin contraseñas.
        Después abrís la app en la computadora con el mismo mail y tenés todo.
      </p>
      <div class="sync-form">
        <input type="email" id="syncMail" placeholder="tu@mail.com" autocomplete="email">
        <button class="btn" id="syncEntrar" type="button" style="flex:0 0 auto">Entrar</button>
      </div>`;
    $('#syncEntrar').onclick = () => {
      const m = $('#syncMail').value.trim();
      if (!/.+@.+\..+/.test(m)) return avisar('Escribí un mail válido');
      nube.entrar(m);
    };
  }
};

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
  cam:{ x:0, y:0, vx:0, vy:0, escala:1, angulo:0 },
  vuelo:null,
  nodos:[], nucleos:[], estrellas:[],
  sel:null, punteros:new Map(), gesto:null,

  abrir(){
    this.lienzo = $('#cosmosLienzo');
    this.ctx = this.lienzo.getContext('2d');
    this.construir();
    $('#cosmos').hidden = false;
    document.body.style.overflow = 'hidden';
    this.activo = true;
    this.medir();

    const foco = this.nucleos.find(n => n.id === db.datos.config.focoPilarId) || this.nucleos[0];
    this.cam = { x:foco ? foco.x : 0, y:foco ? foco.y : 0, vx:0, vy:0, escala:0.85, angulo:0 };
    this.vuelo = null;
    this.punteros.clear(); this.gesto = null;

    this.seleccionar(null);
    const pista = $('#cosmosPista');
    pista.classList.remove('ida');
    setTimeout(() => pista.classList.add('ida'), 5000);

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

  construir(){
    const ps = [...db.datos.pilares].sort((a,b) => a.orden - b.orden);
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
      const rad = 68 + Math.sqrt(i) * 36;
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

    this.estrellas = Array.from({length:260}, () => ({
      x:(Math.random()-.5) * 3200,
      y:(Math.random()-.5) * 3200,
      r:Math.random() * 1.2 + .3,
      a:Math.random() * .55 + .25
    }));
  },

  /* ---------- cámara: mundo ⇄ pantalla ---------- */

  aPantalla(wx, wy){
    const c = Math.cos(this.cam.angulo), s = Math.sin(this.cam.angulo);
    const dx = wx - this.cam.x, dy = wy - this.cam.y;
    return [
      (dx*c - dy*s) * this.cam.escala + this.W/2,
      (dx*s + dy*c) * this.cam.escala + this.H/2
    ];
  },

  aMundo(px, py){
    const c = Math.cos(this.cam.angulo), s = Math.sin(this.cam.angulo);
    const ex = (px - this.W/2) / this.cam.escala;
    const ey = (py - this.H/2) / this.cam.escala;
    return [ this.cam.x + ex*c + ey*s, this.cam.y - ex*s + ey*c ];
  },

  // Mover la cámara para que un punto del mundo quede bajo un punto de pantalla.
  anclar(mundo, px, py){
    const c = Math.cos(this.cam.angulo), s = Math.sin(this.cam.angulo);
    const ex = (px - this.W/2) / this.cam.escala;
    const ey = (py - this.H/2) / this.cam.escala;
    this.cam.x = mundo[0] - (ex*c + ey*s);
    this.cam.y = mundo[1] - (-ex*s + ey*c);
  },

  zoom(factor, px = this.W/2, py = this.H/2){
    const antes = this.aMundo(px, py);
    this.cam.escala = Math.max(0.3, Math.min(6, this.cam.escala * factor));
    this.anclar(antes, px, py);
  },

  // Entrar hacia una estrella. Persigue al nodo vivo, porque flota:
  // si apuntáramos a donde estaba al tocarlo, quedaría descentrado.
  volarA(nd, escala = 2.8){
    this.vuelo = { nd, escala: Math.max(this.cam.escala, escala) };
    this.cam.vx = this.cam.vy = 0;
  },

  alejar(){
    this.vuelo = { x:0, y:0, escala:0.62 };
    this.cam.vx = this.cam.vy = 0;
  },

  radioDe(nd){
    const n = diasDe(nd.m);
    let r = 3.2 + Math.min(n, 180) ** 0.42 * 0.72;
    if (nd.m.favorita) r += 1.2;
    return r;
  },

  alfaDe(nd){
    const n = diasDe(nd.m);
    return n >= 180 ? 1 : n >= 90 ? .92 : n >= 12 ? .82 : n > 0 ? .7 : .55;
  },

  // Con zoom alto se rotula todo: entraste a mirar de cerca.
  rotulada(nd){
    return this.cam.escala > 1.5 || enManifiesto(nd.m) || nd.m.favorita || nd === this.sel;
  },

  seleccionar(nd, volar = false){
    this.sel = nd;
    const carta = $('#cosmosCarta');
    if (!nd){ carta.hidden = true; if (this.vuelo?.nd) this.vuelo = null; return; }
    if (volar) this.volarA(nd);

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

  golpe(px, py){
    let mejor = null, mejorD = Math.max(26, 26 * this.cam.escala);
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
    const esc = this.cam.escala;

    // vuelo suave hacia una estrella
    if (this.vuelo){
      const v = this.vuelo, k = 0.12;
      const tx = v.nd ? v.nd.x : v.x;
      const ty = v.nd ? v.nd.y : v.y;
      this.cam.x += (tx - this.cam.x) * k;
      this.cam.y += (ty - this.cam.y) * k;
      this.cam.escala += (v.escala - this.cam.escala) * k;
      // con un nodo el vuelo no termina: lo sigue mientras esté elegido
      if (!v.nd && Math.hypot(tx - this.cam.x, ty - this.cam.y) < 1.2 &&
          Math.abs(v.escala - this.cam.escala) < 0.02) this.vuelo = null;
    }else if (!this.punteros.size){
      this.cam.x += this.cam.vx; this.cam.y += this.cam.vy;
      this.cam.vx *= 0.94; this.cam.vy *= 0.94;
      if (Math.abs(this.cam.vx) < 0.02) this.cam.vx = 0;
      if (Math.abs(this.cam.vy) < 0.02) this.cam.vy = 0;
    }

    ctx.clearRect(0, 0, W, H);

    // estrellas de fondo con parallax
    const c = Math.cos(this.cam.angulo), s = Math.sin(this.cam.angulo);
    for (const e of this.estrellas){
      const dx = e.x - this.cam.x * 0.34, dy = e.y - this.cam.y * 0.34;
      const sx = (dx*c - dy*s) * esc * 0.7 + W/2;
      const sy = (dx*s + dy*c) * esc * 0.7 + H/2;
      if (sx < -20 || sx > W+20 || sy < -20 || sy > H+20) continue;
      ctx.beginPath();
      ctx.arc(sx, sy, e.r * Math.min(esc, 2), 0, 7);
      ctx.fillStyle = `rgba(255,255,255,${e.a * (0.6 + 0.4*Math.sin(this.t*0.5 + e.x))})`;
      ctx.fill();
    }

    for (const nd of this.nodos){
      nd.x = nd.bx + Math.cos(this.t * nd.vel + nd.fase) * nd.amp;
      nd.y = nd.by + Math.sin(this.t * nd.vel * 0.83 + nd.fase) * nd.amp;
      [nd.sx, nd.sy] = this.aPantalla(nd.x, nd.y);
    }

    // hilos
    const alcance = 230 * esc;
    for (let i = 0; i < this.nodos.length; i++){
      for (let j = i+1; j < this.nodos.length; j++){
        const a = this.nodos[i], b = this.nodos[j];
        const mismoPilar = a.m.pilarId && a.m.pilarId === b.m.pilarId;
        const mismoAutor = a.m.fuente && normal(a.m.fuente) === normal(b.m.fuente);
        if (!mismoPilar && !mismoAutor) continue;

        const d = Math.hypot(a.sx - b.sx, a.sy - b.sy);
        if (d > alcance) continue;
        if (Math.max(a.sx,b.sx) < -40 || Math.min(a.sx,b.sx) > W+40) continue;

        const cerca = 1 - d/alcance;
        const tocado = this.sel && (a === this.sel || b === this.sel);
        let alfa = (mismoAutor ? 0.20 : 0.075) * cerca;
        if (tocado) alfa = Math.min(0.6, alfa * 4.5 + 0.14);

        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy);
        ctx.strokeStyle = hexA(tocado ? this.sel.color : (mismoAutor ? '#cbb994' : a.color), alfa);
        ctx.lineWidth = (mismoAutor ? 1 : 0.7) * Math.min(esc, 2.2);
        if (mismoAutor && !tocado) ctx.setLineDash([2,5]); else ctx.setLineDash([]);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    // regiones
    for (const n of this.nucleos){
      const [sx, sy] = this.aPantalla(n.x, n.y);
      const radio = 190 * esc;
      if (sx < -radio || sx > W+radio || sy < -radio || sy > H+radio) continue;

      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, radio);
      g.addColorStop(0, hexA(n.color, 0.18));
      g.addColorStop(1, hexA(n.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy, radio, 0, 7); ctx.fill();

      ctx.save();
      ctx.translate(sx, sy); ctx.rotate(this.cam.angulo);
      ctx.font = `600 ${Math.min(9.5 * Math.max(esc, 1), 22)}px -apple-system, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = hexA(n.color, 0.5);
      ctx.fillText(n.nombre.toUpperCase().split('').join(' '), 0, 3);
      ctx.restore();
    }

    // nodos
    for (const nd of this.nodos){
      if (nd.sx < -80 || nd.sx > W+80 || nd.sy < -80 || nd.sy > H+80) continue;
      const r = Math.max(1.6, Math.min(this.radioDe(nd) * esc, 26));
      const a = this.alfaDe(nd);

      if (enManifiesto(nd.m) || nd === this.sel){
        const g = ctx.createRadialGradient(nd.sx, nd.sy, 0, nd.sx, nd.sy, r*4.5);
        g.addColorStop(0, hexA(nd.color, .34));
        g.addColorStop(1, hexA(nd.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(nd.sx, nd.sy, r*4.5, 0, 7); ctx.fill();
      }

      ctx.beginPath(); ctx.arc(nd.sx, nd.sy, r, 0, 7);
      ctx.fillStyle = hexA(nd.color, a); ctx.fill();

      if (nd === this.sel){
        const pulso = r + 7 + Math.sin(this.t*2.6) * 2.4;
        ctx.beginPath(); ctx.arc(nd.sx, nd.sy, pulso, 0, 7);
        ctx.strokeStyle = hexA(nd.color, .75); ctx.lineWidth = 1.2; ctx.stroke();
      }

      if (this.rotulada(nd)){
        ctx.save();
        ctx.translate(nd.sx, nd.sy + r + 15); ctx.rotate(this.cam.angulo);
        ctx.font = '11px -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(240,235,227,${nd === this.sel ? .92 : esc > 1.5 ? .6 : .42})`;
        ctx.fillText(recortar(nd.m.texto, esc > 2.2 ? 46 : 30), 0, 0);
        if (esc > 2.2 && nd.m.fuente){
          ctx.font = '10px -apple-system, system-ui, sans-serif';
          ctx.fillStyle = 'rgba(203,185,148,.65)';
          ctx.fillText('— ' + nd.m.fuente, 0, 15);
        }
        ctx.restore();
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

/* ------------------------------------------------------------
   Gestos: un dedo arrastra, dos dedos hacen zoom y giran a la vez.
   La rueda del mouse también acerca, para cuando estás en la compu.
   ------------------------------------------------------------ */

function cablearCosmos(){
  const lienzo = $('#cosmosLienzo');
  let movido = 0, t0 = 0;

  const centro = () => {
    const ps = [...cosmos.punteros.values()];
    return [ (ps[0].x + ps[1].x)/2, (ps[0].y + ps[1].y)/2 ];
  };
  const distancia = () => {
    const ps = [...cosmos.punteros.values()];
    return Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
  };
  const angulo = () => {
    const ps = [...cosmos.punteros.values()];
    return Math.atan2(ps[1].y - ps[0].y, ps[1].x - ps[0].x);
  };

  const pos = ev => {
    const r = lienzo.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  };

  lienzo.addEventListener('pointerdown', ev => {
    lienzo.classList.add('agarrando');
    try{ lienzo.setPointerCapture(ev.pointerId); }catch(e){}
    cosmos.punteros.set(ev.pointerId, pos(ev));
    cosmos.vuelo = null;          // tocar la pantalla corta el vuelo
    cosmos.cam.vx = cosmos.cam.vy = 0;

    if (cosmos.punteros.size === 1){ movido = 0; t0 = Date.now(); }
    if (cosmos.punteros.size === 2){
      cosmos.gesto = { dist:distancia(), ang:angulo(), centro:centro() };
    }
  });

  lienzo.addEventListener('pointermove', ev => {
    if (!cosmos.punteros.has(ev.pointerId)) return;
    const previo = cosmos.punteros.get(ev.pointerId);
    const actual = pos(ev);
    cosmos.punteros.set(ev.pointerId, actual);

    if (cosmos.punteros.size === 1){
      const dx = actual.x - previo.x, dy = actual.y - previo.y;
      movido += Math.abs(dx) + Math.abs(dy);
      const c = Math.cos(cosmos.cam.angulo), s = Math.sin(cosmos.cam.angulo);
      const wx = (dx*c + dy*s) / cosmos.cam.escala;
      const wy = (-dx*s + dy*c) / cosmos.cam.escala;
      cosmos.cam.x -= wx; cosmos.cam.y -= wy;
      cosmos.cam.vx = -wx; cosmos.cam.vy = -wy;
      return;
    }

    if (cosmos.punteros.size === 2 && cosmos.gesto){
      const g = cosmos.gesto;
      const cen = centro(), dist = distancia(), ang = angulo();
      const anclaMundo = cosmos.aMundo(cen[0], cen[1]);

      if (g.dist > 8) cosmos.cam.escala = Math.max(0.3, Math.min(6, cosmos.cam.escala * (dist / g.dist)));
      cosmos.cam.angulo += (ang - g.ang);
      cosmos.anclar(anclaMundo, cen[0], cen[1]);

      cosmos.gesto = { dist, ang, centro:cen };
      movido += 50;                       // con dos dedos nunca es un toque
    }
  });

  const soltar = ev => {
    if (!cosmos.punteros.has(ev.pointerId)) return;
    const p = cosmos.punteros.get(ev.pointerId);
    cosmos.punteros.delete(ev.pointerId);
    if (cosmos.punteros.size < 2) cosmos.gesto = null;
    if (!cosmos.punteros.size) lienzo.classList.remove('agarrando');

    if (!cosmos.punteros.size && movido < 8 && Date.now() - t0 < 400){
      cosmos.cam.vx = cosmos.cam.vy = 0;
      const nd = cosmos.golpe(p.x, p.y);
      cosmos.seleccionar(nd, !!nd);        // tocar una estrella = entrar hacia ella
      $('#cosmosPista').classList.add('ida');
    }
  };
  lienzo.addEventListener('pointerup', soltar);
  lienzo.addEventListener('pointercancel', soltar);

  lienzo.addEventListener('wheel', ev => {
    ev.preventDefault();
    const r = lienzo.getBoundingClientRect();
    cosmos.zoom(Math.exp(-ev.deltaY * 0.0016), ev.clientX - r.left, ev.clientY - r.top);
  }, { passive:false });

  $('#btnCosmos').onclick = () => cosmos.abrir();
  $('#cosmosSalir').onclick = () => cosmos.cerrar();
  $('#cosmosAlejar').onclick = () => { cosmos.seleccionar(null); cosmos.cam.angulo = 0; cosmos.alejar(); };

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
    db.datos.config.hoy = { fecha:fechaISO(), maximaId:otra.id };   // reinicia el ciclo
    otra.ultimaVista = new Date().toISOString();
    db.guardar(); renderHoy();
  };
  $('#accReposo').onclick = () => {
    const m = maximaDe(db.datos.config.hoy?.maximaId);
    if (m) reposo.abrir(m);
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
  $('#btnAjustes').onclick = () => ir('ajustes');
  $('#btnLecturas').onclick = () => ir('lecturas');
  $('#btnVolverPilares').onclick = () => ir('pilares');
  $('#segLecturas').addEventListener('click', ev => {
    const b = ev.target.closest('[data-seg]');
    if (!b) return;
    segLecturas = b.dataset.seg; renderLecturas();
  });
  $('#lecturasLista').addEventListener('click', ev => {
    const b = ev.target.closest('[data-libro]');
    if (b) verLibro(b.dataset.libro);
  });

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
  $('#segYo').addEventListener('click', ev => {
    const b = ev.target.closest('[data-seg]');
    if (!b) return;
    segYo = b.dataset.seg; renderYo();
  });
  $('#manifiestoBody').addEventListener('click', ev => {
    const b = ev.target.closest('[data-maxima]');
    if (b) verMaxima(b.dataset.maxima);
  });

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
  $('#segTema').addEventListener('click', ev => {
    const b = ev.target.closest('[data-tema]');
    if (!b) return;
    db.datos.config.tema = b.dataset.tema;
    db.guardar(); aplicarTema(); renderAjustes();
  });

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
cablearReposo();
programarAvisoCambio();
aplicarTema();
ir('hoy');
nube.iniciar();
programarNotif();
chequeoAlAbrir();

if (db.datos.config.focoVencido){
  db.datos.config.focoVencido = false; db.guardar();
  setTimeout(() => avisar('Semana nueva: ¿seguís con el mismo foco?'), 900);
}

if ('serviceWorker' in navigator){
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
