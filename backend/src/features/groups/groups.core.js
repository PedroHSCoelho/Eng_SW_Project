// Núcleo puro dos grupos: só regras, sem banco, Express ou aleatoriedade própria
// (os bytes aleatórios do convite vêm de fora, para o teste poder fixá-los).
import { BusinessRuleError, ValidationError } from '../../errors/AppError.js'

// Mesmos valores do enum GroupRole do schema.prisma
export const PAPEIS_NO_GRUPO = ['ORGANIZER', 'MEMBER']

// Sem 0/O e 1/I, que se confundem quando alguém digita o código lido no celular.
// São 32 símbolos: 256 (valores de um byte) é múltiplo de 32, então `byte % 32` não favorece nenhum.
export const ALFABETO_DO_CONVITE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const TAMANHO_DO_CONVITE = 8

export function validarNomeDoGrupo(dados) {
  const name = typeof dados?.name === 'string' ? dados.name.trim() : ''
  if (name.length < 3 || name.length > 60) {
    throw new ValidationError('Nome do grupo deve ter de 3 a 60 caracteres')
  }
  return { name }
}

// Transforma bytes aleatórios em um código legível de 8 caracteres.
export function gerarCodigoDeConvite(bytes) {
  if (!bytes || bytes.length < TAMANHO_DO_CONVITE) throw new Error('Bytes insuficientes para o convite')
  let codigo = ''
  for (let i = 0; i < TAMANHO_DO_CONVITE; i++) codigo += ALFABETO_DO_CONVITE[bytes[i] % 32]
  return codigo
}

// O código chega da URL ou digitado: ignora espaços e maiúsculas/minúsculas.
// Formato inválido é tratado como convite inexistente (não diz o que está errado).
export function normalizarCodigo(valor) {
  const codigo = typeof valor === 'string' ? valor.trim().toUpperCase() : ''
  return /^[A-Z0-9]{4,12}$/.test(codigo) ? codigo : null
}

export function validarPapelNoGrupo(papel) {
  if (!PAPEIS_NO_GRUPO.includes(papel)) throw new ValidationError('Papel inválido')
  return papel
}

// Regra central: o grupo nunca fica sem organizador (ninguém mais conseguiria gerenciá-lo).
// Vale para rebaixar, remover e sair: em todos, um organizador deixa de ser organizador.
export function verificarSobraOrganizador({ alvo, totalOrganizadores }) {
  if (alvo.role === 'ORGANIZER' && totalOrganizadores <= 1) {
    throw new BusinessRuleError('O grupo precisa ter ao menos um admin')
  }
}

// Quem pode tirar quem do grupo: qualquer um sai sozinho; só organizador remove outra pessoa.
export function verificarPodeRemover({ quemPede, alvo }) {
  const ehOProprio = quemPede.userId === alvo.userId
  if (!ehOProprio && quemPede.role !== 'ORGANIZER') {
    throw new BusinessRuleError('Só um admin pode remover outra pessoa do grupo')
  }
}

// O que a tela recebe sobre o grupo. O código de convite só aparece para organizador.
export function grupoParaParticipante(grupo, participacao) {
  return {
    id: grupo.id,
    name: grupo.name,
    myRole: participacao.role,
    myPlayerId: participacao.playerId ?? null,
    ...(participacao.role === 'ORGANIZER' && { inviteCode: grupo.inviteCode }),
  }
}
