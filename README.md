# Tiempos-2025: Gestor Profesional de Lotería

[![React Badge](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript Badge](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite Badge](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase Badge](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.io/)

**Tiempos-2025** es una aplicación web full-stack diseñada para la gestión completa de un sistema de venta de lotería (conocido como "tiempos"). Permite a los administradores gestionar usuarios, registrar resultados de sorteos, y supervisar transacciones, mientras que los clientes pueden comprar números y ver resultados históricos.

---

## 📖 Resumen del Proyecto

Este proyecto es una solución integral y moderna para digitalizar la venta y gestión de lotería. La interfaz de usuario es rápida y reactiva, construida con las últimas tecnologías de frontend, y se apoya en una poderosa infraestructura de backend como servicio (BaaS) que garantiza escalabilidad, seguridad y gestión de datos en tiempo real.

-   **Para el Dueño (`owner`):** Control total del sistema, incluyendo la gestión de vendedores, la sincronización automática de resultados oficiales y la visualización de todas las operaciones.
-   **Para Vendedores (`seller`):** Capacidad de registrar clientes, gestionar recargas y retiros, y vender números.
-   **Para Clientes (`client`):** Comprar números para diferentes sorteos, consultar su saldo, ver el historial de jugadas y resultados.

---

## 🏗️ Arquitectura Técnica

La aplicación utiliza una arquitectura desacoplada, con un frontend moderno que se comunica con los servicios de Supabase.

### Frontend

-   **Framework:** **React 19** con TypeScript.
-   **Herramienta de Build:** **Vite** para un desarrollo y compilación ultra-rápidos.
-   **Estructura:** El código está organizado en `components`, `hooks` (para la lógica reutilizable, como la carga de datos) y `utils`.
-   **Cliente de Supabase:** Se utiliza `@supabase/supabase-js` para interactuar con el backend (autenticación, base de datos, y funciones).

### Backend (BaaS - Backend as a Service)

-   **Plataforma:** **Supabase**.
-   **Base de Datos:** Una base de datos **PostgreSQL** gestionada por Supabase. El esquema completo (tablas, relaciones, tipos) está definido en `supabase_setup.sql`.
-   **Autenticación:** Se utiliza el sistema de autenticación de Supabase, que se integra con la base de datos a través de la tabla `auth.users`.
-   **Seguridad:** Implementa **Row Level Security (RLS)** de PostgreSQL para asegurar que los usuarios solo puedan acceder a los datos que les corresponden según su rol.
-   **Funciones de Base de Datos (RPC):** La lógica de negocio compleja (ej. crear un vendedor, reclamar un premio) está encapsulada en funciones de PostgreSQL, que pueden ser llamadas de forma segura desde el frontend.

---

## 🚀 Guía de Instalación y Puesta en Marcha

Sigue estos pasos para configurar el entorno de desarrollo local.

### Prerrequisitos

-   [Node.js](https://nodejs.org/) (versión 20.x o superior)
-   [Git](https://git-scm.com/)
-   Una cuenta de [Supabase](https://supabase.com/)

### 1. Clonar el Repositorio

```bash
git clone https://github.com/jordelmir/Tiempos-2025.git
cd Tiempos-2025
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Supabase

1.  **Crea un nuevo proyecto** en tu dashboard de Supabase.
2.  Navega a la sección **SQL Editor** y haz clic en **"New query"**.
3.  Copia todo el contenido del archivo `supabase_setup.sql` de este repositorio, pégalo en el editor y haz clic en **"RUN"**. Esto creará todas las tablas, funciones y políticas de seguridad.
4.  Ve a **Project Settings > API**. Aquí encontrarás tus credenciales de Supabase.

### 4. Configurar Variables de Entorno

1.  En la raíz del proyecto, crea un archivo llamado `.env`.
2.  Añade las credenciales de Supabase que obtuviste en el paso anterior, con el siguiente formato:

    ```env
    VITE_SUPABASE_URL=TU_URL_DE_SUPABASE
    VITE_SUPABASE_ANON_KEY=TU_LLAVE_ANONIMA_DE_SUPABASE
    ```

### 5. Configurar el Rol de Dueño (Owner)

1.  Ejecuta la aplicación localmente (siguiente paso) y **regístrate** con el correo que deseas sea el dueño del sistema (ej. `elysiumalternative9@gmail.com`).
2.  Una vez registrado, vuelve al **SQL Editor** de Supabase y ejecuta el siguiente comando para asignarte los privilegios de `owner`:

    ```sql
    SELECT public.setup_owner('tu-correo-de-dueño@example.com');
    ```

### 6. Ejecutar la Aplicación

```bash
npm run dev
```

¡La aplicación debería estar corriendo en `http://localhost:5173` o el puerto que indique Vite!

---

## ⚙️ Scripts Disponibles

-   `npm run dev`: Inicia el servidor de desarrollo de Vite.
-   `npm run build`: Compila la aplicación para producción.
-   `npm run preview`: Sirve la build de producción localmente para previsualización.