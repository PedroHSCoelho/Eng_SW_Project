import { useRef, useState } from 'react'
import Avatar from '../../ui/Avatar.jsx'
import { ehOrganizadorDo, useGrupo } from '../groups/GrupoContext.jsx'
import { useFotos } from './FotosContext.jsx'
import { enviarFoto, removerFoto } from './photosApi.js'
import { reduzirFoto as reduzirFotoPadrao } from './reduzirFoto.js'

const botao = 'rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 disabled:opacity-50'

// Foto grande no perfil + "Trocar foto" / "Remover foto".
// Os botões só aparecem para o admin do grupo ou para o próprio jogador; quem decide de verdade
// é o back-end (403 para os outros), aqui é só para não mostrar botão que não funciona.
// `reduzirFoto` vem por prop só para os testes trocarem o <canvas> (o jsdom não desenha).
export default function FotoDoJogador({ jogador, reduzirFoto = reduzirFotoPadrao }) {
  const { grupo } = useGrupo()
  const { versoes, recarregar } = useFotos()
  const entrada = useRef(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const podeMexer = ehOrganizadorDo(grupo) || grupo?.myPlayerId === jogador.id
  const temFoto = versoes.has(jogador.id)

  async function executar(acao) {
    setEnviando(true)
    setErro('')
    try {
      await acao()
      await recarregar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  function escolher(evento) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = '' // deixa escolher o mesmo arquivo de novo depois
    if (arquivo) executar(async () => enviarFoto(jogador.id, await reduzirFoto(arquivo)))
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar jogador={jogador} tamanho="g" />
      {podeMexer && (
        <div className="flex flex-wrap gap-2">
          <input
            ref={entrada}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label={`Escolher foto de ${jogador.nickname}`}
            onChange={escolher}
            disabled={enviando}
          />
          <button
            type="button"
            disabled={enviando}
            onClick={() => entrada.current?.click()}
            className={`${botao} bg-green-800 ring-green-700 hover:bg-green-700`}
          >
            {enviando ? 'Enviando…' : temFoto ? 'Trocar foto' : 'Adicionar foto'}
          </button>
          {temFoto && (
            <button
              type="button"
              disabled={enviando}
              onClick={() => executar(() => removerFoto(jogador.id))}
              className={`${botao} bg-transparent ring-green-700 hover:bg-green-800`}
            >
              Remover foto
            </button>
          )}
        </div>
      )}
      {erro && (
        <p role="alert" className="w-full rounded-lg bg-red-100 px-3 py-1.5 text-sm text-red-800">
          {erro}
        </p>
      )}
    </div>
  )
}
