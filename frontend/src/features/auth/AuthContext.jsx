import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authApi from './authApi.js'

// Contexto = "variável global" do React para a árvore de componentes: qualquer tela
// pode perguntar quem está logado sem receber isso por props em cada nível.
export const AuthContext = createContext({ usuario: null, carregando: false })

export function useAuth() {
  return useContext(AuthContext)
}

// O front NÃO guarda token: ele está num cookie httpOnly. Ao abrir a página perguntamos
// ao back-end "quem sou eu?" (/api/auth/me); se o cookie for válido, ele responde com o usuário.
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    authApi
      .buscarUsuarioLogado()
      .then((u) => ativo && setUsuario(u))
      .catch(() => ativo && setUsuario(null)) // 401 = ninguém logado
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [])

  const entrar = useCallback(async (dados) => setUsuario(await authApi.entrar(dados)), [])
  const cadastrar = useCallback(async (dados) => setUsuario(await authApi.cadastrar(dados)), [])
  // Pergunta de novo ao back-end quem sou eu (ex.: depois de um pedido de organizador aprovado).
  const recarregar = useCallback(async () => {
    try {
      setUsuario(await authApi.buscarUsuarioLogado())
    } catch {
      setUsuario(null)
    }
  }, [])
  const sair = useCallback(async () => {
    try {
      await authApi.sair()
    } finally {
      setUsuario(null) // mesmo se a rede falhar, a tela volta para "deslogado"
    }
  }, [])

  const valor = useMemo(
    () => ({ usuario, carregando, entrar, cadastrar, sair, recarregar }),
    [usuario, carregando, entrar, cadastrar, sair, recarregar],
  )
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
