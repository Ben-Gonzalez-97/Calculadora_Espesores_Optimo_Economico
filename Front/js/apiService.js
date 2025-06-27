/**
 * @file apiService.js
 * @summary Define la URL base para las llamadas a la API.
 * Este módulo centraliza la configuración del endpoint de la API, permitiendo
 * que sea fácilmente configurable según el entorno de despliegue.
 */

/**
 * URL base para todas las solicitudes a la API del backend.
 * Intenta obtener la URL de una variable global `window.API_BASE` si está definida;
 * de lo contrario, utiliza una ruta relativa ("/") como valor por defecto.
 * Esto permite configurar el endpoint de la API externamente durante el despliegue
 * sin modificar el código fuente.
 * @const {string}
 */
const API_BASE = window.API_BASE || '/';

// Podríamos añadir aquí funciones genéricas para hacer fetch, si se repiten mucho.
// Por ahora, solo la constante API_BASE.
