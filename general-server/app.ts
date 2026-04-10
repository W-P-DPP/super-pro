import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { responseMiddleware } from './utils/middleware/responseMiddleware.ts';
import { jwtMiddleware } from './utils/middleware/jwtMiddleware.ts';
import { operationLogMiddleware } from './utils/middleware/operationLogMiddleware.ts';
import router from './src/index.ts';
import { RequestLogger, ErrorLogger } from './utils/index.ts';

export function createApp() {
  const app = express();
  const publicPath = fileURLToPath(new URL('./public', import.meta.url));

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(bodyParser.text({ type: 'text/xml' }));
  
  app.use(RequestLogger.middleware());
  app.use('/public', express.static(path.resolve(publicPath)));
  app.use(express.static(path.resolve(publicPath)));
  app.use(responseMiddleware);
  app.get('/',(req,res)=>{
    res.sendSuccess()
  })
  app.use('/api', jwtMiddleware, operationLogMiddleware, router);
  app.use(ErrorLogger.middleware());
  return app;
}
