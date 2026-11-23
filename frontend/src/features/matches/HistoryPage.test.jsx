import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import HistoryPage from './HistoryPage.jsx'
import { diaSeguinte } from './historyApi.js'

const jogadores = [
  { id: 1, name: 'José', nickname: 'Zé', position: 'FORWARD', active: true },
  { id: 2, name: 'Roberto', nickname: 'Beto', position: 'GOALKEEPER', active: true },
]
const item = (id, extra = {}) => ({
  id, date: '2026-11-20T22:00:00.000Z', location: `Quadra ${id}`, result: 'A_WINS', score: { A: 2, B: 1 }, ...extra,
})
const pagina = (items, extra = {}) => ({ items, page: 1, pageSize: 10, total: items.length, totalPages: 1, ...extra })

function resposta(status, corpo) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo }
}

// Simula a API: lista de jogadores fixa e histórico decidido por `historico(url)`.
function simularApi(historico) {
  fetch.mockImplementation(async (url) => {
    if (url === '/api/players') return resposta(200, { data: jogadores })
    if (url.startsWith('/api/matches/historico')) return historico(url)
    return resposta(404, { erro: 'Rota não encontrada' })
  })
}

const urlsDoHistorico = () => fetch.mock.calls.map(([u]) => u).filter((u) => u.startsWith('/api/matches/historico'))
const ultimaUrl = () => new URL(urlsDoHistorico().at(-1), 'http://x')

const renderizar = () =>
  render(
    <MemoryRouter>
      <HistoryPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('diaSeguinte', () => {
  it('soma um dia, inclusive na virada de mês e de ano', () => {
    expect(diaSeguinte('2026-11-20')).toBe('2026-11-21')
    expect(diaSeguinte('2026-11-30')).toBe('2026-12-01')
    expect(diaSeguinte('2026-12-31')).toBe('2027-01-01')
    expect(diaSeguinte('2028-02-28')).toBe('2028-02-29') // ano bissexto
  })
})

describe('HistoryPage', () => {
  it('lista as partidas com data, local, placar e resultado, com link para o detalhe', async () => {
    simularApi(() => resposta(200, { data: pagina([item(1), item(2, { result: 'DRAW', score: { A: 1, B: 1 } })]) }))

    renderizar()

    expect(await screen.findByText('Quadra 1')).toBeInTheDocument()
    expect(screen.getByText('Time A 2 x 1 Time B')).toBeInTheDocument()
    expect(screen.getByText('Vitória do Time A')).toBeInTheDocument()
    expect(screen.getByText('Empate')).toBeInTheDocument()
    expect(screen.getByText('Quadra 1').closest('a')).toHaveAttribute('href', '/partidas/1')
    expect(ultimaUrl().searchParams.get('page')).toBe('1')
  })

  it('avisa quando não há partidas finalizadas', async () => {
    simularApi(() => resposta(200, { data: pagina([], { totalPages: 0 }) }))
    renderizar()
    expect(await screen.findByText('Nenhuma partida finalizada encontrada.')).toBeInTheDocument()
  })

  it('filtrar por jogador manda o playerId e volta para a página 1', async () => {
    simularApi(() => resposta(200, { data: pagina([item(1)], { totalPages: 3, total: 25 }) }))
    renderizar()
    await screen.findByText('Quadra 1')
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))
    await waitFor(() => expect(ultimaUrl().searchParams.get('page')).toBe('2'))

    fireEvent.change(screen.getByLabelText('Jogador'), { target: { value: '2' } })

    await waitFor(() => expect(ultimaUrl().searchParams.get('playerId')).toBe('2'))
    expect(ultimaUrl().searchParams.get('page')).toBe('1')
  })

  it('filtrar por período manda "de" e "ate" já como dia seguinte (ate exclusivo na API)', async () => {
    simularApi(() => resposta(200, { data: pagina([item(1)]) }))
    renderizar()
    await screen.findByText('Quadra 1')

    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-11-01' } })
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-11-30' } })

    await waitFor(() => expect(ultimaUrl().searchParams.get('ate')).toBe('2026-12-01'))
    expect(ultimaUrl().searchParams.get('de')).toBe('2026-11-01')
  })

  describe('paginação', () => {
    const tresPaginas = (url) => {
      const page = Number(new URL(url, 'http://x').searchParams.get('page'))
      return resposta(200, { data: pagina([item(page * 10)], { page, totalPages: 3, total: 25 }) })
    }

    it('mostra a página atual, o total e navega para a próxima e a anterior', async () => {
      simularApi(tresPaginas)
      renderizar()

      expect(await screen.findByText('Página 1 de 3 (25 partidas)')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()

      fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))
      expect(await screen.findByText('Página 2 de 3 (25 partidas)')).toBeInTheDocument()
      expect(screen.getByText('Quadra 20')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Anterior' }))
      expect(await screen.findByText('Página 1 de 3 (25 partidas)')).toBeInTheDocument()
    })

    it('na última página o botão "Próxima" fica desabilitado', async () => {
      simularApi(tresPaginas)
      renderizar()
      await screen.findByText('Página 1 de 3 (25 partidas)')

      fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))
      await screen.findByText('Página 2 de 3 (25 partidas)')
      fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))

      expect(await screen.findByText('Página 3 de 3 (25 partidas)')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled()
    })
  })

  it('mostra o erro da API (ex.: filtro inválido)', async () => {
    simularApi(() => resposta(400, { erro: '"de" deve ser anterior a "ate"' }))

    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('anterior')
  })
})
