// Este módulo maneja la gestión de catálogos de parámetros.

const CATALOG_STORAGE_KEY = 'parameter_catalogs';
const MAX_CATALOG_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_CATALOG_ENTRIES = 50; 

const valoresBase = {
    vida_util: 15,
    w: 0.04,
    beta: 7968,
    C: 2205.48,
    k: 0.049,
    Ta: 28,
    Te: 50,
    Ti: 180,
    v: 2.1,
    eta: 85,
    h: '', 
    diametro: 0.1016, 
    ambiente: '', 
    tipo_calculo: '', 
    orientacion: '' 
};

const leyendas = {
    vida_util: "Vida util (años)",
    w: "Costo del combustible ($/kW-h)",
    beta: "Periodo de operación por año (h/años)",
    C: "Parámetro de coste, asociado al precio del material ($/m3)",
    k: "Coeficiente de conductividad térmica (W/m°C)",
    Ta: "Temperatura ambiente (°C)",
    Te: "Temperatura externa o superficial (°C)",
    Ti: "Temperatura interna máxima (°C)",
    v: "Velocidad del viento (m/s)",
    eta: "Eficiencia de la máquina térmica (%)",
    h: "Coeficiente de convección (W/m²°C)",
    diametro: "Diámetro tubería (m)",
    ambiente: "Tipo de ambiente: interior o exterior",
    tipo_calculo: "Tipo de cálculo: plano, cilindro o esfera",
    orientacion: "Orientación de la geometría: horizontal o vertical"
};


function getCurrentInputValues() {
    const values = {};
    for (const key in valoresBase) {
        const inputElement = document.getElementById(`inp_${key}`);
        if (inputElement) {
            // Tratar 'h' específicamente para permitir string vacío o número
            if (key === 'h') {
                values[key] = inputElement.value === '' ? '' : Number(inputElement.value);
            } else if (inputElement.type === 'number') {
                 // Para otros numéricos, convertir a número, pero si está vacío, podría ser NaN o 0.
                 // Se asume que el backend maneja bien los NaN o que las validaciones previas lo impiden.
                values[key] = inputElement.value === '' ? null : Number(inputElement.value); // Enviar null si está vacío
            }
            else {
                values[key] = inputElement.value;
            }
        } else {
            // Si el input no existe, se podría asignar un valor por defecto o null.
            values[key] = valoresBase[key]; // Opcional: tomar de valoresBase si no existe el input
        }
    }
    return values;
}

function loadValuesToInputs(values) {
    for (const key in values) {
        const inputElement = document.getElementById(`inp_${key}`);
        if (inputElement) {
            inputElement.value = values[key] === null ? '' : values[key]; // Si es null, poner string vacío en input
        }
    }
}

function saveCatalogSafe(name, values) {
    try {
        let catalogs = JSON.parse(localStorage.getItem(CATALOG_STORAGE_KEY) || '{}');
        
        if (Object.keys(catalogs).length >= MAX_CATALOG_ENTRIES && !catalogs[name]) {
            // Usar showMessageModal en lugar de alert
            showMessageModal(`Límite de ${MAX_CATALOG_ENTRIES} catálogos alcanzado. Por favor, elimina alguno existente.`, "Error al Guardar");
            return false;
        }

        catalogs[name] = values;
        const catalogsString = JSON.stringify(catalogs);

        if (new TextEncoder().encode(catalogsString).length > MAX_CATALOG_SIZE_BYTES) {
            // Usar showMessageModal en lugar de alert
            showMessageModal('El tamaño total de los catálogos excede el límite. No se pudo guardar.', "Error al Guardar");
            return false;
        }
        
        localStorage.setItem(CATALOG_STORAGE_KEY, catalogsString);
        return true;
    } catch (e) {
        console.error("Error guardando en localStorage (puede ser por cuota excedida):", e);
        // Usar showMessageModal en lugar de alert
        showMessageModal("No se pudo guardar el catálogo. El almacenamiento podría estar lleno o deshabilitado.", "Error al Guardar");
        return false;
    }
}


function renderListaParametros() {
    const container = document.getElementById('parametrosGuardadosContainer');
    if (!container) {
        console.warn("Contenedor 'parametrosGuardadosContainer' no encontrado.");
        return;
    }

    container.innerHTML = ''; 
    let catalogs = {};
    try {
        catalogs = JSON.parse(localStorage.getItem(CATALOG_STORAGE_KEY) || '{}');
    } catch (e) {
        console.error("Error al leer catálogos de localStorage:", e);
        localStorage.removeItem(CATALOG_STORAGE_KEY); 
    }

    if (Object.keys(catalogs).length === 0) {
        // Se mantiene el mensaje, pero el botón de guardar ahora es estático en index.html
        container.innerHTML = `
          <div class="flex max-w-[480px] flex-col items-center gap-2">
            <p class="text-[#101518] text-lg font-bold leading-tight tracking-[-0.015em] max-w-[480px] text-center">No hay parámetros guardados</p>
            <p class="text-[#101518] text-sm font-normal leading-normal max-w-[480px] text-center">Guarda tus parámetros de cálculo para uso futuro usando el botón de abajo.</p>
          </div>`;
        return;
    }

    const lista = document.createElement('div');
    lista.className = 'flex flex-col gap-3 w-full'; // Clases del app.js original

    Object.keys(catalogs).forEach(nombre => {
        const item = document.createElement('div');
        // Clases del app.js original para cada item
        item.className = 'flex flex-row items-center justify-between bg-gray-100 rounded-lg px-4 py-2'; 
        item.innerHTML = `
          <span class="font-semibold text-[#1976d2] cursor-pointer">${nombre}</span>
          <div class="flex gap-2">
            <button class="cargar-parametro bg-[#b2d1e5] text-[#101518] rounded px-3 py-1 font-bold text-sm" data-nombre="${nombre}">Cargar</button>
            <button class="eliminar-parametro bg-[#e57373] text-white rounded px-3 py-1 font-bold text-sm" data-nombre="${nombre}">Eliminar</button>
          </div>
        `;
        // Event listener para cargar al hacer clic en el nombre (como en la nueva versión)
        item.querySelector('span').addEventListener('click', () => cargarParametros(nombre));
        item.querySelector('.cargar-parametro').addEventListener('click', () => cargarParametros(nombre));
        item.querySelector('.eliminar-parametro').addEventListener('click', () => eliminarParametros(nombre));
        lista.appendChild(item);
    });
    container.appendChild(lista);
}

// --- Las funciones de modal showInputModal, showMessageModal, showConfirmationModal se han movido a modalHandler.js ---

function guardarParametrosActuales() {
    const randomNumber = Math.floor(10000 + Math.random() * 90000); // Genera un número entre 10000 y 99999
    const nombreSugerido = `Parametro-${new Date().toISOString().slice(0,10)}-ID-${randomNumber}`;
    
    // Llamar a showInputModal desde modalHandler.js (asumiendo que está disponible globalmente o importado)
    showInputModal("Ingresa un nombre para este conjunto de parámetros:", nombreSugerido, "Guardar Parámetros")
        .then(nombreCatalogo => {
            if (nombreCatalogo) { 
                const currentValues = getCurrentInputValues();
                if (saveCatalogSafe(nombreCatalogo, currentValues)) {
                    renderListaParametros(); 
                    // Llamar a showMessageModal desde modalHandler.js
                    showMessageModal(`Parámetros "${nombreCatalogo}" guardados.`);
                }
            } 
            // No es necesario manejar nombreCatalogo === "" aquí, ya que showInputModal lo hace.
            // Si nombreCatalogo es null, el usuario canceló, no se hace nada.
        })
        .catch(error => {
            console.error("Error al mostrar el modal de input:", error);
            // Podrías mostrar un error genérico si el modal en sí falla
            // showMessageModal("No se pudo mostrar el diálogo para guardar parámetros.", "Error");
        });
}

function cargarParametros(name) {
    // Llamar a showConfirmationModal para confirmar la carga
    showConfirmationModal(`¿Estás seguro de que quieres cargar los parámetros del catálogo "${name}"? Los valores actuales en el formulario se sobrescribirán.`, "Confirmar Carga")
        .then(confirmed => {
            if (confirmed) {
                try {
                    const catalogs = JSON.parse(localStorage.getItem(CATALOG_STORAGE_KEY) || '{}');
                    if (catalogs[name]) {
                        loadValuesToInputs(catalogs[name]);
                        // Llamar a showMessageModal desde modalHandler.js
                        showMessageModal(`Parámetros "${name}" cargados.`);
                    } else {
                        // Llamar a showMessageModal desde modalHandler.js
                        showMessageModal(`Catálogo "${name}" no encontrado.`, "Error");
                    }
                } catch (e) {
                    console.error("Error cargando parámetros:", e);
                    // Llamar a showMessageModal desde modalHandler.js
                    showMessageModal("Error al cargar los parámetros.", "Error");
                }
            } else {
                // Opcional: Mostrar un mensaje si el usuario cancela la carga
                // showMessageModal(`Carga del catálogo "${name}" cancelada.`);
            }
        })
        .catch(error => {
            console.error("Error al mostrar el modal de confirmación para cargar:", error);
            showMessageModal("No se pudo mostrar el diálogo de confirmación para la carga.", "Error");
        });
}

function eliminarParametros(name) {
    // Llamar a showConfirmationModal desde modalHandler.js
    showConfirmationModal(`¿Estás seguro de que quieres eliminar el catálogo "${name}"?`, "Confirmar Eliminación")
        .then(confirmed => {
            if (confirmed) {
                try {
                    let catalogs = JSON.parse(localStorage.getItem(CATALOG_STORAGE_KEY) || '{}');
                    if (catalogs[name]) {
                        delete catalogs[name];
                        localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(catalogs));
                        renderListaParametros(); 
                        // Llamar a showMessageModal desde modalHandler.js
                        showMessageModal(`Catálogo "${name}" eliminado.`);
                    }
                } catch (e) {
                    console.error("Error eliminando parámetros:", e);
                    // Llamar a showMessageModal desde modalHandler.js
                    showMessageModal("Error al eliminar el catálogo.", "Error");
                }
            }
        })
        .catch(error => {
            console.error("Error al mostrar el modal de confirmación:", error);
            // showMessageModal("No se pudo mostrar el diálogo de confirmación.", "Error");
        });
}

function initCatalogManager() {
    const btnGuardarParametros = document.getElementById('btnGuardarParametros');
    if (btnGuardarParametros) {
        btnGuardarParametros.addEventListener('click', guardarParametrosActuales);
    } 
    
    renderListaParametros(); 
}
