import { Link } from 'react-router-dom'
import { useAuth } from './features/auth/AuthContext.jsx'

// Cada cartão leva à tela da funcionalidade. Quem não está logado cai no login (a rota protegida redireciona).
const funcionalidades = [
  { icone: '👤', titulo: 'Jogadores', texto: 'Perfil individual com gols, assistências e partidas', para: '/jogadores' },
  { icone: '📋', titulo: 'Súmula', texto: 'Registrar resultados, gols e assistências da partida', para: '/partidas' },
  { icone: '🗂️', titulo: 'Histórico', texto: 'Todas as partidas finalizadas, com filtros por jogador e período', para: '/historico' },
  { icone: '🏆', titulo: 'Ranking', texto: 'Classificação automática por pontos e desempenho', para: '/ranking' },
  { icone: '⭐', titulo: 'Avaliação', texto: 'Notas recebidas por cada participante após o jogo', para: '/partidas' },
]

const sorteio = {
  icone: '🎲',
  titulo: 'Sorteio de times',
  texto: 'Times equilibrados pela média de notas dos presentes',
  para: '/sorteio',
}

export default function HomePage() {
  const ehOrganizador = useAuth().usuario?.role === 'ORGANIZER'
  const cartoes = ehOrganizador ? [...funcionalidades, sorteio] : funcionalidades

  return (
    <div className="mx-auto grid max-w-5xl gap-4 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
      {cartoes.map((f) => (
        <Link
          key={f.titulo}
          to={f.para}
          className="rounded-xl bg-green-900 p-5 shadow-lg ring-1 ring-green-700 hover:bg-green-800"
        >
          <div className="text-3xl">{f.icone}</div>
          <h2 className="mt-2 text-lg font-semibold">{f.titulo}</h2>
          <p className="text-sm text-green-200">{f.texto}</p>
        </Link>
      ))}
    </div>
  )
}
