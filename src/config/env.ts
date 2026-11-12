import 'dotenv/config';

export const PORT = Number(process.env.PORT ?? 4010);

export const JWT_SECRET = process.env.JWT_SECRET ?? '';
if (!JWT_SECRET) {
  console.error('Falta la variable JWT_SECRET.');
  process.exit(1);
}

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';

const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:5301').split(',').map((s) => s.trim());
export const corsOrigin: boolean | string[] = origins.includes('*') ? true : origins;
