import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import App from '../../App.jsx'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const resposta = (status, corpo) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => corpo,
})

const maria = { id: 1, name: 'Maria', email: 'maria@x.com', role: 'PLAYER', playerId: 5 }
const semVinculo = { ...maria, playerId: null }
const chefe = { id: 2, name: 'Chefe', email: 'chefe@x.com', role: 'ORGANIZER', playerId: null }
const motivo = 'Organizo a pelada de quinta feira'

// Simula a API por "MÉTODO url". O /me devolve "usuario"; rotas não configuradas devolvem lista vazia.
function abrir(rota, usuario, rotas = {}) {
  fetch.mockImplementation(async (url, opcoes = {}) => {
    if (url === '/api/health') return { ok: true }
    if (url === '/api/auth/me') return resposta(200, { data: usuario })
    const tratador = rotas[`${opcoes.method ?? 'GET'} ${url}`]
    return tratador ? tratador() : resposta(200, { data: [] })
  })
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <App />
    </MemoryRouter>,
  )
}

const chamadas = () => fetch.mock.calls.map(([url, o]) => `${o?.method ?? 'GET'} ${url}`)

describe('Tela "Ser organizador"', () => {
  it('jogador vinculado vê o formulário e envia o motivo', async () => {
    abrir('/ser-organizador', maria, {
      'GET /api/organizer-requests/mine': () => resposta(200, { data: null }),
      'POST /api/organizer-requests': () =>
        resposta(201, { data: { id: 1, status: 'PENDING', message: motivo, createdAt: '2026-11-10T12:00:00Z' } }),
    })

    fireEvent.change(await screen.findByLabelText('Motivo do pedido'), { target: { value: motivo } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }))

    expect(await screen.findByText('Pedido em análise')).toBeInTheDocument()
    const [, opcoes] = fetch.mock.calls.find(([url, o]) => url === '/api/organizer-requests' && o?.method === 'POST')
    expect(JSON.parse(opcoes.body)).toEqual({ message: motivo })
  })

  it('mostra a mensagem do back-end quando ele recusa o pedido', async () => {
    abrir('/ser-organizador', maria, {
      'GET /api/organizer-requests/mine': () => resposta(200, { data: null }),
      'POST /api/organizer-requests': () => resposta(400, { erro: 'Explique o motivo em 10 a 200 caracteres' }),
    })

    fireEvent.change(await screen.findByLabelText('Motivo do pedido'), { target: { value: 'curto' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('10 a 200')
  })

  it('conta sem jogador vinculado é orientada a pedir o vínculo e não vê o formulário', async () => {
    abrir('/ser-organizador', semVinculo, {
      'GET /api/organizer-requests/mine': () => resposta(200, { data: null }),
    })

    expect(await screen.findByText(/vinculada a um jogador/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Motivo do pedido')).not.toBeInTheDocument()
  })

  it('pedido recusado mostra a data e permite tentar de novo (o back-end aplica os 7 dias)', async () => {
    abrir('/ser-organizador', maria, {
      'GET /api/organizer-requests/mine': () =>
        resposta(200, { data: { id: 1, status: 'REJECTED', message: motivo, decidedAt: '2026-11-03T12:00:00Z' } }),
    })

    expect(await screen.findByText(/foi recusado em/)).toBeInTheDocument()
    expect(screen.getByLabelText('Motivo do pedido')).toBeInTheDocument()
  })

  it('pedido aprovado, mas ainda "jogador" na tela: pergunta de novo quem sou eu', async () => {
    abrir('/ser-organizador', maria, {
      'GET /api/organizer-requests/mine': () =>
        resposta(200, { data: { id: 1, status: 'APPROVED', message: motivo } }),
    })

    await waitFor(() => expect(chamadas().filter((c) => c === 'GET /api/auth/me').length).toBe(2))
  })

  it('o menu "Ser organizador" aparece para jogador e some para organizador', async () => {
    abrir('/', chefe)
    await screen.findByText('Chefe (Organizador)')
    expect(screen.queryByRole('link', { name: 'Ser organizador' })).not.toBeInTheDocument()

    cleanup()
    abrir('/', maria)
    expect(await screen.findByRole('link', { name: 'Ser organizador' })).toBeInTheDocument()
  })
})

describe('Fila de pedidos na tela Usuários', () => {
  const pedido = {
    id: 7,
    message: motivo,
    status: 'PENDING',
    user: { id: 1, name: 'Maria', email: 'maria@x.com' },
  }

  it('organizador vê o pedido com o motivo e aprova; a fila é recarregada', async () => {
    let pendentes = [pedido]
    abrir('/usuarios', chefe, {
      'GET /api/users': () => resposta(200, { data: [maria, chefe] }),
      'GET /api/organizer-requests': () => resposta(200, { data: pendentes }),
      'PATCH /api/organizer-requests/7/approve': () => {
        pendentes = []
        return resposta(200, { data: { ...pedido, status: 'APPROVED' } })
      },
    })

    expect(await screen.findByText(`“${motivo}”`)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar pedido de Maria' }))

    await waitFor(() => expect(chamadas()).toContain('PATCH /api/organizer-requests/7/approve'))
    await waitFor(() => expect(screen.queryByText(`“${motivo}”`)).not.toBeInTheDocument())
  })

  it('recusar chama a rota de recusa', async () => {
    abrir('/usuarios', chefe, {
      'GET /api/users': () => resposta(200, { data: [maria, chefe] }),
      'GET /api/organizer-requests': () => resposta(200, { data: [pedido] }),
      'PATCH /api/organizer-requests/7/reject': () => resposta(200, { data: { ...pedido, status: 'REJECTED' } }),
    })

    fireEvent.click(await screen.findByRole('button', { name: 'Recusar pedido de Maria' }))

    await waitFor(() => expect(chamadas()).toContain('PATCH /api/organizer-requests/7/reject'))
  })

  it('sem pedidos pendentes a seção não aparece', async () => {
    abrir('/usuarios', chefe, { 'GET /api/users': () => resposta(200, { data: [maria, chefe] }) })

    await screen.findByLabelText('Papel de Maria')
    expect(screen.queryByText(/Pedidos de organizador/)).not.toBeInTheDocument()
  })
})
