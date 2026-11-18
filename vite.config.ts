import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

function localVercelApiPlugin(): Plugin {
  return {
    name: 'local-vercel-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || '';
        if (!rawUrl.startsWith('/api/')) {
          return next();
        }

        const urlObj = new URL(rawUrl, 'http://localhost');
        const cleanPath = urlObj.pathname.replace(/^\/+|\/+$/g, '');
        const candidateFile = path.resolve(process.cwd(), `${cleanPath}.ts`);

        if (!fs.existsSync(candidateFile)) {
          return next();
        }

        try {
          // Reload .env and .env.local on every dev API request so changes take effect without restarting Vite
          const loaded = loadEnv(server.config.mode || 'development', process.cwd(), '');
          for (const [k, v] of Object.entries(loaded)) {
            if (v !== undefined) {
              process.env[k] = v;
            }
          }

          // Parse request body if POST/PUT/PATCH
          let parsedBody: any = {};
          if (req.method && ['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const rawBody = Buffer.concat(chunks).toString('utf8').trim();
            if (rawBody) {
              try {
                parsedBody = JSON.parse(rawBody);
              } catch {
                parsedBody = rawBody;
              }
            }
          }

          const queryObj: Record<string, string> = {};
          urlObj.searchParams.forEach((val, key) => {
            queryObj[key] = val;
          });

          const vercelReq: any = Object.assign(req, {
            body: parsedBody,
            query: queryObj
          });

          const vercelRes: any = Object.assign(res, {
            status(code: number) {
              res.statusCode = code;
              return vercelRes;
            },
            json(payload: any) {
              if (!res.headersSent) {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
              }
              res.end(JSON.stringify(payload));
              return vercelRes;
            }
          });

          const mod = await server.ssrLoadModule(`/${cleanPath}.ts`);
          if (typeof mod?.default !== 'function') {
            return vercelRes.status(500).json({ ok: false, error: `API handler ${cleanPath}.ts has no default export` });
          }

          await mod.default(vercelReq, vercelRes);
          if (!res.writableEnded) {
            res.end();
          }
        } catch (err: any) {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
          }
          res.end(
            JSON.stringify({
              ok: false,
              error: err?.message || 'Local dev API middleware failed'
            })
          );
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localVercelApiPlugin()],
  server: {
    port: 5173,
    host: true
  }
});
