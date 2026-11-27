// Casos de uso dos grupos: criar, entrar pelo convite, ver membros, mudar papel, remover/sair.
// Quem pede vem sempre do login (req.usuario) e da participação dele no grupo, nunca do corpo.
import { randomBytes } from 'node:crypto'
import { BusinessRuleError, NotFoundError, ValidationError } from '../../../errors/AppError.js'
import { validarDadosDoJogador } from '../../players/service/players.service.js'
import {
  TAMANHO_DO_CONVITE,
  gerarCodigoDeConvite,
  grupoParaParticipante,
  normalizarCodigo,
  validarNomeDoGrupo,
  validarPapelNoGrupo,
  verificarPodeRemover,
  verificarPodeMudarPapel,
  verificarSobraOrganizador,
} from '../core/groups.core.js'

// Convite inexistente e grupo de que a pessoa não participa dão a MESMA resposta (404):
// ninguém descobre, testando ids, quais grupos existem.
const GRUPO_NAO_ENCONTRADO = 'Grupo não encontrado'

// O jogador de quem cria/entra usa o nome da conta; apelido e posição vêm do formulário.
function lerJogador(usuario, dados) {
  return validarDadosDoJogador({ name: usuario.name, nickname: dados.nickname, position: dados.position })
}

export function criarGroupsService({ groupsRepo, playersRepo, gerarBytes = randomBytes }) {
  const novoCodigo = () => gerarCodigoDeConvite(gerarBytes(TAMANHO_DO_CONVITE))

  async function grupoPeloCodigo(codigo) {
    const normalizado = normalizarCodigo(codigo)
    const grupo = normalizado && (await groupsRepo.buscarPorCodigo(normalizado))
    if (!grupo) throw new NotFoundError('Convite inválido ou expirado')
    return grupo
  }

  async function membroOuFalhar(groupId, userId) {
    const membro = await groupsRepo.buscarParticipacao(groupId, userId)
    if (!membro) throw new NotFoundError('Membro não encontrado')
    return membro
  }

  return {
    // Usado pelo middleware de toda rota /api/grupos/:grupoId/...
    async participacao(groupId, userId) {
      const participacao = await groupsRepo.buscarParticipacao(groupId, userId)
      if (!participacao) throw new NotFoundError(GRUPO_NAO_ENCONTRADO)
      return participacao
    },

    // Quem cria vira organizador. Se informar apelido e posição, também vira jogador do grupo.
    async criar(usuario, dados) {
      const { name } = validarNomeDoGrupo(dados)
      const querJogar = dados.nickname !== undefined || dados.position !== undefined
      const jogador = querJogar ? lerJogador(usuario, dados) : null
      const { grupo, participacao } = await groupsRepo.criarComOrganizador({
        name, inviteCode: novoCodigo(), userId: usuario.id, jogador,
      })
      return grupoParaParticipante(grupo, participacao)
    },

    async meus(usuario) {
      return (await groupsRepo.listarDoUsuario(usuario.id)).map((p) => grupoParaParticipante(p.group, p))
    },

    async detalhes(participacao) {
      return grupoParaParticipante(await groupsRepo.buscarPorId(participacao.groupId), participacao)
    },

    async renomear(participacao, dados) {
      const grupo = await groupsRepo.atualizarGrupo(participacao.groupId, validarNomeDoGrupo(dados))
      return grupoParaParticipante(grupo, participacao)
    },

    // Gerar outro código invalida o link antigo (para quando ele vazar).
    async novoConvite(participacao) {
      const grupo = await groupsRepo.atualizarGrupo(participacao.groupId, { inviteCode: novoCodigo() })
      return grupoParaParticipante(grupo, participacao)
    },

    // Tela do convite: o nome do grupo, quantas pessoas tem e os jogadores que o admin cadastrou
    // à mão e ainda não têm conta (`unclaimedPlayers`), para a pessoa dizer "sou eu" e não virar
    // um jogador duplicado.
    async verConvite(codigo, usuario) {
      const grupo = await grupoPeloCodigo(codigo)
      const jaParticipa = Boolean(await groupsRepo.buscarParticipacao(grupo.id, usuario.id))
      return {
        id: grupo.id,
        name: grupo.name,
        totalMembers: grupo._count.memberships,
        alreadyMember: jaParticipa,
        unclaimedPlayers: jaParticipa ? [] : await groupsRepo.listarJogadoresSemConta(grupo.id),
      }
    },

    // Entra como MEMBER. Com { playerId }, a conta vira a desse jogador sem conta ("sou eu");
    // senão ganha um jogador novo no grupo (apelido único dentro do grupo).
    async entrar(codigo, usuario, dados) {
      const grupo = await grupoPeloCodigo(codigo)
      if (await groupsRepo.buscarParticipacao(grupo.id, usuario.id)) {
        throw new BusinessRuleError('Você já participa deste grupo')
      }
      if (dados.playerId !== undefined && dados.playerId !== null) {
        if (!Number.isInteger(dados.playerId) || dados.playerId <= 0) throw new ValidationError('playerId inválido')
        const jogador = await playersRepo.buscarPorId(dados.playerId)
        if (!jogador || jogador.groupId !== grupo.id || !jogador.active) throw new NotFoundError('Jogador não encontrado')
        if (await groupsRepo.buscarParticipacaoPorJogador(jogador.id)) {
          throw new BusinessRuleError('Esse jogador já está ligado a outra conta')
        }
        const participacao = await groupsRepo.entrarComoJogador({ groupId: grupo.id, userId: usuario.id, playerId: jogador.id })
        return grupoParaParticipante(grupo, participacao)
      }
      const participacao = await groupsRepo.entrar({
        groupId: grupo.id, userId: usuario.id, jogador: lerJogador(usuario, dados),
      })
      return grupoParaParticipante(grupo, participacao)
    },

    async membros(participacao) {
      return groupsRepo.listarMembros(participacao.groupId)
    },

    // Organizador muda o papel e/ou o jogador vinculado de um membro.
    // { role: 'ORGANIZER' | 'MEMBER' } e/ou { playerId: 3 | null }
    async alterarMembro(participacao, userId, dados) {
      const { groupId } = participacao
      const alvo = await membroOuFalhar(groupId, userId)
      const mudancas = {}

      if (dados.role !== undefined) {
        mudancas.role = validarPapelNoGrupo(dados.role)
        verificarPodeMudarPapel({ quemPede: participacao, alvo, novoPapel: mudancas.role })
        if (mudancas.role !== 'ORGANIZER') {
          verificarSobraOrganizador({ alvo, totalOrganizadores: await groupsRepo.contarOrganizadores(groupId) })
        }
      }

      if (dados.playerId !== undefined) {
        const { playerId } = dados
        if (playerId !== null) {
          if (!Number.isInteger(playerId) || playerId <= 0) {
            throw new ValidationError('playerId deve ser um inteiro positivo ou null')
          }
          // Jogador de outro grupo é tratado como inexistente.
          const jogador = await playersRepo.buscarPorId(playerId)
          if (!jogador || jogador.groupId !== groupId) throw new NotFoundError('Jogador não encontrado')
          const dono = await groupsRepo.buscarParticipacaoPorJogador(playerId)
          if (dono && dono.userId !== userId) {
            throw new BusinessRuleError('Jogador já está vinculado a outra pessoa')
          }
        }
        mudancas.playerId = playerId
      }

      if (Object.keys(mudancas).length === 0) throw new ValidationError('Informe role e/ou playerId')
      return groupsRepo.atualizarParticipacao(groupId, userId, mudancas)
    },

    // Remover alguém (organizador) ou sair (o próprio). O jogador fica no grupo, com o histórico.
    async removerMembro(participacao, userId) {
      const { groupId } = participacao
      const alvo = await membroOuFalhar(groupId, userId)
      verificarPodeRemover({ quemPede: participacao, alvo })
      verificarSobraOrganizador({ alvo, totalOrganizadores: await groupsRepo.contarOrganizadores(groupId) })
      await groupsRepo.removerParticipacao(groupId, userId)
    },
  }
}
