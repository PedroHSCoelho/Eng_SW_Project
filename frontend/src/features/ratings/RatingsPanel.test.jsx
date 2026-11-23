import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import RatingsPanel from './RatingsPanel.jsx'

const DESTAQUE = { playerId: 2, nickname: 'Beto', average: 4.7, count: 3, goals: 1 }
const prazo = '2026-11-22T22:00:00.000Z'
const pendentes = (...ids) => ({
  open: true, deadline: prazo, pending: ids.map((playerId) => ({ playerId, nickname: `J${playerId}` })),
})

function resposta(status, corpo) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo }
}

// Simula a API por "MÉTODO url". Rota não configurada devolve 404.
function simularApi(rotas) {
  fetch.mockImplementation(async (url, opcoes = {}) => {
    const rota = rotas[`${opcoes.method ?? 'GET'} ${url}`]
    return rota ? rota(opcoes.body && JSON.parse(opcoes.body)) : resposta(404, { erro: 'Rota não encontrada' })
  })
}

const chamou = (chave) => fetch.mock.calls.some(([url, o]) => `${o?.method ?? 'GET'} ${url}` === chave)

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('RatingsPanel: destaque', () => {
  it('mostra o destaque da partida com média e gols', async () => {
    simularApi({ 'GET /api/matches/7/destaque': () => resposta(200, { data: DESTAQUE }) })

    render(<RatingsPanel matchId={7} podeAvaliar={false} />)

    expect(await screen.findByText(/Destaque da partida/)).toHaveTextContent('Beto (média 4.7, 1 gol)')
  })

  it('sem destaque explica a regra das 3 avaliações', async () => {
    simularApi({ 'GET /api/matches/7/destaque': () => resposta(200, { data: null }) })

    render(<RatingsPanel matchId={7} podeAvaliar={false} />)

    expect(await screen.findByText(/pelo menos 3 avaliações/)).toBeInTheDocument()
  })

  it('quem não jogou vê o destaque, mas não pede nem vê pendências', async () => {
    simularApi({ 'GET /api/matches/7/destaque': () => resposta(200, { data: DESTAQUE }) })

    render(<RatingsPanel matchId={7} podeAvaliar={false} />)
    await screen.findByText(/Destaque da partida/)

    expect(chamou('GET /api/matches/7/avaliacoes/pendentes')).toBe(false)
    expect(screen.queryByRole('button', { name: /Avaliar/ })).not.toBeInTheDocument()
  })
})

describe('RatingsPanel: avaliar', () => {
  const base = {
    'GET /api/matches/7/destaque': () => resposta(200, { data: null }),
    'GET /api/matches/7/avaliacoes/minhas': () => resposta(200, { data: [] }),
  }

  it('lista quem falta avaliar e avisa o prazo e o anonimato', async () => {
    simularApi({ ...base, 'GET /api/matches/7/avaliacoes/pendentes': () => resposta(200, { data: pendentes(2, 3) }) })

    render(<RatingsPanel matchId={7} podeAvaliar />)

    expect(await screen.findByText(/Faltam 2 jogadores/)).toBeInTheDocument()
    expect(screen.getByText(/Sua nota é anônima/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Avaliar J2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Avaliar J3' })).toBeInTheDocument()
  })

  it('só habilita "Avaliar" depois de escolher a nota', async () => {
    simularApi({ ...base, 'GET /api/matches/7/avaliacoes/pendentes': () => resposta(200, { data: pendentes(2) }) })
    render(<RatingsPanel matchId={7} podeAvaliar />)
    const botao = await screen.findByRole('button', { name: 'Avaliar J2' })
    expect(botao).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/Nota de J2/), { target: { value: '4' } })

    expect(botao).toBeEnabled()
  })

  it('envia ratedId, nota e comentário e depois some da lista de pendentes', async () => {
    let lista = pendentes(2, 3)
    simularApi({
      ...base,
      'GET /api/matches/7/avaliacoes/pendentes': () => resposta(200, { data: lista }),
      'PUT /api/matches/7/avaliacoes': (corpo) => {
        expect(corpo).toEqual({ ratedId: 2, score: 4, comment: 'jogou bem' })
        lista = pendentes(3) // a API passa a devolver só quem ainda falta
        return resposta(200, { data: { id: 1, matchId: 7, ratedId: 2, score: 4, comment: 'jogou bem' } })
      },
    })
    render(<RatingsPanel matchId={7} podeAvaliar />)
    await screen.findByText(/Faltam 2 jogadores/)

    fireEvent.change(screen.getByLabelText(/Nota de J2/), { target: { value: '4' } })
    fireEvent.change(screen.getAllByLabelText(/Comentário/)[0], { target: { value: 'jogou bem' } })
    fireEvent.click(screen.getByRole('button', { name: 'Avaliar J2' }))

    expect(await screen.findByText(/Falta 1 jogador/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Avaliar J2' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Avaliar J3' })).toBeInTheDocument()
  })

  it('quando avaliou todo mundo, mostra a confirmação', async () => {
    simularApi({ ...base, 'GET /api/matches/7/avaliacoes/pendentes': () => resposta(200, { data: pendentes() }) })

    render(<RatingsPanel matchId={7} podeAvaliar />)

    expect(await screen.findByText(/Você avaliou todos os jogadores/)).toBeInTheDocument()
  })

  it('depois do prazo avisa e não oferece formulário', async () => {
    simularApi({
      ...base,
      'GET /api/matches/7/avaliacoes/pendentes': () => resposta(200, { data: { open: false, deadline: prazo, pending: [] } }),
    })

    render(<RatingsPanel matchId={7} podeAvaliar />)

    expect(await screen.findByText(/prazo de avaliação desta partida terminou/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Avaliar/ })).not.toBeInTheDocument()
  })

  it('mostra o erro do back-end (ex.: prazo de 48h) e mantém a lista', async () => {
    simularApi({
      ...base,
      'GET /api/matches/7/avaliacoes/pendentes': () => resposta(200, { data: pendentes(2) }),
      'PUT /api/matches/7/avaliacoes': () => resposta(422, { erro: 'O prazo de 48 horas para avaliar esta partida acabou' }),
    })
    render(<RatingsPanel matchId={7} podeAvaliar />)
    await screen.findByText(/Faltam 1 jogador|Falta 1 jogador/)

    fireEvent.change(screen.getByLabelText(/Nota de J2/), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Avaliar J2' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('48 horas')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Avaliar J2' })).toBeInTheDocument())
  })
})

describe('RatingsPanel: editar minhas notas', () => {
  const destaqueNulo = { 'GET /api/matches/7/destaque': () => resposta(200, { data: null }) }
  const minha = { ratedId: 2, nickname: 'J2', score: 4, comment: 'jogou bem' }

  it('mostra a nota que já dei, com os valores preenchidos, e permite atualizar', async () => {
    let minhas = [minha]
    simularApi({
      ...destaqueNulo,
      'GET /api/matches/7/avaliacoes/pendentes': () => resposta(200, { data: pendentes() }),
      'GET /api/matches/7/avaliacoes/minhas': () => resposta(200, { data: minhas }),
      'PUT /api/matches/7/avaliacoes': (corpo) => {
        expect(corpo).toEqual({ ratedId: 2, score: 2, comment: 'mudei de ideia' })
        minhas = [{ ...minha, score: 2, comment: 'mudei de ideia' }]
        return resposta(200, { data: { id: 1, matchId: 7, ratedId: 2, score: 2, comment: 'mudei de ideia' } })
      },
    })
    render(<RatingsPanel matchId={7} podeAvaliar />)

    expect(await screen.findByText('Suas avaliações')).toBeInTheDocument()
    expect(screen.getByLabelText(/Nota de J2/)).toHaveValue('4')
    expect(screen.getByDisplayValue('jogou bem')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Nota de J2/), { target: { value: '2' } })
    fireEvent.change(screen.getByDisplayValue('jogou bem'), { target: { value: 'mudei de ideia' } })
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar nota de J2' }))

    // Depois de salvar, a linha reinicia com os valores que a API devolveu.
    await waitFor(() => expect(screen.getByLabelText(/Nota de J2/)).toHaveValue('2'))
    expect(screen.getByDisplayValue('mudei de ideia')).toBeInTheDocument()
  })

  it('depois do prazo as minhas notas aparecem só para leitura', async () => {
    simularApi({
      ...destaqueNulo,
      'GET /api/matches/7/avaliacoes/pendentes': () => resposta(200, { data: { open: false, deadline: prazo, pending: [] } }),
      'GET /api/matches/7/avaliacoes/minhas': () => resposta(200, { data: [minha] }),
    })

    render(<RatingsPanel matchId={7} podeAvaliar />)

    expect(await screen.findByText(/J2: nota 4 — jogou bem/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Atualizar/ })).not.toBeInTheDocument()
  })

  it('quem ainda não avaliou ninguém não vê a seção "Suas avaliações"', async () => {
    simularApi({
      ...destaqueNulo,
      'GET /api/matches/7/avaliacoes/pendentes': () => resposta(200, { data: pendentes(2) }),
      'GET /api/matches/7/avaliacoes/minhas': () => resposta(200, { data: [] }),
    })

    render(<RatingsPanel matchId={7} podeAvaliar />)
    await screen.findByText(/Falta 1 jogador/)

    expect(screen.queryByText('Suas avaliações')).not.toBeInTheDocument()
  })
})
