import { NavLink } from 'react-router-dom'
import { ehOrganizadorDo, useGrupo } from '../../groups/context/GrupoContext.jsx'
import Icone from '../../../ui/Icones.jsx'

const aba = ({ isActive }) =>
  `flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-colors duration-150 ${
    isActive ? 'bg-gramado text-gramado-tinta' : 'bg-superficie text-texto-suave ring-1 ring-borda hover:text-texto'
  }`

// Abas da área de Partidas: próximas/ao vivo, histórico e (organizador) sorteio.
// Juntas num lugar só, em vez de três itens soltos no menu.
export default function AbasDePartidas() {
  const ehOrganizador = ehOrganizadorDo(useGrupo().grupo)
  return (
    <nav aria-label="Partidas" className="mb-4 flex flex-wrap gap-2">
      <NavLink to="/partidas" end className={aba}>
        <Icone nome="sumula" tamanho={18} />
        Próximas e ao vivo
      </NavLink>
      <NavLink to="/historico" className={aba}>
        <Icone nome="historico" tamanho={18} />
        Histórico
      </NavLink>
      {ehOrganizador && (
        <NavLink to="/sorteio" className={aba}>
          <Icone nome="sorteio" tamanho={18} />
          Sortear times
        </NavLink>
      )}
    </nav>
  )
}
