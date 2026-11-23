import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import RankingPage from './RankingPage.jsx'

const linha = (position, playerId, nickname, extra = {}) => ({
  position, playerId, nickname, name: nickname, points: 9, matches: 3, wins: 3, draws: 0, losses: 0,
  goalDifference: 4, goals: 5, assists: 2, ...extra,
})

const ranking = {
  geral: [linha(1, 1, 'Zé'), linha(2, 2, 'Beto', { points: 4, wins: 1, draws: 1, losses: 1, goalDifference: -1 })],
  artilharia: [linha(1, 2, 'Beto', { goals: 7, matches: 4 })],
  assistencias: [],
}

function resposta(status, corpo) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo }
}

const renderizar = () =>
  render(
    <MemoryRouter>
      <RankingPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => resposta(200, { data: ranking })))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('RankingPage', () => {
  it('mostra o ranking geral por padrão, com posição, pontos e link para o perfil', async () => {
    renderizar()

    const tabela = await screen.findByRole('table')
    const linhas = within(tabela).getAllByRole('row')
    expect(linhas).toHaveLength(3) // cabeçalho + 2 jogadores
    expect(within(linhas[1]).getByRole('link', { name: 'Zé' })).toHaveAttribute('href', '/jogadores/1')
    expect(within(linhas[1]).getByText('9')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/rankings?periodo=tudo', undefined)
  })

  it('troca para a aba de artilharia', async () => {
    renderizar()
    await screen.findByRole('table')

    fireEvent.click(screen.getByRole('tab', { name: 'Artilharia' }))

    const tabela = screen.getByRole('table')
    expect(within(tabela).getByText('Beto')).toBeInTheDocument()
    expect(within(tabela).queryByText('Zé')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Artilharia' })).toHaveAttribute('aria-selected', 'true')
  })

  it('aba sem ninguém explica por quê', async () => {
    renderizar()
    await screen.findByRole('table')

    fireEvent.click(screen.getByRole('tab', { name: 'Assistências' }))

    expect(screen.getByText('Ainda não há assistências no período.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('ranking geral vazio explica a regra das 3 partidas', async () => {
    fetch.mockImplementation(async () => resposta(200, { data: { geral: [], artilharia: [], assistencias: [] } }))

    renderizar()

    expect(await screen.findByText(/pelo menos 3/)).toBeInTheDocument()
  })

  it('mudar o período busca de novo com o período escolhido', async () => {
    renderizar()
    await screen.findByRole('table')

    fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'mes' } })

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/rankings?periodo=mes', undefined))
  })

  it('mostra o erro da API e esconde a tabela', async () => {
    fetch.mockImplementation(async () => resposta(400, { erro: 'Período inválido; use mes, ano ou tudo' }))

    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Período inválido')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
