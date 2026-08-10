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
    d.notas    ??= [];
    d.registros ??= [];
    d.config   ??= {};
    d.config.umbral ??= 12;
    d.config.hora   ??= '07:30';
    d.config.notif  ??= false;
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
    estado:'nueva', favorita:false, resonancias:0,
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
    notas: [],
    registros: [],
    config: {
      focoPilarId: foco.id,
      focoSemana: semanaISO(new Date()),
      umbral: 12,
      hora: '07:30',
      notif: false,
      hoy: null                // { fecha, maximaId }
    }
  };
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

const ETIQUETA_ESTADO = { nueva:'Nueva', practica:'En práctica', cimiento:'Cimiento' };

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

  if (m.estado === 'practica') peso *= 2.6;
  else if (m.estado === 'nueva') peso *= 1.6;
  else if (m.estado === 'cimiento') peso *= 0.55;   // ya es parte tuya

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

  $('#maximaFuente').textContent = m.fuente ? `— ${m.fuente}` : '';

  // progreso hacia cimiento
  const prog = $('#maximaProgreso');
  if (m.estado === 'cimiento'){
    prog.innerHTML = `<span style="color:${esc(p?.color || '')}">◆ Cimiento</span>`;
  }else{
    const u = cfg.umbral;
    const pct = Math.min(100, Math.round(m.resonancias / u * 100));
    prog.innerHTML =
      `<span>${ETIQUETA_ESTADO[m.estado]}</span>
       <span class="barra"><i style="width:${pct}%"></i></span>
       <span>${m.resonancias}/${u}</span>`;
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

  const cimientos = db.datos.maximas.filter(m => m.estado === 'cimiento').length;
  const partes = [];
  if (n > 0) partes.push(n === 1 ? '1 día seguido' : `${n} días seguidos`);
  if (cimientos > 0) partes.push(`${cimientos} ${cimientos === 1 ? 'cimiento' : 'cimientos'}`);
  return partes.join('  ·  ');
}

function resonar(){
  const m = maximaDe(db.datos.config.hoy?.maximaId);
  if (!m) return;

  m.resonancias++;
  if (m.estado === 'nueva') m.estado = 'practica';

  let subio = false;
  if (m.estado === 'practica' && m.resonancias >= db.datos.config.umbral){
    m.estado = 'cimiento';
    subio = true;
  }
  db.guardar();
  vibrar(subio ? 40 : 12);

  const btn = $('#accResono');
  btn.classList.remove('pulso'); void btn.offsetWidth; btn.classList.add('pulso');

  avisar(subio ? '◆ Se volvió cimiento. Ya está en tu manifiesto.' : 'Anotado.');
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
    const cim = ms.filter(m => m.estado === 'cimiento').length;
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
          <span><b>${cim}</b> ${cim === 1 ? 'cimiento' : 'cimientos'}</span>
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
    if (['nueva','practica','cimiento'].includes(filtroEstado) && m.estado !== filtroEstado) return false;
    if (q && !(m.texto + ' ' + m.fuente).toLowerCase().includes(q)) return false;
    return true;
  });

  const orden = { cimiento:0, practica:1, nueva:2 };
  lista.sort((a,b) =>
    (b.favorita - a.favorita) ||
    (orden[a.estado] - orden[b.estado]) ||
    (b.resonancias - a.resonancias)
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
          <span class="mx-estado ${m.estado}">${ETIQUETA_ESTADO[m.estado]}</span>
          <span>${esc(p?.nombre || 'Sin pilar')}</span>
          ${m.fuente ? `<span>· ${esc(m.fuente)}</span>` : ''}
          ${m.resonancias ? `<span>· ${m.resonancias}×</span>` : ''}
        </div>
      </article>`;
  }).join('');
}

/* ============================================================
   9. VISTA — DIARIO
   ============================================================ */

function renderDiario(){
  const cont = $('#diarioLista');
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
            <div class="nota-txt">${esc(n.texto)}</div>
          </article>`;
      }).join('')}
    </div>`).join('');
}

/* ============================================================
   10. VISTA — MANIFIESTO
   ============================================================ */

function textoManifiesto(){
  const lineas = [];
  [...db.datos.pilares].sort((a,b)=>a.orden-b.orden).forEach(p => {
    const cs = db.datos.maximas.filter(m => m.pilarId === p.id && m.estado === 'cimiento');
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
  const conCimientos = db.datos.maximas.some(m => m.estado === 'cimiento');

  if (!conCimientos){
    cont.innerHTML = `
      <div class="mf-vacio">
        <p>Tu manifiesto está en blanco, y está bien.</p>
        <small>Cada vez que una frase te resuene, marcala en Hoy.
        Cuando llegue a ${db.datos.config.umbral} veces deja de ser una frase linda
        y pasa a ser un cimiento: aparece acá sola.</small>
      </div>`;
    return;
  }

  cont.innerHTML = [...db.datos.pilares].sort((a,b)=>a.orden-b.orden).map(p => {
    const cs = db.datos.maximas.filter(m => m.pilarId === p.id && m.estado === 'cimiento');
    if (!cs.length) return '';
    return `
      <section class="mf-bloque" style="--c:${esc(p.color)}">
        <div class="mf-pilar">${esc(p.nombre)}</div>
        ${p.definicion ? `<p class="mf-def">${esc(p.definicion)}</p>` : ''}
        ${cs.map(m => `<div class="mf-frase">${esc(m.texto)}</div>`).join('')}
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
  $('#setUmbral').value = cfg.umbral;

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

function editarMaxima(id){
  const m = id ? maximaDe(id) : null;
  let pilarSel = m?.pilarId || db.datos.config.focoPilarId || db.datos.pilares[0]?.id;
  let estadoSel = m?.estado || 'nueva';

  abrirSheet(`
    <h3>${m ? 'Editar máxima' : 'Nueva máxima'}</h3>
    <div class="campo">
      <label>La frase</label>
      <textarea id="fTexto" rows="3" placeholder="Escribila como querés recordarla…">${esc(m?.texto || '')}</textarea>
    </div>
    <div class="campo">
      <label>De quién es (opcional)</label>
      <input type="text" id="fFuente" value="${esc(m?.fuente || '')}" placeholder="Un autor, un amigo, vos">
    </div>
    <div class="campo">
      <label>Pilar</label>
      ${opcionesPilar(pilarSel)}
    </div>
    <div class="campo">
      <label>En qué punto está</label>
      <div class="pick-estado">
        ${['nueva','practica','cimiento'].map(e =>
          `<button type="button" data-pick-estado="${e}" class="${e === estadoSel ? 'on' : ''}">${ETIQUETA_ESTADO[e]}</button>`
        ).join('')}
      </div>
    </div>
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
      const be = ev.target.closest('[data-pick-estado]');
      if (be){
        estadoSel = be.dataset.pickEstado;
        $$('[data-pick-estado]', cuerpo).forEach(b => b.classList.toggle('on', b === be));
      }
    });

    $('#fGuardar', cuerpo).onclick = () => {
      const texto = $('#fTexto', cuerpo).value.trim();
      if (!texto) return avisar('Falta la frase');
      const fuente = $('#fFuente', cuerpo).value.trim();

      if (m){
        Object.assign(m, { texto, fuente, pilarId:pilarSel, estado:estadoSel });
      }else{
        db.datos.maximas.push({
          id:uid(), texto, fuente, pilarId:pilarSel, estado:estadoSel,
          favorita:false, resonancias:0,
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
      <span class="mx-estado ${m.estado}" style="--c:${esc(p?.color || '')}">${ETIQUETA_ESTADO[m.estado]}</span>
      <span>${esc(p?.nombre || 'Sin pilar')}</span>
      ${m.fuente ? `<span>· ${esc(m.fuente)}</span>` : ''}
      <span>· resonó ${m.resonancias}×</span>
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
      d.config.umbral ??= 12;
      d.config.hora   ??= '07:30';
      d.config.notif  ??= false;

      db.datos = d;
      db.guardar();
      ir('hoy'); avisar('Importado');
    }catch(e){ avisar('El archivo no es un respaldo válido'); }
  };
  lector.readAsText(archivo);
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
  $('#btnNuevaNota').onclick = () => editarNota();
  $('#diarioLista').addEventListener('click', ev => {
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
  $('#setUmbral').onchange = e => {
    const v = Math.max(3, Math.min(60, Number(e.target.value) || 12));
    db.datos.config.umbral = v; e.target.value = v; db.guardar();
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
