import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import panelDevApi from './scripts/panel-dev-api.mjs'

// El sitio se publica en GitHub Pages bajo https://<user>.github.io/SW-Web/,
// así que en build necesita el base path "/SW-Web/". En desarrollo se sirve
// desde la raíz para mayor comodidad.
//
// `isPreview` va aparte porque en `vite preview` el command es 'serve', no
// 'build': sin él, el servidor de previsualización sirve en la raíz mientras el
// HTML ya construido pide /SW-Web/assets/..., y todo responde 404.
// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/SW-Web/' : '/',
  // panelDevApi: el backend local del panel (/panel), solo en `npm run dev`.
  plugins: [react(), panelDevApi()],
}))
