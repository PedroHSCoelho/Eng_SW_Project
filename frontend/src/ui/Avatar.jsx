import { useState } from 'react'
import { useFotos } from '../features/photos/context/FotosContext.jsx'
import { urlDaFoto } from '../features/photos/api/photosApi.js'
import { iniciais } from '../features/photos/domain/fotos.js'

const TAMANHOS = {
  p: 'h-6 w-6 text-[0.6rem]', // ao lado do nome em listas
  m: 'h-9 w-9 text-xs',
  g: 'h-20 w-20 text-2xl', // perfil do jogador
}

// Mini foto redonda do jogador; sem foto (ou se a imagem falhar), mostra as iniciais.
// É decorativa (aria-hidden): o nome ao lado continua sendo o texto que o leitor de tela lê.
// As iniciais vêm do CSS (content: attr(data-iniciais)), não do texto do elemento: assim o
// texto da linha continua só "Zé", e não "ZÉZé".
export default function Avatar({ jogador, tamanho = 'p', className = '' }) {
  const { grupoId, versoes } = useFotos()
  const [falhou, setFalhou] = useState(null)
  const id = jogador?.id ?? jogador?.playerId
  const versao = id ? versoes.get(id) : undefined
  const comFoto = grupoId !== null && versao !== undefined && falhou !== versao

  return (
    <span
      aria-hidden="true"
      data-iniciais={iniciais(jogador?.nickname ?? jogador?.name)}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-superficie-2 align-middle font-bold text-gramado ring-1 ring-borda ${
        comFoto ? '' : 'before:content-[attr(data-iniciais)]'
      } ${TAMANHOS[tamanho] ?? TAMANHOS.p} ${className}`}
    >
      {comFoto && (
        <img
          src={urlDaFoto(grupoId, id, versao)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFalhou(versao)}
        />
      )}
    </span>
  )
}
