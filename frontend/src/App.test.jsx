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
    fetch.mockResolvedValue({ ok: true })

    render(<App />)

    expect(await screen.findByText('API: online')).toBeInTheDocument()
    expect(screen.getByText('Ranking')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/health')
  })

  it('indica quando a API está offline', async () => {
    fetch.mockRejectedValue(new Error('Falha de conexão'))

    render(<App />)

    expect(await screen.findByText('API: offline')).toBeInTheDocument()
  })
})
