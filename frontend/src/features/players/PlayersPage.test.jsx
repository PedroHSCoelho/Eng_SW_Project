import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import PlayersPage from './PlayersPage.jsx'
import { AuthContext } from '../auth/AuthContext.jsx'

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

const listaCom = (...jogadores) => ({ 'GET /api/players': () => resposta(200, { data: jogadores }) })

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
    <AuthContext.Provider value={{ usuario: { id: 1, role: papel }, carregando: false }}>
      <PlayersPage />
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

      renderizarPagina()

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

      await waitFor(() => expect(chamadas()).toContain('GET /api/players?busca=ze'))
    })

    it('pede só jogadores ativos quando o filtro é marcado', async () => {
      simularApi()
      renderizarPagina()
      await screen.findByText('Nenhum jogador encontrado.')

      fireEvent.click(screen.getByLabelText('Mostrar só ativos'))

      await waitFor(() => expect(chamadas()).toContain('GET /api/players?ativos=true'))
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
      simularApi({ 'POST /api/players': () => resposta(201, { data: ze }) })
      renderizarPagina()
      await screen.findByText('Nenhum jogador encontrado.')

      preencher({ nome: 'José da Silva', apelido: 'Zé', posicao: 'FORWARD' })
      fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }))

      await waitFor(() =>
        expect(chamadas().filter((c) => c === 'GET /api/players')).toHaveLength(2),
      )
      expect(corpoDaChamada('POST /api/players')).toEqual({
        name: 'José da Silva',
        nickname: 'Zé',
        position: 'FORWARD',
      })
      expect(screen.getByLabelText('Nome')).toHaveValue('')
    })

    it('mostra o erro do back-end e mantém o que foi digitado', async () => {
      simularApi({
        'POST /api/players': () => resposta(422, { erro: 'Apelido já está em uso' }),
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
        'PUT /api/players/1': () => resposta(200, { data: ze }),
      })
      renderizarPagina()
      await screen.findByText('Zé')

      fireEvent.click(screen.getByRole('button', { name: 'Editar Zé' }))

      expect(screen.getByText('Editar jogador')).toBeInTheDocument()
      expect(screen.getByLabelText('Nome')).toHaveValue('José da Silva')
      fireEvent.change(screen.getByLabelText('Apelido'), { target: { value: 'Zezinho' } })
      fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

      await waitFor(() => expect(chamadas()).toContain('PUT /api/players/1'))
      expect(corpoDaChamada('PUT /api/players/1')).toEqual({
        name: 'José da Silva',
        nickname: 'Zezinho',
        position: 'FORWARD',
      })
      await waitFor(() => expect(screen.getByText('Novo jogador')).toBeInTheDocument())
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
        'PATCH /api/players/1/inativar': () => resposta(200, { data: { ...ze, active: false } }),
      })
      renderizarPagina()
      await screen.findByText('Zé')

      fireEvent.click(screen.getByRole('button', { name: 'Inativar Zé' }))
      expect(chamadas()).not.toContain('PATCH /api/players/1/inativar')

      fireEvent.click(screen.getByRole('button', { name: 'Confirmar inativação de Zé' }))
      await waitFor(() => expect(chamadas()).toContain('PATCH /api/players/1/inativar'))
    })

    it('permite desistir da inativação', async () => {
      simularApi(listaCom(ze))
      renderizarPagina()
      await screen.findByText('Zé')

      fireEvent.click(screen.getByRole('button', { name: 'Inativar Zé' }))
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar inativação de Zé' }))

      expect(screen.getByRole('button', { name: 'Inativar Zé' })).toBeInTheDocument()
      expect(chamadas()).not.toContain('PATCH /api/players/1/inativar')
    })

    it('não oferece inativar para quem já está inativo', async () => {
      simularApi(listaCom(beto))
      renderizarPagina()
      await screen.findByText('Beto')

      expect(screen.queryByRole('button', { name: 'Inativar Beto' })).not.toBeInTheDocument()
    })
  })

  describe('exclusão', () => {
    it('só exclui depois de confirmar', async () => {
      simularApi({
        ...listaCom(ze),
        'DELETE /api/players/1': () => resposta(204),
      })
      renderizarPagina()
      await screen.findByText('Zé')

      fireEvent.click(screen.getByRole('button', { name: 'Excluir Zé' }))
      expect(chamadas()).not.toContain('DELETE /api/players/1')

      fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão de Zé' }))
      await waitFor(() => expect(chamadas()).toContain('DELETE /api/players/1'))
    })

    it('mostra o motivo quando o back-end recusa a exclusão', async () => {
      simularApi({
        ...listaCom(ze),
        'DELETE /api/players/1': () =>
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
