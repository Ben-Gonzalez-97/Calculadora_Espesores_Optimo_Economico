// --- CONFIGURACIÓN DE ENDPOINT DE API SEGÚN ENTORNO ---
// Usa ruta relativa por defecto, pero permite sobreescribir con variable global
const API_BASE = window.API_BASE || '/';

// Podríamos añadir aquí funciones genéricas para hacer fetch, si se repiten mucho.
// Por ahora, solo la constante API_BASE.
