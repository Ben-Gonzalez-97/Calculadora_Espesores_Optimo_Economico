// Este módulo orquesta la inicialización de la UI y otros módulos.

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

function globalLoadEvents() {
    // Lógica que estaba en window.addEventListener('load') en app.js
    // Por ejemplo, seleccionar un valor por defecto para 'inp_tipo_calculo' si está vacío.
    const inpTipoCalculo = document.getElementById('inp_tipo_calculo');
    if (inpTipoCalculo && inpTipoCalculo.value === '') {
        // inpTipoCalculo.value = 'cilindro'; // O el valor por defecto que prefieras
        // Si cambiar este valor debe disparar otros eventos (ej. actualizar rangos de gráfica):
        // inpTipoCalculo.dispatchEvent(new Event('change'));
    }
    // Aquí puede ir otra lógica de inicialización de UI global.
}

document.addEventListener('DOMContentLoaded', () => {
    // Es crucial que los scripts se carguen en el orden correcto en index.html
    // para que las funciones y constantes estén disponibles.

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
        initCatalogManager(); // Esto ya llama a renderListaParametros
    } else {
        console.error("initCatalogManager no está definido.");
    }

    // Configurar placeholders, tooltips y valores iniciales después de que catalogManager haya cargado sus constantes.
    populateInputPlaceholdersAndTooltips();

    // Ejecutar otras lógicas de carga global
    globalLoadEvents();

    console.log("Aplicación inicializada modularmente desde uiSetup.js.");
});
