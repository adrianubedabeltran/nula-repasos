# Nula.Studio — Repasos de Obra
## Cómo poner en marcha la app (15 minutos)

---

### Requisitos previos
- Tener [Node.js](https://nodejs.org) instalado (versión 18 o superior)
- Una cuenta gratuita en [GitHub](https://github.com)
- Una cuenta gratuita en [Vercel](https://vercel.com)

---

### Paso 1 — Instalar dependencias

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
npm install
```

### Paso 2 — Probar en local (opcional)

```bash
npm run dev
```

Abre http://localhost:5173 en el navegador. Deberías ver la app.

---

### Paso 3 — Subir a GitHub

1. Ve a https://github.com/new y crea un repositorio llamado `nula-repasos` (privado si prefieres)
2. En la terminal:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/nula-repasos.git
git push -u origin main
```

---

### Paso 4 — Desplegar en Vercel

1. Ve a https://vercel.com y haz login con tu cuenta de GitHub
2. Pulsa **"Add New Project"**
3. Selecciona el repositorio `nula-repasos`
4. Vercel detecta automáticamente que es un proyecto Vite. No toques nada.
5. Pulsa **"Deploy"**

En ~1 minuto tienes la app en una URL tipo:
`https://nula-repasos.vercel.app`

---

### Paso 5 — Instalar como app en el móvil

**Android (Chrome):**
1. Abre la URL en Chrome
2. Pulsa los tres puntos (⋮) → "Añadir a pantalla de inicio"
3. Se instala como app nativa

**iPhone / iPad (Safari):**
1. Abre la URL en Safari
2. Pulsa el botón compartir (□↑) → "Añadir a pantalla de inicio"
3. Se instala como app nativa

---

### Paso 6 — Dominio propio (opcional)

Si quieres que sea `repasos.nula.studio`:

1. En Vercel → tu proyecto → Settings → Domains
2. Añade `repasos.nula.studio`
3. Vercel te da un registro CNAME para añadir en el DNS de nula.studio
4. En tu gestor de DNS añades:
   ```
   CNAME  repasos  cname.vercel-dns.com
   ```
5. En 5-10 minutos funciona con HTTPS automático

---

### Iconos

Los iconos PNG incluidos son versiones simplificadas.
Para regenerarlos con mayor calidad a partir del SVG:

```bash
npm install -g sharp-cli
sharp -i public/icons/icon.svg -o public/icons/icon-192.png resize 192
sharp -i public/icons/icon.svg -o public/icons/icon-512.png resize 512
sharp -i public/icons/icon.svg -o public/icons/apple-touch-icon.png resize 180
```

---

### Próximos pasos recomendados

Para que los datos persistan y se compartan entre usuarios en tiempo real (tú + clientes), el siguiente paso sería conectar a **Firebase Firestore** (gratuito hasta ~50.000 lecturas/día). Consultar cuando sea necesario.
