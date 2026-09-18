import express from 'express';
import path from 'path';
import mysql from 'mysql2/promise';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'bodeguita',
};

let connectionPool: mysql.Pool | null = null;

const initializeDatabase = async () => {
  if (!process.env.MYSQL_HOST || !process.env.MYSQL_USER) {
    console.warn('MySQL credentials not configured. Session persistence is disabled.');
    return null;
  }

  try {
    const bootstrap = mysql.createPool({
      host: mysqlConfig.host,
      port: mysqlConfig.port,
      user: mysqlConfig.user,
      password: mysqlConfig.password,
      database: 'mysql',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${mysqlConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await bootstrap.end();

    connectionPool = mysql.createPool({
      host: mysqlConfig.host,
      port: mysqlConfig.port,
      user: mysqlConfig.user,
      password: mysqlConfig.password,
      database: mysqlConfig.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    await connectionPool.query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id INT NOT NULL AUTO_INCREMENT,
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NULL,
        session_started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        session_ended_at TIMESTAMP NULL,
        active_order_count INT NOT NULL DEFAULT 0,
        order_snapshot JSON NULL,
        PRIMARY KEY (id),
        KEY idx_user_id (user_id),
        KEY idx_session_started_at (session_started_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connectionPool.query(`
      CREATE TABLE IF NOT EXISTS admin_session_events (
        id INT NOT NULL AUTO_INCREMENT,
        session_id INT NULL,
        event_type ENUM('logout', 'session_start', 'status_change') NOT NULL,
        event_payload JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_session_id (session_id),
        KEY idx_event_type (event_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    return connectionPool;
  } catch (error) {
    console.warn('MySQL unavailable. Session persistence is disabled.', error);
    return null;
  }
};

app.use(express.json());

// Initialize Gemini Client
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. BodeBot fallback answers will be used.');
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Health Check API
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/session/reset', async (req, res) => {
  const { userId, userName, orders, event, sessionId } = req.body ?? {};

  if (!connectionPool) {
    res.json({ status: 'skipped', message: 'MySQL not configured; session reset stored only in client memory.' });
    return;
  }

  try {
    const activeOrders = Array.isArray(orders) ? orders : [];
    const snapshot = {
      userId: String(userId || 'anonymous'),
      userName: String(userName || 'Sin usuario'),
      savedAt: new Date().toISOString(),
      event: String(event || 'logout'),
      activeOrderCount: activeOrders.length,
      orders: activeOrders,
    };

    const [sessionResult] = await connectionPool.execute(
      `INSERT INTO admin_sessions (user_id, user_name, session_ended_at, active_order_count, order_snapshot) VALUES (?, ?, NOW(), ?, ?)`,
      [snapshot.userId, snapshot.userName, activeOrders.length, JSON.stringify(snapshot)]
    );

    const sessionInsert = sessionResult as { insertId?: number };

    await connectionPool.execute(
      `INSERT INTO admin_session_events (session_id, event_type, event_payload) VALUES (?, ?, ?)`,
      [sessionInsert.insertId ?? null, String(event || 'logout'), JSON.stringify(snapshot)]
    );

    res.json({ status: 'saved', sessionId: sessionInsert.insertId ?? null, savedAt: snapshot.savedAt });
  } catch (error: any) {
    console.error('Error saving admin session snapshot:', error);
    res.status(500).json({ status: 'error', error: error?.message || 'Unknown DB error' });
  }
});

// BodeBot Assistant API
app.post('/api/bodebot', async (req, res) => {
  try {
    const { message, menu } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const ai = getAiClient();

    if (!ai) {
      // Fallback friendly response if no API key is present
      res.json({
        reply: `¡Hola! Soy BodeBot 🍔. Te recomiendo probar **La Bestia** o **Bodeguita Burger**, nuestras estrellas de la casa. ¿Buscas alguna opción en particular o maridaje con cerveza artesanal?`,
      });
      return;
    }

    const systemInstruction = `
Tu eres BodeBot, el camarero virtual y sommelier gastronómico oficial de "La Bodeguita - Premium Urban Gastronomy".
Tu personalidad es urbana, apasionada por las hamburguesas artesanales, divertida, acogedora y con gran conocimiento gastronómico.

Menú actual disponible en el restaurante:
${JSON.stringify(
  menu?.map((m: any) => ({
    id: m.id,
    nombre: m.name,
    descripcion: m.description,
    precio: `$${m.price}`,
    categoria: m.category,
    ingredientes: m.ingredients,
    etiqueta: m.badge,
  })) || []
)}

Reglas de respuesta:
1. Responde siempre en español de forma cercana, concisa y apetitosa.
2. Si el usuario pregunta por recomendaciones, alérgenos, maridajes o ingredientes, consulta la lista del menú arriba y sugiere de 1 a 2 opciones específicas.
3. Menciona precios exactos y resalta lo crujiente, sabroso o ahumado de los ingredientes.
4. Mantén las respuestas en un formato scannable con viñetas o negritas si listas opciones.
5. Puedes usar emoticonos como 🍔, 🥓, 🍺, 🔥, 🧀.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: message,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || '¡Ey! Tuve un pequeño despiste en la cocina. ¿Me repites tu pregunta sobre el menú? 🍔';
    res.json({ reply });
  } catch (error: any) {
    console.error('Error in /api/bodebot:', error);
    res.status(500).json({
      reply: '¡Ups! Parece que se me quemó la carne. ¿Puedes volver a preguntarme en un segundo? 🍔',
      error: error?.message,
    });
  }
});

async function startServer() {
  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
