/**
 * @file uiSetup.js
 * @summary Orquesta la inicialización de la interfaz de usuario (UI) y otros módulos de la aplicación.
 * Se encarga de poblar los placeholders de los inputs, configurar tooltips, y llamar
 * a las funciones de inicialización de otros módulos cuando el DOM está completamente cargado.
 */

/**
 * Popula los placeholders de los campos de entrada y configura los tooltips basados en el objeto `leyendas`.
 * También carga valores por defecto en los inputs utilizando `loadValuesToInputs` y `valoresBase`
 * si están disponibles globalmente.
 * @global {function} loadValuesToInputs - Función (esperada de catalogManager.js) para cargar valores en los inputs.
 * @global {object} valoresBase - Objeto (esperado de catalogManager.js) con los valores por defecto.
 * @global {object} leyendas - Objeto (esperado de catalogManager.js) con las leyendas para los tooltips.
 */
function populateInputPlaceholdersAndTooltips() {
    // Cargar valores por defecto en los inputs
    // Esta función asume que catalogManager.js ya se cargó y definió
    // loadValuesToInputs y valoresBase globalmente o de forma accesible.
    if (typeof loadValuesToInputs === 'function' && typeof valoresBase === 'object') {
        // Antes de cargar valores base, verificar si hay algo en localStorage
        // que deba cargarse por defecto (ej. el último usado). Por ahora, solo valoresBase.
        loadValuesToInputs(valoresBase); 
    } else {
        console.warn("loadValuesToInputs o valoresBase no están definidos. No se cargarán valores por defecto.");
    }

    // Configurar tooltips/placeholders basados en 'leyendas'
    if (typeof leyendas === 'object') {
        for (const key in leyendas) {
            const inputElement = document.getElementById(`inp_${key}`);
            if (inputElement) {
                inputElement.title = leyendas[key];
                // Considerar si el placeholder debe ser la leyenda o algo más corto.
                // inputElement.placeholder = leyendas[key]; 
            }
        }
    } else {
        console.warn("Objeto 'leyendas' no definido. No se configurarán tooltips.");
    }
}

/**
 * Ejecuta la lógica de carga global que originalmente estaba en el evento `window.onload` de `app.js`.
 * Puede incluir la configuración de valores por defecto para ciertos campos o cualquier otra
 * inicialización de UI que deba ocurrir después de que los elementos básicos del DOM estén listos.
 */
function globalLoadEvents() {
    // Lógica que estaba en window.addEventListener('load') en app.js
    // Por ejemplo, seleccionar un valor por defecto para 'inp_tipo_calculo' si está vacío.
    const inpTipoCalculo = document.getElementById('inp_tipo_calculo');
    if (inpTipoCalculo && inpTipoCalculo.value === '') {
        // inpTipoCalculo.value = 'cilindro'; // Valor por defecto opcional
        // Si cambiar este valor debe disparar otros eventos (ej. actualizar rangos de gráfica):
        // inpTipoCalculo.dispatchEvent(new Event('change'));
    }
    // Aquí puede ir otra lógica de inicialización de UI global.
}

/**
 * Listener para el evento 'DOMContentLoaded'. Se ejecuta cuando el HTML inicial
 * ha sido completamente cargado y parseado, sin esperar a stylesheets, imágenes y subframes.
 * Inicializa los manejadores de la aplicación (cálculos, gráficos, modales, catálogo)
 * y configura la UI.
 * @listens DOMContentLoaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar todos los módulos
    if (typeof initCalculationHandler === 'function') {
        initCalculationHandler();
    } else {
        console.error("initCalculationHandler no está definido.");
    }

    if (typeof initGraphHandler === 'function') {
        initGraphHandler();
    } else {
        console.error("initGraphHandler no está definido.");
    }

    if (typeof initModalHandler === 'function') {
        initModalHandler();
    } else {
        console.error("initModalHandler no está definido.");
    }
    
    if (typeof initCatalogManager === 'function') {
        initCatalogManager();
    } else {
        console.error("initCatalogManager no está definido.");
    }

    // Configurar placeholders, tooltips y valores iniciales.
    populateInputPlaceholdersAndTooltips();

    // Ejecutar otras lógicas de carga global.
    globalLoadEvents();

    console.log("Aplicación inicializada modularmente desde uiSetup.js.");
});
