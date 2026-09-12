/* ============================================================================
   🚗 JURIS_PULSE - SCRIPT PRINCIPAL
   ============================================================================
   Bloques:
     1. Estado global
     2. Referencias al DOM
     3. Utilidades
     4. Carga inicial
     5. Poda de árbol
     6. Renderizado
     7. Interacción
   ============================================================================ */


/* ============================================================================
   1. ESTADO GLOBAL
   ============================================================================ */
const AppState = {
    todasLasTesis: [],       // Todas las tesis del backend
    tesisFiltradas: [],      // Después de aplicar la poda de árbol
    modoSemantico: false,    // ¿Está activo el toggle semántico?
    registroActual: null     // Registro de la tesis abierta en la cortina
};


/* ============================================================================
   2. REFERENCIAS AL DOM
   ============================================================================ */
const DOM = {
    // Filtros y búsqueda
    filtroTipo: document.getElementById('filtroTipo'),
    filtroMateria: document.getElementById('filtroMateria'),
    filtroBusqueda: document.getElementById('filtroBusqueda'),
    toggleSemantica: document.getElementById('toggleSemantica'),
    toggleLabel: document.getElementById('toggleLabel'),

    // Métricas
    relojRestantes: document.getElementById('relojRestantes'),
    relojJuris: document.getElementById('relojJuris'),
    relojAisladas: document.getElementById('relojAisladas'),

    // Listado
    listadoContainer: document.getElementById('listadoContainer'),

    // Cortina
    cortinaDetalle: document.getElementById('cortinaDetalle'),
    detBadgeTipo: document.getElementById('detBadgeTipo'),
    detBadgeMateria: document.getElementById('detBadgeMateria'),
    detRubro: document.getElementById('detRubro'),
    detReg: document.getElementById('detReg'),
    detFecha: document.getElementById('detFecha'),
    detTextoContenedor: document.getElementById('detTextoContenedor'),
    btnCerrarCortina: document.getElementById('btnCerrarCortina'),
    btnCopiarTexto: document.getElementById('btnCopiarTexto')
};


/* ============================================================================
   3. UTILIDADES
   ============================================================================ */

/**
 * Escapa caracteres HTML para evitar inyecciones.
 */
function escapeHtml(texto) {
    if (!texto) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(texto).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Formatea una fecha ISO (YYYY-MM-DD) al formato "17 de octubre de 2025".
 */
function formatearFecha(fechaStr) {
    if (!fechaStr) return 'Sin fecha';
    try {
        const fecha = new Date(fechaStr);
        if (isNaN(fecha)) return fechaStr;
        return fecha.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch (e) {
        return fechaStr;
    }
}

/**
 * Log con prefijo para depuración.
 */
function log(mensaje, tipo = 'info') {
    const prefijo = tipo === 'error' ? '❌' : (tipo === 'warn' ? '⚠️' : '✅');
    console.log(`[JURIS_PULSE] ${prefijo} ${mensaje}`);
}


/* ============================================================================
   4. CARGA INICIAL
   ============================================================================ */

/**
 * Carga todas las tesis del backend al iniciar la página.
 */
async function cargarTesisDelBackend() {
    log('Cargando tesis del backend...');
    try {
        const response = await fetch('/api/jurisprudencias/todas');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!data.success || !data.tesis) {
            throw new Error('Respuesta inválida del backend');
        }

        AppState.todasLasTesis = data.tesis;
        log(`${AppState.todasLasTesis.length} tesis cargadas desde el backend.`);
        ejecutarPodaDeArbol();
    } catch (error) {
        log(`Error al cargar tesis: ${error.message}`, 'error');
        if (DOM.listadoContainer) {
            DOM.listadoContainer.innerHTML = `
                <div class="estado-vacio" style="color:#f87171;">
                    ❌ Error al conectar con el backend: ${escapeHtml(error.message)}
                </div>
            `;
        }
    }
}


/* ============================================================================
   5. PODA DE ÁRBOL (FILTROS LOCALES)
   ============================================================================ */

/**
 * Aplica los filtros locales (Tipo, Materia, Texto) sobre las tesis cargadas.
 */
function ejecutarPodaDeArbol() {
    log('Aplicando poda de árbol...');

    const tipo = DOM.filtroTipo ? DOM.filtroTipo.value : 'todas';
    const materia = DOM.filtroMateria ? DOM.filtroMateria.value : 'todas';
    const busqueda = DOM.filtroBusqueda ?
        DOM.filtroBusqueda.value.toLowerCase().trim() : '';

    AppState.tesisFiltradas = AppState.todasLasTesis.filter(t => {
        // Filtro por tipo
        if (tipo !== 'todas' && t.tipo !== tipo) return false;

        // Filtro por materia
        if (materia !== 'todas') {
            const materias = Array.isArray(t.materia)
                ? t.materia
                : (t.materia || '').split(',').map(m => m.trim());
            if (!materias.includes(materia)) return false;
        }

        // Filtro por texto (rubro o resumen)
        if (busqueda) {
            const rubro = (t.rubro || '').toLowerCase();
            const resumen = (t.resumen_ia || '').toLowerCase();
            if (!rubro.includes(busqueda) && !resumen.includes(busqueda)) {
                return false;
            }
        }

        return true;
    });

    log(`${AppState.tesisFiltradas.length} tesis después de la poda.`);
    actualizarMetricas();
    renderizarListado();
}


/* ============================================================================
   6. RENDERIZADO
   ============================================================================ */

/**
 * Actualiza las 3 métricas (Restantes, Juris, Aisladas).
 */
function actualizarMetricas() {
    const total = AppState.tesisFiltradas.length;
    const juris = AppState.tesisFiltradas.filter(t => t.tipo === 'Jurisprudencia').length;
    const aisladas = AppState.tesisFiltradas.filter(t => t.tipo === 'Aislada').length;

    if (DOM.relojRestantes) DOM.relojRestantes.innerText = total;
    if (DOM.relojJuris) DOM.relojJuris.innerText = juris;
    if (DOM.relojAisladas) DOM.relojAisladas.innerText = aisladas;
}

/**
 * Renderiza las tarjetas de las tesis en el listado.
 */
function renderizarListado() {
    if (!DOM.listadoContainer) return;

    // Caso vacío
    if (AppState.tesisFiltradas.length === 0) {
        DOM.listadoContainer.innerHTML = `
            <div class="estado-vacio">🔍 Ninguna coincidencia.</div>
        `;
        return;
    }

    // Construir el HTML de las tarjetas
    let html = '';
    for (const t of AppState.tesisFiltradas) {
        const claseBorde = t.tipo === 'Jurisprudencia' ? 'jurisprudencia' : 'aislada';
        const materiasStr = formatearMaterias(t.materia);
        const fechaFormateada = formatearFecha(t.fecha_publicacion);

        html += `
            <div class="tarjeta ${claseBorde}" data-registro="${t.registro_digital}">
                <div class="tarjeta-meta">
                    <span>📌 REG: ${t.registro_digital}</span>
                    <span>${escapeHtml(t.tipo || 'Aislada')} · ${escapeHtml(materiasStr)}</span>
                </div>
                <div class="tarjeta-rubro">${escapeHtml(t.rubro)}</div>
                <div class="tarjeta-footer">
                    <span class="btn-resumen"
                          data-resumen="${escapeHtml(t.resumen_ia || 'Sin resumen')}">
                        <i class="fas fa-robot"></i> Resumen IA
                    </span>
                    <span>📅 ${escapeHtml(fechaFormateada)}</span>
                </div>
            </div>
        `;
    }

    DOM.listadoContainer.innerHTML = html;
    log(`${AppState.tesisFiltradas.length} tarjetas renderizadas.`);
}

/**
 * Convierte el campo "materia" en un texto legible.
 */
function formatearMaterias(materia) {
    if (!materia) return 'COMÚN';
    if (Array.isArray(materia)) return materia.join(', ');
    return String(materia).split(',').map(m => m.trim()).join(', ');
}


/* ============================================================================
   7. INTERACCIÓN
   ============================================================================ */

/* ---------- 7.1 Click en una tarjeta: abrir cortina ---------- */
if (DOM.listadoContainer) {
    DOM.listadoContainer.addEventListener('click', async (e) => {
        // Ignorar clic sobre el botón de resumen IA
        if (e.target.closest('.btn-resumen')) return;

        const tarjeta = e.target.closest('[data-registro]');
        if (!tarjeta) return;

        const registro = parseInt(tarjeta.dataset.registro, 10);
        await abrirCortina(registro);
    });
}

/**
 * Abre la cortina con el detalle de una tesis.
 */
async function abrirCortina(registro) {
    log(`Abriendo cortina del registro ${registro}...`);
    AppState.registroActual = registro;

    // Mostrar cortina con estado de carga
    if (DOM.cortinaDetalle) {
        DOM.cortinaDetalle.classList.remove('oculta');
    }
    if (DOM.detRubro) DOM.detRubro.innerText = 'Cargando...';
    if (DOM.detTextoContenedor) DOM.detTextoContenedor.innerText = 'Cargando...';
    if (DOM.detReg) DOM.detReg.innerText = registro;

    try {
        const response = await fetch(`/api/jurisprudencias/detalle/${registro}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!data.success || !data.tesis) {
            throw new Error('Tesis no encontrada');
        }

        const t = data.tesis;

        // Actualizar la cortina
        if (DOM.detBadgeTipo) DOM.detBadgeTipo.innerText = (t.tipo || 'Aislada').toUpperCase();
        if (DOM.detBadgeMateria) DOM.detBadgeMateria.innerText = formatearMaterias(t.materia);
        if (DOM.detRubro) DOM.detRubro.innerText = t.rubro || 'Sin rubro';
        if (DOM.detReg) DOM.detReg.innerText = t.registro_digital;
        if (DOM.detFecha) DOM.detFecha.innerText = `📅 ${formatearFecha(t.fecha_publicacion)}`;

        // Texto estructurado
        const texto = construirTextoDetalle(t);
        if (DOM.detTextoContenedor) DOM.detTextoContenedor.innerText = texto;

        log(`Detalle del registro ${registro} cargado.`);
    } catch (error) {
        log(`Error al cargar detalle: ${error.message}`, 'error');
        if (DOM.detTextoContenedor) {
            DOM.detTextoContenedor.innerText = `❌ Error: ${error.message}`;
        }
    }
}

/**
 * Construye el texto estructurado para mostrar en la cortina.
 */
function construirTextoDetalle(t) {
    const partes = [];

    if (t.resumen_ia) partes.push(`🤖 SÍNTESIS IA:\n${t.resumen_ia}`);
    if (t.hechos) partes.push(`📋 HECHOS:\n${t.hechos}`);
    if (t.criterio_juridico) partes.push(`⚖️ CRITERIO JURÍDICO:\n${t.criterio_juridico}`);
    if (t.justificacion) partes.push(`📖 JUSTIFICACIÓN:\n${t.justificacion}`);
    if (t.texto) partes.push(`📜 TEXTO:\n${t.texto}`);

    return partes.join('\n\n');
}

/* ---------- 7.2 Cerrar cortina ---------- */
if (DOM.btnCerrarCortina) {
    DOM.btnCerrarCortina.addEventListener('click', () => {
        if (DOM.cortinaDetalle) DOM.cortinaDetalle.classList.add('oculta');
        AppState.registroActual = null;
        log('Cortina cerrada.');
    });
}

/* ---------- 7.3 Botón "Copiar tesis" ---------- */
if (DOM.btnCopiarTexto) {
    DOM.btnCopiarTexto.addEventListener('click', () => {
        const registro = AppState.registroActual;
        if (!registro) return;

        const t = AppState.todasLasTesis.find(x => x.registro_digital === registro);
        if (!t) return;

        const textoCopiar = construirTextoDetalle(t);
        navigator.clipboard.writeText(textoCopiar)
            .then(() => {
                DOM.btnCopiarTexto.innerHTML = '<i class="fas fa-check"></i> Copiado';
                setTimeout(() => {
                    DOM.btnCopiarTexto.innerHTML = '<i class="fas fa-copy"></i> Copiar Tesis';
                }, 2000);
            })
            .catch(err => log(`Error al copiar: ${err}`, 'error'));
    });
}

/* ---------- 7.4 Escuchadores de filtros ---------- */
if (DOM.filtroTipo) DOM.filtroTipo.addEventListener('change', ejecutarPodaDeArbol);
if (DOM.filtroMateria) DOM.filtroMateria.addEventListener('change', ejecutarPodaDeArbol);
if (DOM.filtroBusqueda) DOM.filtroBusqueda.addEventListener('input', ejecutarPodaDeArbol);

/* ---------- 7.5 Toggle semántico (por ahora solo cambia el estado) ---------- */
if (DOM.toggleSemantica) {
    DOM.toggleSemantica.addEventListener('change', (e) => {
        AppState.modoSemantico = e.target.checked;
        if (DOM.toggleLabel) {
            DOM.toggleLabel.classList.toggle('activo', AppState.modoSemantico);
        }
        log(`Modo semántico: ${AppState.modoSemantico ? 'ACTIVADO' : 'desactivado'}`);
        // La búsqueda semántica real la implementaremos en el siguiente paso.
    });
}


/* ============================================================================
   🚀 ARRANQUE
   ============================================================================ */
document.addEventListener('DOMContentLoaded', () => {
    log('Aplicación iniciada.');
    cargarTesisDelBackend();
});