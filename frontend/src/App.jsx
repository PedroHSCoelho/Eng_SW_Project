import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import HomePage from './features/home/pages/HomePage.jsx'
import PlayersPage from './features/players/pages/PlayersPage.jsx'
import PlayerProfilePage from './features/players/pages/PlayerProfilePage.jsx'
import RankingPage from './features/rankings/pages/RankingPage.jsx'
import MatchesPage from './features/matches/pages/MatchesPage.jsx'
import MatchPage from './features/matches/pages/MatchPage.jsx'
import HistoryPage from './features/matches/pages/HistoryPage.jsx'
import DrawPage from './features/draw/pages/DrawPage.jsx'
import LoginPage from './features/auth/pages/LoginPage.jsx'
import RotaProtegida from './features/auth/components/RotaProtegida.jsx'
import { AuthProvider, useAuth } from './features/auth/context/AuthContext.jsx'
import { GrupoProvider, ehOrganizadorDo, useGrupo } from './features/groups/context/GrupoContext.jsx'
import { FotosProvider } from './features/photos/context/FotosContext.jsx'
import GroupsPage from './features/groups/pages/GroupsPage.jsx'
import InvitePage from './features/groups/pages/InvitePage.jsx'
import MembersPage from './features/groups/pages/MembersPage.jsx'
import Logo from './ui/Logo.jsx'
import Icone from './ui/Icones.jsx'

// Navegação principal. No celular vira a barra inferior (polegar alcança na beira do campo);
// do tablet para cima fica no header. É o MESMO <nav>: só o CSS muda de lugar.
const itemPrincipal = ({ isActive }) =>
  `flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[11px] font-medium transition-colors duration-150 md:min-h-9 md:flex-none md:flex-row md:gap-1.5 md:px-3 md:text-sm ${
    isActive ? 'text-gramado md:bg-gramado md:text-gramado-tinta' : 'text-texto-suave hover:text-texto md:hover:bg-superficie-2'
  }`


// O AuthProvider deixa "quem está logado" disponível para todas as telas, e o GrupoProvider,
// "em que grupo estou" e o FotosProvider, "quem do grupo tem foto" (os dados de jogadores, partidas e ranking são de cada grupo).
// O BrowserRouter fica em main.jsx (nos testes entra o MemoryRouter).
export default function App() {
  return (
    <AuthProvider>
      <GrupoProvider>
        <FotosProvider>
          <Layout />
        </FotosProvider>
      </GrupoProvider>
    </AuthProvider>
  )
}

// Grupo atual no header: um "chip" com o nome que leva a Meus grupos (trocar, criar ou entrar).
function SeletorDeGrupo() {
  const { grupo } = useGrupo()
  return (
    <NavLink
      to="/grupos"
      aria-label={grupo ? `Grupo atual: ${grupo.name}. Trocar de grupo` : 'Meus grupos'}
      className={({ isActive }) =>
        `flex min-h-10 max-w-44 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold ring-1 transition-colors duration-150 lg:max-w-56 ${
          isActive ? 'bg-superficie-2 ring-gramado' : 'ring-borda hover:bg-superficie-2'
        }`
      }
    >
      <Icone nome="escudo" tamanho={18} className="text-gramado" />
      <span className="truncate" aria-hidden="true">{grupo ? grupo.name : 'Grupos'}</span>
      <span aria-hidden="true" className="text-texto-suave">▾</span>
    </NavLink>
  )
}

// Ponto discreto do status da API: verde = online, vermelho = offline, amarelo = testando.
// O texto completo fica para leitores de tela e no tooltip (title).
function StatusDaApi({ api }) {
  const cor = { carregando: 'bg-ouro', online: 'bg-gramado', offline: 'bg-perigo' }[api]
  return (
    <span role="status" title={`API: ${api}`} className="flex size-6 items-center justify-center">
      <span className={`size-2.5 rounded-full ${cor} ${api === 'online' ? 'shadow-[0_0_0_3px_rgb(34_197_94/0.25)]' : ''}`} />
      <span className="sr-only">API: {api}</span>
    </span>
  )
}

// Layout fixo (cabeçalho + navegação); o <Routes> troca só o conteúdo conforme a URL.
function Layout() {
  const { usuario, sair } = useAuth()
  const { grupo } = useGrupo()
  const ehOrganizador = ehOrganizadorDo(grupo)
  const { pathname } = useLocation()
  const naAreaDePartidas = ['/historico', '/sorteio'].some((p) => pathname.startsWith(p))
  // Estado do teste de conexão com o back-end: 'carregando' | 'online' | 'offline'
  const [api, setApi] = useState('carregando')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? setApi('online') : setApi('offline')))
      .catch(() => setApi('offline'))
  }, [])

  return (
    <div className="min-h-screen bg-fundo text-texto">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-ouro focus:px-3 focus:py-2 focus:text-fundo"
      >
        Pular para o conteúdo
      </a>

      <header className="sticky top-0 z-40 border-b border-borda bg-fundo/95">
        <div className="mx-auto flex h-[var(--altura-header)] max-w-[var(--largura-conteudo)] items-center gap-3 px-4">
          <Link to="/" aria-label="Cobra da Bola, página inicial" className="rounded-lg">
            <Logo tamanho={34} />
          </Link>
          <StatusDaApi api={api} />

          {/* Deslogado só existe "Início": no celular a barra inferior some (o logo já leva ao início). */}
          <nav
            aria-label="Principal"
            className={`fixed inset-x-0 bottom-0 z-40 h-[var(--altura-barra-inferior)] items-stretch gap-1 border-t border-borda bg-superficie px-2 pb-[env(safe-area-inset-bottom)] md:static md:ml-4 md:flex md:h-auto md:items-center md:border-0 md:bg-transparent md:p-0 ${
              usuario ? 'flex' : 'hidden'
            }`}
          >
            <NavLink to="/" end className={itemPrincipal}>
              <Icone nome="inicio" />
              Início
            </NavLink>
            {usuario && (
              <>
                {/* "Partidas" fica acesa também no histórico e no sorteio (são abas da mesma área). */}
                <NavLink to="/partidas" className={(estado) => itemPrincipal({ isActive: estado.isActive || naAreaDePartidas })}>
                  <Icone nome="sumula" />
                  Partidas
                </NavLink>
                <NavLink to="/ranking" className={itemPrincipal}>
                  <Icone nome="trofeu" />
                  Ranking
                </NavLink>
                <NavLink to="/jogadores" className={itemPrincipal}>
                  <Icone nome="jogadores" />
                  Jogadores
                </NavLink>
                <NavLink to={grupo ? '/membros' : '/grupos'} className={itemPrincipal}>
                  <Icone nome="escudo" />
                  Grupo
                </NavLink>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            {usuario && <SeletorDeGrupo />}
            {!usuario && (
              <NavLink
                to="/login"
                className="flex min-h-10 items-center gap-1.5 rounded-xl bg-gramado px-4 text-sm font-semibold text-gramado-tinta transition-colors duration-150 hover:bg-gramado-claro"
              >
                <Icone nome="entrar" tamanho={18} />
                Entrar
              </NavLink>
            )}
            {usuario && (
              <>
                <span className="hidden max-w-40 truncate text-sm text-texto-suave lg:inline">
                  {usuario.name}
                  {grupo && ` (${ehOrganizador ? 'Admin' : 'Membro'})`}
                </span>
                <button
                  type="button"
                  onClick={sair}
                  aria-label="Sair"
                  className="flex min-h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium text-texto-suave transition-colors duration-150 hover:bg-superficie-2 hover:text-texto"
                >
                  <Icone nome="sair" tamanho={18} />
                  <span className="hidden md:inline" aria-hidden="true">Sair</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* pb: espaço para a barra inferior não cobrir o fim da página no celular */}
      <main
        id="conteudo"
        className={`pt-6 md:pb-12 ${usuario ? 'pb-[calc(var(--altura-barra-inferior)+1.5rem)]' : 'pb-12'}`}
      >
        {/* key: ao trocar de grupo, as telas montam de novo e buscam os dados do novo grupo. */}
        <Routes key={grupo?.id ?? 'sem-grupo'}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/jogadores"
            element={
              <RotaProtegida doGrupo>
                <PlayersPage />
              </RotaProtegida>
            }
          />
          <Route
            path="/jogadores/:id"
            element={
              <RotaProtegida doGrupo>
                <PlayerProfilePage />
              </RotaProtegida>
            }
          />
          <Route
            path="/partidas"
            element={
              <RotaProtegida doGrupo>
                <MatchesPage />
              </RotaProtegida>
            }
          />
          <Route
            path="/historico"
            element={
              <RotaProtegida doGrupo>
                <HistoryPage />
              </RotaProtegida>
            }
          />
          <Route
            path="/partidas/:id"
            element={
              <RotaProtegida doGrupo>
                <MatchPage />
              </RotaProtegida>
            }
          />
          <Route
            path="/sorteio"
            element={
              <RotaProtegida doGrupo papel="ORGANIZER">
                <DrawPage />
              </RotaProtegida>
            }
          />
          <Route
            path="/ranking"
            element={
              <RotaProtegida doGrupo>
                <RankingPage />
              </RotaProtegida>
            }
          />
          <Route
            path="/grupos"
            element={
              <RotaProtegida>
                <GroupsPage />
              </RotaProtegida>
            }
          />
          <Route
            path="/convite/:codigo"
            element={
              <RotaProtegida>
                <InvitePage />
              </RotaProtegida>
            }
          />
          <Route
            path="/membros"
            element={
              <RotaProtegida doGrupo>
                <MembersPage />
              </RotaProtegida>
            }
          />
          <Route
            path="*"
            element={<p className="text-center text-green-200">Página não encontrada</p>}
          />
        </Routes>
      </main>
    </div>
  )
}
