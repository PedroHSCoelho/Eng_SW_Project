const funcionalidades = [
  { icone: '👤', titulo: 'Jogadores', texto: 'Perfil individual com gols, assistências e partidas' },
  { icone: '📋', titulo: 'Súmula', texto: 'Registrar resultados, gols e assistências da partida' },
  { icone: '🏆', titulo: 'Ranking', texto: 'Classificação automática por pontos e desempenho' },
  { icone: '⭐', titulo: 'Avaliação', texto: 'Notas recebidas por cada participante após o jogo' },
]

export default function HomePage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-4 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  )
}
