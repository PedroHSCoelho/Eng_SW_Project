// Ponto de entrada na Vercel: a plataforma chama este arquivo como uma função (serverless).
// O Express já é um "handler" (req, res), então basta exportá-lo; NÃO chamamos app.listen aqui.
// Localmente continuamos usando backend/src/index.js (com listen), como antes.
import app from '../backend/src/app.js'

export default app
