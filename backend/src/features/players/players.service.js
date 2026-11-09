// Regras de negócio dos jogadores. Recebe o repositório por parâmetro
// para poder ser testado sem banco.
import { BusinessRuleError, NotFoundError, ValidationError } from '../../errors/AppError.js'

// Mesmos valores do enum Position do schema.prisma
const POSICOES_VALIDAS = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD']

// Valida e devolve o texto sem espaços nas pontas. Valor que não é texto
// conta como vazio (vira 400, nunca um erro 500 por TypeError).
function textoComTamanho(valor, min, max, mensagem) {
  const texto = typeof valor === 'string' ? valor.trim() : ''
  if (texto.length < min || texto.length > max) {
    throw new ValidationError(mensagem)
  }
  return texto
}

// Núcleo puro: valida a entrada externa e devolve SÓ os campos que o serviço
// controla (lista explícita). nicknameKey, id e active enviados pelo cliente
// são descartados; nicknameKey é sempre calculado aqui.
function validarDadosDoJogador(dados) {
  const name = textoComTamanho(dados.name, 2, 50, 'Nome deve ter de 2 a 50 caracteres')
  const nickname = textoComTamanho(dados.nickname, 2, 30, 'Apelido deve ter de 2 a 30 caracteres')
  if (!POSICOES_VALIDAS.includes(dados.position)) {
    throw new ValidationError('Posição inválida')
  }
  return { name, nickname, nicknameKey: nickname.toLowerCase(), position: dados.position }
}

export function criarPlayersService(repo) {
  async function buscarOuFalhar(id) {
    const jogador = await repo.buscarPorId(id)
    if (!jogador) throw new NotFoundError('Jogador não encontrado')
    return jogador
  }

  return {
    async listar({ busca, apenasAtivos } = {}) {
      return repo.listar({
        busca: typeof busca === 'string' ? busca.trim() : '',
        apenasAtivos: apenasAtivos === true,
      })
    },

    buscar(id) {
      return buscarOuFalhar(id)
    },

    async criar(dados) {
      const jogador = validarDadosDoJogador(dados)
      if (await repo.buscarPorNicknameKey(jogador.nicknameKey)) {
        throw new BusinessRuleError('Apelido já está em uso')
      }
      return repo.criar(jogador)
    },

    // PUT: substitui nome, apelido e posição. O apelido pode continuar o mesmo
    // (é o próprio jogador), mas não pode ser o de outro. `active` só muda em inativar.
    async atualizar(id, dados) {
      await buscarOuFalhar(id)
      const jogador = validarDadosDoJogador(dados)
      const dono = await repo.buscarPorNicknameKey(jogador.nicknameKey)
      if (dono && dono.id !== id) {
        throw new BusinessRuleError('Apelido já está em uso')
      }
      return repo.atualizar(id, jogador)
    },

    // Quem já jogou não pode sumir do histórico: só inativar.
    async excluir(id) {
      await buscarOuFalhar(id)
      if (await repo.possuiPartidas(id)) {
        throw new BusinessRuleError('Jogador com partidas não pode ser excluído; inative-o')
      }
      await repo.excluir(id)
    },

    async inativar(id) {
      await buscarOuFalhar(id)
      return repo.atualizar(id, { active: false })
    },
  }
}
