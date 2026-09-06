# Cómo levantar IonDroplet de cero

Secuencia exacta para dejar corriendo el backend (puerto 3001) y el frontend V2 (puerto 3000)
en una máquina limpia. Toma unos 10 minutos la primera vez.

Requisitos: Node.js 20 o superior (probado con 24.14.0) y el ESP32 conectado por USB.

Las dos carpetas del sistema:

| Parte | Carpeta |
|---|---|
| Backend | `IonDroplet\IonDroplet Nv\IonDroplet Completo\iondroplet-backend` |
| Frontend V2 | `IonDroplet-V2` |

> El frontend viejo (`IonDroplet Completo\IonDroplet-Front`) es legado. No hace falta para V2.

---

## 1. Backend

### 1.1 Instalar dependencias

```powershell
cd "C:\Users\alexi\Downloads\Proyectos\IonDroplet\IonDroplet Nv\IonDroplet Completo\iondroplet-backend"
npm install
```

### 1.2 Crear el archivo `.env`

Copia `.env.example` a `.env` y llena los valores:

```powershell
Copy-Item .env.example .env
notepad .env
```

| Variable | Para qué sirve | ¿Obligatoria? |
|---|---|---|
| `JWT_SECRET` | Firma los tokens de sesión | Sí, si vas a usar login |
| `ANTHROPIC_API_KEY` | Solo para `POST /api/ai/analyze` | No — el riego funciona sin ella |
| `SERIAL_PORT` | Puerto USB del ESP32 | No — si falta, usa `COM5` |

Para saber qué puerto le tocó al ESP32, conéctalo y corre:

```powershell
[System.IO.Ports.SerialPort]::GetPortNames()
```

Si sale algo distinto de `COM5`, ponlo en `.env` como `SERIAL_PORT=COM7` (o el que sea).
Los puertos Bluetooth también aparecen en esa lista; el ESP32 es el que se agrega al
conectar el cable.

### 1.3 Arrancar el backend

```powershell
npm start
```

Debe imprimir:

```
Base de datos SQLite (iondroplet.db) inicializada correctamente.
IonDroplet backend corriendo en http://localhost:3001
[USB] ¡Conectado exitosamente al puerto COM5! Escuchando al ESP32...
```

Si en vez de la última línea sale `Error en puerto serial`, el ESP32 no está conectado o el
puerto está mal. El servidor sigue corriendo y sirviendo datos viejos, pero no llegan lecturas
nuevas.

Durante el desarrollo, `npm run dev` reinicia el servidor solo al guardar cambios.

---

## 2. Primer usuario

La tabla `users` nace vacía y **no hay pantalla de registro**. Sin este paso, el login siempre
falla. Con el backend ya corriendo, en otra ventana:

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/auth/register -Method POST -ContentType "application/json" -Body '{"email":"admin@iondroplet.mx","password":"cambiala"}'
```

Responde `id` y `email` (no un token). Para comprobar que el login funciona:

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -ContentType "application/json" -Body '{"email":"admin@iondroplet.mx","password":"cambiala"}'
```

Ese sí responde `{ token }`.

> Nota: hoy la app V2 no pide login — el middleware de autenticación está desactivado a
> propósito para la demo local. Este paso es para que el endpoint no quede roto.

---

## 3. Umbral de riego

Este es el número que decide cuándo entra la bomba: **si la humedad baja de este valor, riega**.
Está guardado en la columna `hum_max`, aunque funcione como mínimo (el nombre viene de antes).

`POST /api/thresholds` borra la fila anterior y guarda una nueva, así que **hay que mandar los
cinco campos siempre**, no solo el que quieres cambiar:

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/thresholds -Method POST -ContentType "application/json" -Body '{"temp_max":24,"hum_max":40,"volt_min":0,"volt_max":30,"curr_max":5}'
```

Para ver el valor actual:

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/thresholds
```

`temp_max`, `volt_min`, `volt_max` y `curr_max` no los usa nadie hoy (no hay sensores de
temperatura ni de corriente), pero hay que mandarlos para no perder la fila.

---

## 4. Frontend V2

En otra ventana:

```powershell
cd C:\Users\alexi\Downloads\Proyectos\IonDroplet-V2
npm install
npm run dev
```

Abre <http://localhost:3000>.

Si el backend **no** corre en `http://localhost:3001`, crea `.env.local`:

```
NEXT_PUBLIC_API_URL=http://192.168.1.50:3001
```

Eso es lo que hay que cambiar para abrir la app desde el celular en el campo: pon la IP de la
computadora donde corre el backend.

---

## 5. Comprobar que todo jala

1. Arriba a la derecha debe decir **"Sistema conectado"** en verde. Si dice "Sin conexión", el
   backend no está corriendo o la dirección de `NEXT_PUBLIC_API_URL` está mal.
2. Moja el sensor. El número grande debe cambiar en unos 3 segundos.
3. Si la humedad queda **por debajo** del umbral del paso 3, la bomba enciende sola (con el
   modo en "Solo (automático)") y la tarjeta de riego se pone azul con "REGANDO AHORA".
4. En "Yo decido", el botón "REGAR AHORA" enciende la bomba a mano. En modo automático ese
   botón no aparece, porque el backend ignora los comandos manuales mientras el automático
   está activo.

Si el número no se mueve al mojar el sensor, revisa la ventana del backend: debe imprimir
`[USB] Humedad recibida del ESP32: NN%` cada pocos segundos.

---

## Atajo

`IonDroplet Completo\INICIAR_SISTEMA.bat` abre el backend y el frontend **viejo** (V1) en dos
ventanas. Para V2, arranca el backend con ese `.bat` (o con `npm start`) y el frontend a mano
desde `IonDroplet-V2` con `npm run dev`.
