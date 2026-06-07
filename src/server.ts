import 'dotenv/config';
import app from './app';

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`🚀 TechNaVeia API rodando na porta ${PORT}`);
  console.log(`📦 Ambiente: ${process.env.NODE_ENV ?? 'development'}`);
});
