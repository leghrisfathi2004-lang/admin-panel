require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const compression = require('compression');
const path = require('path');

const connectDB = require('./config/db');
const {
  cspNonce,
  helmetMiddleware,
  mongoSanitize,
  xss,
  hpp,
  apiLimiter,
} = require('./middleware/security');
const { issueToken } = require('./middleware/csrf');
const ipFilter = require('./middleware/ipFilter');

const authRoutes = require('./routes/auth');
const hostRoutes = require('./routes/hosts');
const legacyRoutes = require('./routes/legacy');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(compression());
app.use(cspNonce);
app.use(helmetMiddleware);

app.use(
  cors({
    origin: (process.env.ALLOWED_ORIGIN || '').split(',').filter(Boolean),
    credentials: true,
  })
);

app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true, limit: '20kb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(mongoSanitize);
app.use(xss);
app.use(hpp);
app.use(issueToken);

app.use('/api/legacy', legacyRoutes);

app.use('/api/auth', ipFilter, authRoutes);
app.use('/api/hosts', apiLimiter, (req, res, next) => {
  if (req.path === '/public') return next();
  return ipFilter(req, res, next);
}, hostRoutes);

const renderHtml = (file) => (req, res) => {
  const fs = require('fs');
  const html = fs
    .readFileSync(path.join(__dirname, 'public', file), 'utf8')
    .replace(/__CSP_NONCE__/g, res.locals.cspNonce);
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  res.send(html);
};

app.get('/', renderHtml('index.html'));
app.get('/dashboard', renderHtml('dashboard.html'));

app.use(
  express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, p) => {
      if (p.endsWith('.html')) res.setHeader('Cache-Control', 'no-store');
    },
  })
);

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ ok: false, message: 'Not found' });
  }
  renderHtml('index.html')(req, res);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ ok: false, message: 'Server error' });
});

const PORT = process.env.PORT || 3000;

(async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`IPTV Admin running on http://localhost:${PORT}`));
})();
