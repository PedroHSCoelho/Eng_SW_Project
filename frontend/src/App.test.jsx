import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

const jogador = { id: 1, name: 'Maria', email: 'maria@x.com' }
const organizador = { id: 2, name: 'Chefe', email: 'chefe@x.com' }

// O papel é por grupo: Maria é membro e Chefe é organizador do mesmo grupo.
const grupoDe = (usuario) => ({
  id: 1,
  name: 'Pelada de quinta',
  myRole: usuario.id === organizador.id ? 'ORGANIZER' : 'MEMBER',
  myPlayerId: null,
  ...(usuario.id === organizador.id && { inviteCode: 'ABCD2345' }),
})
const membros = [
  { userId: 1, role: 'MEMBER', playerId: null, user: { id: 1, name: 'Maria' }, player: null },
  { userId: 2, role: 'ORGANIZER', playerId: null, user: { id: 2, name: 'Chefe' }, player: null },
]

// MemoryRouter = roteador em memória, para testar sem navegador: a URL inicial vem em "rota".
function renderizar(rota = '/') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <App />
    </MemoryRouter>,
  )
}

// Simula a API. "usuario" = quem o /api/auth/me devolve (null = ninguém logado, 401).
// `semGrupo`: a pessoa está logada mas ainda não participa de nenhum grupo.
function simularApi(usuario = null, { semGrupo = false } = {}) {
  fetch.mockImplementation(async (url, opcoes = {}) => {
    if (url === '/api/health') return { ok: true }
    if (url === '/api/auth/me') {
      return usuario ? resposta(200, { data: usuario }) : resposta(401, { erro: 'Autenticação necessária' })
    }
    if (url === '/api/auth/logout') return resposta(204)
    if (url === '/api/grupos' && !opcoes.method) return resposta(200, { data: semGrupo ? [] : [grupoDe(usuario)] })
    if (url === '/api/grupos/1/membros' && !opcoes.method) return resposta(200, { data: membros })
    if (url === '/api/convites/ABCD2345') {
      return resposta(200, { data: { id: 1, name: 'Pelada de quinta', totalMembers: 2, alreadyMember: false } })
    }
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
  it('deslogado: menu mostra "Entrar" e esconde Jogadores e Grupo', async () => {
    simularApi(null)

    renderizar('/')

    expect(await screen.findByRole('link', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Jogadores' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Grupo' })).not.toBeInTheDocument()
  })

  it('deslogado em /jogadores (rota protegida) é mandado para a tela de login', async () => {
    simularApi(null)

    renderizar('/jogadores')

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('membro vê o menu (Partidas, Ranking, Jogadores, Grupo), o grupo no cabeçalho e o papel NESTE grupo', async () => {
    simularApi(jogador)

    renderizar('/')

    expect(await screen.findByText('Pelada de quinta')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Jogadores' })).toBeInTheDocument()
    for (const item of ['Início', 'Partidas', 'Ranking', 'Jogadores']) {
      expect(screen.getByRole('link', { name: item })).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: 'Grupo' })).toHaveAttribute('href', '/membros')
    expect(screen.getByRole('link', { name: 'Grupo atual: Pelada de quinta. Trocar de grupo' })).toHaveAttribute('href', '/grupos')
    expect(screen.queryByRole('link', { name: 'Sorteio' })).not.toBeInTheDocument() // virou aba de Partidas
    expect(screen.getByText('Maria (Membro)')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ser organizador' })).not.toBeInTheDocument()
  })

  it('logado sem grupo: a home convida a criar ou entrar num grupo, e /partidas leva a Meus grupos', async () => {
    simularApi(jogador, { semGrupo: true })

    renderizar('/')
    expect(await screen.findByRole('link', { name: /Criar ou entrar num grupo/ })).toHaveAttribute('href', '/grupos')
    cleanup()

    simularApi(jogador, { semGrupo: true })
    renderizar('/partidas')
    expect(await screen.findByRole('heading', { name: 'Meus grupos' })).toBeInTheDocument()
    expect(screen.getByText('Você ainda não participa de nenhum grupo.')).toBeInTheDocument()
  })

  it('"Sair" chama o logout e volta o menu para deslogado', async () => {
    simularApi(jogador)
    renderizar('/')

    fireEvent.click(await screen.findByRole('button', { name: 'Sair' }))

    expect(await screen.findByRole('link', { name: 'Entrar' })).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' })
  })
})

describe('App: grupos', () => {
  it('criar grupo: manda nome, apelido e posição e abre o grupo novo', async () => {
    simularApi(jogador, { semGrupo: true })
    const padrao = fetch.getMockImplementation()
    let criado = false
    fetch.mockImplementation(async (url, opcoes = {}) => {
      if (url === '/api/grupos' && opcoes.method === 'POST') {
        criado = true
        return resposta(201, { data: { id: 5, name: 'Racha', myRole: 'ORGANIZER', myPlayerId: 9, inviteCode: 'ZZZZ2345' } })
      }
      if (url === '/api/grupos' && criado) {
        return resposta(200, { data: [{ id: 5, name: 'Racha', myRole: 'ORGANIZER', myPlayerId: 9, inviteCode: 'ZZZZ2345' }] })
      }
      return padrao(url, opcoes)
    })
    renderizar('/grupos')

    fireEvent.change(await screen.findByLabelText('Nome do grupo'), { target: { value: 'Racha' } })
    fireEvent.change(screen.getByLabelText('Seu apelido no grupo'), { target: { value: 'Mari' } })
    fireEvent.change(screen.getByLabelText('Posição'), { target: { value: 'FORWARD' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar grupo' }))

    expect(await screen.findByText('Maria (Admin)')).toBeInTheDocument()
    const [, opcoes] = fetch.mock.calls.find(([url, o]) => url === '/api/grupos' && o?.method === 'POST')
    expect(JSON.parse(opcoes.body)).toEqual({ name: 'Racha', nickname: 'Mari', position: 'FORWARD' })
  })

  it('convite: deslogado vai para o login e, depois de entrar, volta para o convite', async () => {
    simularApi(null)
    const padrao = fetch.getMockImplementation()
    fetch.mockImplementation(async (url, opcoes = {}) =>
      url === '/api/auth/login' ? resposta(200, { data: jogador }) : padrao(url, opcoes),
    )
    renderizar('/convite/ABCD2345')

    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'maria@x.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-forte-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText(/Você foi convidado para/)).toHaveTextContent('Pelada de quinta (2 pessoas)')
  })

  it('entrar pelo convite manda apelido e posição para o código do link', async () => {
    simularApi(jogador, { semGrupo: true })
    const padrao = fetch.getMockImplementation()
    fetch.mockImplementation(async (url, opcoes = {}) =>
      url === '/api/convites/ABCD2345/entrar'
        ? resposta(201, { data: { id: 1, name: 'Pelada de quinta', myRole: 'MEMBER', myPlayerId: 4 } })
        : padrao(url, opcoes),
    )
    renderizar('/convite/ABCD2345')

    fireEvent.change(await screen.findByLabelText('Seu apelido no grupo'), { target: { value: 'Mari' } })
    fireEvent.change(screen.getByLabelText('Posição'), { target: { value: 'DEFENDER' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar no grupo' }))

    await waitFor(() => expect(fetch.mock.calls.some(([url]) => url === '/api/convites/ABCD2345/entrar')).toBe(true))
    const [, opcoes] = fetch.mock.calls.find(([url]) => url === '/api/convites/ABCD2345/entrar')
    expect(JSON.parse(opcoes.body)).toEqual({ nickname: 'Mari', position: 'DEFENDER' })
  })

  it('convite com jogadores sem conta: "sou eu" manda só o playerId e esconde apelido e posição', async () => {
    simularApi(jogador, { semGrupo: true })
    const padrao = fetch.getMockImplementation()
    fetch.mockImplementation(async (url, opcoes = {}) => {
      if (url === '/api/convites/ABCD2345' && !opcoes.method) {
        return resposta(200, {
          data: {
            id: 1, name: 'Pelada de quinta', totalMembers: 2, alreadyMember: false,
            unclaimedPlayers: [{ id: 9, name: 'Maria Souza', nickname: 'Mari', position: 'DEFENDER' }],
          },
        })
      }
      if (url === '/api/convites/ABCD2345/entrar') {
        return resposta(201, { data: { id: 1, name: 'Pelada de quinta', myRole: 'MEMBER', myPlayerId: 9 } })
      }
      return padrao(url, opcoes)
    })
    renderizar('/convite/ABCD2345')

    fireEvent.click(await screen.findByLabelText(/Sou Mari/))
    expect(screen.queryByLabelText('Seu apelido no grupo')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar no grupo' }))

    await waitFor(() => expect(fetch.mock.calls.some(([url]) => url === '/api/convites/ABCD2345/entrar')).toBe(true))
    const [, opcoes] = fetch.mock.calls.find(([url]) => url === '/api/convites/ABCD2345/entrar')
    expect(JSON.parse(opcoes.body)).toEqual({ playerId: 9 })
  })

  it('membros: organizador vê o link de convite e o motivo quando o back-end recusa mudar papel', async () => {
    simularApi(organizador)
    const padrao = fetch.getMockImplementation()
    fetch.mockImplementation(async (url, opcoes = {}) =>
      url === '/api/grupos/1/membros/1' && opcoes.method === 'PATCH'
        ? resposta(422, { erro: 'Não deu para mudar o papel agora' })
        : padrao(url, opcoes),
    )
    renderizar('/membros')

    expect(await screen.findByLabelText('Link de convite')).toHaveValue(`${window.location.origin}/convite/ABCD2345`)
    // Ninguém muda o próprio papel: o Chefe não tem o seletor dele.
    expect(screen.queryByLabelText('Papel de Chefe')).not.toBeInTheDocument()
    fireEvent.change(await screen.findByLabelText('Papel de Maria'), { target: { value: 'ORGANIZER' } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Não deu para mudar o papel')
    const [, opcoes] = fetch.mock.calls.find(([url, o]) => url === '/api/grupos/1/membros/1' && o?.method === 'PATCH')
    expect(JSON.parse(opcoes.body)).toEqual({ role: 'ORGANIZER' })
    expect(screen.getByLabelText('Papel de Maria')).toHaveValue('MEMBER')
  })

  it('membros: membro comum vê a lista, sem convite nem troca de papel, e pode sair', async () => {
    simularApi(jogador)
    renderizar('/membros')

    expect(await screen.findByText('Chefe')).toBeInTheDocument()
    expect(screen.queryByLabelText('Link de convite')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Papel de Chefe')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair do grupo' })).toBeInTheDocument()
  })
})

describe('App: atalhos da página inicial', () => {
  it('os cartões levam às telas (Ranking -> /ranking)', async () => {
    simularApi()

    renderizar('/')

    expect((await screen.findByText('Ranking')).closest('a')).toHaveAttribute('href', '/ranking')
    expect(screen.getByText('Histórico').closest('a')).toHaveAttribute('href', '/historico')
  })

  it('só o organizador DO GRUPO vê o atalho do sorteio', async () => {
    simularApi(organizador)
    renderizar('/')
    expect(await screen.findByText('Sorteio de times')).toBeInTheDocument()
    cleanup()

    simularApi(jogador)
    renderizar('/')
    await screen.findByText('Ranking')
    expect(screen.queryByText('Sorteio de times')).not.toBeInTheDocument()
  })

  it('o sorteio é protegido: membro comum que digita a URL é barrado', async () => {
    simularApi(jogador)
    renderizar('/sorteio')
    expect(await screen.findByRole('alert')).toHaveTextContent('permissão')
  })
})

describe('App: menu da área de Partidas', () => {
  it('Histórico e Sorteio são abas de Partidas, e o item "Partidas" fica aceso nelas', async () => {
    simularApi(organizador)
    renderizar('/sorteio')

    const abas = await screen.findByRole('navigation', { name: 'Partidas' })
    expect(within(abas).getByRole('link', { name: 'Sortear times' })).toHaveAttribute('aria-current', 'page')
    expect(within(abas).getByRole('link', { name: 'Histórico' })).toHaveAttribute('href', '/historico')
    const principal = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(principal).getByRole('link', { name: 'Partidas' }).className).toMatch(/text-gramado/)
  })
})
