import { useEffect, useState } from 'react'

const funcionalidades = [
  { icone: '👤', titulo: 'Jogadores', texto: 'Perfil individual com gols, assistências e partidas' },
  { icone: '📋', titulo: 'Súmula', texto: 'Registrar resultados, gols e assistências da partida' },
  { icone: '🏆', titulo: 'Ranking', texto: 'Classificação automática por pontos e desempenho' },
  { icone: '⭐', titulo: 'Avaliação', texto: 'Notas recebidas por cada participante após o jogo' },
]

export default function App() {
  // Estado do teste de conexão com o back-end: 'carregando' | 'online' | 'offline'
  const [api, setApi] = useState('carregando')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? setApi('online') : setApi('offline')))
      .catch(() => setApi('offline'))
  }, [])

  const statusClasses = {
    carregando: 'bg-yellow-100 text-yellow-800',
    online: 'bg-green-100 text-green-800',
    offline: 'bg-red-100 text-red-800',
  }

  return (
    <div className="min-h-screen bg-green-950 text-white">
      <header className="mx-auto max-w-5xl px-4 py-10 text-center">
        <h1 className="text-4xl font-bold md:text-5xl">⚽ Eng_SW_Project</h1>
        <p className="mt-3 text-green-200">
          Estatísticas, campeonatos, sorteio de times e prancheta para quem ama futebol.
        </p>
        <span
          className={`mt-5 inline-block rounded-full px-4 py-1 text-sm font-medium ${statusClasses[api]}`}
        >
          API: {api}
        </span>
      </header>

      <main className="mx-auto grid max-w-5xl gap-4 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {funcionalidades.map((f) => (
          <section
            key={f.titulo}
            className="rounded-xl bg-green-900 p-5 shadow-lg ring-1 ring-green-700"
          >
            <div className="text-3xl">{f.icone}</div>
            <h2 className="mt-2 text-lg font-semibold">{f.titulo}</h2>
            <p className="text-sm text-green-200">{f.texto}</p>
          </section>
        ))}
      </main>
    </div>
  )
}
