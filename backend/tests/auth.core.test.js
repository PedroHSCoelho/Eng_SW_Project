import { describe, expect, it } from 'vitest'
import {
  lerCookie,
  validarCadastro,
  validarLogin,
  validarPapel,
} from '../src/features/auth/auth.core.js'

const valido = { name: 'Maria Souza', email: 'Maria@Exemplo.com ', password: 'senha-forte-1' }

describe('validarCadastro', () => {
  it('normaliza nome e e-mail (sem espaços, e-mail em minúsculas) e mantém a senha como veio', () => {
    expect(validarCadastro(valido)).toEqual({
      name: 'Maria Souza',
      email: 'maria@exemplo.com',
      password: 'senha-forte-1',
    })
  })

  it.each([
    [{ ...valido, name: 'A' }, 'Nome'],
    [{ ...valido, name: 'x'.repeat(51) }, 'Nome'],
    [{ ...valido, name: 123 }, 'Nome'],
    [{ ...valido, email: 'sem-arroba' }, 'E-mail'],
    [{ ...valido, email: undefined }, 'E-mail'],
    [{ ...valido, password: 'curta' }, 'Senha'],
    [{ ...valido, password: 'a'.repeat(73) }, 'Senha'],
    [{ ...valido, password: 'é'.repeat(37) }, 'Senha'], // 74 bytes: o bcrypt cortaria
    [{ ...valido, password: undefined }, 'Senha'],
  ])('rejeita dados inválidos (%#)', (dados, campo) => {
    expect(() => validarCadastro(dados)).toThrow(campo)
  })
})

describe('validarLogin', () => {
  it('normaliza o e-mail', () => {
    expect(validarLogin({ email: ' A@B.com', password: 'x' })).toEqual({ email: 'a@b.com', password: 'x' })
  })
  it('exige e-mail e senha', () => {
    expect(() => validarLogin({ email: '', password: 'x' })).toThrow('Informe')
    expect(() => validarLogin({ email: 'a@b.com' })).toThrow('Informe')
  })
})

describe('validarPapel', () => {
  it('aceita só os papéis do sistema', () => {
    expect(validarPapel('ORGANIZER')).toBe('ORGANIZER')
    expect(() => validarPapel('ADMIN')).toThrow('Papel inválido')
    expect(() => validarPapel(undefined)).toThrow('Papel inválido')
  })
})

describe('lerCookie', () => {
  it('acha o cookie pelo nome entre vários', () => {
    expect(lerCookie('a=1; token=abc.def; b=2', 'token')).toBe('abc.def')
  })
  it('devolve null quando não existe, o cabeçalho falta ou o valor é inválido', () => {
    expect(lerCookie('a=1', 'token')).toBeNull()
    expect(lerCookie(undefined, 'token')).toBeNull()
    expect(lerCookie('token=%E0%A4%A', 'token')).toBeNull()
  })
})
