import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue()],
    server: {
      host: '0.0.0.0',
      port: 5180,
      proxy: {
        // 管理后台接口（带 JWT 鉴权）
        '/admin/api': {
          target: env.VITE_API_TARGET || 'http://localhost:3000',
          changeOrigin: true,
        },
        // 公开端点：藏品分类列表 GET /categories（后端 CollectibleController，无需登录）
        // 供管理后台的藏品分类默认值直接从后端获取，替代 localStorage
        '/categories': {
          target: env.VITE_API_TARGET || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})
