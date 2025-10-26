# Documentación del Sistema POS

Este directorio contiene toda la documentación técnica, planes de implementación y guías del sistema POS.

## 📁 Estructura de Carpetas

```
docs/
├── README.md                          # Este archivo
├── planning/                          # Análisis y planificación
│   └── ANALISIS_FEATURES_Y_OPORTUNIDADES.md
├── features/                          # Documentación por feature
│   ├── offline-mode/                  # Modo Offline (PWA)
│   │   └── PLAN_IMPLEMENTACION_OFFLINE_MODE.md
│   ├── loyalty-program/               # Programa de Lealtad (futuro)
│   ├── discounts/                     # Sistema de Descuentos (futuro)
│   └── taxes/                         # Cálculo de Impuestos (futuro)
├── auth/                              # Autenticación y Autorización
│   ├── AUTH_DEVELOPER_GUIDE.md
│   ├── AUTHORIZATION_GUIDE.md
│   ├── MIDDLEWARE_AUTH.md
│   └── LOGOUT_STATE_CLEANUP.md
├── maintenance/                       # Mantenimiento y Operaciones
│   └── DEPENDENCIES_UPDATE.md
└── infrastructure/                    # Infraestructura y DevOps (futuro)
    ├── deployment/
    └── monitoring/
```

## 📚 Documentos Principales

### 🎯 Planificación

| Documento | Descripción | Última Actualización |
|-----------|-------------|---------------------|
| [Análisis de Features y Oportunidades](./planning/ANALISIS_FEATURES_Y_OPORTUNIDADES.md) | Comparativa exhaustiva con sistemas POS del mercado. 47 oportunidades identificadas. | 2025-01-25 |

### 🚀 Features

#### Modo Offline (PWA)
| Documento | Descripción | Estado |
|-----------|-------------|--------|
| [Plan de Implementación](./features/offline-mode/PLAN_IMPLEMENTACION_OFFLINE_MODE.md) | Plan detallado en 5 fases para implementar capacidad offline completa | 📋 Pendiente |

**Duración estimada:** 4-5 semanas
**Prioridad:** 🔴 Alta

#### Programa de Lealtad
*Documentación pendiente*

#### Sistema de Descuentos
*Documentación pendiente*

#### Cálculo de Impuestos
*Documentación pendiente*

### 🔐 Autenticación y Autorización

| Documento | Descripción | Estado |
|-----------|-------------|--------|
| [AUTH_DEVELOPER_GUIDE.md](./auth/AUTH_DEVELOPER_GUIDE.md) | Guía completa para desarrolladores sobre el sistema de autenticación JWT | ✅ Completado |
| [AUTHORIZATION_GUIDE.md](./auth/AUTHORIZATION_GUIDE.md) | Sistema de autorización y RBAC (Admin/Seller) | ✅ Completado |
| [MIDDLEWARE_AUTH.md](./auth/MIDDLEWARE_AUTH.md) | Documentación del middleware de autenticación Next.js | ✅ Completado |
| [LOGOUT_STATE_CLEANUP.md](./auth/LOGOUT_STATE_CLEANUP.md) | Proceso de limpieza de estado al cerrar sesión | ✅ Completado |

### 🔧 Mantenimiento y Operaciones

| Documento | Descripción | Estado |
|-----------|-------------|--------|
| [DEPENDENCIES_UPDATE.md](./maintenance/DEPENDENCIES_UPDATE.md) | Guía para actualización de dependencias del proyecto | ✅ Completado |

## 🏗️ Convenciones

### Nomenclatura de Archivos
- **MAYÚSCULAS_CON_GUIONES_BAJOS.md** - Para documentos principales
- `kebab-case.md` - Para documentos secundarios o ejemplos
- Usar nombres descriptivos y específicos

### Estructura de Documentos
Cada documento debe incluir:
1. **Título claro** con emoji representativo
2. **Tabla de contenidos** para docs >500 líneas
3. **Fecha de creación y última actualización**
4. **Estado** (Pendiente, En Progreso, Completado)
5. **Autor/Responsable** (opcional)
6. **Versionado** si aplica

### Plantilla de Feature
```markdown
# Feature: [Nombre]

## 📋 Información del Documento
**Versión:** 1.0
**Fecha:** YYYY-MM-DD
**Estado:** [Pendiente/En Progreso/Completado]
**Prioridad:** [Alta/Media/Baja]

## 🎯 Objetivo
[Descripción del objetivo]

## 📊 Contexto
[Análisis del estado actual]

## 🏗️ Solución Propuesta
[Arquitectura y diseño]

## 🚀 Plan de Implementación
[Fases y tasks]

## ✅ Criterios de Éxito
[Métricas y validación]
```

## 📝 Cómo Contribuir

### Agregar Nueva Documentación

1. **Identificar el módulo/feature** correspondiente
2. **Crear subcarpeta si no existe:**
   ```bash
   mkdir -p docs/features/nueva-feature
   ```
3. **Crear el documento** siguiendo la plantilla
4. **Actualizar este README.md** con el nuevo documento

### Actualizar Documentación Existente

1. Modificar el documento
2. Actualizar la fecha de "Última Actualización"
3. Incrementar versión si es un cambio mayor

## 🔍 Búsqueda Rápida

### Por Estado de Implementación
- **Completados:** Documentos en `auth/`
- **Pendientes:** Documentos en `features/*/PLAN_*.md`
- **En Progreso:** (Ninguno actualmente)

### Por Prioridad
- **🔴 Alta:** Offline Mode
- **🟡 Media:** Loyalty Program, Discounts, Taxes
- **🟢 Baja:** (Por definir)

## 📞 Contacto

Para preguntas sobre la documentación, contactar al equipo técnico o crear un issue en el repositorio.

---

**Última actualización de este índice:** 2025-01-25
