import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import HomePage from './HomePage.jsx'
import { AuthContext } from '../../auth/context/AuthContext.jsx'
import { GrupoFixo } from '../../groups/context/GrupoContext.jsx'

const resposta = (status, corpo) => ({ ok: status >= 200 && status < 300, status, json: async () => corpo })

const historico = {
  items: [{ id: 9, date: '2026-11-20T22:00:00.000Z', location: 'Campo do Zé', result: 'A_WINS', score: { A: 3, B: 1 } }],
  page: 1,
  pageSize: 1,
  total: 1,
  totalPages: 1,
}
const partida = {
  id: 9,
  goals: [
    { team: 'A', ownGoal: false, scorer: { id: 1, nickname: 'Bia' } },
    { team: 'A', ownGoal: false, scorer: { id: 1, nickname: 'Bia' } },
    { team: 'A', ownGoal: true, scorer: { id: 5, nickname: 'Contra' } },
    { team: 'B', ownGoal: false, scorer: { id: 2, nickname: 'Tico' } },
  ],
}
const ranking = {
  geral: [
    { playerId: 1, nickname: 'Bia', points: 12 },
    { playerId: 2, nickname: 'Tico', points: 9 },
    { playerId: 3, nickname: 'Zé', points: 7 },
  ],
  artilharia: [{ playerId: 1, nickname: 'Bia', goals: 8 }],
  assistencias: [],
}
const votacao = { craques: [{ playerId: 2, nickname: 'Tico', votes: 5, team: 'A' }], candidates: [] }

// Simula as rotas que a home já usava nas outras telas (nenhuma rota nova).
function simularApi(dados = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      if (url.startsWith('/api/grupos/1/matches/historico')) return resposta(200, { data: dados.historico ?? historico })
      if (url === '/api/grupos/1/matches/9') return resposta(200, { data: partida })
      if (url === '/api/grupos/1/matches/9/craque') return resposta(200, { data: dados.votacao ?? { craques: [], candidates: [] } })
      if (url.startsWith('/api/grupos/1/rankings')) return resposta(200, { data: dados.ranking ?? ranking })
      return resposta(404, { erro: 'não simulado' })
    }),
  )
}

// grupo = null: logado, mas sem grupo nenhum.
function renderizar(usuario = { id: 1, name: 'Maria' }, grupo = { id: 1, name: 'Grupo de teste', myRole: 'MEMBER', myPlayerId: null }) {
  return render(
    <AuthContext.Provider value={{ usuario, carregando: false }}>
      <GrupoFixo grupo={usuario ? grupo : null}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </GrupoFixo>
    </AuthContext.Provider>,
  )
}

beforeEach(() => simularApi({ votacao }))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('HomePage', () => {
  it('mostra o hero com o botão principal "Registrar partida"', () => {
    renderizar()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Quem é o cobra da pelada?')
    expect(screen.getByRole('link', { name: 'Registrar partida' })).toHaveAttribute('href', '/partidas')
  })

  it('último jogo: placar, artilheiros (sem gol contra) e link para a súmula', async () => {
    renderizar()

    const bloco = await screen.findByRole('region', { name: 'Último jogo' })
    const link = await within(bloco).findByRole('link', { name: 'Ver súmula: Time A 3 a 1 Time B' })
    expect(link).toHaveAttribute('href', '/partidas/9')
    expect(within(bloco).getByText('Bia')).toBeInTheDocument()
    expect(within(bloco).getByText('×2')).toBeInTheDocument()
    expect(within(bloco).getByText('Tico')).toBeInTheDocument()
    expect(within(bloco).queryByText('Contra')).not.toBeInTheDocument()
  })

  it('pódio com o top 3 do ranking geral', async () => {
    renderizar()

    const podio = await screen.findByRole('list', { name: 'Top 3 por pontos' })
    expect(within(podio).getByText('Bia')).toBeInTheDocument()
    expect(within(podio).getByText('12 pts')).toBeInTheDocument()
    expect(within(podio).getByText('Zé')).toBeInTheDocument()
  })

  it('cobra da rodada = craque votado na última partida', async () => {
    renderizar()

    const bloco = screen.getByRole('region', { name: 'Cobra da rodada' })
    expect(await within(bloco).findByText('Tico')).toBeInTheDocument()
    expect(within(bloco).getByText(/Craque da última partida, com/)).toHaveTextContent('com 5 votos')
  })

  it('sem votos ainda, o cobra da rodada vira o artilheiro geral', async () => {
    simularApi({ votacao: null })
    renderizar()

    const bloco = screen.getByRole('region', { name: 'Cobra da rodada' })
    expect(await within(bloco).findByText(/Artilheiro geral com/)).toBeInTheDocument()
    expect(within(bloco).getByText('Bia')).toBeInTheDocument()
  })

  it('sem partidas nem ranking mostra estados vazios amigáveis, não erro', async () => {
    simularApi({
      historico: { items: [], page: 1, pageSize: 1, total: 0, totalPages: 0 },
      ranking: { geral: [], artilharia: [], assistencias: [] },
    })
    renderizar()

    expect(await screen.findByText(/Nenhuma partida encerrada ainda/)).toBeInTheDocument()
    expect(screen.getByText(/O pódio sai quando/)).toBeInTheDocument()
    expect(screen.getByText(/Ninguém brilhou ainda/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('se a API falhar, os blocos também ficam vazios em vez de quebrar a tela', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => resposta(500, { erro: 'Erro interno' })))
    renderizar()

    expect(await screen.findByText(/Nenhuma partida encerrada ainda/)).toBeInTheDocument()
  })

  it('deslogado: não chama a API e convida para entrar', () => {
    renderizar(null)

    expect(screen.getByRole('link', { name: 'Entrar para ver os números' })).toHaveAttribute('href', '/login')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('atalhos: Súmula e Ranking em destaque, os outros menores', () => {
    renderizar()

    expect(screen.getByRole('heading', { name: 'Súmula', level: 3 }).closest('a')).toHaveAttribute('href', '/partidas')
    expect(screen.getByRole('heading', { name: 'Ranking', level: 3 }).closest('a')).toHaveAttribute('href', '/ranking')
    expect(screen.getByText('Jogadores').closest('a')).toHaveAttribute('href', '/jogadores')
    expect(screen.queryByText('Sorteio de times')).not.toBeInTheDocument()
  })
})
