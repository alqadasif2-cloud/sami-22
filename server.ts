import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/server/routes.ts';
import { isValidProductionServerUrl, syncProductionApiServerUrlToCloud } from './src/server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.set('trust proxy', 1);

// 1. CORS & OPTIONS Preflight FIRST (before body parsers, so preflights and body errors always include CORS headers)
app.use((req: Request, res: Response, next: NextFunction) => {
  const reqOrigin = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';
  if (reqOrigin) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, Authorization, X-Auth-Token, X-Sami-Session, Cache-Control, Pragma, Range, X-File-Name, X-Upload-Id, X-Expected-Sha256, X-Description-B64, X-Is-Mandatory, X-Min-Supported-Version'
  );
  res.setHeader(
    'Access-Control-Expose-Headers',
    'Content-Length, Content-Range, Accept-Ranges, X-Sami-Apk-Sha256, X-Sami-Apk-Size'
  );
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Auto-discover and persist deployed HTTPS production origin (ignores localhost & AI Studio preview URLs)
  const forwardedProto = String(req.headers['x-forwarded-proto'] || req.protocol || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  const forwardedHost = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim();
  if (forwardedProto === 'https' && forwardedHost) {
    const candidateOrigin = isValidProductionServerUrl(`https://${forwardedHost}`);
    if (candidateOrigin) {
      syncProductionApiServerUrlToCloud(candidateOrigin).catch(() => {});
    }
  }

  next();
});

// 2. Body parsers with 50mb limit for JSON API & media payloads (binary APK streams bypass express.json cleanly)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 3. Prevent Android WebView clients from ever opening developer CI/CD pages
app.use((req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  const isAndroidWebView = ua.includes('; wv)') || ua.includes('Version/4.0 Chrome/');
  if (isAndroidWebView && (req.path === '/dev-fix-center.html' || req.path === '/fix-center.html')) {
    return res.redirect(302, '/');
  }
  next();
});

// 4. Serve static assets from public/ folder (Sami app index.html, images, icons, styles, js bundles)
app.use(express.static(path.resolve(__dirname, 'public')));
app.use('/assets', express.static(path.resolve(__dirname, 'public/assets')));

// 5. Mount API routes + strict JSON 404 fallback so /api/* never returns HTML
app.use('/api', apiRouter);
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `المسار المطلوب غير موجود على الخادم (${req.method} /api${req.path})`,
  });
});

// 6. Global Express error handler ensuring JSON responses with CORS headers on API routes
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  if (req.path.startsWith('/api')) {
    const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
    return res.status(status).json({
      success: false,
      error: err?.type === 'entity.too.large'
        ? 'حجم البيانات المرسلة يتجاوز الحد المسموح به على الخادم'
        : 'حدث خطأ غير متوقع أثناء معالجة الطلب على الخادم',
    });
  }
  next(err);
});

// 7. Development mode with Vite Middleware (for /dev-fix-center.html only)
const isDev = process.env.NODE_ENV !== 'production';

async function startServer() {
  // Persist configured production URL from environment on startup if valid (non-preview, non-localhost HTTPS)
  const startupProdUrl = isValidProductionServerUrl(
    process.env.PUBLIC_SERVER_URL || process.env.SAMI_PRODUCTION_SERVER_URL || process.env.APP_URL
  );
  if (startupProdUrl) {
    syncProductionApiServerUrlToCloud(startupProdUrl).catch(() => {});
  }

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

  // SPA fallback always prefers public/index.html (the real Sami application)
  app.get('*', (_req, res) => {
    const publicIndexPath = path.resolve(__dirname, 'public', 'index.html');
    const prodIndexPath = path.resolve(__dirname, 'dist', 'index.html');
    const indexPath = fs.existsSync(publicIndexPath)
      ? publicIndexPath
      : fs.existsSync(prodIndexPath)
        ? prodIndexPath
        : path.resolve(__dirname, 'index.html');
    res.sendFile(indexPath);
  });

  app.listen(PORT, HOST, () => {
    console.log(`[Sami Server] App running on http://${HOST}:${PORT}`);
  });
}

startServer();
