// Regras de negócio dos jogadores. Recebe o repositório por parâmetro
// para poder ser testado sem banco. Todo caso de uso recebe o grupo (groupId) de quem pede:
// jogador de outro grupo é tratado como inexistente (404).
import { BusinessRuleError, NotFoundError, ValidationError } from '../../errors/AppError.js'

// Nota do admin: de 0 a 5, de meio em meio ponto (0; 0,5; 1; ... 5). null apaga a nota.
export const NOTA_MAXIMA = 5
export function validarNota(valor) {
  if (valor === null) return null
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0 || valor > NOTA_MAXIMA || !Number.isInteger(valor * 2)) {
    throw new ValidationError('A nota vai de 0 a 5, de meio em meio ponto (ex.: 3,5)')
  }
  return valor
}

// Só admin vê a nota. Os repositórios reais já escondem; isto garante também no serviço.
const semNota = ({ skill, ...resto }) => resto

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
// Exportada porque os grupos também criam jogador (quem cria ou entra no grupo).
export function validarDadosDoJogador(dados) {
  const name = textoComTamanho(dados.name, 2, 50, 'Nome deve ter de 2 a 50 caracteres')
  const nickname = textoComTamanho(dados.nickname, 2, 30, 'Apelido deve ter de 2 a 30 caracteres')
  if (!POSICOES_VALIDAS.includes(dados.position)) {
    throw new ValidationError('Posição inválida')
  }
  return { name, nickname, nicknameKey: nickname.toLowerCase(), position: dados.position }
}

export function criarPlayersService(repo) {
  async function buscarOuFalhar(groupId, id) {
    const jogador = await repo.buscarPorId(id)
    if (!jogador || jogador.groupId !== groupId) throw new NotFoundError('Jogador não encontrado')
    return jogador
  }

  return {
    // `comNota`: quem pede é admin (só admin vê a nota de cada jogador).
    async listar(groupId, { busca, apenasAtivos, comNota = false } = {}) {
      const jogadores = await repo.listar({
        groupId,
        busca: typeof busca === 'string' ? busca.trim() : '',
        apenasAtivos: apenasAtivos === true,
        comNota,
      })
      return comNota ? jogadores.map((j) => ({ ...j, skill: j.skill ?? null })) : jogadores.map(semNota)
    },

    async buscar(groupId, id, { comNota = false } = {}) {
      const jogador = await buscarOuFalhar(groupId, id)
      if (!comNota) return semNota(jogador)
      const comA = await repo.buscarPorId(id, { comNota: true })
      return { ...jogador, skill: comA?.skill ?? null }
    },

    // Admin dá (ou apaga, com null) a nota de 0 a 5 que equilibra o sorteio.
    async definirNota(groupId, id, dados) {
      await buscarOuFalhar(groupId, id)
      if (dados.skill === undefined) throw new ValidationError('Informe a nota (skill), ou null para apagar')
      const skill = validarNota(dados.skill)
      const jogador = await repo.atualizar(id, { skill }, { comNota: true })
      return { id: jogador.id, nickname: jogador.nickname, skill: jogador.skill ?? null }
    },

    async criar(groupId, dados) {
      const jogador = validarDadosDoJogador(dados)
      if (await repo.buscarPorNicknameKey(groupId, jogador.nicknameKey)) {
        throw new BusinessRuleError('Apelido já está em uso')
      }
      return semNota(await repo.criar({ ...jogador, groupId }))
    },

    // PUT: substitui nome, apelido e posição. O apelido pode continuar o mesmo
    // (é o próprio jogador), mas não pode ser o de outro. `active` só muda em inativar.
    async atualizar(groupId, id, dados) {
      await buscarOuFalhar(groupId, id)
      const jogador = validarDadosDoJogador(dados)
      const dono = await repo.buscarPorNicknameKey(groupId, jogador.nicknameKey)
      if (dono && dono.id !== id) {
        throw new BusinessRuleError('Apelido já está em uso')
      }
      return semNota(await repo.atualizar(id, jogador))
    },

    // Quem já jogou não pode sumir do histórico: só inativar.
    async excluir(groupId, id) {
      await buscarOuFalhar(groupId, id)
      if (await repo.possuiPartidas(id)) {
        throw new BusinessRuleError('Jogador com partidas não pode ser excluído; inative-o')
      }
      await repo.excluir(id)
    },

    async inativar(groupId, id) {
      await buscarOuFalhar(groupId, id)
      return semNota(await repo.atualizar(id, { active: false }))
    },
  }
}
