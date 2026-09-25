/* ============================================================================
   🚗 JURIS_PULSE - SCRIPT PRINCIPAL v3.1.7
   ============================================================================
   Bloques:
     1.  Estado global
     2.  Referencias al DOM
     3.  Utilidades
     4.  Tema (claro / oscuro)
     5.  Drawer (menú lateral)
     6.  Header (expandido / compacto al scroll)
     7.  Pestañas (Explorar / Preguntar / Exacta)
     8.  Dashboard (total + fechas)
     9.  Carga inicial del índice
    10.  Scroll infinito (paginación)
    11.  Hidratación de resúmenes IA
    12.  Renderizado de tarjetas
    13.  Pestaña EXPLORAR
    14.  Pestaña PREGUNTAR
    15.  Pestaña EXACTA
    16.  Cortina de detalle
    17.  Interacción general
    18.  Arranque
   ============================================================================ */


/* ============================================================================
   1. ESTADO GLOBAL
   ============================================================================ */
const AppState = {
    todasLasTesis: [],
    stats: { total: 0, fecha_min: null, fecha_max: null, fecha_max_texto: null },
    modoActual: 'explorar',

    explorarFiltradas: [],
    explorarVisibles: 0,

    preguntarConsulta: '',
    preguntarResultados: [],
    preguntarFiltrados: [],

    exactaConsulta: '',
    exactaResultados: [],
    exactaTotal: 0,
    exactaOffset: 0,
    exactaLoteSize: 100,

    cacheResumenes: {},
    registroActual: null
};


/* ============================================================================
   2. REFERENCIAS AL DOM
   ============================================================================ */
const DOM = {
    header: document.getElementById('header'),
    logo: document.getElementById('logo'),
    btnHamburguesa: document.getElementById('btnHamburguesa'),
    btnTema: document.getElementById('btnTema'),

    pestanaExplorar: document.getElementById('pestanaExplorar'),
    pestanaPreguntar: document.getElementById('pestanaPreguntar'),
    pestanaExacta: document.getElementById('pestanaExacta'),

    dashTotal: document.getElementById('dashTotal'),
    dashRango: document.getElementById('dashRango'),

    panelExplorar: document.getElementById('panelExplorar'),
    panelPreguntar: document.getElementById('panelPreguntar'),
    panelExacta: document.getElementById('panelExacta'),

    explorarTipo: document.getElementById('explorarTipo'),
    explorarMateria: document.getElementById('explorarMateria'),

    preguntarTexto: document.getElementById('preguntarTexto'),
    btnPreguntar: document.getElementById('btnPreguntar'),
    preguntarFiltros: document.getElementById('preguntarFiltros'),
    preguntarTipo: document.getElementById('preguntarTipo'),
    preguntarMateria: document.getElementById('preguntarMateria'),
    preguntarAyuda: document.getElementById('preguntarAyuda'),

    exactaTexto: document.getElementById('exactaTexto'),
    btnExacta: document.getElementById('btnExacta'),
    exactaFiltros: document.getElementById('exactaFiltros'),
    exactaTipo: document.getElementById('exactaTipo'),
    exactaMateria: document.getElementById('exactaMateria'),
    exactaAyuda: document.getElementById('exactaAyuda'),

    listadoContainer: document.getElementById('listadoContainer'),
    spinnerLote: document.getElementById('spinnerLote'),
    btnSubir: document.getElementById('btnSubir'),

    drawer: document.getElementById('drawer'),
    drawerOverlay: document.getElementById('drawerOverlay'),
    btnCerrarDrawer: document.getElementById('btnCerrarDrawer'),

    cortinaDetalle: document.getElementById('cortinaDetalle'),
    detBadgeTipo: document.getElementById('detBadgeTipo'),
    detBadgeMateria: document.getElementById('detBadgeMateria'),
    detRubro: document.getElementById('detRubro'),
    detReg: document.getElementById('detReg'),
    detFecha: document.getElementById('detFecha'),
    detTextoContenedor: document.getElementById('detTextoContenedor'),
    btnCerrarCortina: document.getElementById('btnCerrarCortina'),
    btnCopiarTexto: document.getElementById('btnCopiarTexto'),
    tooltipOverlay: document.getElementById('tooltipOverlay'),
    tooltipTexto: document.getElementById('tooltipTexto'),
    btnCerrarTooltip: document.getElementById('btnCerrarTooltip')
};


/* ============================================================================
   3. UTILIDADES
   ============================================================================ */

function escapeHtml(texto) {
    if (!texto) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(texto).replace(/[&<>"']/g, m => map[m]);
}

function formatearFechaLarga(fechaStr) {
    if (!fechaStr) return 'Sin fecha';
    try {
        const fecha = new Date(fechaStr + 'T12:00:00');
        if (isNaN(fecha)) return fechaStr;
        return fecha.toLocaleDateString('es-ES', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    } catch (e) {
        return fechaStr;
    }
}

function formatearFechaCorta(fechaStr) {
    if (!fechaStr) return 'Sin fecha';
    try {
        const fecha = new Date(fechaStr + 'T12:00:00');
        if (isNaN(fecha)) return fechaStr;
        const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
                       'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        return `${fecha.getDate()} ${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
    } catch (e) {
        return fechaStr;
    }
}

function formatearMaterias(materia) {
    if (!materia) return 'COMÚN';
    if (Array.isArray(materia)) return materia.join(', ');
    return String(materia).split(',').map(m => m.trim()).join(', ');
}

function log(mensaje, tipo = 'info') {
    const prefijo = tipo === 'error' ? '❌' : (tipo === 'warn' ? '⚠️' : '✅');
    console.log(`[JURIS_PULSE] ${prefijo} ${mensaje}`);
}


/* ============================================================================
   4. TEMA (CLARO / OSCURO)
   ============================================================================ */
const TEMA_KEY = 'juris_pulse_tema';

function cargarTema() {
    try {
        const guardado = localStorage.getItem(TEMA_KEY);
        if (guardado === 'claro' || guardado === 'oscuro') {
            aplicarTema(guardado);
            return;
        }
        const prefiereClaro = window.matchMedia('(prefers-color-scheme: light)').matches;
        aplicarTema(prefiereClaro ? 'claro' : 'oscuro');
    } catch (e) {
        log(`No se pudo leer el tema: ${e.message}`, 'warn');
        aplicarTema('oscuro');
    }
}

function aplicarTema(tema) {
    document.documentElement.setAttribute('data-tema', tema);
    if (DOM.btnTema) {
        DOM.btnTema.innerHTML = tema === 'oscuro'
            ? '<i class="fas fa-moon"></i>'
            : '<i class="fas fa-sun"></i>';
    }
    try {
        localStorage.setItem(TEMA_KEY, tema);
    } catch (e) {
        log(`No se pudo guardar el tema: ${e.message}`, 'warn');
    }
}

function alternarTema() {
    const actual = document.documentElement.getAttribute('data-tema') || 'oscuro';
    const nuevo = actual === 'oscuro' ? 'claro' : 'oscuro';
    aplicarTema(nuevo);
    log(`Tema cambiado a: ${nuevo}`);
}


/* ============================================================================
   5. DRAWER (MENÚ LATERAL)
   ============================================================================ */

function abrirDrawer() {
    if (DOM.drawer) DOM.drawer.classList.add('abierto');
    if (DOM.drawerOverlay) DOM.drawerOverlay.classList.add('visible');
}

function cerrarDrawer() {
    if (DOM.drawer) DOM.drawer.classList.remove('abierto');
    if (DOM.drawerOverlay) DOM.drawerOverlay.classList.remove('visible');
}


/* ============================================================================
   6. HEADER (EXPANDIDO / COMPACTO AL SCROLL)
   ============================================================================ */
let ultimoScrollY = 0;

function manejarScrollHeader() {
    const y = window.scrollY;

    if (y > 100 && y > ultimoScrollY) {
        if (DOM.header) DOM.header.classList.add('compacto');
    } else if (y < ultimoScrollY || y < 50) {
        if (DOM.header) DOM.header.classList.remove('compacto');
    }

    // Mostrar/ocultar el botón "Regresar arriba"
    if (DOM.btnSubir) {
        if (y > 400) {
            DOM.btnSubir.classList.add('visible');
        } else {
            DOM.btnSubir.classList.remove('visible');
        }
    }

    ultimoScrollY = y;
    detectarScrollInfinito();
}


/* ============================================================================
   7. PESTAÑAS (EXPLORAR / PREGUNTAR / EXACTA)
   ============================================================================ */

function cambiarPestana(nuevoModo) {
    if (nuevoModo === AppState.modoActual) return;

    log(`Cambiando pestaña: ${AppState.modoActual} → ${nuevoModo}`);
    AppState.modoActual = nuevoModo;

    document.body.setAttribute('data-modo', nuevoModo);

    [DOM.pestanaExplorar, DOM.pestanaPreguntar, DOM.pestanaExacta].forEach(p => {
        if (p) p.classList.remove('activa');
    });
    const activa = {
        explorar: DOM.pestanaExplorar,
        preguntar: DOM.pestanaPreguntar,
        exacta: DOM.pestanaExacta
    }[nuevoModo];
    if (activa) activa.classList.add('activa');

    if (DOM.panelExplorar) DOM.panelExplorar.style.display = nuevoModo === 'explorar' ? 'flex' : 'none';
    if (DOM.panelPreguntar) DOM.panelPreguntar.style.display = nuevoModo === 'preguntar' ? 'flex' : 'none';
    if (DOM.panelExacta) DOM.panelExacta.style.display = nuevoModo === 'exacta' ? 'flex' : 'none';

    // Mostrar/ocultar el dashboard según el contexto de cada pestaña
    actualizarDashboardPorPestana();

    if (nuevoModo === 'explorar') {
        renderizarExplorar();
    } else if (nuevoModo === 'preguntar') {
        if (AppState.preguntarResultados.length > 0) {
            aplicarFiltrosPreguntar();
        } else {
            mostrarEstadoInicial('preguntar');
        }
    } else if (nuevoModo === 'exacta') {
        if (AppState.exactaResultados.length > 0) {
            aplicarFiltrosExacta();
        } else {
            mostrarEstadoInicial('exacta');
        }
    }

    window.location.hash = nuevoModo;
}

function mostrarEstadoInicial(modo) {
    if (!DOM.listadoContainer) return;
    const mensajes = {
        explorar: '📋 Aplica filtros para navegar el corpus.',
        preguntar: '🧠 Escribe una consulta y presiona "Buscar por significado".',
        exacta: '🔤 Escribe una frase y presiona "Buscar".'
    };
    DOM.listadoContainer.innerHTML = `
        <div class="estado-vacio">${mensajes[modo] || ''}</div>
    `;
}


/* ============================================================================
   8. DASHBOARD (TOTAL + FECHAS)
   ============================================================================ */

function actualizarDashboard(total) {
    if (DOM.dashTotal) DOM.dashTotal.innerText = total.toLocaleString('es-MX');
}

/**
 * Ajusta la visibilidad y el número del dashboard según la pestaña activa.
 * - Explorar: siempre visible (total del corpus filtrado).
 * - Preguntar: visible solo si hay búsqueda activa.
 * - Exacta: visible solo si hay búsqueda activa.
 */
function actualizarDashboardPorPestana() {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;

    const modo = AppState.modoActual;

    if (modo === 'explorar') {
        dashboard.style.display = 'flex';
        actualizarDashboard(AppState.explorarFiltradas.length);
        pintarRangoFechas();
    } else if (modo === 'preguntar') {
        if (AppState.preguntarResultados.length > 0) {
            dashboard.style.display = 'flex';
            actualizarDashboard(AppState.preguntarFiltrados.length);
        } else {
            dashboard.style.display = 'none';
        }
    } else if (modo === 'exacta') {
        if (AppState.exactaResultados.length > 0) {
            dashboard.style.display = 'flex';
            actualizarDashboard(AppState.exactaTotal);
        } else {
            dashboard.style.display = 'none';
        }
    }
}

function pintarRangoFechas() {
    if (!DOM.dashRango) return;
    const s = AppState.stats;
    if (!s.fecha_min || !s.fecha_max) {
        DOM.dashRango.innerText = 'Sin datos';
        return;
    }
    const min = formatearFechaLarga(s.fecha_min);
    const max = formatearFechaLarga(s.fecha_max);
    DOM.dashRango.innerText = `Del ${min} al ${max}`;
}


/* ============================================================================
   9. CARGA INICIAL DEL ÍNDICE
   ============================================================================ */

async function cargarIndice() {
    log('Cargando índice del corpus...');
    try {
        const response = await fetch('/api/jurisprudencias/indice');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!data.success || !data.tesis) throw new Error('Respuesta inválida del backend');

        AppState.todasLasTesis = data.tesis;
        log(`Índice cargado: ${AppState.todasLasTesis.length} tesis.`);

        actualizarDashboard(AppState.todasLasTesis.length);
        renderizarExplorar();
    } catch (error) {
        log(`Error al cargar índice: ${error.message}`, 'error');
        if (DOM.listadoContainer) {
            DOM.listadoContainer.innerHTML = `
                <div class="estado-error">
                    ❌ Error al conectar con el backend: ${escapeHtml(error.message)}
                </div>
            `;
        }
    }
}

async function cargarStats() {
    try {
        const response = await fetch('/api/jurisprudencias/stats');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.success && data.stats) {
            AppState.stats = data.stats;
            pintarRangoFechas();
        }
    } catch (error) {
        log(`Error al cargar stats: ${error.message}`, 'warn');
    }
}


/* ============================================================================
   10. SCROLL INFINITO (PAGINACIÓN)
   ============================================================================ */
let cargandoLote = false;

function detectarScrollInfinito() {
    if (cargandoLote) return;
    if (!DOM.listadoContainer) return;

    const scrollY = window.scrollY + window.innerHeight;
    const alturaTotal = document.body.offsetHeight;

    if (alturaTotal - scrollY < 600) {
        if (AppState.modoActual === 'explorar') {
            cargarMasExplorar();
        } else if (AppState.modoActual === 'exacta') {
            cargarMasExacta();
        }
    }
}

function mostrarSpinnerLote(visible) {
    if (DOM.spinnerLote) {
        DOM.spinnerLote.style.display = visible ? 'flex' : 'none';
    }
}


/* ============================================================================
   11. HIDRATACIÓN DE RESÚMENES IA
   ============================================================================ */

async function hidratarResumenes(listaTesis) {
    if (!listaTesis || listaTesis.length === 0) return;

    const faltantes = listaTesis
        .map(t => t.registro_digital)
        .filter(reg => AppState.cacheResumenes[reg] === undefined);

    if (faltantes.length === 0) return;

    const TAMANO_LOTE = 200;
    const lotes = [];
    for (let i = 0; i < faltantes.length; i += TAMANO_LOTE) {
        lotes.push(faltantes.slice(i, i + TAMANO_LOTE));
    }

    log(`Hidratando ${faltantes.length} resúmenes en ${lotes.length} lote(s)...`);

    for (const lote of lotes) {
        try {
            const response = await fetch('/api/jurisprudencias/resumenes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registros: lote })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (!data.success || !data.resumenes) throw new Error('Respuesta inválida');

            for (const [reg, resumen] of Object.entries(data.resumenes)) {
                AppState.cacheResumenes[parseInt(reg, 10)] = resumen || '';
            }
        } catch (error) {
            log(`Error hidratando lote: ${error.message}`, 'warn');
        }
    }
}


/* ============================================================================
   12. RENDERIZADO DE TARJETAS
   ============================================================================ */

function construirTarjeta(t, opciones = {}) {
    const materiasStr = formatearMaterias(t.materia);
    const fechaCorta = formatearFechaCorta(t.fecha_publicacion);
    const tipoIcono = t.tipo === 'Jurisprudencia' ? '⚖️' : '📄';

    // Score discreto: 0-1 → ~7.9-10.2 (×10 + 3, 1 decimal)
    let scoreTxt = '';
    if (opciones.mostrarSimilitud && t.similitud !== undefined) {
        scoreTxt = (parseFloat(t.similitud) * 10 + 3).toFixed(1);
    }

    return `
        <div class="tarjeta" data-registro="${t.registro_digital}">
            <div class="tarjeta-top">
                <div class="tarjeta-reg">📍 REG: ${t.registro_digital}</div>
                <div class="tarjeta-tipo">${tipoIcono} ${escapeHtml(t.tipo || 'Aislada')}</div>
                <div class="tarjeta-materia">📘 ${escapeHtml(materiasStr)}</div>
            </div>
            <div class="tarjeta-rubro">${escapeHtml(t.rubro)}</div>
            <div class="tarjeta-bottom">
                <div class="tarjeta-resumen">🤖 Resumen IA</div>
                <div class="tarjeta-fecha">📅 Publicada el ${escapeHtml(fechaCorta)}</div>
                <div class="tarjeta-score">${scoreTxt}</div>
            </div>
        </div>
    `;
}

function renderizarTarjetas(lista, opciones = {}) {
    if (!DOM.listadoContainer) return;

    if (lista.length === 0) {
        DOM.listadoContainer.innerHTML = `
            <div class="estado-vacio">🔍 Ninguna coincidencia.</div>
        `;
        return;
    }

    let html = '';

    if (opciones.encabezado) {
        html += `<div class="mensaje-ayuda">${escapeHtml(opciones.encabezado)}</div>`;
    }

    for (const t of lista) {
        html += construirTarjeta(t, opciones);
    }

    DOM.listadoContainer.innerHTML = html;
    log(`${lista.length} tarjetas renderizadas.`);

    hidratarResumenes(lista);
}


/* ============================================================================
   13. PESTAÑA EXPLORAR
   ============================================================================ */

const EXPLORAR_LOTE_INICIAL = 200;
const EXPLORAR_LOTE_INCREMENTO = 100;

function renderizarExplorar() {
    const tipo = DOM.explorarTipo ? DOM.explorarTipo.value : 'todas';
    const materia = DOM.explorarMateria ? DOM.explorarMateria.value : 'todas';

    const filtradas = AppState.todasLasTesis.filter(t => {
        if (tipo !== 'todas' && t.tipo !== tipo) return false;
        if (materia !== 'todas') {
            const materias = Array.isArray(t.materia)
                ? t.materia
                : (t.materia || '').split(',').map(m => m.trim());
            if (!materias.includes(materia)) return false;
        }
        return true;
    });

    AppState.explorarFiltradas = filtradas;
    AppState.explorarVisibles = Math.min(EXPLORAR_LOTE_INICIAL, filtradas.length);

    actualizarDashboard(filtradas.length);
    pintarRangoFechas();
    renderizarTarjetas(filtradas.slice(0, AppState.explorarVisibles));
}

function cargarMasExplorar() {
    const total = AppState.explorarFiltradas.length;
    if (AppState.explorarVisibles >= total) return;

    cargandoLote = true;
    mostrarSpinnerLote(true);

    setTimeout(() => {
        const nuevas = Math.min(
            AppState.explorarVisibles + EXPLORAR_LOTE_INCREMENTO,
            total
        );
        const lote = AppState.explorarFiltradas.slice(
            AppState.explorarVisibles,
            nuevas
        );

        const html = lote.map(t => construirTarjeta(t)).join('');
        DOM.listadoContainer.insertAdjacentHTML('beforeend', html);

        AppState.explorarVisibles = nuevas;
        hidratarResumenes(lote);

        cargandoLote = false;
        mostrarSpinnerLote(false);
    }, 300);
}


/* ============================================================================
   14. PESTAÑA PREGUNTAR
   ============================================================================ */

async function ejecutarPreguntar() {
    const consulta = (DOM.preguntarTexto?.value || '').trim();

    if (consulta.length < 3) {
        alert('La consulta debe tener al menos 3 caracteres.');
        return;
    }

    AppState.preguntarConsulta = consulta;
    log(`Búsqueda semántica: "${consulta}"`);

    if (DOM.listadoContainer) {
        DOM.listadoContainer.innerHTML = `
            <div class="estado-cargando">
                <i class="fas fa-circle-notch fa-spin"></i>
                Buscando por significado...
            </div>
        `;
    }

    try {
        const url = `/api/jurisprudencias/buscar/semantica?q=${encodeURIComponent(consulta)}&limit=100`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!data.success) throw new Error('Respuesta inválida');

        AppState.preguntarResultados = data.tesis || [];
        log(`${AppState.preguntarResultados.length} resultados semánticos.`);

        if (DOM.preguntarFiltros) DOM.preguntarFiltros.style.display = 'grid';
        if (DOM.preguntarAyuda) DOM.preguntarAyuda.style.display = 'none';

        aplicarFiltrosPreguntar();
    } catch (error) {
        log(`Error en búsqueda semántica: ${error.message}`, 'error');
        if (DOM.listadoContainer) {
            DOM.listadoContainer.innerHTML = `
                <div class="estado-error">
                    ❌ Error: ${escapeHtml(error.message)}
                </div>
            `;
        }
    }
}

function aplicarFiltrosPreguntar() {
    const tipo = DOM.preguntarTipo ? DOM.preguntarTipo.value : 'todas';
    const materia = DOM.preguntarMateria ? DOM.preguntarMateria.value : 'todas';

    const filtrados = AppState.preguntarResultados.filter(t => {
        if (tipo !== 'todas' && t.tipo !== tipo) return false;
        if (materia !== 'todas') {
            const materias = Array.isArray(t.materia)
                ? t.materia
                : (t.materia || '').split(',').map(m => m.trim());
            if (!materias.includes(materia)) return false;
        }
        return true;
    });

    AppState.preguntarFiltrados = filtrados;
    actualizarDashboard(filtrados.length);

    if (filtrados.length === 0 && AppState.preguntarResultados.length > 0) {
        DOM.listadoContainer.innerHTML = `
            <div class="mensaje-ayuda" style="text-align:center; padding: 30px 20px;">
                ⚠️ Ninguno de los ${AppState.preguntarResultados.length} resultados
                coincide con los filtros aplicados.<br><br>
                💡 Prueba a quitar el filtro, o haz una nueva consulta.
                <br><br>
                <button class="btn-primario" style="max-width: 200px; margin: 0 auto;"
                        onclick="limpiarFiltrosPreguntar()">
                    Limpiar filtros
                </button>
            </div>
        `;
        return;
    }

    const encabezado = filtrados.length > 0
        ? `🧠 ${filtrados.length} tesis relevantes para: «${AppState.preguntarConsulta}»`
        : '';

    renderizarTarjetas(filtrados, {
        mostrarSimilitud: true,
        encabezado
    });
}

function limpiarFiltrosPreguntar() {
    if (DOM.preguntarTipo) DOM.preguntarTipo.value = 'todas';
    if (DOM.preguntarMateria) DOM.preguntarMateria.value = 'todas';
    aplicarFiltrosPreguntar();
}


/* ============================================================================
   15. PESTAÑA EXACTA
   ============================================================================ */

async function ejecutarExacta(resetear = true) {
    const consulta = (DOM.exactaTexto?.value || '').trim();

    if (consulta.length < 2) {
        alert('La consulta debe tener al menos 2 caracteres.');
        return;
    }

    if (resetear) {
        AppState.exactaConsulta = consulta;
        AppState.exactaResultados = [];
        AppState.exactaOffset = 0;
        AppState.exactaTotal = 0;

        if (DOM.listadoContainer) {
            DOM.listadoContainer.innerHTML = `
                <div class="estado-cargando">
                    <i class="fas fa-circle-notch fa-spin"></i>
                    Buscando coincidencias literales...
                </div>
            `;
        }
    }

    const tipo = DOM.exactaTipo ? DOM.exactaTipo.value : 'todas';
    const materia = DOM.exactaMateria ? DOM.exactaMateria.value : 'todas';

    try {
        const params = new URLSearchParams({
            q: AppState.exactaConsulta,
            offset: AppState.exactaOffset,
            limit: AppState.exactaLoteSize
        });
        if (tipo !== 'todas') params.append('tipo', tipo);
        if (materia !== 'todas') params.append('materia', materia);

        const url = `/api/jurisprudencias/buscar/exacta?${params.toString()}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!data.success) throw new Error('Respuesta inválida');

        AppState.exactaTotal = data.total;
        AppState.exactaResultados = AppState.exactaResultados.concat(data.resultados || []);
        AppState.exactaOffset += AppState.exactaLoteSize;

        if (DOM.exactaFiltros) DOM.exactaFiltros.style.display = 'grid';
        if (DOM.exactaAyuda) DOM.exactaAyuda.style.display = 'none';

        if (resetear) {
            aplicarFiltrosExacta();
        } else {
            const nuevas = data.resultados || [];
            const html = nuevas.map(t => construirTarjeta(t)).join('');
            if (DOM.listadoContainer && html) {
                DOM.listadoContainer.insertAdjacentHTML('beforeend', html);
                hidratarResumenes(nuevas);
            }
        }

        log(`Exacta: ${AppState.exactaResultados.length}/${AppState.exactaTotal} cargadas.`);
    } catch (error) {
        log(`Error en búsqueda exacta: ${error.message}`, 'error');
        if (DOM.listadoContainer) {
            DOM.listadoContainer.innerHTML = `
                <div class="estado-error">
                    ❌ Error: ${escapeHtml(error.message)}
                </div>
            `;
        }
    }
}

function aplicarFiltrosExacta() {
    if (!DOM.listadoContainer) return;

    if (AppState.exactaResultados.length === 0) {
        DOM.listadoContainer.innerHTML = `
            <div class="estado-vacio">🔍 Ninguna coincidencia literal.</div>
        `;
        actualizarDashboard(0);
        return;
    }

    actualizarDashboard(AppState.exactaTotal);

    const encabezado = `📖 ${AppState.exactaTotal} coincidencias para: «${AppState.exactaConsulta}»`;

    let html = `<div class="mensaje-ayuda">${escapeHtml(encabezado)}</div>`;
    for (const t of AppState.exactaResultados) {
        html += construirTarjeta(t);
    }
    DOM.listadoContainer.innerHTML = html;
    hidratarResumenes(AppState.exactaResultados);
}

function cargarMasExacta() {
    if (AppState.exactaResultados.length >= AppState.exactaTotal) return;
    ejecutarExacta(false);
}


/* ============================================================================
   16. CORTINA DE DETALLE
   ============================================================================ */

async function abrirCortina(registro) {
    log(`Abriendo cortina del registro ${registro}...`);
    AppState.registroActual = registro;

    if (DOM.cortinaDetalle) DOM.cortinaDetalle.classList.remove('oculta');
    if (DOM.detRubro) DOM.detRubro.innerText = 'Cargando...';
    if (DOM.detTextoContenedor) DOM.detTextoContenedor.innerText = 'Cargando...';
    if (DOM.detReg) DOM.detReg.innerText = registro;

    try {
        const response = await fetch(`/api/jurisprudencias/detalle/${registro}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!data.success || !data.tesis) throw new Error('Tesis no encontrada');

        const t = data.tesis;

        if (DOM.detBadgeTipo) DOM.detBadgeTipo.innerText = (t.tipo || 'Aislada').toUpperCase();
        if (DOM.detBadgeMateria) DOM.detBadgeMateria.innerText = formatearMaterias(t.materia);
        if (DOM.detRubro) DOM.detRubro.innerText = t.rubro || 'Sin rubro';
        if (DOM.detReg) DOM.detReg.innerText = t.registro_digital;
        if (DOM.detFecha) {
            DOM.detFecha.innerText = `📅 Publicada el ${formatearFechaLarga(t.fecha_publicacion)}`;
        }
        if (DOM.detTextoContenedor) DOM.detTextoContenedor.innerText = construirTextoDetalle(t);

        log(`Detalle del registro ${registro} cargado.`);
    } catch (error) {
        log(`Error al cargar detalle: ${error.message}`, 'error');
        if (DOM.detTextoContenedor) {
            DOM.detTextoContenedor.innerText = `❌ Error: ${error.message}`;
        }
    }
}

function construirTextoDetalle(t) {
    const partes = [];
    if (t.resumen_ia) partes.push(`🤖 SÍNTESIS IA:\n${t.resumen_ia}`);
    if (t.hechos) partes.push(`📋 HECHOS:\n${t.hechos}`);
    if (t.criterio_juridico) partes.push(`⚖️ CRITERIO JURÍDICO:\n${t.criterio_juridico}`);
    if (t.justificacion) partes.push(`📖 JUSTIFICACIÓN:\n${t.justificacion}`);
    if (t.texto) partes.push(`📜 TEXTO:\n${t.texto}`);
    return partes.join('\n\n');
}

function cerrarCortina() {
    if (DOM.cortinaDetalle) DOM.cortinaDetalle.classList.add('oculta');
    AppState.registroActual = null;
}


/* ============================================================================
   17. INTERACCIÓN GENERAL
   ============================================================================ */

// --- Header ---
if (DOM.btnHamburguesa) DOM.btnHamburguesa.addEventListener('click', abrirDrawer);
if (DOM.btnTema) DOM.btnTema.addEventListener('click', alternarTema);

// --- Drawer ---
if (DOM.btnCerrarDrawer) DOM.btnCerrarDrawer.addEventListener('click', cerrarDrawer);
if (DOM.drawerOverlay) DOM.drawerOverlay.addEventListener('click', cerrarDrawer);

// --- Pestañas ---
if (DOM.pestanaExplorar) DOM.pestanaExplorar.addEventListener('click', () => cambiarPestana('explorar'));
if (DOM.pestanaPreguntar) DOM.pestanaPreguntar.addEventListener('click', () => cambiarPestana('preguntar'));
if (DOM.pestanaExacta) DOM.pestanaExacta.addEventListener('click', () => cambiarPestana('exacta'));

// --- Explorar ---
if (DOM.explorarTipo) DOM.explorarTipo.addEventListener('change', renderizarExplorar);
if (DOM.explorarMateria) DOM.explorarMateria.addEventListener('change', renderizarExplorar);

// --- Preguntar ---
if (DOM.btnPreguntar) DOM.btnPreguntar.addEventListener('click', ejecutarPreguntar);
if (DOM.preguntarTexto) {
    DOM.preguntarTexto.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            ejecutarPreguntar();
        }
    });
}
if (DOM.preguntarTipo) DOM.preguntarTipo.addEventListener('change', aplicarFiltrosPreguntar);
if (DOM.preguntarMateria) DOM.preguntarMateria.addEventListener('change', aplicarFiltrosPreguntar);

// --- Exacta ---
if (DOM.btnExacta) DOM.btnExacta.addEventListener('click', () => ejecutarExacta(true));
if (DOM.exactaTexto) {
    DOM.exactaTexto.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            ejecutarExacta(true);
        }
    });
}
if (DOM.exactaTipo) DOM.exactaTipo.addEventListener('change', () => ejecutarExacta(true));
if (DOM.exactaMateria) DOM.exactaMateria.addEventListener('change', () => ejecutarExacta(true));

// --- Listado: clic en tarjeta o en "Resumen IA" ---
if (DOM.listadoContainer) {
    DOM.listadoContainer.addEventListener('click', (e) => {
        const btnResumen = e.target.closest('.tarjeta-resumen');
        if (btnResumen) {
            e.stopPropagation();
            const tarjeta = btnResumen.closest('[data-registro]');
            if (!tarjeta) return;
            const reg = parseInt(tarjeta.dataset.registro, 10);
            const resumen = AppState.cacheResumenes[reg];
            abrirTooltipResumen(resumen);
            return;
        }

        const tarjeta = e.target.closest('[data-registro]');
        if (!tarjeta) return;
        const registro = parseInt(tarjeta.dataset.registro, 10);
        abrirCortina(registro);
    });
}

// --- Tooltip de Resumen IA ---
function abrirTooltipResumen(texto) {
    if (!DOM.tooltipOverlay || !DOM.tooltipTexto) return;

    if (texto && texto.trim() !== '') {
        DOM.tooltipTexto.innerText = texto;
    } else {
        DOM.tooltipTexto.innerText = '⏳ Resumen IA aún no disponible. Espera unos segundos.';
    }
    DOM.tooltipOverlay.classList.add('visible');
}

function cerrarTooltipResumen() {
    if (DOM.tooltipOverlay) DOM.tooltipOverlay.classList.remove('visible');
}

if (DOM.tooltipOverlay) {
    DOM.tooltipOverlay.addEventListener('click', (e) => {
        if (e.target === DOM.tooltipOverlay) {
            cerrarTooltipResumen();
        }
    });
}

if (DOM.btnCerrarTooltip) {
    DOM.btnCerrarTooltip.addEventListener('click', cerrarTooltipResumen);
}

// --- Cortina ---
if (DOM.btnCerrarCortina) DOM.btnCerrarCortina.addEventListener('click', cerrarCortina);

if (DOM.btnCopiarTexto) {
    DOM.btnCopiarTexto.addEventListener('click', () => {
        const registro = AppState.registroActual;
        if (!registro) return;

        const t = [...AppState.todasLasTesis, ...AppState.preguntarResultados, ...AppState.exactaResultados]
            .find(x => x.registro_digital === registro);
        if (!t) return;

        const texto = construirTextoDetalle(t);
        abrirModalCopiar(texto);
    });
}

function abrirModalCopiar(texto) {
    const overlay = document.createElement('div');
    overlay.id = 'modalCopiar';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(2, 6, 23, 0.95);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        padding: 20px;
        gap: 12px;
    `;

    const instruccion = document.createElement('div');
    instruccion.style.cssText = `
        color: #f59e0b;
        text-align: center;
        font-weight: bold;
        font-size: 14px;
        padding: 8px;
    `;
    instruccion.innerText = '✅ Texto seleccionado. Presiona Ctrl+C (o mantén presionado → Copiar en móvil).';

    const textarea = document.createElement('textarea');
    textarea.value = texto;
    textarea.readOnly = true;
    textarea.style.cssText = `
        flex: 1;
        width: 100%;
        padding: 16px;
        font-size: 13px;
        font-family: 'Courier New', monospace;
        line-height: 1.5;
        background: #0f172a;
        color: #e2e8f0;
        border: 2px solid #f59e0b;
        border-radius: 8px;
        resize: none;
        outline: none;
    `;

    const btnCerrar = document.createElement('button');
    btnCerrar.innerText = 'Cerrar';
    btnCerrar.style.cssText = `
        padding: 14px;
        font-size: 15px;
        font-weight: bold;
        background: #f59e0b;
        color: #020617;
        border: none;
        border-radius: 8px;
        cursor: pointer;
    `;
    btnCerrar.addEventListener('click', () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });

    overlay.appendChild(instruccion);
    overlay.appendChild(textarea);
    overlay.appendChild(btnCerrar);
    document.body.appendChild(overlay);

    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, texto.length);
}

// --- Tecla ESC cierra drawer, tooltip o cortina ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        cerrarDrawer();
        cerrarTooltipResumen();
        if (DOM.cortinaDetalle && !DOM.cortinaDetalle.classList.contains('oculta')) {
            cerrarCortina();
        }
    }
});

// --- Scroll (header compacto + scroll infinito) ---
window.addEventListener('scroll', manejarScrollHeader, { passive: true });



// --- Scroll ---

// --- Botón "Regresar arriba" ---
if (DOM.btnSubir) {
    DOM.btnSubir.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
window.addEventListener('scroll', manejarScrollHeader, { passive: true });


/* ============================================================================
   18. ARRANQUE
   ============================================================================ */
document.addEventListener('DOMContentLoaded', () => {
    log('Aplicación iniciada.');
    cargarTema();

    const hash = window.location.hash.replace('#', '');
    if (['explorar', 'preguntar', 'exacta'].includes(hash)) {
        cambiarPestana(hash);
    }

    cargarStats();
    cargarIndice();
});