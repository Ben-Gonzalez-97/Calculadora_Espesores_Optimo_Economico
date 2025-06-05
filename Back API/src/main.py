import os
import sys
import webbrowser
import threading
import socket
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
dotenv_path_to_load = None
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    # Ejecutando como bundle de PyInstaller
    # 1. Intentar cargar .env interno (empaquetado en _MEIPASS)
    internal_dotenv_path = os.path.join(sys._MEIPASS, '.env')
    if os.path.exists(internal_dotenv_path):
        dotenv_path_to_load = internal_dotenv_path
        print(f"Detectado bundle de PyInstaller, cargando .env interno desde: {dotenv_path_to_load}")
    else:
        # 2. Si no hay .env interno, intentar cargar .env externo (junto al .exe)
        print(f"Advertencia: .env interno no encontrado en el bundle ({internal_dotenv_path}).")
        external_dotenv_path = os.path.join(os.path.dirname(sys.executable), '.env')
        if os.path.exists(external_dotenv_path):
            dotenv_path_to_load = external_dotenv_path
            print(f"Cargando .env externo (junto al ejecutable) desde: {dotenv_path_to_load}")
        else:
            print(f"Advertencia: .env externo no encontrado junto al ejecutable ({external_dotenv_path}).")
else:
    # En desarrollo, buscar .env en la raíz del proyecto
    project_root_dev = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    dev_dotenv_path = os.path.join(project_root_dev, '.env')
    if os.path.exists(dev_dotenv_path):
        dotenv_path_to_load = dev_dotenv_path
        print(f"Entorno de desarrollo, cargando .env desde: {dotenv_path_to_load}")
    else:
        print(f"Advertencia: En entorno de desarrollo, .env no encontrado en {dev_dotenv_path}.")

if dotenv_path_to_load and os.path.exists(dotenv_path_to_load):
    load_dotenv(dotenv_path_to_load)
    print(f"Variables de entorno cargadas exitosamente desde: {dotenv_path_to_load}")
else:
    print("Advertencia: No se cargó ningún archivo .env. Usando valores por defecto o variables de entorno del sistema si están definidas.")

# Determinar la ruta base para PyInstaller y desarrollo
if hasattr(sys, '_MEIPASS'):
    # PyInstaller: _MEIPASS es la raíz del bundle temporal.
    # Los módulos (api, services) y datos (Front) están relativos a _MEIPASS.
    # El CWD por defecto es _MEIPASS.
    # sys.path ya está configurado por PyInstaller para encontrar módulos en _MEIPASS.
    # No es necesario cambiar os.chdir o sys.path aquí para los módulos Python.
    pass
else:
    # Desarrollo: el script está en src/
    src_dir = os.path.dirname(os.path.abspath(__file__))
    # Cambiar CWD a src/ para que los imports 'from api...' etc. funcionen directamente
    if os.getcwd() != src_dir:
         os.chdir(src_dir)
    # Añadir src_dir a sys.path para asegurar que los módulos en src/ son encontrables
    if src_dir not in sys.path:
         sys.path.insert(0, src_dir)

# Ahora que los paths están configurados, se pueden hacer los imports.
from flask import Flask, send_from_directory
from flask_cors import CORS
from api.calculations import calculations_bp

# Determinar la ruta del frontend (carpeta Front)
if hasattr(sys, '_MEIPASS'):
    # En PyInstaller, 'Front' se añade a la raíz de _MEIPASS.
    static_folder = os.path.join(sys._MEIPASS, 'Front')
else:
    # En desarrollo, main.py está en Back API/src/
    # Front está en ../../Front relativo a la ubicación de main.py
    current_script_dir = os.path.dirname(os.path.abspath(__file__))
    static_folder = os.path.abspath(os.path.join(current_script_dir, '..', '..', 'Front'))

app = Flask(__name__, static_folder=static_folder, static_url_path='')
CORS(app)

app.register_blueprint(calculations_bp)

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

def find_free_port(start_port=5000, max_tries=20):
    port = start_port
    for _ in range(max_tries):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', port))
                return port
            except OSError:
                port += 1
    raise RuntimeError('No se encontró un puerto libre.')

if __name__ == '__main__':
    flask_env = os.environ.get('FLASK_ENV', 'production') 
    app_debug = flask_env == 'development'
    
    default_host = '127.0.0.1' if flask_env == 'development' else '0.0.0.0'
    app_host = os.environ.get('APP_HOST', default_host)
    
    default_port_str = os.environ.get('APP_PORT', '5000')
    try:
        app_port = int(default_port_str)
    except ValueError:
        app_port = 5000

    # Esta variable de entorno la establece Werkzeug (usado por Flask) en el proceso recargado.
    is_werkzeug_reloader_process = os.environ.get('WERKZEUG_RUN_MAIN') == 'true'

    if flask_env == 'development' and not is_werkzeug_reloader_process:
        # Esta lógica solo se ejecuta en el proceso principal del reloader, no en el hijo.
        # Primero, determinamos el puerto final que se usará.
        temp_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            temp_socket.bind((app_host, app_port)) # Prueba el puerto configurado/leído del .env
        except OSError:
            print(f"Puerto {app_port} (configurado) está ocupado, buscando uno libre...")
            app_port = find_free_port(app_port) # Encuentra uno nuevo si está ocupado
        finally:
            temp_socket.close() # Importante liberar el socket de prueba

        # Abrir el navegador automáticamente solo en desarrollo y si no estamos en PyInstaller
        if not hasattr(sys, '_MEIPASS'):
            final_url = f'http://{app_host}:{app_port}'
            # Usamos un pequeño retraso para dar tiempo a que el servidor Flask realmente inicie
            threading.Timer(1.5, lambda: webbrowser.open(final_url)).start()
            print(f"Servidor de desarrollo (proceso principal) iniciando. Navegador intentará abrir: {final_url}")
            print("Espera a que el servidor Flask (proceso hijo del reloader) confirme que está escuchando en este puerto.")

    elif flask_env != 'development': # production o cualquier otro valor
        print(f"Servidor de producción configurado para el puerto {app_port} en host {app_host}")

    # Flask se encargará de imprimir su propio mensaje de "Running on..." en el proceso hijo.
    # El app_port pasado aquí será el que el servidor realmente use.
    app.run(debug=app_debug, host=app_host, port=app_port)