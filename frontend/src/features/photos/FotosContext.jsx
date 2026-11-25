import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useGrupo } from '../groups/GrupoContext.jsx'
import { listarFotos } from './photosApi.js'
import { mapaDeVersoes } from './fotos.js'

// "Quem do grupo tem foto, e em que versão?" para qualquer avatar do app.
// Busca UMA lista leve por grupo (sem as imagens); cada <Avatar> monta a URL da sua foto.
// Sem o provider (ex.: em testes de uma tela só), ninguém tem foto e o avatar mostra iniciais.
const FotosContext = createContext({ grupoId: null, versoes: new Map(), recarregar: async () => {} })

export const useFotos = () => useContext(FotosContext)

export function FotosProvider({ children }) {
  const { grupo } = useGrupo()
  const grupoId = grupo?.id ?? null
  const [versoes, setVersoes] = useState(() => new Map())

  const recarregar = useCallback(async () => {
    if (grupoId === null) return setVersoes(new Map())
    try {
      setVersoes(mapaDeVersoes(await listarFotos()))
    } catch {
      setVersoes(new Map()) // sem a lista, todo mundo aparece com as iniciais: a tela segue funcionando
    }
  }, [grupoId])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const valor = useMemo(() => ({ grupoId, versoes, recarregar }), [grupoId, versoes, recarregar])
  return <FotosContext.Provider value={valor}>{children}</FotosContext.Provider>
}

// Para testes de tela: fotos já conhecidas, sem buscar na API. `versoes`: { playerId: version }.
export function FotosFixas({ grupoId = 1, versoes = {}, recarregar = async () => {}, children }) {
  const valor = useMemo(
    () => ({ grupoId, versoes: new Map(Object.entries(versoes).map(([id, v]) => [Number(id), v])), recarregar }),
    [grupoId, versoes, recarregar],
  )
  return <FotosContext.Provider value={valor}>{children}</FotosContext.Provider>
}
