import { Router } from 'express';
import { googleLogin } from '../controllers/auth';
import { create, getCouple, join, leave } from '../controllers/couple';
import { getMessages, postMessage } from '../controllers/messages';
import { getProgress, postProgress } from '../controllers/progress';
import { getRecords, postBest, postMatch } from '../controllers/records';
import { rtcConfig } from '../controllers/rtc';
import { getConfig, health } from '../controllers/system';
import { asyncHandler } from '../middlewares/asyncHandler';
import { auth } from '../middlewares/auth';

export const routes = Router();

routes.get('/health', health);
routes.get('/config', getConfig);
routes.get('/rtc-config', auth, asyncHandler(rtcConfig));

routes.post('/auth/google', asyncHandler(googleLogin));

routes.get('/couple', auth, asyncHandler(getCouple));
routes.post('/couple/create', auth, asyncHandler(create));
routes.post('/couple/join', auth, asyncHandler(join));
routes.post('/couple/leave', auth, asyncHandler(leave));

routes.get('/progress', auth, asyncHandler(getProgress));
routes.post('/progress', auth, asyncHandler(postProgress));

routes.get('/records', auth, asyncHandler(getRecords));
routes.post('/records/match', auth, asyncHandler(postMatch));
routes.post('/records/best', auth, asyncHandler(postBest));

routes.get('/messages', auth, asyncHandler(getMessages));
routes.post('/messages', auth, asyncHandler(postMessage));
