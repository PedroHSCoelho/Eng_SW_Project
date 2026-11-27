// Travas do script de ambientes (scripts/ambiente.js): garantem que dev e test nunca usam o
// banco de produção e que os testes de banco só rodam num schema de teste.
import { describe, expect, it } from 'vitest'
import { conferirAmbiente, identidadeDoBanco } from '../scripts/ambiente.js'

const supabase = (projeto, porta, extra = '') =>
  `postgresql://postgres.${projeto}:senha@aws-0-us-east-2.pooler.supabase.com:${porta}/postgres${extra}`

const prod = { BANCO: 'producao', DATABASE_URL: supabase('prodabc', 6543, '?pgbouncer=true'), DIRECT_URL: supabase('prodabc', 5432) }
const dev = { BANCO: 'dev', DATABASE_URL: supabase('devxyz', 6543, '?pgbouncer=true'), DIRECT_URL: supabase('devxyz', 5432) }
const test = {
  BANCO: 'test',
  DATABASE_URL: supabase('devxyz', 6543, '?pgbouncer=true&schema=test'),
  DIRECT_URL: supabase('devxyz', 5432, '?schema=test'),
}

describe('identidadeDoBanco', () => {
  it('ignora a porta e a senha (pooler 6543 e direta 5432 são o mesmo banco)', () => {
    expect(identidadeDoBanco(prod.DATABASE_URL)).toBe(identidadeDoBanco(prod.DIRECT_URL))
  })
  it('projetos e schemas diferentes são bancos diferentes', () => {
    expect(identidadeDoBanco(dev.DIRECT_URL)).not.toBe(identidadeDoBanco(prod.DIRECT_URL))
    expect(identidadeDoBanco(test.DIRECT_URL)).not.toBe(identidadeDoBanco(dev.DIRECT_URL))
  })
})

describe('conferirAmbiente', () => {
  it('dev e test separados da produção: pode rodar', () => {
    expect(conferirAmbiente({ nome: 'dev', vars: dev, varsDeProd: prod })).toEqual([])
    expect(conferirAmbiente({ nome: 'test', vars: test, varsDeProd: prod })).toEqual([])
  })

  it('recusa dev ou test apontando para o banco de produção', () => {
    expect(conferirAmbiente({ nome: 'dev', vars: { ...prod, BANCO: 'dev' }, varsDeProd: prod })[0]).toMatch(/PRODUÇÃO/)
    const testNaProd = { BANCO: 'test', DATABASE_URL: prod.DATABASE_URL, DIRECT_URL: test.DIRECT_URL }
    expect(conferirAmbiente({ nome: 'test', vars: testNaProd, varsDeProd: prod }).join()).toMatch(/PRODUÇÃO/)
  })

  it('test sem schema de teste é recusado (os testes apagam os dados)', () => {
    expect(conferirAmbiente({ nome: 'test', vars: { ...dev, BANCO: 'test' }, varsDeProd: prod })[0]).toMatch(/schema de teste/)
  })

  it('.env antigo, sem a marca BANCO=dev (ainda com a senha da produção), é recusado', () => {
    const { BANCO: _marca, ...envAntigo } = prod
    expect(conferirAmbiente({ nome: 'dev', vars: envAntigo })[0]).toMatch(/BANCO=dev.*renomeie para .env.production/)
  })

  it('em produção só passa migrate deploy/status', () => {
    expect(conferirAmbiente({ nome: 'prod', vars: prod, comando: ['prisma', 'migrate', 'deploy'] })).toEqual([])
    expect(conferirAmbiente({ nome: 'prod', vars: prod, comando: ['prisma', 'migrate', 'reset', '--force'] })).toHaveLength(1)
    expect(conferirAmbiente({ nome: 'prod', vars: prod, comando: ['node', 'prisma/seed.js'] })).toHaveLength(1)
  })

  it('variável faltando ou ambiente desconhecido', () => {
    expect(conferirAmbiente({ nome: 'dev', vars: { BANCO: 'dev', DATABASE_URL: dev.DATABASE_URL } })).toEqual(['Falta DIRECT_URL em .env'])
    expect(conferirAmbiente({ nome: 'homolog', vars: dev })[0]).toMatch(/desconhecido/)
  })
})
