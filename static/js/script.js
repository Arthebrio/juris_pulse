/* ============================================================================
   🚗 JURIS_PULSE - SCRIPT PRINCIPAL (VERSIÓN DUAL + CARGA POR LOTES)
   ============================================================================
   Bloques:
     1. Estado global
     2. Referencias al DOM
     3. Utilidades
     4. Persistencia (contador)
     5. Carga inicial (índice + hidratación de resúmenes)
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
    // Datos base (índice completo del corpus, SIN resumen_ia)
    todasLasTesis: [],

    // Resultado que se muestra en el listado
    tesisFiltradas: [],

    // Modo activo
    modoActual: 'filtros',       // 'filtros' | 'semantico'

    // Estado del modo FILTROS
    consultaLocal: '',

    // Estado del modo SEMÁNTICO
    consultaSemantica: '',
    resultadosSemanticos: [],

    // Persistencia
    busquedasRestantes: 20,
    maxBusquedas: 20,

    // Cortina
    registroActual: null,

    // Cache de resúmenes ya hidratados (evita pedirlos dos veces)
    cacheResumenes: {}
};


/* ============================================================================
   2. REFERENCIAS AL DOM
   ============================================================================ */
const DOM = {
    pestanaFiltros: document.getElementById('pestanaFiltros'),
    pestanaSemantica: document.getElementById('pestanaSemantica'),

    mensajeContextual: document.getElementById('mensajeContextual'),

    filtroTipo: document.getElementById('filtroTipo'),
    filtroMateria: document.getElementById('filtroMateria'),

    cajaLocal: document.getElementById('cajaLocal'),
    filtroBusqueda: document.getElementById('filtroBusqueda'),

    cajaSemantica: document.getElementById('cajaSemantica'),
    consultaSemantica: document.getElementById('consultaSemantica'),
    btnBuscarSemantica: document.getElementById('btnBuscarSemantica'),
    contadorBusquedas: document.getElementById('contadorBusquedas'),

    relojRestantes: document.getElementById('relojRestantes'),
    relojJuris: document.getElementById('relojJuris'),
    relojAisladas: document.getElementById('relojAisladas'),

    listadoContainer: document.getElementById('listadoContainer'),

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
   5. CARGA INICIAL (ÍNDICE + HIDRATACIÓN DE RESÚMENES)
   ============================================================================ */

async function cargarTesisDelBackend() {
    log('Cargando índice del corpus desde el backend...');
    try {
        // ✅ CAMBIO CLAVE: /indice en vez de /todas
        // Trae todo el corpus SIN resumen_ia (~11 MB vs ~40 MB).
        const response = await fetch('/api/jurisprudencias/indice');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!data.success || !data.tesis) {
            throw new Error('Respuesta inválida del backend');
        }

        AppState.todasLasTesis = data.tesis;
        log(`Índice cargado: ${AppState.todasLasTesis.length} tesis.`);
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

/**
 * Hidrata los resúmenes IA de un conjunto de registros.
 * Pide al backend solo los resúmenes faltantes (los que no están en cache)
 * y actualiza el data-resumen de cada tarjeta en el DOM.
 *
 * Estrategia: máx 200 registros por petición.
 */
async function hidratarResumenes(listaTesis) {
    if (!listaTesis || listaTesis.length === 0) return;

    // Filtrar los que NO están en cache
    const faltantes = listaTesis
        .map(t => t.registro_digital)
        .filter(reg => AppState.cacheResumenes[reg] === undefined);

    if (faltantes.length === 0) {
        log('Todos los resúmenes ya estaban en cache.');
        return;
    }

    // Procesar en lotes de 200
    const TAMANO_LOTE = 200;
    const lotes = [];
    for (let i = 0; i < faltantes.length; i += TAMANO_LOTE) {
        lotes.push(faltantes.slice(i, i + TAMANO_LOTE));
    }

    log(`Hidratando resúmenes: ${faltantes.length} faltantes en ${lotes.length} lote(s).`);

    for (const lote of lotes) {
        try {
            const response = await fetch('/api/jurisprudencias/resumenes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registros: lote })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (!data.success || !data.resumenes) {
                throw new Error('Respuesta inválida del backend');
            }

            // Guardar en cache
            for (const [reg, resumen] of Object.entries(data.resumenes)) {
                AppState.cacheResumenes[parseInt(reg, 10)] = resumen || '';
            }

            // Actualizar el DOM de las tarjetas ya renderizadas
            for (const [reg, resumen] of Object.entries(data.resumenes)) {
                const tarjeta = DOM.listadoContainer?.querySelector(`[data-registro="${reg}"] .btn-resumen`);
                if (tarjeta) {
                    tarjeta.dataset.resumen = resumen || 'Sin resumen';
                }
            }
        } catch (error) {
            log(`Error hidratando lote: ${error.message}`, 'warn');
        }
    }

    log('Hidratación de resúmenes completada.');
}


/* ============================================================================
   6. CAMBIO DE MODO
   ============================================================================ */

function cambiarModo(nuevoModo) {
    if (nuevoModo === AppState.modoActual) return;

    log(`Cambiando modo: ${AppState.modoActual} → ${nuevoModo}`);
    AppState.modoActual = nuevoModo;

    document.body.setAttribute('data-modo', nuevoModo);

    if (DOM.pestanaFiltros) DOM.pestanaFiltros.classList.toggle('activa', nuevoModo === 'filtros');
    if (DOM.pestanaSemantica) DOM.pestanaSemantica.classList.toggle('activa', nuevoModo === 'semantico');

    if (DOM.mensajeContextual) {
        DOM.mensajeContextual.innerText = nuevoModo === 'filtros'
            ? 'Explora el corpus por tipo, materia y texto.'
            : 'Describe tu consulta en lenguaje natural. La IA buscará por significado.';
    }

    if (DOM.cajaLocal) DOM.cajaLocal.style.display = nuevoModo === 'filtros' ? 'block' : 'none';
    if (DOM.cajaSemantica) DOM.cajaSemantica.style.display = nuevoModo === 'semantico' ? 'flex' : 'none';

    if (nuevoModo === 'filtros') {
        ejecutarPodaDeArbol();
    } else {
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
            if (!rubro.includes(busqueda)) return false;
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

        AppState.resultadosSemanticos = data.tesis;
        log(`${data.tesis.length} resultados semánticos recibidos.`);

        AppState.busquedasRestantes--;
        guardarContador();
        actualizarContador();

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

    let html = '';
    if (opciones.mostrarSimilitud && opciones.consulta) {
        html += `
            <div class="estado-vacio" style="text-align:left; padding: 8px 0; color: #a78bfa; font-size: 12px;">
                🧠 ${lista.length} resultado(s) para: «${escapeHtml(opciones.consulta)}»
            </div>
        `;
    }

    // 🚦 TOPE DE RENDERIZADO: máximo 300 tarjetas a la vez.
    // Si la lista es más grande, el usuario debe afinar filtros.
    const TOPE_RENDER = 300;
    const listaRecortada = lista.slice(0, TOPE_RENDER);
    const truncado = lista.length > TOPE_RENDER;

    if (truncado) {
        html += `
            <div class="estado-vacio" style="text-align:left; padding: 8px 0; color: #f59e0b; font-size: 12px;">
                ⚠️ Mostrando ${TOPE_RENDER} de ${lista.length}. Afina los filtros para ver más específicos.
            </div>
        `;
    }

    for (const t of listaRecortada) {
        const claseBorde = t.tipo === 'Jurisprudencia' ? 'jurisprudencia' : 'aislada';
        const materiasStr = formatearMaterias(t.materia);
        const fechaFormateada = formatearFecha(t.fecha_publicacion);

        let badgeSimilitud = '';
        if (opciones.mostrarSimilitud && t.similitud !== undefined) {
            const sim = parseFloat(t.similitud).toFixed(2);
            badgeSimilitud = `<div class="badge-similitud">🎯 ${sim}</div>`;
        }

        // Resumen desde cache si ya lo tenemos, si no string vacío
        const resumenEnCache = AppState.cacheResumenes[t.registro_digital] || '';

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
                          data-resumen="${escapeHtml(resumenEnCache)}">
                        <i class="fas fa-robot"></i> Resumen IA
                    </span>
                    <span>📅 ${escapeHtml(fechaFormateada)}</span>
                </div>
            </div>
        `;
    }

    DOM.listadoContainer.innerHTML = html;
    log(`${listaRecortada.length} tarjetas renderizadas.`);

    // 🔥 Hidratar resúmenes en background (solo las visibles, sin bloquear)
    hidratarResumenes(listaRecortada);
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

if (DOM.pestanaFiltros) {
    DOM.pestanaFiltros.addEventListener('click', () => cambiarModo('filtros'));
}
if (DOM.pestanaSemantica) {
    DOM.pestanaSemantica.addEventListener('click', () => cambiarModo('semantico'));
}

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

if (DOM.filtroBusqueda) {
    DOM.filtroBusqueda.addEventListener('input', ejecutarPodaDeArbol);
}

if (DOM.btnBuscarSemantica) {
    DOM.btnBuscarSemantica.addEventListener('click', ejecutarBusquedaSemantica);
}

if (DOM.consultaSemantica) {
    DOM.consultaSemantica.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            ejecutarBusquedaSemantica();
        }
    });
}

// Click en tarjeta: abrir cortina. Click en "Resumen IA": mostrar alerta con el resumen.
if (DOM.listadoContainer) {
    DOM.listadoContainer.addEventListener('click', (e) => {
        // Caso 1: clic en el botón "Resumen IA"
        const btnResumen = e.target.closest('.btn-resumen');
        if (btnResumen) {
            e.stopPropagation();
            const resumen = btnResumen.dataset.resumen;
            if (resumen && resumen.trim() !== '') {
                alert(`🤖 SÍNTESIS IA:\n\n${resumen}`);
            } else {
                alert('⏳ Resumen IA aún no disponible. Espera unos segundos o abre la tesis completa.');
            }
            return;
        }

        // Caso 2: clic en cualquier otra parte de la tarjeta → abrir cortina
        const tarjeta = e.target.closest('[data-registro]');
        if (!tarjeta) return;
        const registro = parseInt(tarjeta.dataset.registro, 10);
        abrirCortina(registro);
    });
}

if (DOM.btnCerrarCortina) {
    DOM.btnCerrarCortina.addEventListener('click', () => {
        if (DOM.cortinaDetalle) DOM.cortinaDetalle.classList.add('oculta');
        AppState.registroActual = null;
    });
}

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