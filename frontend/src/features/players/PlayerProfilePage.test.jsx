import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import PlayerProfilePage from './PlayerProfilePage.jsx'

const jogador = { id: 1, name: 'José da Silva', nickname: 'Zé', position: 'FORWARD', active: true }
const stats = {
  playerId: 1, matches: 4, wins: 2, draws: 1, losses: 1, goals: 3, assists: 1, goalsPerMatch: 0.75, goalDifference: 2,
  recentes: [
    { matchId: 4, date: '2026-11-15T22:00:00Z', resultado: 'D', golsPro: 0, golsContra: 1 },
    { matchId: 3, date: '2026-11-10T22:00:00Z', resultado: 'V', golsPro: 2, golsContra: 0 },
    { matchId: 2, date: '2026-11-05T22:00:00Z', resultado: 'E', golsPro: 1, golsContra: 1 },
  ],
}
const notasSuficientes = { geral: { average: 4.3, count: 3 }, porPartida: [], mensagem: null }
const notasInsuficientes = {
  geral: { average: null, count: 1 }, porPartida: [], mensagem: 'sem avaliações suficientes',
}

function resposta(status, corpo) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo }
}

// Simula a API por URL; o que não for configurado devolve 404.
function simularApi({ jogadorResp = resposta(200, { data: jogador }), statsResp = stats, notas = notasSuficientes } = {}) {
  fetch.mockImplementation(async (url) => {
    if (url === '/api/players/1') return jogadorResp
    if (url === '/api/players/1/stats') return resposta(200, { data: statsResp })
    if (url === '/api/players/1/ratings') return resposta(200, { data: notas })
    return resposta(404, { erro: 'Rota não encontrada' })
  })
}

const renderizar = (caminho = '/jogadores/1') =>
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route path="/jogadores/:id" element={<PlayerProfilePage />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('PlayerProfilePage', () => {
  it('mostra nome, posição em português e as estatísticas', async () => {
    simularApi()

    renderizar()

    expect(await screen.findByRole('heading', { name: 'Zé' })).toBeInTheDocument()
    expect(screen.getByText('José da Silva · Atacante')).toBeInTheDocument()
    expect(screen.getByText('Gols por partida').previousSibling).toHaveTextContent('0.75')
    expect(screen.getByText('Vitórias').previousSibling).toHaveTextContent('2')
    expect(screen.getByText('Saldo de gols').previousSibling).toHaveTextContent('2')
  })

  it('mostra a média de notas com 1 casa decimal quando existe', async () => {
    simularApi()

    renderizar()

    expect(await screen.findByText('4.3')).toBeInTheDocument()
    expect(screen.getByText('em 3 avaliações')).toBeInTheDocument()
  })

  it('sem avaliações suficientes mostra o aviso em vez de uma média', async () => {
    simularApi({ notas: notasInsuficientes })

    renderizar()

    expect(await screen.findByText('sem avaliações suficientes')).toBeInTheDocument()
  })

  it('mostra as últimas partidas como V, E ou D, mais recente primeiro', async () => {
    simularApi()

    renderizar()

    const itens = await screen.findAllByRole('listitem')
    expect(itens.map((i) => i.textContent.replace(/\s+/g, ' ').trim())).toEqual(['D 0x1', 'V 2x0', 'E 1x1'])
    expect(itens[0]).toHaveAttribute('aria-label', expect.stringContaining('Derrota, 0 a 1'))
  })

  it('jogador sem partidas avisa que ainda não jogou', async () => {
    simularApi({ statsResp: { ...stats, matches: 0, recentes: [] } })

    renderizar()

    expect(await screen.findByText('Ainda não jogou nenhuma partida finalizada.')).toBeInTheDocument()
  })

  it('jogador inexistente mostra o erro da API', async () => {
    simularApi({ jogadorResp: resposta(404, { erro: 'Jogador não encontrado' }) })

    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Jogador não encontrado')
  })
})
