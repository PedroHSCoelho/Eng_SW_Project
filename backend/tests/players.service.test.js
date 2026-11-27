import { describe, expect, it } from 'vitest'
import { BusinessRuleError, NotFoundError, ValidationError } from '../src/errors/AppError.js'
import { combinaComBusca, criarPlayersService, semAcento } from '../src/features/players/service/players.service.js'

// Repositório falso: só o que o serviço precisa, sem Prisma nem banco.
// Assim cada regra é testada isolada (núcleo decide, casca executa).
function repoFalso(sobrescritas = {}) {
  return {
    buscarPorNicknameKey: async () => null,
    criar: async (dados) => ({ id: 1, active: true, ...dados }),
    ...sobrescritas,
  }
}

const dadosValidos = { name: 'João Silva', nickname: 'Joãozinho', position: 'FORWARD' }

describe('criar jogador', () => {
  it('rejeita nome com menos de 2 caracteres', async () => {
    const service = criarPlayersService(repoFalso())

    await expect(service.criar(1, { ...dadosValidos, name: 'J' })).rejects.toThrow(ValidationError)
  })

  it('rejeita nome com mais de 50 caracteres', async () => {
    const service = criarPlayersService(repoFalso())

    await expect(
      service.criar(1, { ...dadosValidos, name: 'a'.repeat(51) }),
    ).rejects.toThrow(ValidationError)
  })

  it('rejeita nome formado só por espaços', async () => {
    const service = criarPlayersService(repoFalso())

    await expect(service.criar(1, { ...dadosValidos, name: '   ' })).rejects.toThrow(ValidationError)
  })

  it.each([undefined, null, 123, {}])('rejeita nome que não é texto (%s)', async (name) => {
    const service = criarPlayersService(repoFalso())

    await expect(service.criar(1, { ...dadosValidos, name })).rejects.toThrow(ValidationError)
  })

  it.each([undefined, null, 123, '', '   ', 'a', 'a'.repeat(31)])(
    'rejeita apelido ausente, não-texto ou fora de 2 a 30 caracteres (%s)',
    async (nickname) => {
      const service = criarPlayersService(repoFalso())

      await expect(service.criar(1, { ...dadosValidos, nickname })).rejects.toThrow(ValidationError)
    },
  )

  it.each([undefined, null, '', 'goleiro', 'COACH', 1])(
    'rejeita posição que não é uma das quatro válidas (%s)',
    async (position) => {
      const service = criarPlayersService(repoFalso())

      await expect(service.criar(1, { ...dadosValidos, position })).rejects.toThrow(ValidationError)
    },
  )

  it.each(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'])(
    'aceita a posição %s',
    async (position) => {
      const service = criarPlayersService(repoFalso())

      const jogador = await service.criar(1, { ...dadosValidos, position })

      expect(jogador.position).toBe(position)
    },
  )

  it.each(['zé', 'ZÉ', ' Zé '])(
    'rejeita apelido já usado, sem diferenciar maiúsculas nem espaços nas pontas (%s)',
    async (nickname) => {
      const repo = repoFalso({
        buscarPorNicknameKey: async (_groupId, key) => (key === 'zé' ? { id: 2, nickname: 'Zé' } : null),
      })
      const service = criarPlayersService(repo)

      await expect(service.criar(1, { ...dadosValidos, nickname })).rejects.toThrow(BusinessRuleError)
    },
  )

  it('não grava nada quando o apelido já está em uso', async () => {
    let gravou = false
    const repo = repoFalso({
      buscarPorNicknameKey: async () => ({ id: 2 }),
      criar: async () => {
        gravou = true
      },
    })
    const service = criarPlayersService(repo)

    await expect(service.criar(1, dadosValidos)).rejects.toThrow('Apelido já está em uso')
    expect(gravou).toBe(false)
  })

  it('grava nome e apelido sem espaços nas pontas e com nicknameKey em minúsculas', async () => {
    let recebido
    const repo = repoFalso({
      criar: async (dados) => {
        recebido = dados
        return { id: 1, active: true, ...dados }
      },
    })
    const service = criarPlayersService(repo)

    await service.criar(1, { name: '  João Silva ', nickname: ' Joãozinho ', position: 'FORWARD' })

    expect(recebido).toEqual({
      groupId: 1,
      name: 'João Silva',
      nickname: 'Joãozinho',
      nicknameKey: 'joãozinho',
      position: 'FORWARD',
    })
  })

  it('ignora nicknameKey, id e active enviados pelo cliente', async () => {
    let recebido
    const repo = repoFalso({
      criar: async (dados) => {
        recebido = dados
        return { id: 1, active: true, ...dados }
      },
    })
    const service = criarPlayersService(repo)

    await service.criar(1, {
      ...dadosValidos,
      nicknameKey: 'qualquer-coisa',
      id: 999,
      active: false,
    })

    expect(recebido.nicknameKey).toBe('joãozinho')
    expect(recebido).not.toHaveProperty('id')
    expect(recebido).not.toHaveProperty('active')
  })

  it('aceita nome com exatamente 50 caracteres (limite)', async () => {
    const service = criarPlayersService(repoFalso())

    const jogador = await service.criar(1, { ...dadosValidos, name: 'a'.repeat(50) })

    expect(jogador.name).toBe('a'.repeat(50))
  })
})

describe('excluir jogador', () => {
  it('rejeita (404) quando o jogador não existe', async () => {
    const repo = repoFalso({ buscarPorId: async () => null })
    const service = criarPlayersService(repo)

    await expect(service.excluir(1, 99)).rejects.toThrow(NotFoundError)
  })

  it('não exclui quem já tem partida: orienta a inativar', async () => {
    let excluiu = false
    const repo = repoFalso({
      buscarPorId: async () => ({ groupId: 1, id: 1 }),
      possuiPartidas: async () => true,
      excluir: async () => {
        excluiu = true
      },
    })
    const service = criarPlayersService(repo)

    await expect(service.excluir(1, 1)).rejects.toThrow(BusinessRuleError)
    await expect(service.excluir(1, 1)).rejects.toThrow(/inativ/i)
    expect(excluiu).toBe(false)
  })

  it('exclui quem nunca jogou', async () => {
    let excluidoId
    const repo = repoFalso({
      buscarPorId: async () => ({ groupId: 1, id: 1 }),
      possuiPartidas: async () => false,
      excluir: async (id) => {
        excluidoId = id
      },
    })
    const service = criarPlayersService(repo)

    await service.excluir(1, 1)

    expect(excluidoId).toBe(1)
  })
})

describe('inativar jogador', () => {
  it('rejeita (404) quando o jogador não existe', async () => {
    const repo = repoFalso({ buscarPorId: async () => null })
    const service = criarPlayersService(repo)

    await expect(service.inativar(1, 99)).rejects.toThrow(NotFoundError)
  })

  it('marca o jogador como inativo, mesmo que já tenha partidas', async () => {
    const repo = repoFalso({
      buscarPorId: async () => ({ groupId: 1, id: 1, active: true }),
      possuiPartidas: async () => true,
      atualizar: async (id, dados) => ({ id, ...dados }),
    })
    const service = criarPlayersService(repo)

    const jogador = await service.inativar(1, 1)

    expect(jogador.active).toBe(false)
  })
})

describe('reativar jogador', () => {
  it('rejeita (404) quando o jogador não existe ou é de outro grupo', async () => {
    const service = criarPlayersService(repoFalso({ buscarPorId: async () => ({ groupId: 2, id: 1, active: false }) }))
    await expect(service.reativar(1, 1)).rejects.toThrow(NotFoundError)
  })

  it('jogador que já está ativo -> 422', async () => {
    const service = criarPlayersService(repoFalso({ buscarPorId: async () => ({ groupId: 1, id: 1, active: true }) }))
    await expect(service.reativar(1, 1)).rejects.toThrow(BusinessRuleError)
  })

  it('volta a ficar ativo', async () => {
    let gravado
    const repo = repoFalso({
      buscarPorId: async () => ({ groupId: 1, id: 1, active: false }),
      atualizar: async (id, dados) => {
        gravado = dados
        return { id, ...dados }
      },
    })
    const jogador = await criarPlayersService(repo).reativar(1, 1)
    expect(gravado).toEqual({ active: true })
    expect(jogador.active).toBe(true)
  })
})

describe('buscar jogador', () => {
  it('rejeita (404) quando o jogador não existe', async () => {
    const service = criarPlayersService(repoFalso({ buscarPorId: async () => null }))

    await expect(service.buscar(1, 99)).rejects.toThrow(NotFoundError)
  })

  it('devolve o jogador encontrado', async () => {
    const service = criarPlayersService(repoFalso({ buscarPorId: async (id) => ({ groupId: 1, id, name: 'Ana' }) }))

    await expect(service.buscar(1, 3)).resolves.toEqual({ groupId: 1, id: 3, name: 'Ana' })
  })
})

describe('listar jogadores', () => {
  it('repassa a busca sem espaços nas pontas e o filtro de ativos', async () => {
    let filtros
    const repo = repoFalso({
      listar: async (f) => {
        filtros = f
        return []
      },
    })
    const service = criarPlayersService(repo)

    await service.listar(1, { busca: '  ze ', apenasAtivos: true })

    // A busca não vai para o banco: é feita no serviço (para ignorar acentos).
    expect(filtros).toEqual({ groupId: 1, apenasAtivos: true, comNota: false })
  })

  it('sem filtros: busca vazia e inclui inativos', async () => {
    let filtros
    const repo = repoFalso({
      listar: async (f) => {
        filtros = f
        return []
      },
    })
    const service = criarPlayersService(repo)

    await service.listar(1, {})

    expect(filtros).toEqual({ groupId: 1, apenasAtivos: false, comNota: false })
  })

  it('busca ignora maiúsculas E acentos, no nome ou no apelido', async () => {
    const lista = [
      { id: 1, name: 'João Pedro', nickname: 'JP' },
      { id: 2, name: 'Carlos Souza', nickname: 'Carlão' },
      { id: 3, name: 'Ana', nickname: 'Aninha' },
    ]
    const service = criarPlayersService(repoFalso({ listar: async () => lista }))
    const ids = async (busca) => (await service.listar(1, { busca })).map((j) => j.id)

    expect(await ids('joao')).toEqual([1])
    expect(await ids('carlao')).toEqual([2])
    expect(await ids('CARLÃO')).toEqual([2])
    expect(await ids('  ')).toEqual([1, 2, 3])
    expect(await ids('xyz')).toEqual([])
  })
})

describe('semAcento / combinaComBusca', () => {
  it('tira acento e cedilha e passa para minúsculas', () => {
    expect(semAcento('Ação Conceição Ñandu Ü')).toBe('acao conceicao nandu u')
  })
  it('busca vazia combina com todos', () => {
    expect(combinaComBusca({ name: 'Zé', nickname: 'Zé' }, '')).toBe(true)
    expect(combinaComBusca({ name: 'José', nickname: 'Zé' }, 'ze')).toBe(true)
  })
})

describe('atualizar jogador', () => {
  const existente = { groupId: 1, id: 1, name: 'João', nickname: 'Zé', nicknameKey: 'zé', active: true }

  it('rejeita (404) quando o jogador não existe', async () => {
    const service = criarPlayersService(repoFalso({ buscarPorId: async () => null }))

    await expect(service.atualizar(1, 99, dadosValidos)).rejects.toThrow(NotFoundError)
  })

  it('valida os dados como no cadastro (nome curto -> 400)', async () => {
    const service = criarPlayersService(repoFalso({ buscarPorId: async () => existente }))

    await expect(service.atualizar(1, 1, { ...dadosValidos, name: 'J' })).rejects.toThrow(ValidationError)
  })

  it('rejeita apelido que pertence a OUTRO jogador', async () => {
    const repo = repoFalso({
      buscarPorId: async () => existente,
      buscarPorNicknameKey: async () => ({ id: 2 }),
    })
    const service = criarPlayersService(repo)

    await expect(service.atualizar(1, 1, dadosValidos)).rejects.toThrow(BusinessRuleError)
  })

  it('permite manter o próprio apelido, inclusive trocando só maiúsculas', async () => {
    const repo = repoFalso({
      buscarPorId: async () => existente,
      buscarPorNicknameKey: async () => existente, // a chave encontrada é a dele mesmo
      atualizar: async (id, dados) => ({ id, ...dados }),
    })
    const service = criarPlayersService(repo)

    const jogador = await service.atualizar(1, 1, { ...dadosValidos, nickname: 'ZÉ' })

    expect(jogador.nickname).toBe('ZÉ')
  })

  it('grava dados limpos, recalcula nicknameKey e não deixa mexer em active', async () => {
    let recebido
    const repo = repoFalso({
      buscarPorId: async () => existente,
      atualizar: async (id, dados) => {
        recebido = { id, dados }
        return { id, ...dados }
      },
    })
    const service = criarPlayersService(repo)

    await service.atualizar(1, 1, {
      name: ' Maria ',
      nickname: ' Mari ',
      position: 'GOALKEEPER',
      nicknameKey: 'x',
      active: false,
    })

    expect(recebido).toEqual({
      id: 1,
      dados: { name: 'Maria', nickname: 'Mari', nicknameKey: 'mari', position: 'GOALKEEPER' },
    })
  })
})
