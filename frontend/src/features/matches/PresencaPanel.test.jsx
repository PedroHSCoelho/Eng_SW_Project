import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import PresencaPanel from './PresencaPanel.jsx'
import { definirGrupoAtual } from '../../api/grupoAtual.js'

const partida = { id: 7, date: '2026-11-27T23:00:00.000Z', location: 'Quadra', status: 'SCHEDULED', maxPlayers: 2 }
const linha = (playerId, order) => ({ playerId, nickname: `J${playerId}`, position: 'MIDFIELDER', order })
const lista = (extra = {}) => ({ maxPlayers: 2, confirmed: [], waitlist: [], openSpots: 2, me: null, ...extra })

function resposta(status, corpo) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo }
}
function simularApi(rotas) {
  fetch.mockImplementation(async (url, opcoes = {}) => {
    const rota = rotas[`${opcoes.method ?? 'GET'} ${url}`]
    return rota ? rota(opcoes.body && JSON.parse(opcoes.body)) : resposta(404, { erro: 'Rota não encontrada' })
  })
}
const URL = '/api/grupos/1/matches/7/presencas'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  definirGrupoAtual(1)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('PresencaPanel', () => {
  it('membro confirma a presença e vê o nome na lista', async () => {
    simularApi({
      [`GET ${URL}`]: () => resposta(200, { data: lista() }),
      [`POST ${URL}`]: (corpo) => {
        expect(corpo).toEqual({}) // sem playerId: o back-end usa o MEU jogador
        return resposta(201, { data: lista({ confirmed: [linha(1, 1)], openSpots: 1, me: 'CONFIRMED' }) })
      },
    })
    render(<PresencaPanel partida={partida} ehOrganizador={false} meuJogadorId={1} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar presença' }))

    expect(await screen.findByText('✓ Você está confirmado')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Confirmados' })).getByText(/J1/)).toBeInTheDocument()
    expect(screen.getByText('Falta 1 vaga')).toBeInTheDocument()
  })

  it('lista cheia: o botão vira "Entrar na lista de espera" e mostra a posição na espera', async () => {
    const cheia = lista({ confirmed: [linha(2, 1), linha(3, 2)], openSpots: 0 })
    simularApi({
      [`GET ${URL}`]: () => resposta(200, { data: cheia }),
      [`POST ${URL}`]: () => resposta(201, { data: { ...cheia, waitlist: [linha(1, 3)], me: 'WAITLIST' } }),
      [`DELETE ${URL}/1`]: () => resposta(200, { data: cheia }),
    })
    render(<PresencaPanel partida={partida} ehOrganizador={false} meuJogadorId={1} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Entrar na lista de espera' }))
    expect(await screen.findByText('Você é o 1º da lista de espera')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sair da lista' }))
    expect(await screen.findByRole('button', { name: 'Entrar na lista de espera' })).toBeInTheDocument()
  })

  it('conta sem jogador não tem botão de confirmar e recebe a explicação', async () => {
    simularApi({ [`GET ${URL}`]: () => resposta(200, { data: lista() }) })
    render(<PresencaPanel partida={partida} ehOrganizador={false} meuJogadorId={null} />)
    expect(await screen.findByText(/não está ligada a um jogador/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmar presença' })).not.toBeInTheDocument()
  })

  it('organizador põe um jogador na lista e tira outro; membro não vê esses controles', async () => {
    const aoMudar = vi.fn()
    simularApi({
      [`GET ${URL}`]: () => resposta(200, { data: lista({ confirmed: [linha(2, 1)], openSpots: 1 }) }),
      [`POST ${URL}`]: (corpo) => {
        expect(corpo).toEqual({ playerId: 3 })
        return resposta(201, { data: lista({ confirmed: [linha(2, 1), linha(3, 2)], openSpots: 0 }) })
      },
      [`DELETE ${URL}/2`]: () => resposta(200, { data: lista({ confirmed: [linha(3, 1)], openSpots: 1 }) }),
    })
    const jogadores = [2, 3].map((id) => ({ id, nickname: `J${id}` }))
    render(<PresencaPanel partida={partida} ehOrganizador meuJogadorId={null} jogadores={jogadores} aoMudar={aoMudar} />)

    fireEvent.change(await screen.findByLabelText('Pôr na lista'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect(await screen.findByText(/2\/2 confirmados/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tirar J2 da lista' }))
    expect(await screen.findByText(/1\/2 confirmados/)).toBeInTheDocument()
    expect(aoMudar).toHaveBeenLastCalledWith(expect.objectContaining({ confirmed: [linha(3, 1)] }))
    cleanup()

    simularApi({ [`GET ${URL}`]: () => resposta(200, { data: lista({ confirmed: [linha(2, 1)] }) }) })
    render(<PresencaPanel partida={partida} ehOrganizador={false} meuJogadorId={1} jogadores={jogadores} />)
    await screen.findByText(/J2/)
    expect(screen.queryByRole('button', { name: /Tirar/ })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Pôr na lista')).not.toBeInTheDocument()
  })

  it('copia a lista no formato do WhatsApp', async () => {
    const writeText = vi.fn().mockResolvedValue()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    simularApi({ [`GET ${URL}`]: () => resposta(200, { data: lista({ confirmed: [linha(2, 1)], openSpots: 1 }) }) })
    render(<PresencaPanel partida={partida} ehOrganizador={false} meuJogadorId={1} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Copiar para o WhatsApp' }))

    expect(await screen.findByRole('button', { name: 'Lista copiada!' })).toBeInTheDocument()
    expect(writeText.mock.calls[0][0]).toMatch(/Confirmados \(1\/2\):\n1\. J2\n2\./)
  })

  it('"talvez": entra na espera mesmo com vaga, e depois confirma', async () => {
    const corpos = []
    simularApi({
      [`GET ${URL}`]: () => resposta(200, { data: lista() }),
      [`POST ${URL}`]: (corpo) => {
        corpos.push(corpo)
        return corpo.maybe
          ? resposta(201, { data: lista({ waitlist: [{ ...linha(1, 1), maybe: true }], me: 'MAYBE' }) })
          : resposta(201, { data: lista({ confirmed: [linha(1, 1)], openSpots: 1, me: 'CONFIRMED' }) })
      },
    })
    render(<PresencaPanel partida={partida} ehOrganizador={false} meuJogadorId={1} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Talvez (fico na espera)' }))
    expect(await screen.findByText(/Você está como talvez \(1º da espera\)/)).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Lista de espera' })).getByText('(talvez)')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Vou! Confirmar presença' }))
    expect(await screen.findByText('✓ Você está confirmado')).toBeInTheDocument()
    expect(corpos).toEqual([{ maybe: true }, { maybe: false }])
    expect(screen.getByRole('button', { name: 'Mudar para talvez' })).toBeInTheDocument()
  })

  it('leva um convidado, que aparece com quem convidou; só quem levou (ou admin) tira', async () => {
    const primo = { id: 5, name: 'Primo', invitedBy: { playerId: 1, nickname: 'J1' }, status: 'CONFIRMED' }
    const vizinho = { id: 6, name: 'Vizinho', invitedBy: { playerId: 2, nickname: 'J2' }, status: 'WAITLIST' }
    let corpo
    simularApi({
      [`GET ${URL}`]: () => resposta(200, { data: lista({ guests: [vizinho] }) }),
      ['POST /api/grupos/1/matches/7/convidados']: (c) => {
        corpo = c
        return resposta(201, { data: lista({ guests: [primo, vizinho], openSpots: 1 }) })
      },
      ['DELETE /api/grupos/1/matches/7/convidados/5']: () => resposta(200, { data: lista({ guests: [vizinho] }) }),
    })
    render(<PresencaPanel partida={partida} ehOrganizador={false} meuJogadorId={1} />)

    fireEvent.change(await screen.findByLabelText('Levar um convidado'), { target: { value: 'Primo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar convidado' }))

    const convidados = await screen.findByRole('list', { name: 'Convidados' })
    expect(await within(convidados).findByText(/Primo \(convidado do J1\)/)).toBeInTheDocument()
    expect(within(convidados).getByText(/· na espera/)).toBeInTheDocument()
    expect(corpo).toEqual({ name: 'Primo' })
    expect(screen.getByText(/1\/2 confirmados/)).toBeInTheDocument() // o convidado ocupa vaga
    expect(screen.queryByRole('button', { name: 'Tirar o convidado Vizinho' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tirar o convidado Primo' }))
    expect(await screen.findByText(/0\/2 confirmados/)).toBeInTheDocument()
  })
  it('quem levou passa o convidado para os confirmados, com a posição escolhida', async () => {
    const otavio = { id: 5, name: 'Otavio', invitedBy: { playerId: 1, nickname: 'J1' }, status: 'CONFIRMED' }
    let corpo
    const aoMudar = vi.fn()
    simularApi({
      [`GET ${URL}`]: () => resposta(200, { data: lista({ guests: [otavio], openSpots: 1 }) }),
      ['POST /api/grupos/1/matches/7/convidados/5/confirmar']: (c) => {
        corpo = c
        return resposta(200, { data: lista({ confirmed: [{ ...linha(9, 1), nickname: 'Otavio' }], openSpots: 1 }) })
      },
    })
    render(<PresencaPanel partida={partida} ehOrganizador={false} meuJogadorId={1} aoMudar={aoMudar} />)

    fireEvent.change(await screen.findByLabelText('Posição de Otavio'), { target: { value: 'FORWARD' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pôr Otavio nos confirmados' }))

    const confirmados = await screen.findByRole('list', { name: 'Confirmados' })
    expect(within(confirmados).getByText(/Otavio/)).toBeInTheDocument()
    expect(corpo).toEqual({ position: 'FORWARD' })
    expect(screen.getByText('Nenhum convidado.')).toBeInTheDocument()
    expect(aoMudar).toHaveBeenCalled()
  })
})
