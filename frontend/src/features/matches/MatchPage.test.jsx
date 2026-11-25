import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import MatchPage from './MatchPage.jsx'
import { AuthContext } from '../auth/AuthContext.jsx'
import { GrupoFixo } from '../groups/GrupoContext.jsx'

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

const comJogadores = { 'GET /api/grupos/1/players?ativos=true': () => resposta(200, { data: jogadores }) }
const partidaNaApi = (p) => ({ 'GET /api/grupos/1/matches/7': () => resposta(200, { data: p }) })
const chamou = (chave) => fetch.mock.calls.some(([url, o]) => `${o?.method ?? 'GET'} ${url}` === chave)

function renderizar(papel = 'ORGANIZER', playerId = null) {
  return render(
    <AuthContext.Provider value={{ usuario: { id: 1 }, carregando: false }}>
      <GrupoFixo grupo={{ id: 1, name: 'Grupo de teste', myRole: papel, myPlayerId: playerId ?? null }}>
        <MemoryRouter initialEntries={['/partidas/7']}>
          <Routes>
            <Route path="/partidas/:id" element={<MatchPage />} />
          </Routes>
        </MemoryRouter>
      </GrupoFixo>
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
  it('agrupa a escalação em colunas, uma por time, e o botão troca a cor do time', async () => {
    simularApi({ ...comJogadores, ...partidaNaApi(partida({ teamNames: { A: 'Azul' } })) })
    renderizar()
    await screen.findByText('Escalação')

    escolherTime('J1', 'A')
    escolherTime('J2', 'B')
    const azul = screen.getByRole('region', { name: 'Azul' })
    expect(within(azul).getByLabelText('J1')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Time B' })).getByLabelText('J2')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Fora dos times' })).getByLabelText('J3')).toBeInTheDocument()

    const cor = screen.getByRole('button', { name: 'Mudar a cor de Azul' })
    expect(cor).toHaveAttribute('title', 'Cor: Azul (clique para trocar)')
    fireEvent.click(cor)
    expect(cor).toHaveAttribute('title', 'Cor: Laranja (clique para trocar)')
  })

  it('monta os times, salva a escalação e só então libera o início', async () => {
    const salva = partida({ players: escalacao })
    simularApi({
      ...comJogadores,
      ...partidaNaApi(partida()),
      'PUT /api/grupos/1/matches/7/escalacao': (corpo) => {
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
      'PATCH /api/grupos/1/matches/7/iniciar': () =>
        resposta(422, { erro: 'Cada time precisa de pelo menos 3 jogadores para a partida começar (time A tem 2)' }),
    })
    renderizar()
    await screen.findByText('Escalação')

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar partida' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('pelo menos 3 jogadores')
    expect(screen.getByText('Escalação')).toBeInTheDocument()
  })

  it('iniciar abre a súmula ao vivo (box por jogador) com o placar 0 x 0', async () => {
    simularApi({
      ...comJogadores,
      ...partidaNaApi(partida({ players: escalacao })),
      'PATCH /api/grupos/1/matches/7/iniciar': () => resposta(200, { data: partida({ status: 'IN_PROGRESS', players: escalacao }) }),
    })
    renderizar()
    await screen.findByText('Escalação')

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar partida' }))

    expect(await screen.findByRole('button', { name: 'Lances de J1' })).toBeInTheDocument()
    expect(screen.getByLabelText('Placar')).toHaveTextContent('Time A 0 x 0 Time B')
    expect(screen.getByText('Em andamento')).toBeInTheDocument()
  })
})

describe('MatchPage: partida em andamento (súmula)', () => {
  const emAndamento = partida({ status: 'IN_PROGRESS', players: escalacao })

  it('clica no jogador, escolhe Gol e a assistência: o placar muda na hora e o painel fecha', async () => {
    simularApi({
      ...comJogadores,
      ...partidaNaApi(emAndamento),
      'POST /api/grupos/1/matches/7/gols': (corpo) => {
        expect(corpo).toEqual({ scorerId: 1, assistId: 2, minute: 10 })
        return resposta(201, {
          data: { ...emAndamento, score: { A: 1, B: 0 }, goals: [gol(1, 1, { assistId: 2, assist: { id: 2, nickname: 'J2' }, minute: 10 })] },
        })
      },
    })
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Lances de J1' }))

    const painel = screen.getByRole('dialog', { name: 'J1' })
    fireEvent.change(within(painel).getByLabelText('Minuto (opcional)'), { target: { value: '10' } })
    fireEvent.click(within(painel).getByRole('button', { name: /Gol$/ }))
    // A assistência só oferece colegas do MESMO time (nunca o próprio autor).
    const opcoes = within(painel).getAllByRole('button').map((b) => b.textContent)
    expect(opcoes).toEqual(expect.arrayContaining(['J2', 'J3', 'Sem assistência']))
    expect(opcoes).not.toContain('J4')
    fireEvent.click(within(painel).getByRole('button', { name: 'J2' }))

    expect(await screen.findByText(/assistência de J2/)).toBeInTheDocument()
    expect(screen.getByLabelText('Placar')).toHaveTextContent('Time A 1 x 0 Time B')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lances de J1' })).toHaveTextContent('1 gol(s)')
  })

  it('Assistência pergunta quem fez o gol e lança o gol do colega', async () => {
    simularApi({
      ...comJogadores,
      ...partidaNaApi(emAndamento),
      'POST /api/grupos/1/matches/7/gols': (corpo) => {
        expect(corpo).toEqual({ scorerId: 3, assistId: 1 })
        return resposta(201, { data: { ...emAndamento, score: { A: 1, B: 0 }, goals: [gol(1, 3, { assistId: 1, assist: { id: 1, nickname: 'J1' } })] } })
      },
    })
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Lances de J1' }))
    fireEvent.click(screen.getByRole('button', { name: /Assistência/ }))
    expect(screen.getByText('Assistência de J1. Quem fez o gol?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'J3' }))

    expect(await screen.findByText(/assistência de J1/)).toBeInTheDocument()
  })

  it('cartão amarelo vai para a API e aparece no box e na lista de lances', async () => {
    const amarelo = { id: 9, playerId: 4, type: 'YELLOW_CARD', minute: null, player: { id: 4, nickname: 'J4' } }
    simularApi({
      ...comJogadores,
      ...partidaNaApi(emAndamento),
      'POST /api/grupos/1/matches/7/lances': (corpo) => {
        expect(corpo).toEqual({ type: 'YELLOW_CARD', playerId: 4 })
        return resposta(201, { data: { ...emAndamento, events: [amarelo] } })
      },
      'DELETE /api/grupos/1/matches/7/lances/9': () => resposta(200, { data: { ...emAndamento, events: [] } }),
    })
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Lances de J4' }))
    fireEvent.click(screen.getByRole('button', { name: /Amarelo/ }))

    expect(await screen.findByText('Cartões e defesas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lances de J4' })).toHaveTextContent('cartão amarelo')

    fireEvent.click(screen.getByRole('button', { name: 'Remover cartão amarelo de J4' }))
    await waitFor(() => expect(screen.queryByText('Cartões e defesas')).not.toBeInTheDocument())
  })

  it('goleiro tem Defesa difícil no lugar da assistência', async () => {
    const comGoleiro = {
      ...emAndamento,
      players: escalacao.map((p) => (p.playerId === 4 ? { ...p, player: { ...p.player, position: 'GOALKEEPER' } } : p)),
    }
    simularApi({
      ...comJogadores,
      ...partidaNaApi(comGoleiro),
      'POST /api/grupos/1/matches/7/lances': (corpo) => {
        expect(corpo).toEqual({ type: 'DIFFICULT_SAVE', playerId: 4 })
        return resposta(201, { data: { ...comGoleiro, events: [{ id: 1, playerId: 4, type: 'DIFFICULT_SAVE', minute: null, player: { id: 4, nickname: 'J4' } }] } })
      },
    })
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Lances de J4' }))
    const painel = screen.getByRole('dialog', { name: 'J4' })
    expect(within(painel).getByText(/goleiro/)).toBeInTheDocument()
    fireEvent.click(within(painel).getByRole('button', { name: 'Defesa difícil' }))

    expect(await screen.findByText('Cartões e defesas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lances de J4' })).toHaveTextContent('1 defesa(s)')
  })

  it('erro do back-end mantém o painel aberto e mostra a mensagem; Esc fecha', async () => {
    simularApi({
      ...comJogadores,
      ...partidaNaApi(emAndamento),
      'POST /api/grupos/1/matches/7/lances': () => resposta(422, { erro: 'Jogador expulso não recebe mais lances nesta partida' }),
    })
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Lances de J1' }))
    fireEvent.click(screen.getByRole('button', { name: /Vermelho/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('expulso')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('jogador expulso (2 amarelos) aparece como expulso e o painel não oferece lances', async () => {
    const amarelo = (id) => ({ id, playerId: 2, type: 'YELLOW_CARD', minute: null, player: { id: 2, nickname: 'J2' } })
    simularApi({ ...comJogadores, ...partidaNaApi({ ...emAndamento, events: [amarelo(1), amarelo(2)] }) })
    renderizar()
    const box = await screen.findByRole('button', { name: 'Lances de J2' })
    expect(box).toHaveTextContent('Expulso')
    fireEvent.click(box)
    expect(screen.getByText(/foi expulso/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Amarelo/ })).not.toBeInTheDocument()
  })

  it('remove um gol lançado errado', async () => {
    const comGol = { ...emAndamento, score: { A: 1, B: 0 }, goals: [gol(5, 1)] }
    simularApi({
      ...comJogadores,
      ...partidaNaApi(comGol),
      'DELETE /api/grupos/1/matches/7/gols/5': () => resposta(200, { data: emAndamento }),
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
      'PATCH /api/grupos/1/matches/7/encerrar': () =>
        resposta(200, { data: { ...comGol, status: 'FINISHED', result: 'A_WINS' } }),
    })
    renderizar()
    await screen.findByRole('button', { name: 'Lances de J1' })

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar partida' }))
    expect(screen.getByText(/Encerrar com o placar 1 x 0/)).toBeInTheDocument()
    expect(chamou('PATCH /api/grupos/1/matches/7/encerrar')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar encerramento' }))

    expect(await screen.findByText(/Vitória do Time A/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Lances de/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remover gol/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Encerrar partida' })).not.toBeInTheDocument()
  })

  it('cancelar a confirmação não encerra', async () => {
    simularApi({ ...comJogadores, ...partidaNaApi(emAndamento) })
    renderizar()
    await screen.findByRole('button', { name: 'Lances de J1' })

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar partida' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByRole('button', { name: 'Encerrar partida' })).toBeInTheDocument()
    expect(chamou('PATCH /api/grupos/1/matches/7/encerrar')).toBe(false)
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
    expect(screen.queryByRole('button', { name: /Lances de/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(chamou('GET /api/grupos/1/players?ativos=true')).toBe(false) // nem busca a lista de jogadores
  })

  const finalizada = partida({ status: 'FINISHED', result: 'A_WINS', players: escalacao, score: { A: 1, B: 0 } })
  const candidatos = [
    { playerId: 4, nickname: 'J4', team: 'B', votes: 2 },
    { playerId: 1, nickname: 'J1', team: 'A', votes: 0 },
    { playerId: 2, nickname: 'J2', team: 'A', votes: 0 },
  ]
  const votacao = (extra = {}) => ({
    open: true, deadline: '2026-11-22T22:00:00.000Z', canVote: true, myVote: null, totalVotes: 2, totalVoters: 6,
    candidates: candidatos, craques: [candidatos[0]], ...extra,
  })

  it('finalizada: quem jogou vota no craque (menos em si mesmo) e vê o voto marcado', async () => {
    let corpo
    simularApi({
      ...partidaNaApi(finalizada),
      'GET /api/grupos/1/matches/7/craque': () => resposta(200, { data: votacao() }),
      'POST /api/grupos/1/matches/7/craque': (c) => {
        corpo = c
        const novos = [{ ...candidatos[0], votes: 3 }, ...candidatos.slice(1)]
        return resposta(200, { data: votacao({ myVote: 4, totalVotes: 3, candidates: novos, craques: [novos[0]] }) })
      },
    })
    renderizar('PLAYER', 1) // jogador 1 jogou esta partida

    const painel = await screen.findByLabelText('Votação do craque')
    expect(await within(painel).findByText(/J4, com 2 votos/)).toBeInTheDocument()
    expect(within(painel).queryByRole('button', { name: 'Votar em J1' })).not.toBeInTheDocument()
    fireEvent.click(within(painel).getByRole('button', { name: 'Votar em J4' }))

    await waitFor(() => expect(corpo).toEqual({ playerId: 4 }))
    expect(await within(painel).findByText(/J4, com 3 votos/)).toBeInTheDocument()
    expect(within(painel).getByRole('button', { name: 'Votar em J4' })).toHaveTextContent('Votado')
  })

  it('finalizada: quem não jogou vê o resultado (e o empate), mas sem botões de voto', async () => {
    const empate = [{ ...candidatos[0], votes: 1 }, { ...candidatos[1], votes: 1 }, candidatos[2]]
    simularApi({
      ...comJogadores,
      ...partidaNaApi(finalizada),
      'GET /api/grupos/1/matches/7/craque': () => resposta(200, { data: votacao({ canVote: false, candidates: empate, craques: empate.slice(0, 2) }) }),
    })
    renderizar('ORGANIZER', null)

    expect(await screen.findByText(/Empate: J4 e J1, com 1 voto cada/)).toBeInTheDocument()
    expect(screen.getByText(/Só quem jogou a partida vota/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Votar em/ })).not.toBeInTheDocument()
  })

  it('partida ainda não finalizada não mostra a votação do craque', async () => {
    simularApi({ ...partidaNaApi(partida({ status: 'IN_PROGRESS', players: escalacao })) })
    renderizar('PLAYER', 1)

    expect(await screen.findByText('Time A')).toBeInTheDocument()
    expect(screen.queryByText(/Craque da partida/)).not.toBeInTheDocument()
    expect(chamou('GET /api/grupos/1/matches/7/craque')).toBe(false)
  })

  it('mostra os nomes livres dos times no placar e no resultado', async () => {
    simularApi({ ...partidaNaApi({ ...finalizada, teamNames: { A: 'Amarelo', B: 'Azul' } }) })
    renderizar('PLAYER', 1)

    expect(await screen.findByLabelText('Placar')).toHaveTextContent('Amarelo 1 x 0 Azul')
    expect(screen.getByText(/Vitória de Amarelo/)).toBeInTheDocument()
  })

  it('partida inexistente mostra o erro da API', async () => {
    simularApi({ 'GET /api/grupos/1/matches/7': () => resposta(404, { erro: 'Partida não encontrada' }) })
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
    await screen.findByText('Data, local, vagas e times')

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
      'PUT /api/grupos/1/matches/7': (corpo) => {
        expect(corpo).toEqual({ date: new Date('2026-12-05T19:00').toISOString(), location: 'Quadra nova', maxPlayers: null, format: 'SINGLE_GAME', teamCount: 2, teamNames: null })
        return resposta(200, { data: partida({ date: corpo.date, location: corpo.location }) })
      },
    })
    renderizar()
    await screen.findByText('Data, local, vagas e times')

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
      'PUT /api/grupos/1/matches/7': () => resposta(400, { erro: 'Local deve ter de 2 a 100 caracteres' }),
    })
    renderizar()
    await screen.findByText('Data, local, vagas e times')

    fireEvent.change(screen.getByLabelText('Local'), { target: { value: 'ok' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Local deve ter de 2 a 100')
    expect(screen.getByLabelText('Local')).toHaveValue('ok')
  })

  it('não aparece com a partida em andamento nem para jogador comum', async () => {
    simularApi({ ...comJogadores, ...partidaNaApi(partida({ status: 'IN_PROGRESS', players: escalacao })) })
    renderizar()
    await screen.findByRole('button', { name: 'Lances de J1' })
    expect(screen.queryByText('Data, local, vagas e times')).not.toBeInTheDocument()
    cleanup()

    simularApi({ ...partidaNaApi(partida()) })
    renderizar('PLAYER')
    await screen.findByText('Time A')
    expect(screen.queryByText('Data, local, vagas e times')).not.toBeInTheDocument()
  })
})

describe('MatchPage: cancelar partida', () => {
  it('pede confirmação (nada é enviado no primeiro clique) e depois bloqueia tudo', async () => {
    simularApi({
      ...comJogadores,
      ...partidaNaApi(partida({ players: escalacao })),
      'PATCH /api/grupos/1/matches/7/cancelar': () => resposta(200, { data: partida({ status: 'CANCELED', players: escalacao }) }),
    })
    renderizar()
    await screen.findByText('Escalação')

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar partida' }))
    expect(screen.getByText(/Cancelar esta partida\?/)).toBeInTheDocument()
    expect(chamou('PATCH /api/grupos/1/matches/7/cancelar')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))

    expect(await screen.findByText(/Esta partida foi cancelada/)).toBeInTheDocument()
    expect(screen.getByText('Cancelada')).toBeInTheDocument() // selo de status
    expect(screen.queryByText('Escalação')).not.toBeInTheDocument()
    expect(screen.queryByText('Data, local, vagas e times')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('"Voltar" desiste do cancelamento', async () => {
    simularApi({ ...comJogadores, ...partidaNaApi(partida({ players: escalacao })) })
    renderizar()
    await screen.findByText('Escalação')

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar partida' }))
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(screen.getByRole('button', { name: 'Cancelar partida' })).toBeInTheDocument()
    expect(chamou('PATCH /api/grupos/1/matches/7/cancelar')).toBe(false)
  })

  it('também dá para cancelar uma partida em andamento', async () => {
    simularApi({
      ...comJogadores,
      ...partidaNaApi(partida({ status: 'IN_PROGRESS', players: escalacao })),
      'PATCH /api/grupos/1/matches/7/cancelar': () => resposta(200, { data: partida({ status: 'CANCELED', players: escalacao }) }),
    })
    renderizar()
    await screen.findByRole('button', { name: 'Lances de J1' })

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar partida' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))

    expect(await screen.findByText(/Esta partida foi cancelada/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Placar')).not.toBeInTheDocument()
  })

  it('mostra o erro do back-end (ex.: já foi encerrada por outra pessoa)', async () => {
    simularApi({
      ...comJogadores,
      ...partidaNaApi(partida({ players: escalacao })),
      'PATCH /api/grupos/1/matches/7/cancelar': () => resposta(422, { erro: 'Uma partida finalizada não pode ser cancelada' }),
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

describe('MatchPage: pelada (vários times e jogos)', () => {
  // 3 times: A (1-3), B (4-6), C (7-9).
  const nove = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((id) => ({ id, name: `Jogador ${id}`, nickname: `J${id}`, position: 'MIDFIELDER', active: true }))
  const escalacao3 = nove.map((j) => ({ playerId: j.id, team: 'ABC'[Math.floor((j.id - 1) / 3)], player: { id: j.id, nickname: j.nickname } }))
  const pelada = (extra = {}) =>
    partida({ format: 'PELADA', teamCount: 3, status: 'IN_PROGRESS', players: escalacao3, games: [], standings: [], score: { A: 0, B: 0, C: 0 }, ...extra })
  const jogo1 = { id: 1, number: 1, homeTeam: 'A', awayTeam: 'C', result: null, finishedAt: null, score: { home: 0, away: 0 } }
  const comNove = { 'GET /api/grupos/1/players?ativos=true': () => resposta(200, { data: nove }) }

  it('escalação da pelada tem os 3 times e salva teamA, teamB e teamC', async () => {
    simularApi({
      ...comNove,
      ...partidaNaApi(pelada({ status: 'SCHEDULED', players: [] })),
      'PUT /api/grupos/1/matches/7/escalacao': (corpo) => {
        expect(corpo).toEqual({ teamA: [1], teamB: [], teamC: [9] })
        return resposta(200, { data: pelada({ status: 'SCHEDULED', players: [] }) })
      },
    })
    renderizar()
    await screen.findByText('Escalação')
    const opcoes = within(screen.getByLabelText('J1')).getAllByRole('option').map((o) => o.textContent)
    expect(opcoes).toEqual(['Fora', 'Time A', 'Time B', 'Time C'])

    escolherTime('J1', 'A')
    escolherTime('J9', 'C')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar escalação' }))
    await waitFor(() => expect(chamou('PUT /api/grupos/1/matches/7/escalacao')).toBe(true))
  })

  it('sem jogo aberto: sugere A x B, começa o jogo e só os times em campo ficam clicáveis', async () => {
    simularApi({
      ...comNove,
      ...partidaNaApi(pelada()),
      'POST /api/grupos/1/matches/7/jogos': (corpo) => {
        expect(corpo).toEqual({ homeTeam: 'A', awayTeam: 'C' })
        return resposta(201, { data: pelada({ games: [jogo1] }) })
      },
    })
    renderizar()
    expect(await screen.findByText('Comece um jogo para lançar gols e lances.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Lances de/ })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Fica em campo')).toHaveValue('A')
    expect(screen.getByLabelText('Entra')).toHaveValue('B')

    fireEvent.change(screen.getByLabelText('Entra'), { target: { value: 'C' } })
    fireEvent.click(screen.getByRole('button', { name: 'Começar jogo 1' }))

    expect(await screen.findByLabelText('Placar do jogo')).toHaveTextContent('Time A 0 x 0 Time C')
    expect(screen.getByRole('button', { name: 'Lances de J1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lances de J7' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lances de J4' })).not.toBeInTheDocument() // time B esperando
    expect(screen.getByText('esperando')).toBeInTheDocument()
  })

  it('encerra o jogo e mostra a lista de jogos e a classificação da noite', async () => {
    const encerrado = { ...jogo1, result: 'HOME_WINS', finishedAt: '2026-11-20T23:00:00.000Z', score: { home: 2, away: 0 } }
    const tabela = [
      { team: 'A', games: 1, wins: 1, draws: 0, losses: 0, goalsFor: 2, goalsAgainst: 0, points: 3 },
      { team: 'B', games: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
      { team: 'C', games: 1, wins: 0, draws: 0, losses: 1, goalsFor: 0, goalsAgainst: 2, points: 0 },
    ]
    simularApi({
      ...comNove,
      ...partidaNaApi(pelada({ games: [jogo1] })),
      'PATCH /api/grupos/1/matches/7/jogos/1/encerrar': () => resposta(200, { data: pelada({ games: [encerrado], standings: tabela }) }),
    })
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Encerrar jogo 1' }))

    const jogos = await screen.findByRole('list', { name: 'Jogos da noite' })
    expect(jogos).toHaveTextContent('Time A 2 x 0 Time C')
    expect(jogos).toHaveTextContent('vitória do Time A')
    expect(screen.getByRole('table')).toHaveTextContent('Time A')
    // quem ganha fica: A continua e entra o B, que estava esperando
    expect(screen.getByLabelText('Fica em campo')).toHaveValue('A')
    expect(screen.getByLabelText('Entra')).toHaveValue('B')
    expect(screen.getByRole('button', { name: 'Encerrar a pelada' })).toBeInTheDocument()
  })
})
