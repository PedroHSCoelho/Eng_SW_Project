import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import DrawPage from './DrawPage.jsx'
import { definirGrupoAtual } from '../../../api/grupoAtual.js'

// As APIs montam as URLs com o grupo atual: nos testes, o grupo 1.
beforeEach(() => definirGrupoAtual(1))

const jogadores = [1, 2, 3, 4, 5, 6, 7].map((id) => ({
  id, name: `Jogador ${id}`, nickname: `J${id}`, position: id === 1 ? 'GOALKEEPER' : 'MIDFIELDER', active: true,
}))

const time = (ids, strength) => ({
  strength,
  players: ids.map((id) => ({ id, nickname: `J${id}`, position: id === 1 ? 'GOALKEEPER' : 'MIDFIELDER', strength: 3 })),
})
const sorteado = { teamA: time([1, 2, 3], 3.2), teamB: time([4, 5, 6], 3), difference: 0.2 }

function resposta(status, corpo) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo }
}

// Simula a API por "MÉTODO url". Rota não configurada devolve 404.
function simularApi(rotas = {}) {
  fetch.mockImplementation(async (url, opcoes = {}) => {
    const chave = `${opcoes.method ?? 'GET'} ${url}`
    if (chave === 'GET /api/grupos/1/players?ativos=true') return resposta(200, { data: jogadores })
    const rota = rotas[chave]
    return rota ? rota(opcoes.body && JSON.parse(opcoes.body)) : resposta(404, { erro: 'Rota não encontrada' })
  })
}

const renderizar = () =>
  render(
    <MemoryRouter initialEntries={['/sorteio']}>
      <Routes>
        <Route path="/sorteio" element={<DrawPage />} />
        <Route path="/partidas/:id" element={<p>Súmula aberta</p>} />
      </Routes>
    </MemoryRouter>,
  )

const marcar = (...ids) => ids.forEach((id) => fireEvent.click(screen.getByLabelText(new RegExp(`^J${id}\\b`))))

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('DrawPage: escolher quem joga', () => {
  it('lista os jogadores ativos com posição e começa com 0 selecionados', async () => {
    simularApi()
    renderizar()

    expect(await screen.findByLabelText(/^J1\b/)).toBeInTheDocument()
    expect(screen.getByText(/Goleiro/)).toBeInTheDocument()
    expect(screen.getByText(/0 selecionados \(de 6 a 22: 3 a 11 por time\)/)).toBeInTheDocument()
  })

  it('só habilita "Sortear" com pelo menos 6 selecionados', async () => {
    simularApi()
    renderizar()
    await screen.findByLabelText(/^J1\b/)

    marcar(1, 2, 3, 4, 5)
    expect(screen.getByRole('button', { name: 'Sortear times' })).toBeDisabled()
    expect(screen.getByText(/5 selecionados/)).toBeInTheDocument()

    marcar(6)
    expect(screen.getByRole('button', { name: 'Sortear times' })).toBeEnabled()
  })

  it('avisa quando não há jogadores ativos', async () => {
    fetch.mockImplementation(async () => resposta(200, { data: [] }))
    renderizar()
    expect(await screen.findByText(/Cadastre jogadores ativos/)).toBeInTheDocument()
  })
})

describe('DrawPage: sorteio', () => {
  it('envia os ids marcados e mostra os dois times com força e diferença', async () => {
    simularApi({
      'POST /api/grupos/1/sorteio': (corpo) => {
        expect(corpo.playerIds.sort()).toEqual([1, 2, 3, 4, 5, 6])
        return resposta(200, { data: sorteado })
      },
    })
    renderizar()
    await screen.findByLabelText(/^J1\b/)
    marcar(1, 2, 3, 4, 5, 6)

    fireEvent.click(screen.getByRole('button', { name: 'Sortear times' }))

    expect(await screen.findByText('Times sugeridos')).toBeInTheDocument()
    expect(screen.getByText(/Time A/)).toBeInTheDocument()
    expect(screen.getByText('(força média 3.20)')).toBeInTheDocument()
    expect(screen.getByText('Diferença de força entre os times: 0.20')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sortear de novo' })).toBeInTheDocument()
  })

  it('mudar quem está presente descarta o sorteio anterior', async () => {
    simularApi({ 'POST /api/grupos/1/sorteio': () => resposta(200, { data: sorteado }) })
    renderizar()
    await screen.findByLabelText(/^J1\b/)
    marcar(1, 2, 3, 4, 5, 6)
    fireEvent.click(screen.getByRole('button', { name: 'Sortear times' }))
    await screen.findByText('Times sugeridos')

    marcar(7)

    expect(screen.queryByText('Times sugeridos')).not.toBeInTheDocument()
  })

  it('mostra o erro do back-end (ex.: jogador inativo)', async () => {
    simularApi({ 'POST /api/grupos/1/sorteio': () => resposta(422, { erro: 'Jogador inativo não pode ser sorteado: J7' }) })
    renderizar()
    await screen.findByLabelText(/^J1\b/)
    marcar(1, 2, 3, 4, 5, 6)

    fireEvent.click(screen.getByRole('button', { name: 'Sortear times' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Jogador inativo')
    expect(screen.queryByText('Times sugeridos')).not.toBeInTheDocument()
  })
})

describe('DrawPage: usar o sorteio', () => {
  async function ateOResultado(rotas) {
    simularApi({ 'POST /api/grupos/1/sorteio': () => resposta(200, { data: sorteado }), ...rotas })
    renderizar()
    await screen.findByLabelText(/^J1\b/)
    marcar(1, 2, 3, 4, 5, 6)
    fireEvent.click(screen.getByRole('button', { name: 'Sortear times' }))
    await screen.findByText('Times sugeridos')
    fireEvent.change(screen.getByLabelText('Data e hora'), { target: { value: '2026-11-20T19:00' } })
    fireEvent.change(screen.getByLabelText('Local'), { target: { value: 'Quadra da UNIFESP' } })
  }

  it('cria a partida, escala os times sorteados e abre a súmula', async () => {
    const ordem = []
    await ateOResultado({
      'POST /api/grupos/1/matches': (corpo) => {
        ordem.push('criar')
        expect(corpo.location).toBe('Quadra da UNIFESP')
        expect(corpo.date).toBe(new Date('2026-11-20T19:00').toISOString())
        return resposta(201, { data: { id: 9 } })
      },
      'PUT /api/grupos/1/matches/9/escalacao': (corpo) => {
        ordem.push('escalar')
        expect(corpo).toEqual({ teamA: [1, 2, 3], teamB: [4, 5, 6] })
        return resposta(200, { data: { id: 9 } })
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Criar partida com estes times' }))

    expect(await screen.findByText('Súmula aberta')).toBeInTheDocument()
    expect(ordem).toEqual(['criar', 'escalar'])
  })

  it('se a escalação falhar depois de criar a partida, avisa e oferece abrir a partida', async () => {
    await ateOResultado({
      'POST /api/grupos/1/matches': () => resposta(201, { data: { id: 9 } }),
      'PUT /api/grupos/1/matches/9/escalacao': () => resposta(422, { erro: 'Jogador inativo não pode ser escalado: J3' }),
    })

    fireEvent.click(screen.getByRole('button', { name: 'Criar partida com estes times' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Jogador inativo não pode ser escalado')
    expect(screen.getByRole('link', { name: 'Abrir a partida #9' })).toHaveAttribute('href', '/partidas/9')
    expect(screen.queryByText('Súmula aberta')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Criar partida com estes times' })).toBeEnabled())
  })
})
