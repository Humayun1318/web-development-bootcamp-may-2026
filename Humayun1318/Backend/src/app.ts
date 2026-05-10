import express from 'express'
import cors from 'cors';
import { globalErrorHandler } from './app/middlewares/globalErrorHandler';
import notFound from './app/middlewares/notFound';
import { router } from './app/routes';
import { envVars } from './app/config/env';


const app = express();

app.use(express.json());
app.use(
  cors({
    origin: envVars.FRONTEND_URL,
    credentials: true,
  }),
);

// apps entry point
app.use('/api/v1', router);

// Basic route for testing
// app.get('/', (_req, res) => {
//   res.send('Hello, World!');
// });


app.use(globalErrorHandler);
app.use(notFound);

export default app;