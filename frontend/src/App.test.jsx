import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import App from './App.jsx'

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

const jogador = { id: 1, name: 'Maria', email: 'maria@x.com', role: 'PLAYER', playerId: null }
const organizador = { id: 2, name: 'Chefe', email: 'chefe@x.com', role: 'ORGANIZER', playerId: null }

// MemoryRouter = roteador em memória, para testar sem navegador: a URL inicial vem em "rota".
function renderizar(rota = '/') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <App />
    </MemoryRouter>,
  )
}

// Simula a API. "usuario" = quem o /api/auth/me devolve (null = ninguém logado, 401).
function simularApi(usuario = null) {
  fetch.mockImplementation(async (url, opcoes = {}) => {
    if (url === '/api/health') return { ok: true }
    if (url === '/api/auth/me') {
      return usuario ? resposta(200, { data: usuario }) : resposta(401, { erro: 'Autenticação necessária' })
    }
    if (url === '/api/auth/logout') return resposta(204)
    if (url === '/api/users' && !opcoes.method) return resposta(200, { data: [jogador, organizador] })
    return resposta(200, { data: [] })
  })
}

describe('App', () => {
  it('na página inicial exibe as funcionalidades e indica que a API está online', async () => {
    simularApi()

    renderizar('/')

    expect(await screen.findByText('API: online')).toBeInTheDocument()
    expect(screen.getByText('Ranking')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/health')
  })

  it('indica quando a API está offline', async () => {
    fetch.mockRejectedValue(new Error('Falha de conexão'))

    renderizar('/')

    expect(await screen.findByText('API: offline')).toBeInTheDocument()
  })

  it('mostra aviso em uma URL que não existe e permite voltar ao início', async () => {
    simularApi()

    renderizar('/xyz')

    expect(screen.getByText('Página não encontrada')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Início' }))
    expect(await screen.findByText('Ranking')).toBeInTheDocument()
  })
})

describe('App: sessão e papéis', () => {
  it('deslogado: menu mostra "Entrar" e esconde Jogadores e Usuários', async () => {
    simularApi(null)

    renderizar('/')

    expect(await screen.findByRole('link', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Jogadores' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Usuários' })).not.toBeInTheDocument()
  })

  it('deslogado em /jogadores (rota protegida) é mandado para a tela de login', async () => {
    simularApi(null)

    renderizar('/jogadores')

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('jogador logado vê Jogadores, não vê Usuários e é barrado em /usuarios', async () => {
    simularApi(jogador)

    renderizar('/usuarios')

    expect(await screen.findByText('Você não tem permissão para ver esta página.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Jogadores' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Usuários' })).not.toBeInTheDocument()
    expect(screen.getByText('Maria (Jogador)')).toBeInTheDocument()
  })

  it('organizador logado vê o menu Usuários e a lista de contas', async () => {
    simularApi(organizador)

    renderizar('/')
    fireEvent.click(await screen.findByRole('link', { name: 'Usuários' }))

    expect(await screen.findByLabelText('Papel de Maria')).toHaveValue('PLAYER')
    expect(screen.getByLabelText('Papel de Chefe')).toHaveValue('ORGANIZER')
  })

  it('"Sair" chama o logout e volta o menu para deslogado', async () => {
    simularApi(jogador)
    renderizar('/')

    fireEvent.click(await screen.findByRole('button', { name: 'Sair' }))

    expect(await screen.findByRole('link', { name: 'Entrar' })).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' })
  })
})

describe('App: gestão de usuários', () => {
  it('trocar o papel chama a API e mostra o motivo quando o back-end recusa', async () => {
    simularApi(organizador)
    const padrao = fetch.getMockImplementation()
    fetch.mockImplementation(async (url, opcoes = {}) =>
      url === '/api/users/2/role'
        ? resposta(422, { erro: 'O sistema precisa ter ao menos um organizador' })
        : padrao(url, opcoes),
    )
    renderizar('/usuarios')

    fireEvent.change(await screen.findByLabelText('Papel de Chefe'), { target: { value: 'PLAYER' } })

    expect(await screen.findByRole('alert')).toHaveTextContent('ao menos um organizador')
    const [, opcoes] = fetch.mock.calls.find(([url]) => url === '/api/users/2/role')
    expect(JSON.parse(opcoes.body)).toEqual({ role: 'PLAYER' })
    await waitFor(() => expect(screen.getByLabelText('Papel de Chefe')).toHaveValue('ORGANIZER'))
  })
})
