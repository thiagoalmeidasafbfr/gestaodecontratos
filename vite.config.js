import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // O 'base' é crucial para o GitHub Pages
  // Substitua 'saf-analytics-app' pelo nome exato do SEU repositório no GitHub
  // Se o nome do repositório for diferente, mude aqui.
  base: '/gestaodecontratos/', 
  plugins: [react()],
})