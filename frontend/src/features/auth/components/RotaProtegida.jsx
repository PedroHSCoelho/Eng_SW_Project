import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useGrupo } from '../../groups/context/GrupoContext.jsx'

// Envolve uma página: sem login manda para /login (e volta para cá depois de entrar).
// `doGrupo`: a página é de um grupo (jogadores, partidas, ranking...); sem grupo, manda para /grupos.
// `papel`: papel exigido NO GRUPO atual (ex.: 'ORGANIZER'); sem ele, avisa.
// É só experiência de uso: quem de fato barra é o back-end (401/403/404).
export default function RotaProtegida({ papel, doGrupo = false, children }) {
  const { usuario, carregando } = useAuth()
  const { grupo, carregando: carregandoGrupos } = useGrupo()
  const local = useLocation()

  if (carregando) return <p className="text-center text-green-200">Carregando…</p>
  if (!usuario) return <Navigate to="/login" replace state={{ voltarPara: local.pathname }} />
  if (!doGrupo && !papel) return children
  if (carregandoGrupos) return <p className="text-center text-green-200">Carregando…</p>
  if (!grupo) return <Navigate to="/grupos" replace />
  if (papel && grupo.myRole !== papel) {
    return (
      <p role="alert" className="text-center text-green-200">
        Você não tem permissão para ver esta página.
      </p>
    )
  }
  return children
}
