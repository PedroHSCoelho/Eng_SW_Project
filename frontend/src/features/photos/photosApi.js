// Acesso HTTP às fotos dos jogadores. A foto vai em binário (o próprio Blob no corpo),
// não em JSON: é menor e o back confere o tipo pelos bytes.
import { pedir } from '../../api/http.js'
import { apiDoGrupo } from '../../api/grupoAtual.js'

// [{ playerId, version }] de quem tem foto no grupo atual.
export const listarFotos = () => pedir(`${apiDoGrupo()}/players/fotos`)

export const enviarFoto = (playerId, imagem) =>
  pedir(`${apiDoGrupo()}/players/${playerId}/foto`, {
    method: 'PUT',
    headers: { 'Content-Type': imagem.type || 'image/jpeg' },
    body: imagem,
  })

export const removerFoto = (playerId) => pedir(`${apiDoGrupo()}/players/${playerId}/foto`, { method: 'DELETE' })

// A versão na URL faz o navegador baixar de novo só quando a foto muda.
export const urlDaFoto = (grupoId, playerId, versao) => `/api/grupos/${grupoId}/players/${playerId}/foto?v=${versao}`
