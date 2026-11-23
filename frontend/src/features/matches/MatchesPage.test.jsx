import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import MatchesPage from './MatchesPage.jsx'
import { AuthContext } from '../auth/AuthContext.jsx'

const p1 = { id: 1, date: '2026-11-20T22:00:00.000Z', location: 'Quadra A', status: 'FINISHED' }
const p2 = { id: 2, date: '2026-11-27T22:00:00.000Z', location: 'Quadra B', status: 'SCHEDULED' }

function resposta(status, corpo) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo }
}

function renderizar(papel = 'ORGANIZER') {
  return render(
    <AuthContext.Provider value={{ usuario: { id: 1, role: papel }, carregando: false }}>
      <MemoryRouter initialEntries={['/partidas']}>
        <Routes>
          <Route path="/partidas" element={<MatchesPage />} />
          <Route path="/partidas/:id" element={<p>Súmula aberta</p>} />
        </Routes>
      </MemoryRouter>
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
