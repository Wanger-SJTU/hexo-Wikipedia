---
title: Bienvenido a Proyectos
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/es/projects/index/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Bienvenido a Proyectos

Esta es la sección práctica de Learn Harness Engineering. Leer las lecciones no basta: necesitas construir los entornos tú mismo y observar cómo se comportan Codex, Claude Code u otros agentes de IA bajo reglas distintas.

## Resumen de proyectos

El curso incluye 6 proyectos prácticos y progresivos que enseñan a construir desde cero un entorno agentic fiable:

1. **Solo prompt vs reglas primero**: compara el rendimiento de un agente con solo un prompt frente a un harness básico.
2. **Workspace legible para el agente**: aprende a estructurar el repositorio para que sea cómodo para la IA y a establecer mecanismos de handoff.
3. **Continuidad entre sesiones**: diseña archivos de estado y scripts de inicialización para que el agente pueda reanudar el trabajo entre sesiones.
4. **Feedback de runtime y control de alcance**: introduce herramientas que permiten al agente probar su propio código y corregir errores durante la ejecución.
5. **Autoverificación y separación de roles**: construye un mecanismo de revisión independiente para evitar alucinaciones y declaraciones prematuras de éxito.
6. **Harness completo (capstone)**: ensambla un entorno final de trabajo agentic observable y end-to-end.

## Cómo avanzar

Cada carpeta de proyecto suele contener:
- `starter/`: tu workspace inicial.
- `solution/`: una implementación de referencia si te atascas.
- Instrucciones de tarea con contexto y objetivos concretos.

Usa tu AI Coding Agent preferido, por ejemplo Claude Code, Cursor o Trae, para completar las tareas dentro del directorio `starter/`.
