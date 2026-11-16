# Metas por bloque y libros en JSON (ola 20)

Trazo acepta dos JSON más en **Hoy → Importar JSON de Claude**. Valida línea por línea (si algo falla, marca la línea), muestra **Qué cambia** antes de guardar y **conserva el avance**: lo que ya tildaste sigue tildado.

## 1. Metas de un bloque

Un bloque es un proyecto, una ventana o una certificación del plan (`P0` a `A7`, `W1` a `WA5`, `C1` a `C7`), un libro (`libro:mwm`) o una unidad de un libro (`libro:mwm:3`).

```json
{
  "tipo": "metas-bloque",
  "bloque": "P0",
  "metas": [
    {
      "id": "p0-hub",
      "texto": "Portfolio hub con mapa 3D de proyectos",
      "submetas": ["proyectos.json validado", "Mapa 3D con los 27 proyectos"]
    },
    { "texto": "Trazo publicado con README en inglés" },
    "Una meta también puede ser solo un texto"
  ]
}
```

- `id` es opcional: sin él, sale del texto ("trazo-publicado-con-readme-en-ingles"). Conviene ponerlo si después vas a cambiar el texto, así se conserva el avance.
- `submetas` es opcional: una lista de textos.
- Importar **reemplaza la lista del bloque**: las metas que no vienen en el JSON se sacan (Qué cambia las lista antes de guardar). El avance se conserva por `id` de meta y por texto de submeta.
- **Exportar JSON** (en cada bloque) devuelve este mismo formato, sin el avance: exportar e importar da lo mismo.

## 2. Los capítulos de un libro

```json
{
  "tipo": "libro",
  "id": "make-it-stick",
  "titulo": "Make It Stick",
  "autor": "Brown, Roediger y McDaniel",
  "capitulos": [
    { "titulo": "Learning Is Misunderstood", "sub": "opcional" },
    "Para un capítulo alcanza con el título"
  ],
  "unidades": [[1, 2], [3, 4], [5]]
}
```

- `id`: corto, en minúsculas y sin espacios. No puede ser el de un libro que ya viene en Trazo (Measure What Matters es `mwm`).
- `unidades` es opcional: sin ellas se arman de a 2 capítulos. Cada unidad tiene 1 o 2 capítulos y cada capítulo va en una sola unidad.
- El libro queda en **Estudio → Libros** y entra en tu día cuando tocás **Empezar este libro** (en el bloque de inglés, todos los días). Cada unidad usa el sistema de libros: micro-tesis por capítulo, mini-test a 85 %, tesis y repasos; al final, test final, tesis final y artefacto.
- Solo títulos del índice: nunca texto del libro.
