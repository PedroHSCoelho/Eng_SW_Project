import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import SubstituicoesPanel from './SubstituicoesPanel.jsx'
import SumulaAoVivo from './SumulaAoVivo.jsx'
import { definirGrupoAtual } from '../../api/grupoAtual.js'

const jogadores = [1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({ id, nickname: `J${id}`, position: 'MIDFIELDER', active: true }))
const escalado = (playerId, team, extra = {}) => ({ playerId, team, benched: false, player: { id: playerId, nickname: `J${playerId}` }, ...extra })
const partida = {
  id: 7, status: 'IN_PROGRESS', teamCount: 2, goals: [], events: [], games: [],
  players: [escalado(1, 'A'), escalado(2, 'A'), escalado(3, 'A'), escalado(4, 'B'), escalado(5, 'B'), escalado(6, 'B', { benched: true })],
}

beforeEach(() => {
  definirGrupoAtual(1)
  // J7 confirmou e ficou Sem Time; J8 não confirmou.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: { confirmed: [1, 2, 3, 4, 5, 7].map((playerId) => ({ playerId })) } }) })),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('SubstituicoesPanel', () => {
  it('mostra quem está Sem Time (confirmados fora de campo e quem saiu) e faz a troca', async () => {
    const aoSubstituir = vi.fn(async () => true)
    render(<SubstituicoesPanel partida={partida} jogadores={jogadores} aoSubstituir={aoSubstituir} />)

    expect(await screen.findByText('Sem Time: J7, J6')).toBeInTheDocument()
    const entra = screen.getByLabelText('Quem entra')
    expect(within(entra).getByRole('group', { name: 'Sem Time' })).toHaveTextContent('J7J6')
    expect(within(entra).getByRole('group', { name: 'Outros do grupo' })).toHaveTextContent('J8')

    fireEvent.change(entra, { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Quem sai'), { target: { value: '2' } })
    expect(screen.queryByLabelText('Time de quem entra')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Substituir' }))

    await waitFor(() => expect(aoSubstituir).toHaveBeenCalledWith({ entraId: 7, saiId: 2 }))
  })

  it('sem ninguém saindo, põe quem entra no time escolhido; sem ninguém entrando, só tira de campo', async () => {
    const aoSubstituir = vi.fn(async () => true)
    render(<SubstituicoesPanel partida={partida} jogadores={jogadores} aoSubstituir={aoSubstituir} />)
    await screen.findByText('Sem Time: J7, J6')

    fireEvent.change(screen.getByLabelText('Quem entra'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Time de quem entra'), { target: { value: 'B' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pôr no time' }))
    await waitFor(() => expect(aoSubstituir).toHaveBeenCalledWith({ entraId: 8, team: 'B' }))

    fireEvent.change(screen.getByLabelText('Quem entra'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Quem sai'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tirar de campo' }))
    await waitFor(() => expect(aoSubstituir).toHaveBeenLastCalledWith({ saiId: 4 }))
  })
})

describe('SumulaAoVivo com substituições', () => {
  it('quem saiu não tem box no time e aparece em "Saíram"', () => {
    render(<SumulaAoVivo partida={partida} />)
    expect(screen.queryByRole('button', { name: /J6/ })).not.toBeInTheDocument()
    expect(screen.getByText('Saíram: J6')).toBeInTheDocument()
  })
})
