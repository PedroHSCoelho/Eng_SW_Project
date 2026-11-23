// Textos que a tela mostra para os valores dos enums do back-end (MatchStatus, MatchResult).
export const STATUS = {
  SCHEDULED: { nome: 'Agendada', classe: 'bg-yellow-100 text-yellow-800' },
  IN_PROGRESS: { nome: 'Em andamento', classe: 'bg-blue-100 text-blue-800' },
  FINISHED: { nome: 'Finalizada', classe: 'bg-green-100 text-green-800' },
  CANCELED: { nome: 'Cancelada', classe: 'bg-red-100 text-red-800' },
}

export const RESULTADO = {
  A_WINS: 'Vitória do Time A',
  B_WINS: 'Vitória do Time B',
  DRAW: 'Empate',
}

export const formatarData = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
