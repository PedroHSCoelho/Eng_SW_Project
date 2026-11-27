import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/context/AuthContext.jsx'
import { ehOrganizadorDo, useGrupo } from '../../groups/context/GrupoContext.jsx'
import { carregarResumoDaHome } from '../services/resumo.js'
import { ConvitePraEntrar, ConvitePraGrupo, CobraDaRodada, Podio, UltimoJogo } from '../components/BlocosDaHome.jsx'
import Icone from '../../../ui/Icones.jsx'

// Atalhos para as seções. Súmula e Ranking são o coração do app e ganham destaque;
// os outros ficam menores. Quem não está logado cai no login (a rota protegida redireciona).
const destaques = [
  { icone: 'sumula', titulo: 'Súmula', texto: 'Escale os times, lance gols e assistências e encerre a partida', para: '/partidas' },
  { icone: 'trofeu', titulo: 'Ranking', texto: 'Classificação automática por pontos, artilharia e assistências', para: '/ranking' },
]

const secundarios = [
  { icone: 'jogadores', titulo: 'Jogadores', texto: 'Perfil com gols, assistências e partidas', para: '/jogadores' },
  { icone: 'historico', titulo: 'Histórico', texto: 'Partidas finalizadas, com filtros', para: '/historico' },
  // Não há atalho de "Avaliação": a nota de 1 a 5 depois do jogo foi trocada pela votação do craque,
  // que fica dentro da própria partida encerrada (CraquePanel).
]

const sorteio = {
  icone: 'sorteio',
  titulo: 'Sorteio de times',
  texto: 'Times equilibrados pela média de notas',
  para: '/sorteio',
}

// Busca o resumo só para quem está logado (as rotas da API exigem login).
function useResumoDaHome(logado, grupoId) {
  const [estado, setEstado] = useState({ carregando: false, resumo: null })

  useEffect(() => {
    if (!logado) {
      setEstado({ carregando: false, resumo: null })
      return undefined
    }
    let ativo = true
    setEstado({ carregando: true, resumo: null })
    carregarResumoDaHome()
      .then((resumo) => ativo && setEstado({ carregando: false, resumo }))
      .catch(() => ativo && setEstado({ carregando: false, resumo: null }))
    return () => {
      ativo = false
    }
  }, [logado, grupoId])

  return estado
}

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[var(--radius-cartao)] border border-borda bg-superficie">
      <div className="gramado-listrado absolute inset-0 opacity-60" aria-hidden="true" />
      {/* Linhas de cal do campo: círculo central e meio-campo */}
      <svg
        aria-hidden="true"
        className="absolute -right-16 top-1/2 h-72 w-72 -translate-y-1/2 text-texto/15"
        viewBox="0 0 200 200"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      >
        <circle cx="100" cy="100" r="60" />
        <circle cx="100" cy="100" r="4" fill="currentColor" />
        <path d="M100 0v200" />
      </svg>
      <div className="relative p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-ouro">Pelada, súmula e resenha</p>
        <h1 className="titulo mt-2 text-5xl text-texto sm:text-6xl">
          Quem é o <span className="text-gramado">cobra</span> da pelada?
        </h1>
        <p className="mt-3 max-w-md text-texto-suave">
          Registre o jogo na beira do campo e deixe os números resolverem a resenha.
        </p>
        <Link
          to="/partidas"
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gramado px-6 text-base font-bold text-gramado-tinta shadow-lg shadow-gramado/20 transition duration-150 hover:-translate-y-0.5 hover:bg-gramado-claro sm:w-auto"
        >
          <Icone nome="mais" />
          Registrar partida
        </Link>
      </div>
    </section>
  )
}

function AtalhoGrande({ icone, titulo, texto, para }) {
  return (
    <Link
      to={para}
      className="cartao group flex min-h-28 items-center gap-4 p-5 transition duration-150 hover:-translate-y-0.5 hover:border-gramado"
    >
      <span className="flex size-12 items-center justify-center rounded-xl bg-gramado/15 text-gramado">
        <Icone nome={icone} tamanho={26} />
      </span>
      <div className="flex-1">
        <h3 className="titulo text-3xl">{titulo}</h3>
        <p className="text-sm text-texto-suave">{texto}</p>
      </div>
      <Icone nome="seta" className="text-texto-suave transition-transform duration-150 group-hover:translate-x-1" />
    </Link>
  )
}

function AtalhoPequeno({ icone, titulo, texto, para }) {
  return (
    <Link
      to={para}
      className="flex min-h-16 items-center gap-3 rounded-xl border border-borda bg-superficie/60 px-4 py-3 transition-colors duration-150 hover:border-gramado hover:bg-superficie"
    >
      <Icone nome={icone} className="text-texto-suave" />
      <div>
        <h3 className="font-semibold leading-tight">{titulo}</h3>
        <p className="text-xs text-texto-suave">{texto}</p>
      </div>
    </Link>
  )
}

export default function HomePage() {
  const { usuario, carregando: carregandoSessao } = useAuth()
  const { grupo, carregando: carregandoGrupos } = useGrupo()
  const pequenos = ehOrganizadorDo(grupo) ? [...secundarios, sorteio] : secundarios
  // Os blocos mostram o grupo atual; trocar de grupo busca tudo de novo (grupo?.id na dependência).
  const { carregando, resumo } = useResumoDaHome(Boolean(usuario && grupo), grupo?.id)
  const mostrarCarregando = carregandoSessao || carregandoGrupos || carregando

  return (
    <div className="mx-auto max-w-[var(--largura-conteudo)] space-y-6 px-4">
      <Hero />

      <div className="grid gap-4 md:grid-cols-2">
        {!usuario && !carregandoSessao ? (
          <ConvitePraEntrar />
        ) : usuario && !grupo && !carregandoGrupos ? (
          <ConvitePraGrupo />
        ) : (
          <>
            <UltimoJogo carregando={mostrarCarregando} jogo={resumo?.ultimoJogo} />
            <CobraDaRodada carregando={mostrarCarregando} cobra={resumo?.cobra} />
            <Podio carregando={mostrarCarregando} podio={resumo?.podio} />
          </>
        )}
      </div>

      <section aria-labelledby="atalhos-titulo" className="space-y-3">
        <h2 id="atalhos-titulo" className="titulo text-2xl text-texto-suave">
          Atalhos
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {destaques.map((a) => (
            <AtalhoGrande key={a.titulo} {...a} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pequenos.map((a) => (
            <AtalhoPequeno key={a.titulo} {...a} />
          ))}
        </div>
      </section>
    </div>
  )
}
