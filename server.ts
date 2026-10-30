import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/server/routes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// Body parsers with 50mb limit for file attachments & media
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS and Security Headers for AI Studio Iframe and Android WebAssets
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Auth-Token, X-Sami-Session, Cache-Control, Pragma, Range, X-File-Name, X-Upload-Id, X-Expected-Sha256, X-Description-B64, X-Is-Mandatory, X-Min-Supported-Version'
  );
  res.setHeader(
    'Access-Control-Expose-Headers',
    'Content-Length, Content-Range, Accept-Ranges, X-Sami-Apk-Sha256, X-Sami-Apk-Size'
  );
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Prevent Android WebView clients from ever opening developer CI/CD pages
app.use((req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  const isAndroidWebView = ua.includes('; wv)') || ua.includes('Version/4.0 Chrome/');
  if (isAndroidWebView && (req.path === '/dev-fix-center.html' || req.path === '/fix-center.html')) {
    return res.redirect(302, '/');
  }
  next();
});

// Serve static assets from public/ folder (Sami app index.html, images, icons, styles, js bundles)
app.use(express.static(path.resolve(__dirname, 'public')));
app.use('/assets', express.static(path.resolve(__dirname, 'public/assets')));

// Mount API routes
app.use('/api', apiRouter);

// Development mode with Vite Middleware (for /dev-fix-center.html only)
const isDev = process.env.NODE_ENV !== 'production';

async function startServer() {
  if (isDev) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'mpa',
      });
      app.use(vite.middlewares);
      console.log('[Sami Server] Vite middlewares mounted for development');
    } catch (err: any) {
      console.warn('[Sami Server] Vite middleware mount note:', err?.message);
    }
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
  }

  // SPA fallback always serves the real Sami application
  app.get('*', (req, res) => {
    const prodIndexPath = path.resolve(__dirname, 'dist', 'index.html');
    const publicIndexPath = path.resolve(__dirname, 'public', 'index.html');
    const indexPath = !isDev && fs.existsSync(prodIndexPath)
      ? prodIndexPath
      : fs.existsSync(publicIndexPath)
        ? publicIndexPath
        : path.resolve(__dirname, 'index.html');
    res.sendFile(indexPath);
  });

  app.listen(PORT, HOST, () => {
    console.log(`[Sami Server] App running on http://${HOST}:${PORT}`);
  });
}

startServer();
