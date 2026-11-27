// Dados de exemplo para o banco de DESENVOLVIMENTO (npm run db:seed).
// Cria um admin, um grupo com 12 jogadores, uma partida finalizada (com gols, para o ranking
// e o perfil terem números) e uma partida agendada com lista de presença.
// Só roda pelo script de ambientes no ambiente dev: nunca em teste nem em produção.
import bcrypt from 'bcryptjs'
import prisma from '../src/db.js'

if (process.env.AMBIENTE !== 'dev') {
  console.error('O seed só roda no banco de desenvolvimento: use "npm run db:seed".')
  process.exit(1)
}

const ADMIN = { name: 'Admin Dev', email: 'admin@dev.local', senha: 'senha-dev-123' }
const NOME_DO_GRUPO = 'Pelada de dev'

const JOGADORES = [
  ['Marcos Goleiro', 'Paredão', 'GOALKEEPER', 4],
  ['Rafael Lima', 'Rafinha', 'FORWARD', 4.5],
  ['João Sampaio', 'Sampaio', 'MIDFIELDER', 3.5],
  ['Carlos Souza', 'Carlão', 'DEFENDER', 3],
  ['Pedro Alves', 'Pedrinho', 'FORWARD', 3.5],
  ['Lucas Rocha', 'Luquinhas', 'MIDFIELDER', 2.5],
  ['André Dias', 'Dedé', 'DEFENDER', 2],
  ['Bruno Ferreira', 'Brunão', 'GOALKEEPER', 3],
  ['Thiago Melo', 'Thiaguinho', 'MIDFIELDER', 4],
  ['Gustavo Reis', 'Guga', 'FORWARD', 2.5],
  ['Felipe Costa', 'Felipão', 'DEFENDER', 3],
  ['Diego Nunes', 'Dieguito', 'MIDFIELDER', null],
]

async function main() {
  if (await prisma.group.findFirst({ where: { name: NOME_DO_GRUPO } })) {
    console.log(`O grupo "${NOME_DO_GRUPO}" já existe: nada a fazer. Para recomeçar do zero: npm run db:reset`)
    return
  }

  const user = await prisma.user.create({
    data: { name: ADMIN.name, email: ADMIN.email, passwordHash: await bcrypt.hash(ADMIN.senha, 10) },
  })
  const grupo = await prisma.group.create({ data: { name: NOME_DO_GRUPO, inviteCode: 'DEVDEV23' } })
  const jogadores = []
  for (const [name, nickname, position, skill] of JOGADORES) {
    jogadores.push(
      await prisma.player.create({
        data: { groupId: grupo.id, name, nickname, nicknameKey: nickname.toLowerCase(), position, skill },
      }),
    )
  }
  // O admin é o primeiro jogador (Paredão) e organizador do grupo.
  await prisma.membership.create({ data: { groupId: grupo.id, userId: user.id, role: 'ORGANIZER', playerId: jogadores[0].id } })

  // Partida da semana passada, finalizada: Time A 2 x 1 Time B.
  const semanaPassada = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const timeA = jogadores.slice(0, 6)
  const timeB = jogadores.slice(6, 12)
  const finalizada = await prisma.match.create({
    data: {
      groupId: grupo.id, date: semanaPassada, location: 'Quadra da faculdade',
      status: 'FINISHED', result: 'A_WINS', finishedAt: semanaPassada,
      players: {
        create: [...timeA.map((j) => ({ playerId: j.id, team: 'A' })), ...timeB.map((j) => ({ playerId: j.id, team: 'B' }))],
      },
    },
  })
  await prisma.goal.createMany({
    data: [
      { matchId: finalizada.id, scorerId: timeA[1].id, assistId: timeA[2].id, team: 'A', minute: 12 },
      { matchId: finalizada.id, scorerId: timeB[2].id, team: 'B', minute: 30 },
      { matchId: finalizada.id, scorerId: timeA[4].id, assistId: timeA[1].id, team: 'A', minute: 41 },
    ],
  })

  // Partida da semana que vem, agendada, com 14 vagas e 8 confirmados.
  const semanaQueVem = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const agendada = await prisma.match.create({
    data: { groupId: grupo.id, date: semanaQueVem, location: 'Quadra da faculdade', maxPlayers: 14 },
  })
  await prisma.attendance.createMany({ data: jogadores.slice(0, 8).map((j) => ({ matchId: agendada.id, playerId: j.id })) })

  console.log(`Pronto. Entre com ${ADMIN.email} / ${ADMIN.senha} (grupo "${NOME_DO_GRUPO}", convite ${grupo.inviteCode}).`)
}

main()
  .catch((erro) => {
    console.error(erro)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
