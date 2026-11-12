import cors from 'cors';
import express from 'express';
import { corsOrigin } from './config/env';
import { routes } from './routes';

export const app = express();

app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(routes);
