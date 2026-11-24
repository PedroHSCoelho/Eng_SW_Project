import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { definirGrupoAtual } from '../../api/grupoAtual.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { listarMeusGrupos } from './groupsApi.js'

// "Em que grupo estou?" para qualquer tela, como o AuthContext faz com "quem sou eu?".
// grupo = { id, name, myRole, myPlayerId, inviteCode? } ou null (pessoa sem grupo ainda).
export const GrupoContext = createContext({ grupos: [], grupo: null, carregando: false })

export function useGrupo() {
  return useContext(GrupoContext)
}

export const ehOrganizadorDo = (grupo) => grupo?.myRole === 'ORGANIZER'

// Lembra o último grupo aberto neste navegador (só conforto: se falhar, abre o primeiro).
const CHAVE = 'grupoAtual'
function lerSalvo() {
  try {
    return Number(localStorage.getItem(CHAVE)) || null
  } catch {
    return null
  }
}
function salvar(id) {
  try {
    localStorage.setItem(CHAVE, String(id))
  } catch {
    /* sem armazenamento: tudo bem */
  }
}

// Fornece um grupo já escolhido. Ajusta o prefixo das URLs (api/grupoAtual.js) durante a
// renderização, antes de as telas filhas buscarem dados. Os testes usam este componente direto.
export function GrupoFixo({ grupo, grupos = grupo ? [grupo] : [], carregando = false, trocarGrupo, recarregar, children }) {
  definirGrupoAtual(grupo?.id)
  const valor = useMemo(
    () => ({ grupos, grupo, carregando, trocarGrupo, recarregar }),
    [grupos, grupo, carregando, trocarGrupo, recarregar],
  )
  return <GrupoContext.Provider value={valor}>{children}</GrupoContext.Provider>
}

// Busca "meus grupos" sempre que a pessoa logada muda (entrar, sair, trocar de conta).
export function GrupoProvider({ children }) {
  const { usuario } = useAuth()
  const [grupos, setGrupos] = useState([])
  // De quem são os grupos carregados. Enquanto não for da pessoa logada agora, está "carregando":
  // assim nenhuma tela conclui "não tem grupo" no instante entre o login e a resposta da API.
  const [carregadoPara, setCarregadoPara] = useState(null)
  const [grupoId, setGrupoId] = useState(lerSalvo)
  const usuarioId = usuario?.id ?? null

  const recarregar = useCallback(async () => {
    if (usuarioId === null) {
      setGrupos([])
      return []
    }
    let lista = []
    try {
      lista = await listarMeusGrupos()
    } catch {
      lista = []
    }
    setGrupos(lista)
    setCarregadoPara(usuarioId)
    return lista
  }, [usuarioId])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const trocarGrupo = useCallback((id) => {
    setGrupoId(id)
    salvar(id)
  }, [])

  const carregando = usuarioId !== null && carregadoPara !== usuarioId
  // O escolhido, se ainda participo dele; senão o primeiro da lista; senão nenhum.
  const lista = carregando ? [] : grupos
  const grupo = lista.find((g) => g.id === grupoId) ?? lista[0] ?? null

  return (
    <GrupoFixo grupo={grupo} grupos={lista} carregando={carregando} trocarGrupo={trocarGrupo} recarregar={recarregar}>
      {children}
    </GrupoFixo>
  )
}
