// Roda um comando (prisma, vitest, node...) com as variáveis de UM ambiente: dev, test ou prod.
//
//   node scripts/ambiente.js test prisma migrate reset --force
//   node scripts/ambiente.js prod prisma migrate deploy
//
// Por que existe: o Prisma e o dotenv só leem o arquivo `.env`. Para ter três bancos
// (desenvolvimento, teste e produção) sem trocar o `.env` na mão, este script lê o arquivo
// do ambiente pedido, confere as travas de segurança e só então roda o comando com essas
// variáveis. Variável que já existe no processo vale mais que o `.env` (regra do Prisma e
// do dotenv), então o comando nunca "escorrega" para outro banco.
//
// Travas (a função `conferirAmbiente`, testada em tests/ambiente.test.js):
//  0. cada arquivo diz de qual banco é (BANCO=dev | test | producao). Um `.env` antigo, que ainda
//     tem a senha da produção e não tem essa marca, é recusado em vez de ser usado como dev;
//  1. dev e test NUNCA podem apontar para o mesmo banco da produção (.env.production);
//  2. o banco de test precisa de um schema próprio com "test" no nome (?schema=test),
//     porque os testes apagam tudo antes de cada caso;
//  3. em prod só passa `prisma migrate deploy` / `migrate status` (nada de reset, migrate dev ou seed).
import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import dotenv from 'dotenv'

export const ARQUIVOS = { dev: '.env', test: '.env.test', prod: '.env.production' }
export const MARCAS = { dev: 'dev', test: 'test', prod: 'producao' }

// "Identidade" de um banco: usuário + servidor + nome do banco + schema. A porta fica de fora
// porque no Supabase a mesma base responde na 6543 (pooler) e na 5432 (direta).
// No Supabase o usuário é "postgres.<id-do-projeto>", então projetos diferentes têm identidades diferentes.
export function identidadeDoBanco(url) {
  const u = new URL(url)
  const schema = u.searchParams.get('schema') || 'public'
  return `${decodeURIComponent(u.username)}@${u.hostname}/${u.pathname.slice(1)}?schema=${schema}`
}

const COMANDOS_PERMITIDOS_EM_PROD = [
  ['prisma', 'migrate', 'deploy'],
  ['prisma', 'migrate', 'status'],
]

// Núcleo puro: decide se pode rodar. Devolve a lista de problemas (vazia = pode).
export function conferirAmbiente({ nome, vars, varsDeProd = null, comando = [] }) {
  const problemas = []
  if (!ARQUIVOS[nome]) return [`Ambiente desconhecido "${nome}"; use dev, test ou prod`]
  if (vars.BANCO !== MARCAS[nome]) {
    problemas.push(
      `${ARQUIVOS[nome]} não tem a linha BANCO=${MARCAS[nome]}. Se ele ainda é o .env antigo (o da produção), ` +
        `renomeie para .env.production e crie o ${ARQUIVOS[nome]} a partir de ${ARQUIVOS[nome]}.example`,
    )
  }
  for (const chave of ['DATABASE_URL', 'DIRECT_URL']) {
    if (!vars[chave]) problemas.push(`Falta ${chave} em ${ARQUIVOS[nome]}`)
  }
  if (problemas.length > 0) return problemas

  const urls = [vars.DATABASE_URL, vars.DIRECT_URL]
  if (nome !== 'prod' && varsDeProd) {
    const deProd = new Set([varsDeProd.DATABASE_URL, varsDeProd.DIRECT_URL].filter(Boolean).map(identidadeDoBanco))
    if (urls.some((url) => deProd.has(identidadeDoBanco(url)))) {
      problemas.push(`${ARQUIVOS[nome]} aponta para o banco de PRODUÇÃO. Use o projeto/schema de ${nome}.`)
    }
  }
  if (nome === 'test') {
    for (const url of urls) {
      const schema = new URL(url).searchParams.get('schema') ?? ''
      if (!schema.includes('test')) {
        problemas.push(`As URLs de ${ARQUIVOS.test} precisam de um schema de teste (ex.: ?schema=test): os testes apagam os dados`)
        break
      }
    }
  }
  if (nome === 'prod') {
    const permitido = COMANDOS_PERMITIDOS_EM_PROD.some((c) => c.every((parte, i) => comando[i] === parte))
    if (!permitido) problemas.push('Em produção só rodam "prisma migrate deploy" e "prisma migrate status"')
  }
  return problemas
}

function lerArquivo(arquivo) {
  return existsSync(arquivo) ? dotenv.parse(readFileSync(arquivo)) : null
}

function principal() {
  const [nome, ...comando] = process.argv.slice(2)
  const pasta = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') // backend/
  const arquivo = path.join(pasta, ARQUIVOS[nome] ?? '')
  const vars = ARQUIVOS[nome] ? lerArquivo(arquivo) : {}
  if (vars === null) {
    console.error(`Arquivo ${ARQUIVOS[nome]} não encontrado em backend/. Copie ${ARQUIVOS[nome]}.example e preencha.`)
    process.exit(1)
  }
  const varsDeProd = nome === 'prod' ? null : lerArquivo(path.join(pasta, ARQUIVOS.prod))
  const problemas = conferirAmbiente({ nome, vars, varsDeProd, comando })
  if (comando.length === 0) problemas.push('Diga o comando a rodar, ex.: node scripts/ambiente.js test prisma migrate deploy')
  if (problemas.length > 0) {
    for (const p of problemas) console.error(`✋ ${p}`)
    process.exit(1)
  }

  console.log(`▶ ambiente ${nome} (${identidadeDoBanco(vars.DIRECT_URL)}): ${comando.join(' ')}`)
  const [programa, ...args] = comando
  // `npx` acha o prisma/vitest do node_modules; no Windows o npx precisa do shell.
  const resultado = spawnSync('npx', [programa, ...args], {
    cwd: pasta,
    stdio: 'inherit',
    env: { ...process.env, ...vars, AMBIENTE: nome },
    shell: process.platform === 'win32',
  })
  process.exit(resultado.status ?? 1)
}

// Só roda quando chamado pelo terminal (no teste, o arquivo é importado e nada é executado).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) principal()
