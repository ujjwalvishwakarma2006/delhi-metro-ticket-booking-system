import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Check if custom certificates exist
const certPath = path.resolve(__dirname, 'cert')
const certFile = path.join(certPath, 'cert.pem')
const keyFile = path.join(certPath, 'key.pem')

const useCustomCerts = fs.existsSync(certFile) && fs.existsSync(keyFile)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173, // Default Vite port
    strictPort: false, // Use alternative port if 5173 is busy
    https: useCustomCerts ? {
      key: fs.readFileSync(keyFile),
      cert: fs.readFileSync(certFile),
    } : undefined, // Only use HTTPS if certificates exist
  },
})
