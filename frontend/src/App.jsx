import { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import HomePage from './HomePage.jsx'
import PlayersPage from './features/players/PlayersPage.jsx'
import LoginPage from './features/auth/LoginPage.jsx'
import RotaProtegida from './features/auth/RotaProtegida.jsx'
import { AuthProvider, useAuth } from './features/auth/AuthContext.jsx'
import UsersPage from './features/users/UsersPage.jsx'
import OrganizerRequestPage from './features/organizerRequests/OrganizerRequestPage.jsx'

// NavLink = <a> que sabe se aponta para a página atual (destaca o item do menu).
const itemMenu = ({ isActive }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-green-500 text-green-950' : 'bg-green-800 hover:bg-green-700'
  }`

// O AuthProvider deixa "quem está logado" disponível para todas as telas.
// O BrowserRouter fica em main.jsx (nos testes entra o MemoryRouter).
export default function App() {
  return (
    <AuthProvider>
      <Layout />
    </AuthProvider>
  )
}

// Layout fixo (cabeçalho + menu); o <Routes> troca só o conteúdo conforme a URL.
function Layout() {
  const { usuario, sair } = useAuth()
  // Estado do teste de conexão com o back-end: 'carregando' | 'online' | 'offline'
  const [api, setApi] = useState('carregando')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? setApi('online') : setApi('offline')))
      .catch(() => setApi('offline'))
  }, [])

  const statusClasses = {
    carregando: 'bg-yellow-100 text-yellow-800',
    online: 'bg-green-100 text-green-800',
    offline: 'bg-red-100 text-red-800',
  }

  return (
    <div className="min-h-screen bg-green-950 text-white">
      <header className="mx-auto max-w-5xl px-4 py-10 text-center">
        <h1 className="text-4xl font-bold md:text-5xl">⚽ Eng_SW_Project</h1>
        <p className="mt-3 text-green-200">
          Registre partidas, acompanhe estatísticas, veja o ranking e avalie os jogadores da pelada.
        </p>
        <span
          className={`mt-5 inline-block rounded-full px-4 py-1 text-sm font-medium ${statusClasses[api]}`}
        >
          API: {api}
        </span>
        <nav aria-label="Principal" className="mt-6 flex justify-center gap-2">
          <NavLink to="/" end className={itemMenu}>
            Início
          </NavLink>
          {usuario && (
            <NavLink to="/jogadores" className={itemMenu}>
              Jogadores
            </NavLink>
          )}
          {usuario?.role === 'PLAYER' && (
            <NavLink to="/ser-organizador" className={itemMenu}>
              Ser organizador
            </NavLink>
          )}
          {usuario?.role === 'ORGANIZER' && (
            <NavLink to="/usuarios" className={itemMenu}>
              Usuários
            </NavLink>
          )}
          {!usuario && (
            <NavLink to="/login" className={itemMenu}>
              Entrar
            </NavLink>
          )}
        </nav>
        {usuario && (
          <p className="mt-4 text-sm text-green-200">
            {usuario.name} ({usuario.role === 'ORGANIZER' ? 'Organizador' : 'Jogador'}){' '}
            <button type="button" onClick={sair} className="ml-2 underline">
              Sair
            </button>
          </p>
        )}
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/jogadores"
            element={
              <RotaProtegida>
                <PlayersPage />
              </RotaProtegida>
            }
          />
          <Route
            path="/ser-organizador"
            element={
              <RotaProtegida>
                <OrganizerRequestPage />
              </RotaProtegida>
            }
          />
          <Route
            path="/usuarios"
            element={
              <RotaProtegida papel="ORGANIZER">
                <UsersPage />
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
