// Integração com o PostgreSQL de TESTE: os repositórios REAIS (Prisma) e as migrações.
// Os testes de tests/ usam repositórios em memória; aqui conferimos o que só o banco garante.
// Rodar: npm run test:db (lê o .env.test e se recusa a rodar fora do schema de teste).
import { describe, expect, it } from 'vitest'
import prisma from '../src/db.js'
import { playersRepository } from '../src/features/players/players.repository.js'
import { matchesRepository } from '../src/features/matches/matches.repository.js'
import { attendanceRepository } from '../src/features/attendance/attendance.repository.js'
import { BusinessRuleError } from '../src/errors/AppError.js'

const jogador = (groupId, nickname, extra = {}) => ({
  groupId,
  name: `Jogador ${nickname}`,
  nickname,
  nicknameKey: nickname.toLowerCase(),
  position: 'MIDFIELDER',
  ...extra,
})

async function grupoComJogadores(quantos = 4) {
  const grupo = await prisma.group.create({ data: { name: 'Grupo de teste', inviteCode: 'TESTE001' } })
  const jogadores = []
  for (let i = 1; i <= quantos; i += 1) jogadores.push(await playersRepository.criar(jogador(grupo.id, `J${i}`)))
  return { grupo, jogadores }
}

describe('migrações', () => {
  it('todas as migrações foram aplicadas no schema de teste', async () => {
    const [{ total }] = await prisma.$queryRaw`SELECT count(*)::int AS total FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`
    expect(total).toBeGreaterThanOrEqual(17)
  })
})

describe('playersRepository (Prisma de verdade)', () => {
  it('apelido repetido NO MESMO grupo: o @@unique do banco barra e vira erro de negócio', async () => {
    const { grupo } = await grupoComJogadores(1)
    await expect(playersRepository.criar(jogador(grupo.id, 'j1'))).rejects.toThrow(BusinessRuleError)
  })

  it('o mesmo apelido em OUTRO grupo pode', async () => {
    await grupoComJogadores(1)
    const outro = await prisma.group.create({ data: { name: 'Outro', inviteCode: 'TESTE002' } })
    await expect(playersRepository.criar(jogador(outro.id, 'J1'))).resolves.toMatchObject({ nickname: 'J1' })
  })

  it('a nota do admin (skill) não sai na consulta, a não ser que peça (omit do db.js)', async () => {
    const { grupo } = await grupoComJogadores(0)
    const criado = await playersRepository.criar(jogador(grupo.id, 'Zé', { skill: 4.5 }))
    expect(await playersRepository.buscarPorId(criado.id)).not.toHaveProperty('skill')
    expect(await playersRepository.buscarPorId(criado.id, { comNota: true })).toMatchObject({ skill: 4.5 })
  })

  it('listar só do grupo e, com apenasAtivos, sem os inativos', async () => {
    const { grupo, jogadores } = await grupoComJogadores(3)
    await playersRepository.atualizar(jogadores[0].id, { active: false })
    expect(await playersRepository.listar({ groupId: grupo.id, apenasAtivos: false })).toHaveLength(3)
    expect(await playersRepository.listar({ groupId: grupo.id, apenasAtivos: true })).toHaveLength(2)
  })

  it('jogador escalado numa partida não pode ser excluído (onDelete: Restrict)', async () => {
    const { grupo, jogadores } = await grupoComJogadores(2)
    const partida = await matchesRepository.criar({ groupId: grupo.id, date: new Date(), location: 'Quadra' })
    await matchesRepository.substituirEscalacao(partida.id, [
      { playerId: jogadores[0].id, team: 'A' },
      { playerId: jogadores[1].id, team: 'B' },
    ])
    expect(await playersRepository.possuiPartidas(jogadores[0].id)).toBe(true)
    await expect(playersRepository.excluir(jogadores[0].id)).rejects.toThrow()
  })
})

describe('matchesRepository (Prisma de verdade)', () => {
  it('a escalação é trocada inteira numa transação', async () => {
    const { grupo, jogadores } = await grupoComJogadores(4)
    const [a, b, c, d] = jogadores.map((j) => j.id)
    const partida = await matchesRepository.criar({ groupId: grupo.id, date: new Date(), location: 'Quadra' })
    await matchesRepository.substituirEscalacao(partida.id, [{ playerId: a, team: 'A' }, { playerId: b, team: 'B' }])
    const nova = await matchesRepository.substituirEscalacao(partida.id, [{ playerId: c, team: 'A' }, { playerId: d, team: 'B' }])
    expect(nova.players.map((p) => p.playerId)).toEqual([c, d])
  })

  it('gols voltam pelo minuto, com os sem minuto no fim', async () => {
    const { grupo, jogadores } = await grupoComJogadores(2)
    const [a] = jogadores.map((j) => j.id)
    const partida = await matchesRepository.criar({ groupId: grupo.id, date: new Date(), location: 'Quadra' })
    for (const minute of [30, null, 5]) await matchesRepository.criarGol({ matchId: partida.id, scorerId: a, team: 'A', minute })
    const lida = await matchesRepository.buscarPorId(partida.id)
    expect(lida.goals.map((g) => g.minute)).toEqual([5, 30, null])
  })

  it('pelada: o índice único parcial deixa só UM jogo aberto por partida', async () => {
    const { grupo } = await grupoComJogadores(0)
    const partida = await matchesRepository.criar({
      groupId: grupo.id, date: new Date(), location: 'Quadra', format: 'PELADA', teamCount: 3, status: 'IN_PROGRESS',
    })
    await matchesRepository.criarJogo({ matchId: partida.id, number: 1, homeTeam: 'A', awayTeam: 'B' })
    await expect(
      matchesRepository.criarJogo({ matchId: partida.id, number: 2, homeTeam: 'A', awayTeam: 'C' }),
    ).rejects.toThrow('Já existe um jogo aberto')
  })

  it('mudarStatus só troca se o status ainda for o esperado (dois cliques ao mesmo tempo)', async () => {
    const { grupo } = await grupoComJogadores(0)
    const partida = await matchesRepository.criar({ groupId: grupo.id, date: new Date(), location: 'Quadra' })
    await matchesRepository.mudarStatus(partida.id, { de: 'SCHEDULED', para: 'IN_PROGRESS' })
    await expect(matchesRepository.mudarStatus(partida.id, { de: 'SCHEDULED', para: 'IN_PROGRESS' })).rejects.toThrow(
      BusinessRuleError,
    )
  })
})

describe('attendanceRepository (Prisma de verdade)', () => {
  it('confirmar duas vezes não duplica (skipDuplicates + chave matchId/playerId)', async () => {
    const { grupo, jogadores } = await grupoComJogadores(1)
    const partida = await matchesRepository.criar({ groupId: grupo.id, date: new Date(), location: 'Quadra' })
    await attendanceRepository.adicionar({ matchId: partida.id, playerId: jogadores[0].id })
    await attendanceRepository.adicionar({ matchId: partida.id, playerId: jogadores[0].id })
    expect(await attendanceRepository.listarDaPartida(partida.id)).toHaveLength(1)
  })
})
