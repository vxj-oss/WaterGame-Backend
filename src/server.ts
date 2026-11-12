import http from 'http';
import { app } from './app';
import { initDb } from './config/database';
import { PORT } from './config/env';
import { initRealtime } from './sockets/realtime';

const server = http.createServer(app);
initRealtime(server);

initDb()
  .then(() => server.listen(PORT, () => console.log(`Servidor listo en http://localhost:${PORT}`)))
  .catch((e) => {
    console.error('No se pudo iniciar la base de datos:', e);
    process.exit(1);
  });
