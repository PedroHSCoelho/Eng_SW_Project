import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

// MemoryRouter = roteador em memória, para testar sem navegador: a URL inicial vem em "rota".
function renderizar(rota = '/') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <App />
    </MemoryRouter>,
  )
}

// O App chama /api/health e a página de jogadores chama /api/players.
function simularApi() {
  fetch.mockImplementation(async (url) =>
    url === '/api/health'
      ? { ok: true }
      : { ok: true, status: 200, json: async () => ({ data: [] }) },
  )
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

  it('navega da página inicial para a de jogadores pelo menu', async () => {
    simularApi()
    renderizar('/')

    fireEvent.click(screen.getByRole('link', { name: 'Jogadores' }))

    expect(await screen.findByText('Nenhum jogador encontrado.')).toBeInTheDocument()
    expect(screen.queryByText('Ranking')).not.toBeInTheDocument()
  })

  it('abre direto a página de jogadores pela URL /jogadores', async () => {
    simularApi()

    renderizar('/jogadores')

    expect(await screen.findByText('Nenhum jogador encontrado.')).toBeInTheDocument()
  })

  it('mostra aviso em uma URL que não existe e permite voltar ao início', async () => {
    simularApi()

    renderizar('/xyz')

    expect(screen.getByText('Página não encontrada')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Início' }))
    expect(await screen.findByText('Ranking')).toBeInTheDocument()
  })
})
