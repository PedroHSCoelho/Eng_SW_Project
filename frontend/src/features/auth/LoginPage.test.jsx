import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

// Testamos pelo App completo para cobrir o fluxo real: login -> sessão -> menu muda.
function abrirLogin(rotas) {
  fetch.mockImplementation(async (url, opcoes = {}) => {
    if (url === '/api/health') return { ok: true }
    if (url === '/api/auth/me') return resposta(401, { erro: 'Autenticação necessária' })
    const rota = rotas[`${opcoes.method ?? 'GET'} ${url}`]
    return rota ? rota() : resposta(200, { data: [] })
  })
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <App />
    </MemoryRouter>,
  )
}

const corpoEnviado = (chave) => {
  const [, opcoes] = fetch.mock.calls.find(([url, o]) => `${o?.method ?? 'GET'} ${url}` === chave)
  return JSON.parse(opcoes.body)
}

describe('LoginPage', () => {
  it('entra com e-mail e senha, vai para o início e mostra o nome no cabeçalho', async () => {
    abrirLogin({
      'POST /api/auth/login': () =>
        resposta(200, { data: { id: 1, name: 'Maria', role: 'PLAYER', email: 'm@x.com' } }),
    })

    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'm@x.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-forte-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Maria (Jogador)')).toBeInTheDocument()
    expect(corpoEnviado('POST /api/auth/login')).toEqual({
      email: 'm@x.com',
      password: 'senha-forte-1',
    })
  })

  it('mostra a mensagem do back-end quando a senha está errada e continua na tela', async () => {
    abrirLogin({
      'POST /api/auth/login': () => resposta(401, { erro: 'E-mail ou senha inválidos' }),
    })

    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'm@x.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'errada-errada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos')
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('alterna para "Criar conta", pede o nome e envia o cadastro', async () => {
    abrirLogin({
      'POST /api/auth/register': () =>
        resposta(201, { data: { id: 3, name: 'Ana Lima', role: 'PLAYER', email: 'ana@x.com' } }),
    })

    fireEvent.click(await screen.findByRole('button', { name: 'Não tenho conta' }))
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana Lima' } })
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@x.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-forte-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }))

    expect(await screen.findByText('Ana Lima (Jogador)')).toBeInTheDocument()
    expect(corpoEnviado('POST /api/auth/register')).toEqual({
      name: 'Ana Lima',
      email: 'ana@x.com',
      password: 'senha-forte-1',
    })
  })

  it('mostra o erro de validação do cadastro (ex.: senha curta)', async () => {
    abrirLogin({
      'POST /api/auth/register': () =>
        resposta(400, { erro: 'Senha deve ter de 8 a 72 caracteres' }),
    })

    fireEvent.click(await screen.findByRole('button', { name: 'Não tenho conta' }))
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Senha deve ter')
  })
})
