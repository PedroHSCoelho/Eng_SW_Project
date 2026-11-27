import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import PlayersPage from './PlayersPage.jsx'
import { AuthContext } from '../auth/AuthContext.jsx'
import { GrupoFixo } from '../groups/GrupoContext.jsx'

const ze = { id: 1, name: 'José da Silva', nickname: 'Zé', position: 'FORWARD', active: true }
const beto = { id: 2, name: 'Roberto Lima', nickname: 'Beto', position: 'GOALKEEPER', active: false }

function resposta(status, corpo) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo }
}

// Simula a API por "MÉTODO url". Rota não configurada devolve lista vazia.
function simularApi(rotas = {}) {
  fetch.mockImplementation(async (url, opcoes = {}) => {
    const rota = rotas[`${opcoes.method ?? 'GET'} ${url}`]
    return rota ? rota() : resposta(200, { data: [] })
  })
}

const listaCom = (...jogadores) => ({ 'GET /api/grupos/1/players': () => resposta(200, { data: jogadores }) })

// Todas as chamadas feitas ao fetch, no formato "MÉTODO url".
const chamadas = () => fetch.mock.calls.map(([url, opcoes]) => `${opcoes?.method ?? 'GET'} ${url}`)
const corpoDaChamada = (chave) => {
  const [, opcoes] = fetch.mock.calls.find(([url, o]) => `${o?.method ?? 'GET'} ${url}` === chave)
  return JSON.parse(opcoes.body)
}

function preencher({ nome, apelido, posicao }) {
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: nome } })
  fireEvent.change(screen.getByLabelText('Apelido'), { target: { value: apelido } })
  fireEvent.change(screen.getByLabelText('Posição'), { target: { value: posicao } })
}

// A página lê quem está logado pelo contexto; aqui entregamos um usuário pronto, sem rede.
function renderizarPagina(papel = 'ORGANIZER') {
  return render(
    <AuthContext.Provider value={{ usuario: { id: 1 }, carregando: false }}>
      <GrupoFixo grupo={{ id: 1, name: 'Grupo de teste', myRole: papel, myPlayerId: null }}>
        <MemoryRouter>
          <PlayersPage />
        </MemoryRouter>
      </GrupoFixo>
    </AuthContext.Provider>,
  )
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('PlayersPage', () => {
  describe('listagem', () => {
    it('mostra os jogadores com posição em português e marca os inativos', async () => {
      simularApi(listaCom(ze, beto))

      // Como membro, sem o aviso de "sem conta" que só o admin vê.
      renderizarPagina('MEMBER')

      expect(await screen.findByText('Zé')).toBeInTheDocument()
      expect(screen.getByText('José da Silva · Atacante')).toBeInTheDocument()
      expect(screen.getByText('Roberto Lima · Goleiro')).toBeInTheDocument()
      expect(screen.getAllByText('Inativo')).toHaveLength(1)
    })

    it('avisa quando não há jogadores', async () => {
      simularApi()

      renderizarPagina()

      expect(await screen.findByText('Nenhum jogador encontrado.')).toBeInTheDocument()
    })

    it('envia a busca para a API sem espaços nas pontas', async () => {
      simularApi()
      renderizarPagina()
      await screen.findByText('Nenhum jogador encontrado.')

      fireEvent.change(screen.getByLabelText('Buscar por nome ou apelido'), {
        target: { value: ' ze ' },
      })

      await waitFor(() => expect(chamadas()).toContain('GET /api/grupos/1/players?busca=ze'))
    })

    it('pede só jogadores ativos quando o filtro é marcado', async () => {
      simularApi()
      renderizarPagina()
      await screen.findByText('Nenhum jogador encontrado.')

      fireEvent.click(screen.getByLabelText('Mostrar só ativos'))

      await waitFor(() => expect(chamadas()).toContain('GET /api/grupos/1/players?ativos=true'))
    })

    it('mostra erro quando não consegue falar com o servidor', async () => {
      fetch.mockRejectedValue(new Error('rede caiu'))

      renderizarPagina()

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Não foi possível falar com o servidor',
      )
    })
  })

  describe('cadastro', () => {
    it('envia os dados, limpa o formulário e recarrega a lista', async () => {
      simularApi({ 'POST /api/grupos/1/players': () => resposta(201, { data: ze }) })
      renderizarPagina()
      await screen.findByText('Nenhum jogador encontrado.')

      preencher({ nome: 'José da Silva', apelido: 'Zé', posicao: 'FORWARD' })
      fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }))

      await waitFor(() =>
        expect(chamadas().filter((c) => c === 'GET /api/grupos/1/players')).toHaveLength(2),
      )
      expect(corpoDaChamada('POST /api/grupos/1/players')).toEqual({
        name: 'José da Silva',
        nickname: 'Zé',
        position: 'FORWARD',
      })
      expect(screen.getByLabelText('Nome')).toHaveValue('')
    })

    it('mostra o erro do back-end e mantém o que foi digitado', async () => {
      simularApi({
        'POST /api/grupos/1/players': () => resposta(422, { erro: 'Apelido já está em uso' }),
      })
      renderizarPagina()
      await screen.findByText('Nenhum jogador encontrado.')

      preencher({ nome: 'Outro Zé', apelido: 'zé', posicao: 'DEFENDER' })
      fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Apelido já está em uso')
      expect(screen.getByLabelText('Apelido')).toHaveValue('zé')
    })
  })

  describe('edição', () => {
    it('carrega o jogador no formulário e envia a alteração com PUT', async () => {
      simularApi({
        ...listaCom(ze),
        'PUT /api/grupos/1/players/1': () => resposta(200, { data: ze }),
      })
      renderizarPagina()
      await screen.findByText('Zé')

      fireEvent.click(screen.getByRole('button', { name: 'Editar Zé' }))

      expect(screen.getByText('Editar jogador')).toBeInTheDocument()
      expect(screen.getByLabelText('Nome')).toHaveValue('José da Silva')
      fireEvent.change(screen.getByLabelText('Apelido'), { target: { value: 'Zezinho' } })
      fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

      await waitFor(() => expect(chamadas()).toContain('PUT /api/grupos/1/players/1'))
      expect(corpoDaChamada('PUT /api/grupos/1/players/1')).toEqual({
        name: 'José da Silva',
        nickname: 'Zezinho',
        position: 'FORWARD',
      })
      await waitFor(() => expect(screen.getByText('Novo jogador')).toBeInTheDocument())
    })

    it('rola a tela até o formulário ao clicar em Editar', async () => {
      const rolar = vi.fn()
      window.HTMLElement.prototype.scrollIntoView = rolar
      simularApi(listaCom(ze))
      renderizarPagina()
      await screen.findByText('Zé')

      fireEvent.click(screen.getByRole('button', { name: 'Editar Zé' }))

      expect(rolar).toHaveBeenCalled()
      delete window.HTMLElement.prototype.scrollIntoView
    })

    it('cancelar volta o formulário para o modo de cadastro', async () => {
      simularApi(listaCom(ze))
      renderizarPagina()
      await screen.findByText('Zé')

      fireEvent.click(screen.getByRole('button', { name: 'Editar Zé' }))
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(screen.getByText('Novo jogador')).toBeInTheDocument()
      expect(screen.getByLabelText('Nome')).toHaveValue('')
    })
  })

  describe('inativar', () => {
    it('só inativa depois de confirmar', async () => {
      simularApi({
        ...listaCom(ze),
        'PATCH /api/grupos/1/players/1/inativar': () => resposta(200, { data: { ...ze, active: false } }),
      })
      renderizarPagina()
      await screen.findByText('Zé')

      fireEvent.click(screen.getByRole('button', { name: 'Inativar Zé' }))
      expect(chamadas()).not.toContain('PATCH /api/grupos/1/players/1/inativar')

      fireEvent.click(screen.getByRole('button', { name: 'Confirmar inativação de Zé' }))
      await waitFor(() => expect(chamadas()).toContain('PATCH /api/grupos/1/players/1/inativar'))
    })

    it('permite desistir da inativação', async () => {
      simularApi(listaCom(ze))
      renderizarPagina()
      await screen.findByText('Zé')

      fireEvent.click(screen.getByRole('button', { name: 'Inativar Zé' }))
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar inativação de Zé' }))

      expect(screen.getByRole('button', { name: 'Inativar Zé' })).toBeInTheDocument()
      expect(chamadas()).not.toContain('PATCH /api/grupos/1/players/1/inativar')
    })

    it('não oferece inativar para quem já está inativo', async () => {
      simularApi(listaCom(beto))
      renderizarPagina()
      await screen.findByText('Beto')

      expect(screen.queryByRole('button', { name: 'Inativar Beto' })).not.toBeInTheDocument()
    })
  })

  describe('reativar', () => {
    it('inativo ganha o botão Reativar, que chama a API e recarrega a lista', async () => {
      simularApi({
        ...listaCom(beto),
        'PATCH /api/grupos/1/players/2/reativar': () => resposta(200, { data: { ...beto, active: true } }),
      })
      renderizarPagina()
      await screen.findByText('Beto')

      fireEvent.click(screen.getByRole('button', { name: 'Reativar Beto' }))

      await waitFor(() => expect(chamadas()).toContain('PATCH /api/grupos/1/players/2/reativar'))
      await waitFor(() => expect(chamadas().filter((c) => c === 'GET /api/grupos/1/players')).toHaveLength(2))
    })

    it('jogador ativo não tem Reativar', async () => {
      simularApi(listaCom(ze))
      renderizarPagina()
      await screen.findByText('Zé')

      expect(screen.queryByRole('button', { name: 'Reativar Zé' })).not.toBeInTheDocument()
    })
  })

  describe('exclusão', () => {
    it('só exclui depois de confirmar', async () => {
      simularApi({
        ...listaCom(ze),
        'DELETE /api/grupos/1/players/1': () => resposta(204),
      })
      renderizarPagina()
      await screen.findByText('Zé')

      fireEvent.click(screen.getByRole('button', { name: 'Excluir Zé' }))
      expect(chamadas()).not.toContain('DELETE /api/grupos/1/players/1')

      fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão de Zé' }))
      await waitFor(() => expect(chamadas()).toContain('DELETE /api/grupos/1/players/1'))
    })

    it('mostra o motivo quando o back-end recusa a exclusão', async () => {
      simularApi({
        ...listaCom(ze),
        'DELETE /api/grupos/1/players/1': () =>
          resposta(422, { erro: 'Jogador com partidas não pode ser excluído; inative-o' }),
      })
      renderizarPagina()
      await screen.findByText('Zé')

      fireEvent.click(screen.getByRole('button', { name: 'Excluir Zé' }))
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão de Zé' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('inative-o')
    })
  })
})

describe('PlayersPage para quem não é organizador', () => {
  it('mostra a lista, mas sem formulário de cadastro e sem botões de editar, inativar ou excluir', async () => {
    simularApi(listaCom(ze))

    renderizarPagina('PLAYER')

    expect(await screen.findByText('Zé')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Editar|Inativar|Excluir/ })).not.toBeInTheDocument()
  })
})

describe('PlayersPage: perfil', () => {
  it('o apelido de cada jogador é um link para o perfil dele', async () => {
    simularApi(listaCom(ze, beto))

    renderizarPagina('PLAYER')

    expect(await screen.findByRole('link', { name: 'Zé' })).toHaveAttribute('href', '/jogadores/1')
    expect(screen.getByRole('link', { name: 'Beto' })).toHaveAttribute('href', '/jogadores/2')
  })
})

describe('PlayersPage: dar e tirar admin', () => {
  // Zé tem conta (userId 7) e é membro; Beto tem conta (userId 8) e já é admin; Lu não tem conta.
  const lu = { id: 3, name: 'Luana Reis', nickname: 'Lu', position: 'DEFENDER', active: true }
  const membros = [
    { userId: 7, role: 'MEMBER', playerId: 1, user: { id: 7, name: 'José' }, player: { id: 1, nickname: 'Zé' } },
    { userId: 8, role: 'ORGANIZER', playerId: 2, user: { id: 8, name: 'Roberto' }, player: { id: 2, nickname: 'Beto' } },
  ]
  const comMembros = (extra = {}) => ({
    ...listaCom(ze, beto, lu),
    'GET /api/grupos/1/membros': () => resposta(200, { data: membros }),
    ...extra,
  })

  it('admin vê quem é admin, quem não tem conta, e torna um jogador admin', async () => {
    simularApi(comMembros({ 'PATCH /api/grupos/1/membros/7': () => resposta(200, { data: { ...membros[0], role: 'ORGANIZER' } }) }))

    renderizarPagina()

    const tornar = await screen.findByRole('button', { name: 'Tornar Zé admin' })
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tirar admin de Beto' })).toBeInTheDocument()
    expect(screen.getByText('Luana Reis · Defensor · sem conta')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Lu admin/ })).not.toBeInTheDocument()

    fireEvent.click(tornar)

    await waitFor(() => expect(chamadas()).toContain('PATCH /api/grupos/1/membros/7'))
    expect(corpoDaChamada('PATCH /api/grupos/1/membros/7')).toEqual({ role: 'ORGANIZER' })
  })

  it('tirar admin manda MEMBER; se o back-end recusa (último admin), mostra o motivo', async () => {
    simularApi(
      comMembros({ 'PATCH /api/grupos/1/membros/8': () => resposta(422, { erro: 'O grupo precisa ter ao menos um admin' }) }),
    )

    renderizarPagina()
    fireEvent.click(await screen.findByRole('button', { name: 'Tirar admin de Beto' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('ao menos um admin')
    expect(corpoDaChamada('PATCH /api/grupos/1/membros/8')).toEqual({ role: 'MEMBER' })
  })

  it('admin não vê o botão de tirar o próprio admin', async () => {
    // Lu é o jogador da própria conta (userId 1, a do usuário logado) e é admin.
    const eu = { userId: 1, role: 'ORGANIZER', playerId: 3, user: { id: 1, name: 'Luana' }, player: { id: 3, nickname: 'Lu' } }
    simularApi(comMembros({ 'GET /api/grupos/1/membros': () => resposta(200, { data: [...membros, eu] }) }))

    renderizarPagina()

    expect(await screen.findByRole('button', { name: 'Tirar admin de Beto' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tirar admin de Lu' })).not.toBeInTheDocument()
  })

  it('no próprio cartão o admin não tem Inativar nem Excluir (nos outros tem)', async () => {
    const eu = { userId: 1, role: 'ORGANIZER', playerId: 3, user: { id: 1, name: 'Luana' }, player: { id: 3, nickname: 'Lu' } }
    simularApi(comMembros({ 'GET /api/grupos/1/membros': () => resposta(200, { data: [...membros, eu] }) }))

    renderizarPagina()

    expect(await screen.findByRole('button', { name: 'Inativar Zé' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Inativar Lu' })).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Excluir Lu' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar Lu' })).toBeInTheDocument()
    expect(screen.getByText('Seu jogador')).toBeInTheDocument()
  })

  it('membro comum vê a marca de admin, mas não os botões nem o convite', async () => {
    simularApi(comMembros())

    renderizarPagina('MEMBER')

    expect(await screen.findByText('Admin')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /admin/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Adicionar pessoas')).not.toBeInTheDocument()
  })
})

describe('PlayersPage: nota do admin', () => {
  it('admin vê a nota de cada um e muda (inclusive meio ponto e "sem nota")', async () => {
    simularApi({
      'GET /api/grupos/1/players': () => resposta(200, { data: [{ ...ze, skill: 3.5 }, { ...beto, skill: null }] }),
      'PATCH /api/grupos/1/players/2/nota': () => resposta(200, { data: { id: 2, nickname: 'Beto', skill: 4.5 } }),
      'PATCH /api/grupos/1/players/1/nota': () => resposta(200, { data: { id: 1, nickname: 'Zé', skill: null } }),
    })
    renderizarPagina()

    expect(await screen.findByLabelText('Nota de Zé')).toHaveValue('3.5')
    expect(screen.getByLabelText('Nota de Beto')).toHaveValue('')
    expect(within(screen.getByLabelText('Nota de Zé')).getByRole('option', { name: '0,5' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nota de Beto'), { target: { value: '4.5' } })
    await waitFor(() => expect(chamadas()).toContain('PATCH /api/grupos/1/players/2/nota'))
    expect(corpoDaChamada('PATCH /api/grupos/1/players/2/nota')).toEqual({ skill: 4.5 })

    fireEvent.change(screen.getByLabelText('Nota de Zé'), { target: { value: '' } })
    await waitFor(() => expect(corpoDaChamada('PATCH /api/grupos/1/players/1/nota')).toEqual({ skill: null }))
  })

  it('membro não vê nota nenhuma', async () => {
    simularApi(listaCom(ze, beto))
    renderizarPagina('MEMBER')
    await screen.findByText('Zé')
    expect(screen.queryByLabelText(/Nota de/)).not.toBeInTheDocument()
  })
})
