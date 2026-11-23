import 'dotenv/config'
import app from './app.js'

// Falha rápida: sem segredo forte, qualquer um poderia forjar um token de organizador.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('Defina JWT_SECRET no .env com pelo menos 32 caracteres (veja docs/setup.md).')
  process.exit(1)
}

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`)
})
