/* ============================================================================
   🚗 JURIS_PULSE - SCRIPT PRINCIPAL (VERSIÓN DUAL)
   ============================================================================
   Bloques:
     1. Estado global
     2. Referencias al DOM
     3. Utilidades
     4. Persistencia (contador)
     5. Carga inicial
     6. Cambio de modo
     7. Poda de árbol (modo filtros)
     8. Búsqueda semántica (modo semántico)
     9. Renderizado
    10. Cortina de detalle
    11. Interacción
    12. Arranque
   ============================================================================ */


/* ============================================================================
   1. ESTADO GLOBAL
   ============================================================================ */
const AppState = {
    // Datos base
    todasLasTesis: [],           // Las 4,792 tesis del backend
    tesisFiltradas: [],          // Resultado que se muestra en el listado

    // Modo activo
    modoActual: 'filtros',       // 'filtros' | 'semantico'

    // Estado del modo FILTROS
    consultaLocal: '',           // Texto en la caja de filtros

    // Estado del modo SEMÁNTICO
    consultaSemantica: '',       // Texto en la caja semántica
    resultadosSemanticos: [],    // Las 20 (o menos) tesis similares

    // Persistencia
    busquedasRestantes: 20,      // Contador de búsquedas semánticas
    maxBusquedas: 20,            // Límite por sesión

    // Cortina
    registroActual: null
};


/* ============================================================================
   2. REFERENCIAS AL DOM
   ============================================================================ */
const DOM = {
    // Pestañas
    pestanaFiltros: document.getElementById('pestanaFiltros'),
    pestanaSemantica: document.getElementById('pestanaSemantica'),

    // Mensaje contextual
    mensajeContextual: document.getElementById('mensajeContextual'),

    // Filtros (Tipo, Materia)
    filtroTipo: document.getElementById('filtroTipo'),
    filtroMateria: document.getElementById('filtroMateria'),

    // Caja local (modo filtros)
    cajaLocal: document.getElementById('cajaLocal'),
    filtroBusqueda: document.getElementById('filtroBusqueda'),

    // Caja semántica (modo semántico)
    cajaSemantica: document.getElementById('cajaSemantica'),
    consultaSemantica: document.getElementById('consultaSemantica'),
    btnBuscarSemantica: document.getElementById('btnBuscarSemantica'),
    contadorBusquedas: document.getElementById('contadorBusquedas'),

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

function escapeHtml(texto) {
    if (!texto) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(texto).replace(/[&<>"']/g, m => map[m]);
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return 'Sin fecha';
    try {
        const fecha = new Date(fechaStr);
        if (isNaN(fecha)) return fechaStr;
        return fecha.toLocaleDateString('es-ES', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
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
   4. PERSISTENCIA (CONTADOR DE BÚSQUEDAS)
   ============================================================================ */

const STORAGE_KEY = 'juris_pulse_busquedas_semanticas';

function cargarContador() {
    try {
        const guardado = localStorage.getItem(STORAGE_KEY);
        if (guardado !== null) {
            AppState.busquedasRestantes = parseInt(guardado, 10);
        }
    } catch (e) {
        log(`No se pudo leer localStorage: ${e.message}`, 'warn');
    }
    actualizarContador();
}

function guardarContador() {
    try {
        localStorage.setItem(STORAGE_KEY, AppState.busquedasRestantes);
    } catch (e) {
        log(`No se pudo guardar en localStorage: ${e.message}`, 'warn');
    }
}

function actualizarContador() {
    if (!DOM.contadorBusquedas) return;
    DOM.contadorBusquedas.innerText = `${AppState.busquedasRestantes}/${AppState.maxBusquedas}`;
    DOM.contadorBusquedas.classList.toggle('agotado', AppState.busquedasRestantes <= 0);
    if (DOM.btnBuscarSemantica) {
        DOM.btnBuscarSemantica.disabled = AppState.busquedasRestantes <= 0;
    }
}


/* ============================================================================
   5. CARGA INICIAL
   ============================================================================ */

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
                <div class="estado-error">
                    ❌ Error al conectar con el backend: ${escapeHtml(error.message)}
                </div>
            `;
        }
    }
}


/* ============================================================================
   6. CAMBIO DE MODO
   ============================================================================ */

function cambiarModo(nuevoModo) {
    if (nuevoModo === AppState.modoActual) return;

    log(`Cambiando modo: ${AppState.modoActual} → ${nuevoModo}`);
    AppState.modoActual = nuevoModo;

    // 1. Cambiar el atributo data-modo del body (esto cambia los colores del CSS)
    document.body.setAttribute('data-modo', nuevoModo);

    // 2. Actualizar pestañas activas
    if (DOM.pestanaFiltros) DOM.pestanaFiltros.classList.toggle('activa', nuevoModo === 'filtros');
    if (DOM.pestanaSemantica) DOM.pestanaSemantica.classList.toggle('activa', nuevoModo === 'semantico');

    // 3. Cambiar el mensaje contextual
    if (DOM.mensajeContextual) {
        DOM.mensajeContextual.innerText = nuevoModo === 'filtros'
            ? 'Explora el corpus por tipo, materia y texto.'
            : 'Describe tu consulta en lenguaje natural. La IA buscará por significado.';
    }

    // 4. Mostrar/ocultar cajas
    if (DOM.cajaLocal) DOM.cajaLocal.style.display = nuevoModo === 'filtros' ? 'block' : 'none';
    if (DOM.cajaSemantica) DOM.cajaSemantica.style.display = nuevoModo === 'semantico' ? 'flex' : 'none';

    // 5. Actualizar el listado según el modo
    if (nuevoModo === 'filtros') {
        // Restaurar el listado local
        ejecutarPodaDeArbol();
    } else {
        // Mostrar el estado del modo semántico
        if (AppState.resultadosSemanticos.length > 0) {
            AppState.tesisFiltradas = AppState.resultadosSemanticos;
            aplicarFiltrosSobreResultados();
        } else {
            mostrarEstadoSemanticoVacio();
        }
    }
}

function mostrarEstadoSemanticoVacio() {
    if (!DOM.listadoContainer) return;
    DOM.listadoContainer.innerHTML = `
        <div class="estado-vacio">
            🧠 Escribe una consulta y presiona "Buscar por significado".
        </div>
    `;
    actualizarMetricasSobreLista([]);
}


/* ============================================================================
   7. PODA DE ÁRBOL (MODO FILTROS)
   ============================================================================ */

function ejecutarPodaDeArbol() {
    log('Aplicando poda de árbol...');

    const tipo = DOM.filtroTipo ? DOM.filtroTipo.value : 'todas';
    const materia = DOM.filtroMateria ? DOM.filtroMateria.value : 'todas';
    const busqueda = (DOM.filtroBusqueda ? DOM.filtroBusqueda.value : '')
        .toLowerCase().trim();

    AppState.consultaLocal = busqueda;

    AppState.tesisFiltradas = AppState.todasLasTesis.filter(t => {
        if (tipo !== 'todas' && t.tipo !== tipo) return false;

        if (materia !== 'todas') {
            const materias = Array.isArray(t.materia)
                ? t.materia
                : (t.materia || '').split(',').map(m => m.trim());
            if (!materias.includes(materia)) return false;
        }

        if (busqueda) {
            const rubro = (t.rubro || '').toLowerCase();
            const resumen = (t.resumen_ia || '').toLowerCase();
            if (!rubro.includes(busqueda) && !resumen.includes(busqueda)) return false;
        }

        return true;
    });

    log(`${AppState.tesisFiltradas.length} tesis después de la poda.`);
    actualizarMetricasSobreLista(AppState.tesisFiltradas);
    renderizarListado(AppState.tesisFiltradas);
}


/* ============================================================================
   8. BÚSQUEDA SEMÁNTICA (MODO SEMÁNTICO)
   ============================================================================ */

async function ejecutarBusquedaSemantica() {
    const consulta = (DOM.consultaSemantica ? DOM.consultaSemantica.value : '').trim();

    // Validaciones
    if (consulta.length < 3) {
        alert('La consulta debe tener al menos 3 caracteres.');
        return;
    }
    if (AppState.busquedasRestantes <= 0) {
        alert('Has alcanzado el límite de búsquedas semánticas.');
        return;
    }

    log(`Búsqueda semántica: "${consulta}"`);
    AppState.consultaSemantica = consulta;

    // Estado de carga
    if (DOM.listadoContainer) {
        DOM.listadoContainer.innerHTML = `
            <div class="estado-cargando">
                <i class="fas fa-circle-notch fa-spin" style="color:#8b5cf6;"></i>
                Buscando por significado...
            </div>
        `;
    }

    try {
        const url = `/api/jurisprudencias/buscar/semantica?q=${encodeURIComponent(consulta)}&limit=20`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!data.success || !data.tesis) {
            throw new Error('Respuesta inválida del backend');
        }

        // Guardar resultados
        AppState.resultadosSemanticos = data.tesis;
        log(`${data.tesis.length} resultados semánticos recibidos.`);

        // Descontar búsqueda
        AppState.busquedasRestantes--;
        guardarContador();
        actualizarContador();

        // Aplicar filtros locales sobre los resultados
        aplicarFiltrosSobreResultados();

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

/**
 * Aplica los filtros locales (Tipo, Materia) sobre los resultados semánticos.
 */
function aplicarFiltrosSobreResultados() {
    const tipo = DOM.filtroTipo ? DOM.filtroTipo.value : 'todas';
    const materia = DOM.filtroMateria ? DOM.filtroMateria.value : 'todas';

    const filtrados = AppState.resultadosSemanticos.filter(t => {
        if (tipo !== 'todas' && t.tipo !== tipo) return false;

        if (materia !== 'todas') {
            const materias = Array.isArray(t.materia)
                ? t.materia
                : (t.materia || '').split(',').map(m => m.trim());
            if (!materias.includes(materia)) return false;
        }

        return true;
    });

    AppState.tesisFiltradas = filtrados;
    log(`${filtrados.length} resultados semánticos tras filtros.`);
    actualizarMetricasSobreLista(filtrados);

    // Renderizar con badge de similitud
    renderizarListado(filtrados, { mostrarSimilitud: true, consulta: AppState.consultaSemantica });
}


/* ============================================================================
   9. RENDERIZADO
   ============================================================================ */

function actualizarMetricasSobreLista(lista) {
    const total = lista.length;
    const juris = lista.filter(t => t.tipo === 'Jurisprudencia').length;
    const aisladas = lista.filter(t => t.tipo === 'Aislada').length;

    if (DOM.relojRestantes) DOM.relojRestantes.innerText = total;
    if (DOM.relojJuris) DOM.relojJuris.innerText = juris;
    if (DOM.relojAisladas) DOM.relojAisladas.innerText = aisladas;
}

function renderizarListado(lista, opciones = {}) {
    if (!DOM.listadoContainer) return;

    if (lista.length === 0) {
        DOM.listadoContainer.innerHTML = `
            <div class="estado-vacio">🔍 Ninguna coincidencia.</div>
        `;
        return;
    }

    // Encabezado si es búsqueda semántica
    let html = '';
    if (opciones.mostrarSimilitud && opciones.consulta) {
        html += `
            <div class="estado-vacio" style="text-align:left; padding: 8px 0; color: #a78bfa; font-size: 12px;">
                🧠 ${lista.length} resultado(s) para: «${escapeHtml(opciones.consulta)}»
            </div>
        `;
    }

    for (const t of lista) {
        const claseBorde = t.tipo === 'Jurisprudencia' ? 'jurisprudencia' : 'aislada';
        const materiasStr = formatearMaterias(t.materia);
        const fechaFormateada = formatearFecha(t.fecha_publicacion);

        // Badge de similitud (solo si viene de búsqueda semántica)
        let badgeSimilitud = '';
        if (opciones.mostrarSimilitud && t.similitud !== undefined) {
            const sim = parseFloat(t.similitud).toFixed(2);
            badgeSimilitud = `<div class="badge-similitud">🎯 ${sim}</div>`;
        }

        html += `
            <div class="tarjeta ${claseBorde}" data-registro="${t.registro_digital}">
                ${badgeSimilitud}
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
    log(`${lista.length} tarjetas renderizadas.`);
}


/* ============================================================================
   10. CORTINA DE DETALLE
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
        if (!data.success || !data.tesis) {
            throw new Error('Tesis no encontrada');
        }

        const t = data.tesis;

        if (DOM.detBadgeTipo) DOM.detBadgeTipo.innerText = (t.tipo || 'Aislada').toUpperCase();
        if (DOM.detBadgeMateria) DOM.detBadgeMateria.innerText = formatearMaterias(t.materia);
        if (DOM.detRubro) DOM.detRubro.innerText = t.rubro || 'Sin rubro';
        if (DOM.detReg) DOM.detReg.innerText = t.registro_digital;
        if (DOM.detFecha) DOM.detFecha.innerText = `📅 ${formatearFecha(t.fecha_publicacion)}`;
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


/* ============================================================================
   11. INTERACCIÓN
   ============================================================================ */

// Pestañas
if (DOM.pestanaFiltros) {
    DOM.pestanaFiltros.addEventListener('click', () => cambiarModo('filtros'));
}
if (DOM.pestanaSemantica) {
    DOM.pestanaSemantica.addEventListener('click', () => cambiarModo('semantico'));
}

// Filtros (Tipo, Materia): se aplican según el modo activo
if (DOM.filtroTipo) {
    DOM.filtroTipo.addEventListener('change', () => {
        if (AppState.modoActual === 'filtros') ejecutarPodaDeArbol();
        else aplicarFiltrosSobreResultados();
    });
}
if (DOM.filtroMateria) {
    DOM.filtroMateria.addEventListener('change', () => {
        if (AppState.modoActual === 'filtros') ejecutarPodaDeArbol();
        else aplicarFiltrosSobreResultados();
    });
}

// Caja local: filtra en vivo (solo en modo filtros)
if (DOM.filtroBusqueda) {
    DOM.filtroBusqueda.addEventListener('input', ejecutarPodaDeArbol);
}

// Botón buscar semántica
if (DOM.btnBuscarSemantica) {
    DOM.btnBuscarSemantica.addEventListener('click', ejecutarBusquedaSemantica);
}

// Enter en textarea semántica dispara la búsqueda
if (DOM.consultaSemantica) {
    DOM.consultaSemantica.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            ejecutarBusquedaSemantica();
        }
    });
}

// Click en tarjeta: abrir cortina
if (DOM.listadoContainer) {
    DOM.listadoContainer.addEventListener('click', (e) => {
        if (e.target.closest('.btn-resumen')) return;
        const tarjeta = e.target.closest('[data-registro]');
        if (!tarjeta) return;
        const registro = parseInt(tarjeta.dataset.registro, 10);
        abrirCortina(registro);
    });
}

// Cerrar cortina
if (DOM.btnCerrarCortina) {
    DOM.btnCerrarCortina.addEventListener('click', () => {
        if (DOM.cortinaDetalle) DOM.cortinaDetalle.classList.add('oculta');
        AppState.registroActual = null;
    });
}

// Copiar tesis
if (DOM.btnCopiarTexto) {
    DOM.btnCopiarTexto.addEventListener('click', () => {
        const registro = AppState.registroActual;
        if (!registro) return;

        const t = [...AppState.todasLasTesis, ...AppState.resultadosSemanticos]
            .find(x => x.registro_digital === registro);
        if (!t) return;

        navigator.clipboard.writeText(construirTextoDetalle(t))
            .then(() => {
                DOM.btnCopiarTexto.innerHTML = '<i class="fas fa-check"></i> Copiado';
                setTimeout(() => {
                    DOM.btnCopiarTexto.innerHTML = '<i class="fas fa-copy"></i> Copiar Tesis';
                }, 2000);
            })
            .catch(err => log(`Error al copiar: ${err}`, 'error'));
    });
}


/* ============================================================================
   12. ARRANQUE
   ============================================================================ */
document.addEventListener('DOMContentLoaded', () => {
    log('Aplicación iniciada.');
    cargarContador();
    cargarTesisDelBackend();
});