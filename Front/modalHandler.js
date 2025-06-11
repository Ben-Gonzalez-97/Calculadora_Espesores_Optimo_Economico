// Este módulo maneja la lógica de todos los modales.

// Variables para los modales (obtenidas una vez al inicio)
let inputModal, inputModalTitle, inputModalPrompt, inputModalField, inputModalError, inputModalSaveBtn, inputModalCancelBtn;
let messageModal, messageModalTitle, messageModalText, messageModalOkBtn;
let confirmationModal, confirmationModalTitle, confirmationModalText, confirmationModalConfirmBtn, confirmationModalCancelBtn;
let infoModal, closeInfoModalBtn, infoModalBtn; // Para el modal de información existente

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
}

// --- Funciones para Modales Personalizados (movidas desde catalogManager.js) ---
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
                inputModalError.textContent = "El nombre no puede estar vacío."; // Asegurar mensaje de error
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
                document.removeEventListener('keydown', escapeListener);
            }
        };
        document.addEventListener('keydown', escapeListener, { once: true }); // Asegurar que se añade una vez

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
                document.removeEventListener('keydown', escapeListener);
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
                document.removeEventListener('keydown', escapeListener);
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
