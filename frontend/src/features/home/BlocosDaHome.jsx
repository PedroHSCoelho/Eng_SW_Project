// Blocos visuais da home: último jogo, pódio e cobra da rodada.
// Cada um tem três caras: carregando (esqueleto), sem dados (vazio amigável) e com dados.
import { Link } from 'react-router-dom'
import Icone from '../../ui/Icones.jsx'

const formatarDia = (iso) =>
  new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })

function Bloco({ titulo, icone, corIcone = 'text-gramado', children, className = '' }) {
  return (
    <section aria-label={titulo} className={`cartao flex flex-col p-4 sm:p-5 ${className}`}>
      <h2 className="titulo mb-3 flex items-center gap-2 text-2xl text-texto">
        <Icone nome={icone} className={corIcone} />
        {titulo}
      </h2>
      {children}
    </section>
  )
}

function Vazio({ children }) {
  return (
    <p className="flex flex-1 items-center rounded-xl border border-dashed border-borda p-4 text-sm text-texto-suave">
      {children}
    </p>
  )
}

export function Esqueleto({ className = '' }) {
  return <div aria-hidden="true" className={`esqueleto ${className}`} />
}

// ---------- Último jogo ----------

function ListaArtilheiros({ lista, alinhamento }) {
  if (lista.length === 0) return <p className={`text-xs text-texto-suave ${alinhamento}`}>Sem gols</p>
  return (
    <ul className={`space-y-0.5 text-sm ${alinhamento}`}>
      {lista.map((a) => (
        <li key={a.nome}>
          {a.nome}
          {a.gols > 1 && <span className="ml-1 font-semibold text-ouro">×{a.gols}</span>}
        </li>
      ))}
    </ul>
  )
}

export function UltimoJogo({ carregando, jogo }) {
  return (
    <Bloco titulo="Último jogo" icone="bola" className="md:col-span-2">
      {carregando ? (
        <Esqueleto className="h-36" />
      ) : !jogo ? (
        <Vazio>Nenhuma partida encerrada ainda. Bola rolando, súmula preenchida e o placar aparece aqui.</Vazio>
      ) : jogo.pelada ? (
        <Link
          to={`/partidas/${jogo.id}`}
          className="gramado-listrado group block rounded-xl border border-borda p-4 transition-colors duration-150 hover:border-gramado"
          aria-label={`Ver súmula da pelada: ${jogo.pelada.jogos} jogos`}
        >
          <p className="titulo text-3xl">Pelada · {jogo.pelada.jogos} jogo(s)</p>
          <p className="mt-1 text-texto-suave">
            {jogo.pelada.lider ? `Time ${jogo.pelada.lider} terminou a noite na frente` : 'Nenhum jogo encerrado'}
          </p>
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-texto-suave">
            <span className="flex items-center gap-1">
              <Icone nome="calendario" tamanho={14} />
              {formatarDia(jogo.data)}
            </span>
            {jogo.local && (
              <span className="flex items-center gap-1">
                <Icone nome="local" tamanho={14} />
                {jogo.local}
              </span>
            )}
            <span className="ml-auto flex items-center font-medium text-gramado group-hover:text-gramado-claro">
              Ver súmula <Icone nome="seta" tamanho={14} />
            </span>
          </p>
        </Link>
      ) : (
        <Link
          to={`/partidas/${jogo.id}`}
          className="gramado-listrado group block rounded-xl border border-borda p-4 transition-colors duration-150 hover:border-gramado"
          aria-label={`Ver súmula: Time A ${jogo.placar.A} a ${jogo.placar.B} Time B`}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <p className="titulo text-right text-xl">Time A</p>
            <p className="titulo rounded-lg bg-fundo/80 px-4 py-1 text-5xl tabular-nums text-texto">
              {jogo.placar.A}
              <span className="mx-2 text-texto-suave">×</span>
              {jogo.placar.B}
            </p>
            <p className="titulo text-xl">Time B</p>
            <ListaArtilheiros lista={jogo.artilheiros.A} alinhamento="text-right" />
            <span />
            <ListaArtilheiros lista={jogo.artilheiros.B} alinhamento="" />
          </div>
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-texto-suave">
            <span className="flex items-center gap-1">
              <Icone nome="calendario" tamanho={14} />
              {formatarDia(jogo.data)}
            </span>
            {jogo.local && (
              <span className="flex items-center gap-1">
                <Icone nome="local" tamanho={14} />
                {jogo.local}
              </span>
            )}
            <span className="ml-auto flex items-center font-medium text-gramado group-hover:text-gramado-claro">
              Ver súmula <Icone nome="seta" tamanho={14} />
            </span>
          </p>
        </Link>
      )}
    </Bloco>
  )
}

// ---------- Pódio ----------

const DEGRAUS = [
  // ordem visual: 2º, 1º, 3º
  { lugar: 2, altura: 'h-16', cor: 'bg-prata', ordem: 'order-1' },
  { lugar: 1, altura: 'h-24', cor: 'bg-ouro', ordem: 'order-2' },
  { lugar: 3, altura: 'h-12', cor: 'bg-bronze', ordem: 'order-3' },
]

export function Podio({ carregando, podio }) {
  const unidade = podio?.criterio === 'gols' ? 'gols' : 'pts'
  return (
    <Bloco titulo="Pódio" icone="trofeu" corIcone="text-ouro">
      {carregando ? (
        <Esqueleto className="h-40" />
      ) : !podio?.linhas.length ? (
        <Vazio>O pódio sai quando a galera tiver pelo menos 3 jogos encerrados. Bora marcar a próxima!</Vazio>
      ) : (
        <>
          <ol className="flex items-end gap-2" aria-label={`Top 3 por ${podio.criterio}`}>
            {DEGRAUS.map(({ lugar, altura, cor, ordem }) => {
              const linha = podio.linhas[lugar - 1]
              return (
                <li key={lugar} className={`flex flex-1 flex-col items-center ${ordem}`}>
                  {linha ? (
                    <>
                      {lugar === 1 && <Icone nome="coroa" className="mb-1 text-ouro" />}
                      <span className="w-full truncate text-center text-sm font-semibold">{linha.nome}</span>
                      <span className="text-xs text-texto-suave">
                        {linha.valor} {unidade}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-texto-suave">—</span>
                  )}
                  <span
                    className={`titulo mt-1 flex w-full items-start justify-center rounded-t-lg pt-1 text-2xl text-fundo ${altura} ${cor}`}
                  >
                    <span className="sr-only">Lugar </span>
                    {lugar}º
                  </span>
                </li>
              )
            })}
          </ol>
          {podio.criterio === 'gols' && (
            <p className="mt-2 text-xs text-texto-suave">Pela artilharia: ninguém tem 3 jogos ainda.</p>
          )}
        </>
      )}
    </Bloco>
  )
}

// ---------- Cobra da rodada ----------

export function CobraDaRodada({ carregando, cobra }) {
  return (
    <Bloco titulo="Cobra da rodada" icone="estrela" corIcone="text-ouro">
      {carregando ? (
        <Esqueleto className="h-40" />
      ) : !cobra ? (
        <Vazio>Ninguém brilhou ainda. Depois do jogo, avalie a galera e o cobra aparece aqui.</Vazio>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl bg-gradient-to-b from-ouro/15 to-transparent p-4 text-center ring-1 ring-ouro/40">
          <span className="flex size-14 items-center justify-center rounded-full bg-ouro text-fundo">
            <Icone nome={cobra.tipo === 'destaque' ? 'estrela' : 'bola'} tamanho={28} />
          </span>
          <p className="titulo mt-3 text-3xl text-ouro">{cobra.nome}</p>
          {cobra.tipo === 'destaque' ? (
            <p className="text-sm text-texto-suave">
              Nota média <strong className="text-texto">{cobra.media}</strong>
              {cobra.gols > 0 && ` · ${cobra.gols} ${cobra.gols === 1 ? 'gol' : 'gols'}`}
            </p>
          ) : (
            <p className="text-sm text-texto-suave">
              Artilheiro geral com <strong className="text-texto">{cobra.gols}</strong> gols
              <span className="block text-xs">A última rodada ainda não tem notas suficientes.</span>
            </p>
          )}
        </div>
      )}
    </Bloco>
  )
}

// ---------- Deslogado ----------

export function ConvitePraEntrar() {
  return (
    <section aria-label="Números da pelada" className="cartao gramado-listrado p-5 md:col-span-2">
      <h2 className="titulo text-2xl">Placar, pódio e cobra da rodada</h2>
      <p className="mt-1 max-w-prose text-sm text-texto-suave">
        Os números da pelada ficam para quem joga. Entre com sua conta para ver o último jogo, o top 3 do ranking e
        quem foi o cobra da rodada.
      </p>
      <Link
        to="/login"
        className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl bg-superficie-2 px-5 font-semibold ring-1 ring-borda transition-colors duration-150 hover:bg-borda"
      >
        <Icone nome="entrar" />
        Entrar para ver os números
      </Link>
    </section>
  )
}

// Logado, mas ainda sem grupo: os números são de cada grupo, então primeiro é criar ou entrar em um.
export function ConvitePraGrupo() {
  return (
    <section aria-label="Sem grupo" className="cartao gramado-listrado p-5 md:col-span-2">
      <h2 className="titulo text-2xl">Monte a sua pelada</h2>
      <p className="mt-1 max-w-prose text-sm text-texto-suave">
        Você ainda não está em nenhum grupo. Crie um grupo e convide a galera, ou entre com o código que alguém
        te mandou.
      </p>
      <Link
        to="/grupos"
        className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl bg-gramado px-5 font-semibold text-gramado-tinta transition-colors duration-150 hover:bg-gramado-claro"
      >
        <Icone nome="jogadores" />
        Criar ou entrar num grupo
      </Link>
    </section>
  )
}
