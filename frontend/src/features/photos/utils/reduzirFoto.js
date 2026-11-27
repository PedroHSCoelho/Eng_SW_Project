// Reduz a foto NO NAVEGADOR antes de enviar: recorta um quadrado no centro e desenha em
// 256 x 256 num <canvas>, salvando como JPEG. Uma foto de celular (3 a 5 MB) vira ~20 KB,
// o que cabe folgado no limite de 200 KB do back e deixa o app leve.
// Depende de <canvas> e <img>, que o jsdom dos testes não desenha; a conta do recorte,
// que é a parte com regra, está em fotos.js e é testada lá.
import { recorteQuadrado } from '../domain/fotos.js'

const LADO = 256

function carregarImagem(arquivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo)
    const imagem = new Image()
    imagem.onload = () => {
      URL.revokeObjectURL(url)
      resolve(imagem)
    }
    imagem.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não deu para abrir esta imagem. Tente uma foto JPEG ou PNG.'))
    }
    imagem.src = url
  })
}

export async function reduzirFoto(arquivo) {
  if (!arquivo?.type?.startsWith('image/')) throw new Error('Escolha um arquivo de imagem')
  const imagem = await carregarImagem(arquivo)
  const { x, y, lado } = recorteQuadrado(imagem.naturalWidth, imagem.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = LADO
  canvas.height = LADO
  canvas.getContext('2d').drawImage(imagem, x, y, lado, lado, 0, 0, LADO, LADO)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Não deu para preparar a foto'))), 'image/jpeg', 0.85)
  })
}
