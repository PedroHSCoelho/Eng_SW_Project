import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import App from './App.jsx'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('exibe as funcionalidades e indica quando a API está online', async () => {
    // O App chama /api/health e a página de jogadores chama /api/players.
    fetch.mockImplementation(async (url) =>
      url === '/api/health'
        ? { ok: true }
        : { ok: true, status: 200, json: async () => ({ data: [] }) },
    )

    render(<App />)

    expect(await screen.findByText('API: online')).toBeInTheDocument()
    expect(screen.getByText('Ranking')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/health')
    expect(await screen.findByText('Nenhum jogador encontrado.')).toBeInTheDocument()
  })

  it('indica quando a API está offline', async () => {
    fetch.mockRejectedValue(new Error('Falha de conexão'))

    render(<App />)

    expect(await screen.findByText('API: offline')).toBeInTheDocument()
  })
})
