import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import MatchesPage from './MatchesPage.jsx'
import { AuthContext } from '../auth/AuthContext.jsx'
import { GrupoFixo } from '../groups/GrupoContext.jsx'

const p1 = { id: 1, date: '2026-11-20T22:00:00.000Z', location: 'Quadra A', status: 'FINISHED', score: { A: 2, B: 1 } }
const p2 = { id: 2, date: '2026-11-27T22:00:00.000Z', location: 'Quadra B', status: 'SCHEDULED', score: { A: 0, B: 0 } }

function resposta(status, corpo) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo }
}

function renderizar(papel = 'ORGANIZER') {
  return render(
    <AuthContext.Provider value={{ usuario: { id: 1 }, carregando: false }}>
      <GrupoFixo grupo={{ id: 1, name: 'Grupo de teste', myRole: papel, myPlayerId: null }}>
        <MemoryRouter initialEntries={['/partidas']}>
          <Routes>
            <Route path="/partidas" element={<MatchesPage />} />
            <Route path="/partidas/:id" element={<p>Súmula aberta</p>} />
          </Routes>
        </MemoryRouter>
      </GrupoFixo>
    </AuthContext.Provider>,
  )
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => resposta(200, { data: [p1, p2] })))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('MatchesPage', () => {
  it('lista as partidas com local, status e link para a súmula', async () => {
    renderizar()

    expect(await screen.findByText('Quadra A')).toBeInTheDocument()
    expect(screen.getByText('Finalizada')).toBeInTheDocument()
    expect(screen.getByText('Agendada')).toBeInTheDocument()
    expect(screen.getByText('Quadra B').closest('a')).toHaveAttribute('href', '/partidas/2')
  })

  it('avisa quando não há partidas', async () => {
    fetch.mockImplementation(async () => resposta(200, { data: [] }))
    renderizar()
    expect(await screen.findByText('Nenhuma partida registrada ainda.')).toBeInTheDocument()
  })

  it('organizador cria a partida (data em ISO) e vai direto para a súmula', async () => {
    fetch.mockImplementation(async (url, opcoes = {}) =>
      opcoes.method === 'POST' ? resposta(201, { data: { id: 9 } }) : resposta(200, { data: [] }),
    )
    renderizar()
    await screen.findByText('Nenhuma partida registrada ainda.')

    fireEvent.change(screen.getByLabelText('Data e hora'), { target: { value: '2026-11-20T19:00' } })
    fireEvent.change(screen.getByLabelText('Local'), { target: { value: 'Quadra da UNIFESP' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar partida' }))

    expect(await screen.findByText('Súmula aberta')).toBeInTheDocument()
    const [, opcoes] = fetch.mock.calls.find(([, o]) => o?.method === 'POST')
    const corpo = JSON.parse(opcoes.body)
    expect(corpo.location).toBe('Quadra da UNIFESP')
    expect(corpo.date).toBe(new Date('2026-11-20T19:00').toISOString())
  })

  it('erro da API ao criar aparece na tela e não navega', async () => {
    fetch.mockImplementation(async (url, opcoes = {}) =>
      opcoes.method === 'POST' ? resposta(400, { erro: 'Local deve ter de 2 a 100 caracteres' }) : resposta(200, { data: [] }),
    )
    renderizar()
    await screen.findByText('Nenhuma partida registrada ainda.')

    fireEvent.change(screen.getByLabelText('Data e hora'), { target: { value: '2026-11-20T19:00' } })
    fireEvent.change(screen.getByLabelText('Local'), { target: { value: 'ok' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar partida' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Local deve ter de 2 a 100')
    expect(screen.queryByText('Súmula aberta')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Criar partida' })).toBeEnabled())
  })

  it('jogador comum vê a lista, mas não o formulário de nova partida', async () => {
    renderizar('PLAYER')
    expect(await screen.findByText('Quadra A')).toBeInTheDocument()
    expect(screen.queryByText('Nova partida')).not.toBeInTheDocument()
  })
})

describe('MatchesPage: placar e estado na lista', () => {
  const andamento = { id: 3, date: '2026-11-21T22:00:00.000Z', location: 'Quadra C', status: 'IN_PROGRESS', score: { A: 1, B: 0 } }
  const cancelada = { id: 4, date: '2026-11-22T22:00:00.000Z', location: 'Quadra D', status: 'CANCELED', score: { A: 3, B: 3 } }

  it('mostra o placar das partidas em andamento e finalizadas, e nada nas agendadas', async () => {
    fetch.mockImplementation(async () => resposta(200, { data: [p1, p2, andamento] }))
    renderizar()

    await screen.findByText('Quadra A')

    expect(screen.getByText('Time A 2 x 1 Time B')).toBeInTheDocument() // finalizada
    expect(screen.getByText('Time A 1 x 0 Time B')).toBeInTheDocument() // em andamento
    expect(screen.getAllByText(/Time A \d x \d Time B/)).toHaveLength(2) // a agendada não mostra
  })

  it('partida cancelada mostra o selo "Cancelada" e nunca o placar', async () => {
    fetch.mockImplementation(async () => resposta(200, { data: [cancelada] }))
    renderizar()

    expect(await screen.findByText('Cancelada')).toBeInTheDocument()
    expect(screen.queryByText(/Time A \d x \d Time B/)).not.toBeInTheDocument()
  })
})

describe('MatchesPage: formato, vagas e lista de presença', () => {
  it('cria uma pelada de 4 times com vagas; jogo único é o padrão', async () => {
    fetch.mockImplementation(async (url, opcoes = {}) =>
      opcoes.method === 'POST' ? resposta(201, { data: { id: 9 } }) : resposta(200, { data: [] }),
    )
    renderizar()
    await screen.findByText('Nenhuma partida registrada ainda.')
    expect(screen.getByRole('radio', { name: /Jogo único/ })).toBeChecked()
    expect(screen.queryByLabelText('Times')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: /Pelada/ }))
    fireEvent.change(screen.getByLabelText('Times'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Data e hora'), { target: { value: '2026-11-20T19:00' } })
    fireEvent.change(screen.getByLabelText('Local'), { target: { value: 'Society' } })
    fireEvent.change(screen.getByLabelText(/Vagas/), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar partida' }))

    await screen.findByText('Súmula aberta')
    const [, opcoes] = fetch.mock.calls.find(([, o]) => o?.method === 'POST')
    expect(JSON.parse(opcoes.body)).toMatchObject({ format: 'PELADA', teamCount: 4, maxPlayers: 20, location: 'Society' })
  })

  it('dá nomes livres aos times (um campo por time; vazio fica "Time X")', async () => {
    fetch.mockImplementation(async (url, opcoes = {}) =>
      opcoes.method === 'POST' ? resposta(201, { data: { id: 9 } }) : resposta(200, { data: [] }),
    )
    renderizar()
    await screen.findByText('Nenhuma partida registrada ainda.')
    expect(screen.getByLabelText('Nome do Time A')).toHaveAttribute('placeholder', 'Time A')
    expect(screen.queryByLabelText('Nome do Time C')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: /Pelada/ }))
    fireEvent.change(screen.getByLabelText('Nome do Time A'), { target: { value: ' Amarelo ' } })
    fireEvent.change(screen.getByLabelText('Nome do Time C'), { target: { value: 'Verde' } })
    fireEvent.change(screen.getByLabelText('Data e hora'), { target: { value: '2026-11-20T19:00' } })
    fireEvent.change(screen.getByLabelText('Local'), { target: { value: 'Society' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar partida' }))

    await screen.findByText('Súmula aberta')
    const [, opcoes] = fetch.mock.calls.find(([, o]) => o?.method === 'POST')
    expect(JSON.parse(opcoes.body).teamNames).toEqual({ A: 'Amarelo', C: 'Verde' })
  })

  it('a lista mostra os nomes dos times no placar', async () => {
    fetch.mockResolvedValue(
      resposta(200, {
        data: [{ id: 1, date: '2026-11-20T22:00:00.000Z', location: 'Quadra', status: 'FINISHED', result: 'A_WINS', score: { A: 2, B: 1 }, teamNames: { A: 'Amarelo' } }],
      }),
    )
    renderizar()
    expect(await screen.findByText('Amarelo 2 x 1 Time B')).toBeInTheDocument()
  })

  it('agendada mostra quantos estão na lista; pelada mostra times e jogos no lugar do placar', async () => {
    fetch.mockImplementation(async () =>
      resposta(200, {
        data: [
          { ...p2, attendance: { total: 14, maxPlayers: 12 } },
          { ...p1, id: 3, location: 'Society', format: 'PELADA', teamCount: 3, gamesCount: 5, score: { A: 4, B: 2, C: 1 } },
        ],
      }),
    )
    renderizar()
    expect(await screen.findByText('12/12 na lista · 2 na espera')).toBeInTheDocument()
    expect(screen.getByText('Pelada · 3 times · 5 jogo(s)')).toBeInTheDocument()
  })
})
