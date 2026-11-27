// Casca fina sobre o bcryptjs. O bcrypt é lento DE PROPÓSITO (custo configurável):
// quem roubar o banco não consegue testar bilhões de senhas por segundo.
import bcrypt from 'bcryptjs'

export function criarHasher({ custo = 10 } = {}) {
  return {
    gerar: (senha) => bcrypt.hash(senha, custo),
    comparar: (senha, hash) => bcrypt.compare(senha, hash),
  }
}
