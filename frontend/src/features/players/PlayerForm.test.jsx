import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import PlayerForm from './PlayerForm.jsx'

const vazio = { name: '', nickname: '', position: '' }

afterEach(cleanup)

// O formulário é "burro": recebe os valores e avisa o que mudou. Aqui não há API nem fetch.
function montar(props = {}) {
  const aoMudar = vi.fn()
  const aoEnviar = vi.fn()
  const aoCancelar = vi.fn()
  render(
    <PlayerForm
      valores={vazio}
      editando={false}
      enviando={false}
      aoMudar={aoMudar}
      aoEnviar={aoEnviar}
      aoCancelar={aoCancelar}
      {...props}
    />,
  )
  return { aoMudar, aoEnviar, aoCancelar }
}

describe('PlayerForm', () => {
  it('no modo cadastro mostra "Novo jogador" e o botão Cadastrar, sem Cancelar', () => {
    montar()

    expect(screen.getByText('Novo jogador')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
  })

  it('no modo edição mostra os valores recebidos e o botão Cancelar', () => {
    montar({
      editando: true,
      valores: { name: 'José da Silva', nickname: 'Zé', position: 'FORWARD' },
    })

    expect(screen.getByText('Editar jogador')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('José da Silva')
    expect(screen.getByLabelText('Apelido')).toHaveValue('Zé')
    expect(screen.getByLabelText('Posição')).toHaveValue('FORWARD')
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument()
  })

  it('avisa qual campo mudou e o novo valor', () => {
    const { aoMudar } = montar()

    fireEvent.change(screen.getByLabelText('Apelido'), { target: { value: 'Zeca' } })
    fireEvent.change(screen.getByLabelText('Posição'), { target: { value: 'GOALKEEPER' } })

    expect(aoMudar).toHaveBeenCalledWith('nickname', 'Zeca')
    expect(aoMudar).toHaveBeenCalledWith('position', 'GOALKEEPER')
  })

  it('oferece as quatro posições em português', () => {
    montar()

    for (const texto of ['Goleiro', 'Defensor', 'Meio-campista', 'Atacante']) {
      expect(screen.getByRole('option', { name: texto })).toBeInTheDocument()
    }
  })

  it('chama aoEnviar ao enviar e aoCancelar ao cancelar', () => {
    const { aoEnviar, aoCancelar } = montar({
      editando: true,
      valores: { name: 'José', nickname: 'Zé', position: 'FORWARD' },
    })

    fireEvent.submit(screen.getByRole('button', { name: 'Salvar alterações' }).closest('form'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(aoEnviar).toHaveBeenCalledTimes(1)
    expect(aoCancelar).toHaveBeenCalledTimes(1)
  })

  it('desabilita o botão de envio enquanto envia', () => {
    montar({ enviando: true })

    expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeDisabled()
  })
})
