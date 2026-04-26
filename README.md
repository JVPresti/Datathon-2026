# datamoles · Hey Datathon 2026

> **Producto**: **Havi** — tu copiloto financiero proactivo con IA, integrado en el ecosistema de Hey Banco.
> **Equipo**: Diego Quiros (DS Lead) · Fernando Haro · Brayan Ivan · Jorge Vázquez.
> **Fase actual**: ✅ EDA & Modelado · ✅ Pipeline API (FastAPI) · ✅ Havi App (React Native/Expo).

---

## TL;DR

Construimos **Havi**, un copiloto financiero proactivo basado en **Gemini 3.1 Flash**, que no solo responde preguntas, sino que actúa de manera autónoma para proteger e impulsar la salud financiera de los clientes de Hey Banco.

Analizamos 4 datasets masivos (15k clientes, 800k transacciones) y construimos una arquitectura en tres capas:
1. **Modelos y Datos (`notebooks/`)**: EDA, Feature Engineering y Propensión.
2. **Backend Inteligente (`pipeline/`)**: FastAPI que orquesta el contexto (Gemelo Digital) y se conecta con la API de Google Gemini.
3. **Frontend App (`havi-app/`)**: Una app móvil construida con React Native (Expo) siguiendo el design language de Hey Banco, con chat integrado y UI responsiva.

### Los 4 Casos de Uso (UC) Integrados:

| UC | Qué hace | Cómo lo vive el usuario en Havi App |
|---|---|---|
| **UC1** | Asistente Financiero Proactivo | Alertas enriquecidas (ej. fondos insuficientes) con CTA para mover dinero con 1 tap. |
| **UC2** | Gemelo Digital (Conductual) | Tarjeta en el dashboard proyectando el cierre de mes; Havi conoce tus hábitos sin que se los digas. |
| **UC3** | Upselling Inteligente | Alerta proactiva de "cashback perdido", calculando exactamente cuánto ganaría el usuario con Hey Pro. |
| **UC4** | Inteligencia Conversacional | Detección de transacciones atípicas y bloqueo de tarjeta directo desde el chat con Havi. |

---

## Arquitectura del Repositorio

```text
Datathon-2026/
├── README.md                           ← estás acá
├── .gitignore
│
├── havi-app/                           ← 📱 Frontend Móvil (React Native + Expo)
│   ├── app/                            Enrutamiento (Expo Router), pantallas principales.
│   ├── components/                     UI Components (Alertas, Cards, Markdown).
│   └── src/                            Servicios, Contexto (Pipeline API), y Mock Data.
│
├── pipeline/                           ← 🧠 Backend Inteligente (FastAPI)
│   ├── main.py                         Endpoints REST para la App (/context, /chat, /health).
│   ├── context_engine.py               Agrega datos de UC1-UC4 para inyectarlos en el prompt.
│   └── models_loader.py                Conexión con la API de Gemini usando system prompts.
│
├── docs/                               ← 📚 Documentación técnica
│   ├── ARQUITECTURA_PIPELINE.md        Detalle de la conexión App <-> API <-> Gemini.
│   ├── CONTEXT.md                      Brief del proyecto.
│   └── findings/                       Hallazgos de negocio (EDA).
│
├── notebooks/                          ← 📊 Data Science y Machine Learning
│   ├── eda/                            Análisis transversal por dataset.
│   └── uc<n>/                          Análisis e ingeniería de features por Caso de Uso.
│
└── outputs/                            ← 💾 Artefactos y datasets limpios generados
```

## Setup Rápido (Correr el Proyecto)

Para ver la magia en acción, necesitas levantar el backend (Pipeline) y el frontend (App).

### 1. Levantar el Pipeline (Backend)

El backend requiere Python 3.11+.

```bash
cd pipeline
uv venv .venv --python 3.11
source .venv/bin/activate  # En Windows: .venv\Scripts\activate
uv pip install -r requirements.txt

# Configura tu API Key de Google Gemini
# En Windows CMD: set GEMINI_API_KEY=tu_clave
# En macOS/Linux: export GEMINI_API_KEY=tu_clave

# Ejecutar servidor FastAPI
uvicorn main:app --reload --host=0.0.0.0
```
El servidor correrá en `http://localhost:8000`.

### 2. Levantar Havi App (Frontend)

Requiere Node.js 18+ y un dispositivo físico con la app de **Expo Go** (o un simulador iOS/Android).

```bash
cd havi-app
npm install

# Correr la app móvil (usa --tunnel si estás en Windows o en redes distintas)
npx expo start --tunnel --clear
```
Escanea el código QR desde la app de la cámara de tu celular (iOS) o desde la app Expo Go (Android).

---

## Estado del Proyecto

- ✅ **Data Science**: Datos limpios, análisis conductuales profundos terminados. Modelos de propensión listos.
- ✅ **Ingeniería (Pipeline)**: Backend unificado que expone todo el contexto financiero en milisegundos.
- ✅ **Producto (App)**: Diseño premium, alertas contextuales, chat de Gemini completamente integrado con soporte a markdown e interacciones modulares (Pills, CTAs).

### ¿Por qué Havi?
Havi no te manda a leer el estado de cuenta. Havi lee el estado de cuenta por ti, simula el futuro, detecta dónde puedes mejorar, y te da un botón de "Resolver" para que todo quede solucionado en 1 segundo.

> Hey Banco · Datathon 2026 · Equipo datamoles
