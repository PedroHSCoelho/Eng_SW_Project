// Núcleo puro da autenticação: só valida e decide, sem banco, Express, bcrypt ou JWT.
// É a parte mais fácil de testar e de explicar ("core decides, shell executes").
import { ValidationError } from '../../../errors/AppError.js'

// Formato simples (algo@dominio.tld). Não prova que o e-mail existe, só barra lixo óbvio.
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : ''
}

// O bcrypt só lê os 72 primeiros bytes da senha; por isso o limite máximo é 72.
export function validarCadastro(dados) {
  const name = texto(dados.name)
  if (name.length < 2 || name.length > 50) {
    throw new ValidationError('Nome deve ter de 2 a 50 caracteres')
  }
  const email = texto(dados.email).toLowerCase()
  if (email.length > 254 || !FORMATO_EMAIL.test(email)) {
    throw new ValidationError('E-mail inválido')
  }
  const password = typeof dados.password === 'string' ? dados.password : ''
  if (password.length < 8 || Buffer.byteLength(password) > 72) {
    throw new ValidationError('Senha deve ter de 8 a 72 caracteres')
  }
  return { name, email, password }
}

// No login não validamos o tamanho da senha: qualquer erro vira "e-mail ou senha inválidos".
export function validarLogin(dados) {
  const email = texto(dados.email).toLowerCase()
  const password = typeof dados.password === 'string' ? dados.password : ''
  if (!email || !password) {
    throw new ValidationError('Informe e-mail e senha')
  }
  return { email, password }
}

// O que pode sair pela API: nunca o hash da senha.
export function usuarioPublico(usuario) {
  const publico = { ...usuario }
  delete publico.passwordHash
  return publico
}

// Lê um cookie do cabeçalho "Cookie: a=1; token=xyz". Evita a dependência cookie-parser.
export function lerCookie(cabecalho, nome) {
  if (typeof cabecalho !== 'string') return null
  for (const parte of cabecalho.split(';')) {
    const [chave, ...resto] = parte.trim().split('=')
    if (chave === nome) {
      try {
        return decodeURIComponent(resto.join('='))
      } catch {
        return null
      }
    }
  }
  return null
}
