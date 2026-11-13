import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'
import { criarTokens } from '../src/features/auth/tokens.js'

const SEGREDO = 'segredo-de-teste-com-mais-de-32-caracteres!!'
const tokens = criarTokens({ obterSegredo: () => SEGREDO })

describe('tokens (JWT)', () => {
  it('emite um token e verifica devolvendo o id do usuário', () => {
    expect(tokens.verificar(tokens.emitir(42))).toBe(42)
  })

  it('o token não carrega o papel (só o id), para mudanças de papel valerem na hora', () => {
    const dados = jwt.decode(tokens.emitir(7))
    expect(Object.keys(dados).sort()).toEqual(['exp', 'iat', 'sub'])
  })

  it('rejeita token vencido com 401', () => {
    const vencido = criarTokens({ obterSegredo: () => SEGREDO, expiraEmSegundos: -10 })
    expect(() => tokens.verificar(vencido.emitir(1))).toThrow(
      expect.objectContaining({ status: 401 }),
    )
  })

  it('rejeita token assinado com outro segredo', () => {
    const forjado = jwt.sign({}, 'outro-segredo-qualquer', { subject: '1', expiresIn: 60 })
    expect(() => tokens.verificar(forjado)).toThrow(expect.objectContaining({ status: 401 }))
  })

  it('rejeita token adulterado', () => {
    const token = tokens.emitir(1)
    const adulterado = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa')
    expect(() => tokens.verificar(adulterado)).toThrow(expect.objectContaining({ status: 401 }))
  })

  it('rejeita token sem assinatura (alg: none)', () => {
    const semAssinatura = jwt.sign({}, '', { algorithm: 'none', subject: '1' })
    expect(() => tokens.verificar(semAssinatura)).toThrow(expect.objectContaining({ status: 401 }))
  })

  it('rejeita lixo e texto vazio', () => {
    expect(() => tokens.verificar('isso-nao-e-jwt')).toThrow(expect.objectContaining({ status: 401 }))
    expect(() => tokens.verificar('')).toThrow(expect.objectContaining({ status: 401 }))
  })

  it('sem JWT_SECRET configurado falha (não assina com segredo vazio)', () => {
    const semSegredo = criarTokens({ obterSegredo: () => undefined })
    expect(() => semSegredo.emitir(1)).toThrow('JWT_SECRET')
  })
})
