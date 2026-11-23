// Casca HTTP da autenticação. O token viaja em cookie httpOnly: o JavaScript da página
// não consegue lê-lo, então um XSS não consegue roubá-lo (ao contrário do localStorage).
import { Router } from 'express'
import { NOME_DO_COOKIE } from '../../middlewares/auth.js'

export function criarAuthRouter(authService, { autenticar, expiraEmSegundos, cookieSeguro }) {
  const router = Router()

  // sameSite 'strict': o navegador não envia o cookie em requisições vindas de OUTROS sites,
  // o que bloqueia CSRF. 'secure' (só HTTPS) liga em produção.
  const opcoesDoCookie = { httpOnly: true, sameSite: 'strict', secure: cookieSeguro, path: '/' }

  function abrirSessao(res, { token, usuario }, status) {
    res.cookie(NOME_DO_COOKIE, token, { ...opcoesDoCookie, maxAge: expiraEmSegundos * 1000 })
    res.status(status).json({ data: usuario })
  }

  router.post('/register', async (req, res) => {
    abrirSessao(res, await authService.registrar(req.body ?? {}), 201)
  })

  router.post('/login', async (req, res) => {
    abrirSessao(res, await authService.entrar(req.body ?? {}), 200)
  })

  router.post('/logout', (req, res) => {
    res.clearCookie(NOME_DO_COOKIE, opcoesDoCookie)
    res.status(204).end()
  })

  router.get('/me', autenticar, (req, res) => {
    res.json({ data: req.usuario })
  })

  return router
}
