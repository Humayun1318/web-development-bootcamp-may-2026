import express from 'express'
import cors from 'cors';


const app = express();

app.use(express.json());
app.use(cors())

// apps entry point
// app.use('/api/v1', router);

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Hello, World!');
});


// app.use(globalErrorHandler);
// app.use(notFound);
export default app;