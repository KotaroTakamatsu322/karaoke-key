import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages は https://<ユーザー名>.github.io/<リポジトリ名>/ で公開されるので、相対パスで読み込む
  base: './',
})
