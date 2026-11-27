import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import PlayerProfilePage from './PlayerProfilePage.jsx'
import { definirGrupoAtual } from '../../api/grupoAtual.js'

// As APIs montam as URLs com o grupo atual: nos testes, o grupo 1.
beforeEach(() => definirGrupoAtual(1))

const jogador = { id: 1, name: 'José da Silva', nickname: 'Zé', position: 'FORWARD', active: true }
const stats = {
  playerId: 1, matches: 4, wins: 2, draws: 1, losses: 1, goals: 3, assists: 1, goalsPerMatch: 0.75, goalDifference: 2,
  recentes: [
    { matchId: 4, date: '2026-11-15T22:00:00Z', resultado: 'D', golsPro: 0, golsContra: 1 },
    { matchId: 3, date: '2026-11-10T22:00:00Z', resultado: 'V', golsPro: 2, golsContra: 0 },
    { matchId: 2, date: '2026-11-05T22:00:00Z', resultado: 'E', golsPro: 1, golsContra: 1 },
  ],
}

function resposta(status, corpo) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo }
}

// Simula a API por URL; o que não for configurado devolve 404.
function simularApi({ jogadorResp = resposta(200, { data: jogador }), statsResp = stats } = {}) {
  fetch.mockImplementation(async (url) => {
    if (url === '/api/grupos/1/players/1') return jogadorResp
    if (url === '/api/grupos/1/players/1/stats') return resposta(200, { data: statsResp })
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
    expect(screen.getByText('Gols por jogo').previousSibling).toHaveTextContent('0.75')
    expect(screen.getByText('Vitórias').previousSibling).toHaveTextContent('2')
    expect(screen.getByText('Saldo de gols').previousSibling).toHaveTextContent('2')
  })

  it('pelada nas últimas partidas mostra a campanha da noite, nunca "empate" com placar somado', async () => {
    const pelada = { matchId: 5, date: '2026-11-20T22:00:00Z', format: 'PELADA', resultado: null, wins: 3, draws: 0, losses: 2 }
    simularApi({ statsResp: { ...stats, recentes: [pelada, ...stats.recentes] } })

    renderizar()

    const item = await screen.findByLabelText(/^Pelada em .*3 vitórias, 0 empates e 2 derrotas/)
    expect(item).toHaveTextContent('Pelada 3V 0E 2D')
    expect(item).not.toHaveTextContent('x')
  })

  it('admin vê a nota do admin com vírgula (a API só manda o campo para admin)', async () => {
    simularApi({ jogadorResp: resposta(200, { data: { ...jogador, skill: 3.5 } }) })

    renderizar()

    expect(await screen.findByText('3,5')).toBeInTheDocument()
    expect(screen.getByText(/Só os admins veem/)).toBeInTheDocument()
  })

  it('admin vê "ainda sem nota" quando a nota é vazia; membro (sem o campo) não vê a seção', async () => {
    simularApi({ jogadorResp: resposta(200, { data: { ...jogador, skill: null } }) })
    renderizar()
    expect(await screen.findByText(/Ainda sem nota/)).toBeInTheDocument()
    cleanup()

    simularApi()
    renderizar()
    await screen.findByRole('heading', { name: 'Zé' })
    expect(screen.queryByText('Nota do admin')).not.toBeInTheDocument()
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

describe('PlayerProfilePage: estatísticas por período', () => {
  const doMes = { ...stats, matches: 1, wins: 1, draws: 0, losses: 0, goals: 2, recentes: [stats.recentes[0]] }

  // API que responde pelo período pedido (sem ?periodo = tudo).
  function simularPorPeriodo(extra = {}) {
    fetch.mockImplementation(async (url) => {
      if (url === '/api/grupos/1/players/1') return resposta(200, { data: jogador })
      if (url === '/api/grupos/1/players/1/stats') return resposta(200, { data: stats })
      if (url === '/api/grupos/1/players/1/stats?periodo=mes') return resposta(200, { data: doMes })
      if (url === '/api/grupos/1/players/1/stats?periodo=ano') return extra.ano ?? resposta(200, { data: stats })
      return resposta(404, { erro: 'Rota não encontrada' })
    })
  }

  it('começa em "Tudo" (sem parâmetro) e trocar o período atualiza só as estatísticas', async () => {
    simularPorPeriodo()
    renderizar()
    await screen.findByRole('heading', { name: 'Zé' })
    expect(screen.getByText('Jogos').previousSibling).toHaveTextContent('4')

    fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'mes' } })

    await waitFor(() => expect(screen.getByText('Jogos').previousSibling).toHaveTextContent('1'))
    expect(screen.getByText('Gols').previousSibling).toHaveTextContent('2')
    // O jogador não é buscado de novo: só as estatísticas.
    const urls = fetch.mock.calls.map(([u]) => u)
    expect(urls.filter((u) => u === '/api/grupos/1/players/1')).toHaveLength(1)
    expect(urls).toContain('/api/grupos/1/players/1/stats?periodo=mes')
  })

  it('as últimas partidas também seguem o período', async () => {
    simularPorPeriodo()
    renderizar()
    await screen.findAllByRole('listitem')

    fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'mes' } })

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))
  })

  it('mostra o erro da API do período e mantém os números anteriores', async () => {
    simularPorPeriodo({ ano: resposta(400, { erro: 'Período inválido; use mes, ano ou tudo' }) })
    renderizar()
    await screen.findByRole('heading', { name: 'Zé' })

    fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'ano' } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Período inválido')
    expect(screen.getByText('Jogos').previousSibling).toHaveTextContent('4')
  })
})
