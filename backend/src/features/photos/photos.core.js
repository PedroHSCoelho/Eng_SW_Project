// Núcleo puro das fotos dos jogadores: sem banco e sem HTTP, só regras.
// O front já reduz a foto (256 x 256, JPEG) antes de enviar; aqui o back confere de novo,
// porque qualquer um pode chamar a API direto, sem passar pela tela.
import { ForbiddenError, ValidationError } from '../../errors/AppError.js'

// 200 KB sobra para uma foto 256 x 256 (fica em torno de 15 a 40 KB) e impede que alguém
// encha o banco com arquivos enormes.
export const TAMANHO_MAXIMO_DA_FOTO = 200 * 1024

// Descobre o tipo pelos primeiros bytes do arquivo ("assinatura" ou "magic number"), e não
// pelo nome nem pelo Content-Type, que quem envia pode inventar.
//   JPEG: FF D8 FF          PNG: 89 50 4E 47 ("‰PNG")          WebP: "RIFF" .... "WEBP"
export function tipoDaImagem(bytes) {
  if (!bytes || bytes.length < 12) return null
  const b = (i) => bytes[i]
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return 'image/jpeg'
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return 'image/png'
  const texto = (inicio, fim) => String.fromCharCode(...bytes.subarray(inicio, fim))
  if (texto(0, 4) === 'RIFF' && texto(8, 12) === 'WEBP') return 'image/webp'
  return null
}

// Valida o arquivo recebido e devolve { mimeType, data } pronto para gravar.
export function validarFoto(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    throw new ValidationError('Envie a imagem no corpo, com Content-Type image/jpeg, image/png ou image/webp')
  }
  if (bytes.length > TAMANHO_MAXIMO_DA_FOTO) {
    throw new ValidationError('Foto grande demais (máximo 200 KB)')
  }
  const mimeType = tipoDaImagem(bytes)
  if (!mimeType) throw new ValidationError('O arquivo não é uma imagem JPEG, PNG ou WebP')
  return { mimeType, data: bytes }
}

// Quem pode trocar ou tirar a foto de um jogador: o admin do grupo (qualquer jogador)
// ou a própria pessoa (a conta ligada àquele jogador).
export function podeMexerNaFoto(participacao, playerId) {
  return participacao?.role === 'ORGANIZER' || participacao?.playerId === playerId
}

export function exigirPodeMexerNaFoto(participacao, playerId) {
  if (!podeMexerNaFoto(participacao, playerId)) {
    throw new ForbiddenError('Só o admin do grupo ou o próprio jogador trocam esta foto')
  }
}
