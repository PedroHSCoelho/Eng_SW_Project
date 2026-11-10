import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

// Envolve uma página: sem login manda para /login; com login mas sem o papel pedido, avisa.
// É só experiência de uso: quem de fato barra é o back-end (401/403).
export default function RotaProtegida({ papel, children }) {
  const { usuario, carregando } = useAuth()

  if (carregando) return <p className="text-center text-green-200">Carregando…</p>
  if (!usuario) return <Navigate to="/login" replace />
  if (papel && usuario.role !== papel) {
    return (
      <p role="alert" className="text-center text-green-200">
        Você não tem permissão para ver esta página.
      </p>
    )
  }
  return children
}
