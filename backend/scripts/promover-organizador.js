// Bootstrap do primeiro organizador (ou recuperação de acesso se o sistema ficar sem nenhum).
// Uso:  npm run organizador:promover -- email@exemplo.com
// A pessoa precisa já ter criado a conta. Quem roda este comando precisa ter acesso ao banco
// (a credencial está no .env), por isso é uma operação de quem administra o sistema,
// e não uma rota da API.
import 'dotenv/config'
import prisma from '../src/db.js'

const email = process.argv[2]?.trim().toLowerCase()

if (!email) {
  console.error('Uso: npm run organizador:promover -- email@exemplo.com')
  process.exit(1)
}

try {
  const usuario = await prisma.user.findUnique({ where: { email } })
  if (!usuario) {
    console.error(`Nenhuma conta com o e-mail ${email}. Crie a conta na tela de cadastro primeiro.`)
    process.exitCode = 1
  } else if (usuario.role === 'ORGANIZER') {
    console.log(`${email} já é organizador. Nada a fazer.`)
  } else {
    await prisma.user.update({ where: { id: usuario.id }, data: { role: 'ORGANIZER' } })
    console.log(`${email} agora é organizador.`)
  }
} finally {
  await prisma.$disconnect()
}
