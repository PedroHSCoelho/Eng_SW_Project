import { describe, expect, it } from 'vitest'
import {
  ALFABETO_DO_CONVITE,
  gerarCodigoDeConvite,
  grupoParaParticipante,
  normalizarCodigo,
  validarNomeDoGrupo,
  validarPapelNoGrupo,
  verificarPodeMudarPapel,
  verificarPodeRemover,
  verificarSobraOrganizador,
} from '../src/features/groups/core/groups.core.js'

describe('validarNomeDoGrupo', () => {
  it('aceita de 3 a 60 caracteres e tira os espaços das pontas', () => {
    expect(validarNomeDoGrupo({ name: '  Pelada de quinta  ' })).toEqual({ name: 'Pelada de quinta' })
  })

  it.each([undefined, '', 'ab', 'x'.repeat(61), 123])('recusa %s (400)', (name) => {
    expect(() => validarNomeDoGrupo({ name })).toThrow('Nome do grupo deve ter de 3 a 60 caracteres')
  })
})

describe('gerarCodigoDeConvite', () => {
  it('gera 8 caracteres do alfabeto sem símbolos que se confundem', () => {
    const codigo = gerarCodigoDeConvite([0, 1, 2, 3, 31, 32, 255, 100])
    expect(codigo).toHaveLength(8)
    expect(codigo).toBe('ABCD9A9E')
    expect(ALFABETO_DO_CONVITE).toHaveLength(32)
    expect(ALFABETO_DO_CONVITE).not.toMatch(/[0O1I]/)
  })

  it('mesmos bytes, mesmo código (determinístico: a aleatoriedade vem de fora)', () => {
    const bytes = [9, 8, 7, 6, 5, 4, 3, 2]
    expect(gerarCodigoDeConvite(bytes)).toBe(gerarCodigoDeConvite(bytes))
  })

  it('falha com menos de 8 bytes', () => {
    expect(() => gerarCodigoDeConvite([1, 2])).toThrow()
  })
})

describe('normalizarCodigo', () => {
  it('ignora espaços e maiúsculas/minúsculas', () => {
    expect(normalizarCodigo('  abcd2345 ')).toBe('ABCD2345')
  })

  it.each([undefined, '', 'abc', 'ABCD-2345', 'x'.repeat(13), 42])('formato inválido %s vira null', (valor) => {
    expect(normalizarCodigo(valor)).toBeNull()
  })
})

describe('validarPapelNoGrupo', () => {
  it('aceita ORGANIZER e MEMBER e recusa o resto', () => {
    expect(validarPapelNoGrupo('MEMBER')).toBe('MEMBER')
    expect(() => validarPapelNoGrupo('PLAYER')).toThrow('Papel inválido')
  })
})

describe('verificarSobraOrganizador (o grupo nunca fica sem organizador)', () => {
  it('barra o último organizador (422)', () => {
    expect(() => verificarSobraOrganizador({ alvo: { role: 'ORGANIZER' }, totalOrganizadores: 1 })).toThrow(
      'O grupo precisa ter ao menos um admin',
    )
  })

  it('deixa quando há outro organizador', () => {
    expect(() => verificarSobraOrganizador({ alvo: { role: 'ORGANIZER' }, totalOrganizadores: 2 })).not.toThrow()
  })

  it('membro comum nunca é barrado por esta regra', () => {
    expect(() => verificarSobraOrganizador({ alvo: { role: 'MEMBER' }, totalOrganizadores: 1 })).not.toThrow()
  })
})

describe('verificarPodeRemover', () => {
  const membro = { userId: 2, role: 'MEMBER' }
  const organizador = { userId: 1, role: 'ORGANIZER' }

  it('qualquer um pode sair sozinho', () => {
    expect(() => verificarPodeRemover({ quemPede: membro, alvo: membro })).not.toThrow()
  })

  it('organizador remove outra pessoa', () => {
    expect(() => verificarPodeRemover({ quemPede: organizador, alvo: membro })).not.toThrow()
  })

  it('membro não remove outra pessoa', () => {
    expect(() => verificarPodeRemover({ quemPede: membro, alvo: organizador })).toThrow(/Só um admin/)
  })
})

describe('verificarPodeMudarPapel', () => {
  const ana = { userId: 1, role: 'ORGANIZER' }
  const beto = { userId: 2, role: 'ORGANIZER' }

  it('admin não tira o próprio admin', () => {
    expect(() => verificarPodeMudarPapel({ quemPede: ana, alvo: ana, novoPapel: 'MEMBER' })).toThrow(
      'Você não pode tirar o seu próprio admin',
    )
  })

  it('admin tira o admin de outro', () => {
    expect(() => verificarPodeMudarPapel({ quemPede: ana, alvo: beto, novoPapel: 'MEMBER' })).not.toThrow()
  })

  it('mandar o mesmo papel para si mesmo passa', () => {
    expect(() => verificarPodeMudarPapel({ quemPede: ana, alvo: ana, novoPapel: 'ORGANIZER' })).not.toThrow()
  })
})

describe('grupoParaParticipante', () => {
  const grupo = { id: 1, name: 'Pelada', inviteCode: 'ABCD2345' }

  it('organizador vê o código de convite', () => {
    expect(grupoParaParticipante(grupo, { role: 'ORGANIZER', playerId: 3 })).toEqual({
      id: 1, name: 'Pelada', myRole: 'ORGANIZER', myPlayerId: 3, inviteCode: 'ABCD2345',
    })
  })

  it('membro não vê o código', () => {
    expect(grupoParaParticipante(grupo, { role: 'MEMBER', playerId: null })).not.toHaveProperty('inviteCode')
  })
})
