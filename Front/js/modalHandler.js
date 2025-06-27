/**
 * @file modalHandler.js
 * @summary Gestiona la inicialización y la lógica de todos los modales de la aplicación.
 * Incluye modales de información, de entrada de datos, de mensajes y de confirmación.
 * @module modalHandler
 */

// Variables para los modales (obtenidas una vez al inicio)
/** @type {HTMLElement} */
let inputModal, 
    /** @type {HTMLElement} */
    inputModalTitle, 
    /** @type {HTMLElement} */
    inputModalPrompt, 
    /** @type {HTMLInputElement} */
    inputModalField, 
    /** @type {HTMLElement} */
    inputModalError, 
    /** @type {HTMLButtonElement} */
    inputModalSaveBtn, 
    /** @type {HTMLButtonElement} */
    inputModalCancelBtn;

/** @type {HTMLElement} */
let messageModal, 
    /** @type {HTMLElement} */
    messageModalTitle, 
    /** @type {HTMLElement} */
    messageModalText, 
    /** @type {HTMLButtonElement} */
    messageModalOkBtn;

/** @type {HTMLElement} */
let confirmationModal, 
    /** @type {HTMLElement} */
    confirmationModalTitle, 
    /** @type {HTMLElement} */
    confirmationModalText, 
    /** @type {HTMLButtonElement} */
    confirmationModalConfirmBtn, 
    /** @type {HTMLButtonElement} */
    confirmationModalCancelBtn;

/** @type {HTMLElement} */
let infoModal, 
    /** @type {HTMLButtonElement} */
    closeInfoModalBtn, 
    /** @type {HTMLButtonElement} */
    infoModalBtn;

/** @type {HTMLElement} */
let exportModal,
    /** @type {HTMLButtonElement} */
    closeExportModalBtn,
    /** @type {HTMLButtonElement} */
    exportJsonBtn,
    /** @type {HTMLButtonElement} */
    exportCsvBtn;

/**
 * Inicializa todos los manejadores de modales obteniendo las referencias a los elementos del DOM.
 * Configura listeners de eventos iniciales para el modal de información (apertura/cierre)
 * y para el cierre genérico de modales al hacer clic fuera de ellos o presionar Escape (cuando corresponda).
 * Los listeners específicos para acciones dentro de los modales (guardar, confirmar, etc.)
 * se configuran dinámicamente cuando se muestra cada modal.
 * Advierte en la consola si no se encuentran elementos críticos para algún modal.
 */
function initModalHandler() {
    // Modal de Información (original)
    infoModalBtn = document.getElementById('info-modal-btn');
    infoModal = document.getElementById('info-modal');
    closeInfoModalBtn = document.getElementById('close-info-modal-btn');

    if (infoModalBtn && infoModal && closeInfoModalBtn) {
        infoModalBtn.addEventListener('click', () => {
            infoModal.classList.remove('hidden');
        });

        closeInfoModalBtn.addEventListener('click', () => {
            infoModal.classList.add('hidden');
        });

        window.addEventListener('click', (event) => {
            if (event.target === infoModal) {
                infoModal.classList.add('hidden');
            }
        });
    } else {
        console.warn('Elementos del modal de información no encontrados.');
    }

    // Modal de Input (para catálogos)
    inputModal = document.getElementById('input-modal');
    inputModalTitle = document.getElementById('input-modal-title');
    inputModalPrompt = document.getElementById('input-modal-prompt-text');
    inputModalField = document.getElementById('input-modal-field');
    inputModalError = document.getElementById('input-modal-error');
    inputModalSaveBtn = document.getElementById('input-modal-save-btn');
    inputModalCancelBtn = document.getElementById('input-modal-cancel-btn');

    if (!inputModal || !inputModalSaveBtn || !inputModalCancelBtn || !inputModalField) {
        console.warn('Elementos del modal de input no encontrados. La funcionalidad de guardar catálogo puede fallar.');
    }
    
    // Modal de Mensaje (para catálogos)
    messageModal = document.getElementById('message-modal');
    messageModalTitle = document.getElementById('message-modal-title');
    messageModalText = document.getElementById('message-modal-text');
    messageModalOkBtn = document.getElementById('message-modal-ok-btn');

    if (!messageModal || !messageModalOkBtn) {
        console.warn('Elementos del modal de mensaje no encontrados.');
    }

    // Modal de Confirmación (para catálogos)
    confirmationModal = document.getElementById('confirmation-modal');
    confirmationModalTitle = document.getElementById('confirmation-modal-title');
    confirmationModalText = document.getElementById('confirmation-modal-text');
    confirmationModalConfirmBtn = document.getElementById('confirmation-modal-confirm-btn');
    confirmationModalCancelBtn = document.getElementById('confirmation-modal-cancel-btn');
    
    if (!confirmationModal || !confirmationModalConfirmBtn || !confirmationModalCancelBtn) {
        console.warn('Elementos del modal de confirmación no encontrados.');
    }

    // Modal de Exportación
    exportModal = document.getElementById('export-modal');
    closeExportModalBtn = document.getElementById('close-export-modal-btn');
    exportJsonBtn = document.getElementById('export-json-btn');
    exportCsvBtn = document.getElementById('export-csv-btn');

    if (!exportModal || !closeExportModalBtn || !exportJsonBtn || !exportCsvBtn ) {
        console.warn('Elementos del modal de exportación no encontrados o incompletos.');
    } else {
        // El botón closeExportModalBtn ahora también actúa como cancelación para la promesa en showExportModal.
        // Su listener para simplemente ocultar el modal se maneja en showExportModal para coordinar con la promesa.

        // NO AÑADIR listeners para exportJsonBtn y exportCsvBtn aquí.
        // showExportModal se encargará de sus listeners cuando el modal esté activo.

        window.addEventListener('click', (event) => {
            if (event.target === exportModal) {
                exportModal.classList.add('hidden');
                // Si se cierra haciendo clic fuera, la promesa en showExportModal debe manejarse (generalmente como cancelación)
                // Esto se maneja con el MutationObserver dentro de showExportModal
            }
        });
    }
}

// --- Funciones para Modales Personalizados (movidas desde catalogManager.js) ---

/**
 * Muestra un modal de entrada para solicitar información al usuario.
 * @param {string} promptText - El mensaje que se mostrará al usuario en el modal.
 * @param {string} defaultValue - El valor por defecto para el campo de entrada.
 * @param {string} [title="Guardar Catálogo"] - El título del modal.
 * @returns {Promise<string|null>} Una promesa que se resuelve con el valor ingresado por el usuario
 *                                  o `null` si el usuario cancela la entrada.
 *                                  La promesa se rechaza si los elementos del modal no están disponibles.
 */
function showInputModal(promptText, defaultValue, title = "Guardar Catálogo") {
    if (!inputModal || !inputModalTitle || !inputModalPrompt || !inputModalField || !inputModalError || !inputModalSaveBtn || !inputModalCancelBtn) {
        console.error("Modal de input no inicializado correctamente.");
        return Promise.reject("Modal de input no disponible");
    }
    inputModalTitle.textContent = title;
    inputModalPrompt.textContent = promptText;
    inputModalField.value = defaultValue;
    inputModalError.classList.add('hidden');
    inputModal.classList.remove('hidden');
    inputModalField.focus();

    return new Promise((resolve) => {
        // Remover listeners previos para evitar múltiples ejecuciones
        const newSaveBtn = inputModalSaveBtn.cloneNode(true);
        inputModalSaveBtn.parentNode.replaceChild(newSaveBtn, inputModalSaveBtn);
        inputModalSaveBtn = newSaveBtn;

        const newCancelBtn = inputModalCancelBtn.cloneNode(true);
        inputModalCancelBtn.parentNode.replaceChild(newCancelBtn, inputModalCancelBtn);
        inputModalCancelBtn = newCancelBtn;

        inputModalSaveBtn.onclick = () => {
            if (inputModalField.value.trim() === "") {
                inputModalError.textContent = "El nombre no puede estar vacío.";
                inputModalError.classList.remove('hidden');
                return;
            }
            inputModal.classList.add('hidden');
            resolve(inputModalField.value.trim());
        };
        inputModalCancelBtn.onclick = () => {
            inputModal.classList.add('hidden');
            resolve(null); 
        };
        
        const escapeListener = (event) => {
            if (event.key === 'Escape') {
                inputModalCancelBtn.click();
                // document.removeEventListener('keydown', escapeListener); // Se elimina por el observer o {once: true}
            }
        };
        document.addEventListener('keydown', escapeListener, { once: true });

        // Observador para limpiar el listener de escape si el modal se cierra por otros medios
        const observer = new MutationObserver(() => {
            if (inputModal.classList.contains('hidden')) {
                document.removeEventListener('keydown', escapeListener);
                observer.disconnect();
            }
        });
        observer.observe(inputModal, { attributes: true, attributeFilter: ['class'] });
    });
}

/**
 * Muestra un modal de mensaje simple al usuario.
 * @param {string} message - El mensaje a mostrar.
 * @param {string} [title="Mensaje"] - El título del modal.
 * @returns {Promise<boolean>} Una promesa que se resuelve a `true` cuando el usuario cierra el modal.
 *                             La promesa se rechaza si los elementos del modal no están disponibles.
 */
function showMessageModal(message, title = "Mensaje") {
    if (!messageModal || !messageModalTitle || !messageModalText || !messageModalOkBtn) {
        console.error("Modal de mensaje no inicializado correctamente.");
        return Promise.reject("Modal de mensaje no disponible");
    }
    messageModalTitle.textContent = title;
    messageModalText.textContent = message;
    messageModal.classList.remove('hidden');
    messageModalOkBtn.focus();

    return new Promise((resolve) => {
        const newOkBtn = messageModalOkBtn.cloneNode(true);
        messageModalOkBtn.parentNode.replaceChild(newOkBtn, messageModalOkBtn);
        messageModalOkBtn = newOkBtn;
        
        messageModalOkBtn.onclick = () => {
            messageModal.classList.add('hidden');
            resolve(true);
        };

        const escapeListener = (event) => {
            if (event.key === 'Escape') {
                messageModalOkBtn.click();
                // document.removeEventListener('keydown', escapeListener);
            }
        };
        document.addEventListener('keydown', escapeListener, { once: true });

        const observer = new MutationObserver(() => {
            if (messageModal.classList.contains('hidden')) {
                document.removeEventListener('keydown', escapeListener);
                observer.disconnect();
            }
        });
        observer.observe(messageModal, { attributes: true, attributeFilter: ['class'] });
    });
}

/**
 * Muestra un modal de confirmación para que el usuario acepte o cancele una acción.
 * @param {string} message - El mensaje de confirmación.
 * @param {string} [title="Confirmar Acción"] - El título del modal.
 * @returns {Promise<boolean>} Una promesa que se resuelve a `true` si el usuario confirma,
 *                             o `false` si cancela.
 *                             La promesa se rechaza si los elementos del modal no están disponibles.
 */
function showConfirmationModal(message, title = "Confirmar Acción") {
    if (!confirmationModal || !confirmationModalTitle || !confirmationModalText || !confirmationModalConfirmBtn || !confirmationModalCancelBtn) {
        console.error("Modal de confirmación no inicializado correctamente.");
        return Promise.reject("Modal de confirmación no disponible");
    }
    confirmationModalTitle.textContent = title;
    confirmationModalText.textContent = message;
    confirmationModal.classList.remove('hidden');
    confirmationModalConfirmBtn.focus();

    return new Promise((resolve) => {
        const newConfirmBtn = confirmationModalConfirmBtn.cloneNode(true);
        confirmationModalConfirmBtn.parentNode.replaceChild(newConfirmBtn, confirmationModalConfirmBtn);
        confirmationModalConfirmBtn = newConfirmBtn;

        const newCancelBtn = confirmationModalCancelBtn.cloneNode(true);
        confirmationModalCancelBtn.parentNode.replaceChild(newCancelBtn, confirmationModalCancelBtn);
        confirmationModalCancelBtn = newCancelBtn;

        confirmationModalConfirmBtn.onclick = () => {
            confirmationModal.classList.add('hidden');
            resolve(true); 
        };
        confirmationModalCancelBtn.onclick = () => {
            confirmationModal.classList.add('hidden');
            resolve(false);
        };

        const escapeListener = (event) => {
            if (event.key === 'Escape') {
                confirmationModalCancelBtn.click();
                // document.removeEventListener('keydown', escapeListener);
            }
        };
        document.addEventListener('keydown', escapeListener, { once: true });
        
        const observer = new MutationObserver(() => {
            if (confirmationModal.classList.contains('hidden')) {
                document.removeEventListener('keydown', escapeListener);
                observer.disconnect();
            }
        });
        observer.observe(confirmationModal, { attributes: true, attributeFilter: ['class'] });
    });
}
// --- FIN FUNCIONES PARA MODALES PERSONALIZADOS ---

/**
 * Muestra el modal de exportación.
 * @returns {Promise<string|null>} Una promesa que se resuelve con el formato de exportación seleccionado (ej. "JSON", "CSV")
 *                                  o `null` si el usuario cancela o cierra el modal.
 *                                  La promesa se rechaza si los elementos del modal no están disponibles.
 */
function showExportModal() {
    if (!exportModal || !exportJsonBtn || !exportCsvBtn || !closeExportModalBtn) { // Chequeo actualizado
        console.error("Modal de exportación no inicializado correctamente.");
        return Promise.reject("Modal de exportación no disponible");
    }
    exportModal.classList.remove('hidden');
    // Asegurarse de que el primer botón de opción sea enfocable si se desea, o el modal en sí.
    if (exportJsonBtn) {
        exportJsonBtn.focus();
    }


    return new Promise((resolve) => {
        let promiseResolved = false; // Bandera para evitar múltiples resoluciones

        const handleExportOptionClick = (event) => {
            if (promiseResolved) return;
            promiseResolved = true;

            const format = event.target.id.split('-')[1]?.toUpperCase();
            if (format) {
                cleanExportModalListeners();
                exportModal.classList.add('hidden'); 
                resolve(format);
            } else {
                // Caso improbable si el id del botón no es el esperado
                cleanExportModalListeners();
                exportModal.classList.add('hidden');
                resolve(null);
            }
        };

        const handleCancelClick = () => { 
            if (promiseResolved) return;
            promiseResolved = true;

            cleanExportModalListeners();
            exportModal.classList.add('hidden'); 
            resolve(null);
        };
        
        const escapeListener = (event) => {
            if (event.key === 'Escape') {
                // Simula clic en el botón "X" (closeExportModalBtn)
                // No llamar a closeExportModalBtn.click() directamente si ya tiene un listener {once: true}
                // y queremos que esta lógica de escape también sea {once: true} en efecto.
                // En su lugar, invocar la acción de cancelación directamente.
                handleCancelClick();
            }
        };

        const cleanExportModalListeners = () => {
            exportJsonBtn.removeEventListener('click', handleExportOptionClick);
            exportCsvBtn.removeEventListener('click', handleExportOptionClick);
            closeExportModalBtn.removeEventListener('click', handleCancelClick);
            document.removeEventListener('keydown', escapeListener);
            if (observer) observer.disconnect(); 
        };
        
        exportJsonBtn.addEventListener('click', handleExportOptionClick, { once: true });
        exportCsvBtn.addEventListener('click', handleExportOptionClick, { once: true });
        closeExportModalBtn.addEventListener('click', handleCancelClick, { once: true }); 
        document.addEventListener('keydown', escapeListener, { once: true });

        const observer = new MutationObserver(() => {
            if (exportModal.classList.contains('hidden') && !promiseResolved) {
                // Si el modal se ocultó (ej. clic fuera) y la promesa no fue resuelta por un botón,
                // se considera una cancelación.
                promiseResolved = true;
                cleanExportModalListeners(); 
                resolve(null); 
            }
        });
        observer.observe(exportModal, { attributes: true, attributeFilter: ['class'] });
    });
}
