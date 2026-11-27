import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import FotoDoJogador from './FotoDoJogador.jsx'
import { FotosProvider } from '../context/FotosContext.jsx'
import { GrupoFixo } from '../../groups/context/GrupoContext.jsx'

beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const resposta = (status, corpo) => ({ ok: status >= 200 && status < 300, status, json: async () => corpo })
const ze = { id: 1, name: 'José da Silva', nickname: 'Zé', position: 'FORWARD', active: true }
const grupo = (myRole, myPlayerId = null) => ({ id: 1, name: 'Pelada', myRole, myPlayerId })
// O canvas não desenha no jsdom: nos testes a "redução" devolve um JPEG pronto.
const fotoReduzida = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: 'image/jpeg' })
const reduzirFoto = vi.fn(async () => fotoReduzida)

// Simula a API das fotos: `fotos` é a lista [{ playerId, version }] e muda com PUT/DELETE.
function simularApi({ fotos = [], respostaDoEnvio } = {}) {
  let lista = fotos
  fetch.mockImplementation(async (url, opcoes = {}) => {
    if (url === '/api/grupos/1/players/fotos') return resposta(200, { data: lista })
    if (url === '/api/grupos/1/players/1/foto' && opcoes.method === 'PUT') {
      if (respostaDoEnvio) return respostaDoEnvio
      lista = [{ playerId: 1, version: 99 }]
      return resposta(200, { data: lista[0] })
    }
    if (url === '/api/grupos/1/players/1/foto' && opcoes.method === 'DELETE') {
      lista = []
      return resposta(204)
    }
    return resposta(404, { erro: 'Rota não encontrada' })
  })
}

function renderizar(g) {
  return render(
    <GrupoFixo grupo={g}>
      <FotosProvider>
        <FotoDoJogador jogador={ze} reduzirFoto={reduzirFoto} />
      </FotosProvider>
    </GrupoFixo>,
  )
}

const escolherArquivo = () =>
  fireEvent.change(screen.getByLabelText('Escolher foto de Zé'), {
    target: { files: [new File(['x'], 'eu.png', { type: 'image/png' })] },
  })

describe('FotoDoJogador', () => {
  it('admin adiciona a foto: reduz, envia em binário e o avatar passa a mostrar a imagem', async () => {
    simularApi()
    const { container } = renderizar(grupo('ORGANIZER'))

    await screen.findByRole('button', { name: 'Adicionar foto' })
    escolherArquivo()

    await waitFor(() => expect(container.querySelector('img')).toHaveAttribute('src', '/api/grupos/1/players/1/foto?v=99'))
    const envio = fetch.mock.calls.find(([, op]) => op?.method === 'PUT')
    expect(envio[1].headers['Content-Type']).toBe('image/jpeg')
    expect(envio[1].body).toBe(fotoReduzida)
    expect(screen.getByRole('button', { name: 'Trocar foto' })).toBeInTheDocument()
  })

  it('o próprio jogador remove a sua foto', async () => {
    simularApi({ fotos: [{ playerId: 1, version: 5 }] })
    const { container } = renderizar(grupo('MEMBER', 1))

    fireEvent.click(await screen.findByRole('button', { name: 'Remover foto' }))

    await waitFor(() => expect(container.querySelector('img')).toBeNull())
    expect(fetch).toHaveBeenCalledWith('/api/grupos/1/players/1/foto', { method: 'DELETE' })
    expect(screen.getByRole('button', { name: 'Adicionar foto' })).toBeInTheDocument()
  })

  it('membro vendo outro jogador: vê a foto, mas sem botões', async () => {
    simularApi({ fotos: [{ playerId: 1, version: 5 }] })
    const { container } = renderizar(grupo('MEMBER', 2))

    await waitFor(() => expect(container.querySelector('img')).not.toBeNull())
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByLabelText('Escolher foto de Zé')).toBeNull()
  })

  it('erro da API aparece na tela', async () => {
    simularApi({ respostaDoEnvio: resposta(400, { erro: 'O arquivo não é uma imagem JPEG, PNG ou WebP' }) })
    renderizar(grupo('ORGANIZER'))

    await screen.findByRole('button', { name: 'Adicionar foto' })
    escolherArquivo()

    expect(await screen.findByRole('alert')).toHaveTextContent('não é uma imagem')
  })
})
