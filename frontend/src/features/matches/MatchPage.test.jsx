import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import MatchPage from './MatchPage.jsx'
import { AuthContext } from '../auth/AuthContext.jsx'

const jogadores = [1, 2, 3, 4, 5, 6].map((id) => ({
  id, name: `Jogador ${id}`, nickname: `J${id}`, position: 'MIDFIELDER', active: true,
}))

const escalacao = [
  ...[1, 2, 3].map((playerId) => ({ playerId, team: 'A', player: { id: playerId, nickname: `J${playerId}` } })),
  ...[4, 5, 6].map((playerId) => ({ playerId, team: 'B', player: { id: playerId, nickname: `J${playerId}` } })),
]

// Partida como o back-end devolve: sempre com `score` calculado.
const partida = (extra = {}) => ({
  id: 7, date: '2026-11-20T22:00:00.000Z', location: 'Quadra da UNIFESP', status: 'SCHEDULED', result: null,
  players: [], goals: [], score: { A: 0, B: 0 }, ...extra,
})
const gol = (id, scorer, extra = {}) => ({
  id, scorerId: scorer, assistId: null, team: 'A', ownGoal: false, minute: null,
  scorer: { id: scorer, nickname: `J${scorer}` }, assist: null, ...extra,
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

const comJogadores = { 'GET /api/players?ativos=true': () => resposta(200, { data: jogadores }) }
const partidaNaApi = (p) => ({ 'GET /api/matches/7': () => resposta(200, { data: p }) })
const chamou = (chave) => fetch.mock.calls.some(([url, o]) => `${o?.method ?? 'GET'} ${url}` === chave)

function renderizar(papel = 'ORGANIZER', playerId = null) {
  return render(
    <AuthContext.Provider value={{ usuario: { id: 1, role: papel, playerId }, carregando: false }}>
      <MemoryRouter initialEntries={['/partidas/7']}>
        <Routes>
          <Route path="/partidas/:id" element={<MatchPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

const escolherTime = (apelido, time) =>
  fireEvent.change(screen.getByLabelText(apelido), { target: { value: time } })

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('MatchPage: partida agendada (escalação)', () => {
  it('monta os times, salva a escalação e só então libera o início', async () => {
    const salva = partida({ players: escalacao })
    simularApi({
      ...comJogadores,
      ...partidaNaApi(partida()),
      'PUT /api/matches/7/escalacao': (corpo) => {
        expect(corpo).toEqual({ teamA: [1, 2, 3], teamB: [4, 5, 6] })
        return resposta(200, { data: salva })
      },
    })
    renderizar()
    await screen.findByText('Escalação')

    expect(screen.getByRole('button', { name: 'Salvar escalação' })).toBeDisabled() // nada mudou
    ;[1, 2, 3].forEach((n) => escolherTime(`J${n}`, 'A'))
    ;[4, 5, 6].forEach((n) => escolherTime(`J${n}`, 'B'))

    expect(screen.getByText(/Time A: 3 · Time B: 3/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar partida' })).toBeDisabled()
    expect(screen.getByText('Salve a escalação antes de iniciar.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Salvar escalação' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Iniciar partida' })).toBeEnabled())
  })

  it('mostra o erro do back-end (ex.: menos de 3 por time) e mantém a tela', async () => {
    simularApi({
      ...comJogadores,
      ...partidaNaApi(partida({ players: escalacao.slice(0, 2) })),
      'PATCH /api/matches/7/iniciar': () =>
        resposta(422, { erro: 'Cada time precisa de pelo menos 3 jogadores para a partida começar (time A tem 2)' }),
    })
    renderizar()
    await screen.findByText('Escalação')

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar partida' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('pelo menos 3 jogadores')
    expect(screen.getByText('Escalação')).toBeInTheDocument()
  })

  it('iniciar abre o formulário de gol com o placar 0 x 0', async () => {
    simularApi({
      ...comJogadores,
      ...partidaNaApi(partida({ players: escalacao })),
      'PATCH /api/matches/7/iniciar': () => resposta(200, { data: partida({ status: 'IN_PROGRESS', players: escalacao }) }),
    })
    renderizar()
    await screen.findByText('Escalação')

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar partida' }))

    expect(await screen.findByRole('heading', { name: 'Lançar gol' })).toBeInTheDocument()
    expect(screen.getByLabelText('Placar')).toHaveTextContent('Time A 0 x 0 Time B')
    expect(screen.getByText('Em andamento')).toBeInTheDocument()
  })
})

describe('MatchPage: partida em andamento (súmula)', () => {
  const emAndamento = partida({ status: 'IN_PROGRESS', players: escalacao })

  it('lança um gol e o placar muda na hora, com a assistência na lista', async () => {
    simularApi({
      ...comJogadores,
      ...partidaNaApi(emAndamento),
      'POST /api/matches/7/gols': (corpo) => {
        expect(corpo).toEqual({ scorerId: 1, ownGoal: false, assistId: 2, minute: 10 })
        return resposta(201, {
          data: { ...emAndamento, score: { A: 1, B: 0 }, goals: [gol(1, 1, { assistId: 2, assist: { id: 2, nickname: 'J2' }, minute: 10 })] },
        })
      },
    })
    renderizar()
    await screen.findByRole('heading', { name: 'Lançar gol' })

    fireEvent.change(screen.getByLabelText('Autor'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Assistência'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Minuto (opcional)'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lançar gol' }))

    expect(await screen.findByText(/assistência de J2/)).toBeInTheDocument()
    expect(screen.getByLabelText('Placar')).toHaveTextContent('Time A 1 x 0 Time B')
    expect(screen.getByLabelText('Autor')).toHaveValue('') // formulário limpo para o próximo gol
  })

  it('a assistência só oferece colegas do mesmo time do autor (nunca o próprio autor)', async () => {
    simularApi({ ...comJogadores, ...partidaNaApi(emAndamento) })
    renderizar()
    await screen.findByRole('heading', { name: 'Lançar gol' })

    fireEvent.change(screen.getByLabelText('Autor'), { target: { value: '1' } }) // J1, Time A

    const opcoes = within(screen.getByLabelText('Assistência')).getAllByRole('option').map((o) => o.textContent)
    expect(opcoes).toEqual(['Sem assistência', 'J2', 'J3'])
  })

  it('gol contra desabilita e limpa a assistência', async () => {
    simularApi({ ...comJogadores, ...partidaNaApi(emAndamento) })
    renderizar()
    await screen.findByRole('heading', { name: 'Lançar gol' })
    fireEvent.change(screen.getByLabelText('Autor'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Assistência'), { target: { value: '2' } })

    fireEvent.click(screen.getByLabelText('Gol contra'))

    expect(screen.getByLabelText('Assistência')).toBeDisabled()
    expect(screen.getByLabelText('Assistência')).toHaveValue('')
  })

  it('remove um gol lançado errado', async () => {
    const comGol = { ...emAndamento, score: { A: 1, B: 0 }, goals: [gol(5, 1)] }
    simularApi({
      ...comJogadores,
      ...partidaNaApi(comGol),
      'DELETE /api/matches/7/gols/5': () => resposta(200, { data: emAndamento }),
    })
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Remover gol de J1' }))

    expect(await screen.findByText('Nenhum gol lançado.')).toBeInTheDocument()
    expect(screen.getByLabelText('Placar')).toHaveTextContent('Time A 0 x 0 Time B')
  })

  it('encerrar pede confirmação (nada é enviado no primeiro clique) e depois bloqueia a súmula', async () => {
    const comGol = { ...emAndamento, score: { A: 1, B: 0 }, goals: [gol(5, 1)] }
    simularApi({
      ...comJogadores,
      ...partidaNaApi(comGol),
      'PATCH /api/matches/7/encerrar': () =>
        resposta(200, { data: { ...comGol, status: 'FINISHED', result: 'A_WINS' } }),
    })
    renderizar()
    await screen.findByRole('heading', { name: 'Lançar gol' })

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar partida' }))
    expect(screen.getByText(/Encerrar com o placar 1 x 0/)).toBeInTheDocument()
    expect(chamou('PATCH /api/matches/7/encerrar')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar encerramento' }))

    expect(await screen.findByText(/Vitória do Time A/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Lançar gol' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remover gol/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Encerrar partida' })).not.toBeInTheDocument()
  })

  it('cancelar a confirmação não encerra', async () => {
    simularApi({ ...comJogadores, ...partidaNaApi(emAndamento) })
    renderizar()
    await screen.findByRole('heading', { name: 'Lançar gol' })

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar partida' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByRole('button', { name: 'Encerrar partida' })).toBeInTheDocument()
    expect(chamou('PATCH /api/matches/7/encerrar')).toBe(false)
  })
})

describe('MatchPage: partida finalizada e jogador comum', () => {
  it('finalizada: só leitura (sem formulários nem botões de ação)', async () => {
    simularApi({
      ...comJogadores,
      ...partidaNaApi(partida({ status: 'FINISHED', result: 'DRAW', players: escalacao, goals: [gol(1, 1), gol(2, 4, { team: 'B' })], score: { A: 1, B: 1 } })),
    })
    renderizar()

    expect(await screen.findByText(/Empate/)).toBeInTheDocument()
    expect(screen.getByText(/súmula encerrada/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('jogador comum vê os times e os gols, mas sem editor, formulário ou botões', async () => {
    simularApi({ ...partidaNaApi(partida({ status: 'IN_PROGRESS', players: escalacao, goals: [gol(1, 1)], score: { A: 1, B: 0 } })) })
    renderizar('PLAYER')

    expect(await screen.findByText('Time A')).toBeInTheDocument()
    expect(screen.getByText('J4')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Lançar gol' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(chamou('GET /api/players?ativos=true')).toBe(false) // nem busca a lista de jogadores
  })

  const finalizada = partida({ status: 'FINISHED', result: 'A_WINS', players: escalacao, score: { A: 1, B: 0 } })
  const apiDeAvaliacoes = {
    'GET /api/matches/7/destaque': () => resposta(200, { data: null }),
    'GET /api/matches/7/avaliacoes/minhas': () => resposta(200, { data: [] }),
    'GET /api/matches/7/avaliacoes/pendentes': () =>
      resposta(200, { data: { open: true, deadline: '2026-11-22T22:00:00.000Z', pending: [{ playerId: 2, nickname: 'J2' }] } }),
  }

  it('finalizada: quem jogou vê o painel de avaliações com quem falta avaliar', async () => {
    simularApi({ ...partidaNaApi(finalizada), ...apiDeAvaliacoes })
    renderizar('PLAYER', 1) // jogador 1 jogou esta partida

    expect(await screen.findByRole('button', { name: 'Avaliar J2' })).toBeInTheDocument()
  })

  it('finalizada: quem não jogou (ex.: organizador sem jogador) vê o painel, mas sem poder avaliar', async () => {
    simularApi({ ...comJogadores, ...partidaNaApi(finalizada), ...apiDeAvaliacoes })
    renderizar('ORGANIZER', null)

    expect(await screen.findByRole('heading', { name: /Avaliações/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Avaliar/ })).not.toBeInTheDocument()
    expect(chamou('GET /api/matches/7/avaliacoes/pendentes')).toBe(false)
  })

  it('partida ainda não finalizada não mostra avaliações', async () => {
    simularApi({ ...partidaNaApi(partida({ status: 'IN_PROGRESS', players: escalacao })) })
    renderizar('PLAYER', 1)

    expect(await screen.findByText('Time A')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Avaliações/ })).not.toBeInTheDocument()
  })

  it('partida inexistente mostra o erro da API', async () => {
    simularApi({ 'GET /api/matches/7': () => resposta(404, { erro: 'Partida não encontrada' }) })
    renderizar('PLAYER')

    expect(await screen.findByRole('alert')).toHaveTextContent('Partida não encontrada')
  })
})

// Mesmo formato do campo "datetime-local" (hora do navegador) que o formulário usa.
const comoCampoLocal = (iso) => {
  const d = new Date(iso)
  const dois = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}T${dois(d.getHours())}:${dois(d.getMinutes())}`
}

describe('MatchPage: editar data e local (partida agendada)', () => {
  it('mostra os valores atuais e só habilita "Salvar" depois de mudar algo', async () => {
    simularApi({ ...comJogadores, ...partidaNaApi(partida()) })
    renderizar()
    await screen.findByText('Data e local')

    expect(screen.getByLabelText('Data e hora')).toHaveValue(comoCampoLocal('2026-11-20T22:00:00.000Z'))
    expect(screen.getByLabelText('Local')).toHaveValue('Quadra da UNIFESP')
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Local'), { target: { value: 'Quadra nova' } })

    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled()
  })

  it('envia a data em ISO e o local, e mostra os valores novos', async () => {
    simularApi({
      ...comJogadores,
      ...partidaNaApi(partida()),
      'PUT /api/matches/7': (corpo) => {
        expect(corpo).toEqual({ date: new Date('2026-12-05T19:00').toISOString(), location: 'Quadra nova' })
        return resposta(200, { data: partida({ date: corpo.date, location: corpo.location }) })
      },
    })
    renderizar()
    await screen.findByText('Data e local')

    fireEvent.change(screen.getByLabelText('Data e hora'), { target: { value: '2026-12-05T19:00' } })
    fireEvent.change(screen.getByLabelText('Local'), { target: { value: 'Quadra nova' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText(/Quadra nova/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled())
  })

  it('mostra o erro do back-end (ex.: local curto) e mantém o que foi digitado', async () => {
    simularApi({
      ...comJogadores,
      ...partidaNaApi(partida()),
      'PUT /api/matches/7': () => resposta(400, { erro: 'Local deve ter de 2 a 100 caracteres' }),
    })
    renderizar()
    await screen.findByText('Data e local')

    fireEvent.change(screen.getByLabelText('Local'), { target: { value: 'ok' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Local deve ter de 2 a 100')
    expect(screen.getByLabelText('Local')).toHaveValue('ok')
  })

  it('não aparece com a partida em andamento nem para jogador comum', async () => {
    simularApi({ ...comJogadores, ...partidaNaApi(partida({ status: 'IN_PROGRESS', players: escalacao })) })
    renderizar()
    await screen.findByRole('heading', { name: 'Lançar gol' })
    expect(screen.queryByText('Data e local')).not.toBeInTheDocument()
    cleanup()

    simularApi({ ...partidaNaApi(partida()) })
    renderizar('PLAYER')
    await screen.findByText('Time A')
    expect(screen.queryByText('Data e local')).not.toBeInTheDocument()
  })
})

describe('MatchPage: cancelar partida', () => {
  it('pede confirmação (nada é enviado no primeiro clique) e depois bloqueia tudo', async () => {
    simularApi({
      ...comJogadores,
      ...partidaNaApi(partida({ players: escalacao })),
      'PATCH /api/matches/7/cancelar': () => resposta(200, { data: partida({ status: 'CANCELED', players: escalacao }) }),
    })
    renderizar()
    await screen.findByText('Escalação')

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar partida' }))
    expect(screen.getByText(/Cancelar esta partida\?/)).toBeInTheDocument()
    expect(chamou('PATCH /api/matches/7/cancelar')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))

    expect(await screen.findByText(/Esta partida foi cancelada/)).toBeInTheDocument()
    expect(screen.getByText('Cancelada')).toBeInTheDocument() // selo de status
    expect(screen.queryByText('Escalação')).not.toBeInTheDocument()
    expect(screen.queryByText('Data e local')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('"Voltar" desiste do cancelamento', async () => {
    simularApi({ ...comJogadores, ...partidaNaApi(partida({ players: escalacao })) })
    renderizar()
    await screen.findByText('Escalação')

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar partida' }))
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(screen.getByRole('button', { name: 'Cancelar partida' })).toBeInTheDocument()
    expect(chamou('PATCH /api/matches/7/cancelar')).toBe(false)
  })

  it('também dá para cancelar uma partida em andamento', async () => {
    simularApi({
      ...comJogadores,
      ...partidaNaApi(partida({ status: 'IN_PROGRESS', players: escalacao })),
      'PATCH /api/matches/7/cancelar': () => resposta(200, { data: partida({ status: 'CANCELED', players: escalacao }) }),
    })
    renderizar()
    await screen.findByRole('heading', { name: 'Lançar gol' })

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar partida' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))

    expect(await screen.findByText(/Esta partida foi cancelada/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Placar')).not.toBeInTheDocument()
  })

  it('mostra o erro do back-end (ex.: já foi encerrada por outra pessoa)', async () => {
    simularApi({
      ...comJogadores,
      ...partidaNaApi(partida({ players: escalacao })),
      'PATCH /api/matches/7/cancelar': () => resposta(422, { erro: 'Uma partida finalizada não pode ser cancelada' }),
    })
    renderizar()
    await screen.findByText('Escalação')

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar partida' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('finalizada não pode ser cancelada')
  })

  it('não há botão de cancelar para partida finalizada, cancelada ou para jogador comum', async () => {
    simularApi({ ...comJogadores, ...partidaNaApi(partida({ status: 'FINISHED', result: 'DRAW', players: escalacao })) })
    renderizar()
    await screen.findByText(/Empate/)
    expect(screen.queryByRole('button', { name: 'Cancelar partida' })).not.toBeInTheDocument()
    cleanup()

    simularApi({ ...partidaNaApi(partida({ players: escalacao })) })
    renderizar('PLAYER')
    await screen.findByText('Time A')
    expect(screen.queryByRole('button', { name: 'Cancelar partida' })).not.toBeInTheDocument()
  })
})
