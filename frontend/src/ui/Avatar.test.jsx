import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import Avatar from './Avatar.jsx'
import { FotosFixas } from '../features/photos/context/FotosContext.jsx'

afterEach(cleanup)

const ze = { id: 1, nickname: 'Zé' }

// Como nas telas: o avatar ao lado do nome.
const linha = (avatar) => (
  <p data-testid="linha">
    {avatar}
    {ze.nickname}
  </p>
)

describe('Avatar', () => {
  it('sem foto: mostra as iniciais (pelo CSS) e não muda o texto da linha', () => {
    render(linha(<Avatar jogador={ze} />))

    const avatar = screen.getByTestId('linha').firstChild
    expect(avatar).toHaveAttribute('data-iniciais', 'ZÉ')
    expect(avatar).toHaveAttribute('aria-hidden', 'true')
    expect(avatar.querySelector('img')).toBeNull()
    expect(screen.getByTestId('linha')).toHaveTextContent(/^Zé$/)
  })

  it('com foto: mostra a imagem da versão atual', () => {
    render(<FotosFixas grupoId={3} versoes={{ 1: 123 }}>{linha(<Avatar jogador={ze} />)}</FotosFixas>)

    const img = screen.getByTestId('linha').querySelector('img')
    expect(img).toHaveAttribute('src', '/api/grupos/3/players/1/foto?v=123')
    expect(img).toHaveAttribute('alt', '')
    expect(screen.getByText('Zé')).toBeInTheDocument()
  })

  it('aceita linhas que só têm playerId (ranking, presença, craque)', () => {
    const { container } = render(
      <FotosFixas versoes={{ 7: 1 }}>
        <Avatar jogador={{ playerId: 7, nickname: 'Bia' }} />
      </FotosFixas>,
    )
    expect(container.querySelector('img')).toHaveAttribute('src', '/api/grupos/1/players/7/foto?v=1')
  })

  it('se a imagem não carregar, volta para as iniciais', () => {
    const { container } = render(
      <FotosFixas versoes={{ 1: 5 }}>
        <Avatar jogador={ze} />
      </FotosFixas>,
    )
    fireEvent.error(container.querySelector('img'))
    expect(container.querySelector('img')).toBeNull()
    expect(container.firstChild).toHaveAttribute('data-iniciais', 'ZÉ')
  })
})
