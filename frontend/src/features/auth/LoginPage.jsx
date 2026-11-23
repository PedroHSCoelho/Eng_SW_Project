import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

const campo =
  'mt-1 w-full rounded-lg bg-green-950 px-3 py-2 text-white ring-1 ring-green-700 focus:outline-none focus:ring-2 focus:ring-green-400'

// Uma tela só para entrar e para criar conta (alterna pelo link abaixo do formulário).
export default function LoginPage() {
  const { usuario, entrar, cadastrar } = useAuth()
  const navegar = useNavigate()
  const [criandoConta, setCriandoConta] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to="/" replace />

  function mudar(nome, valor) {
    setForm((atual) => ({ ...atual, [nome]: valor }))
  }

  async function enviar(evento) {
    evento.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      if (criandoConta) await cadastrar(form)
      else await entrar({ email: form.email, password: form.password })
      navegar('/', { replace: true })
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="mx-auto max-w-sm px-4 pb-16" aria-labelledby="titulo-login">
      <h2 id="titulo-login" className="text-2xl font-bold">
        {criandoConta ? 'Criar conta' : 'Entrar'}
      </h2>

      {erro && (
        <p role="alert" className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-800">
          {erro}
        </p>
      )}

      <form onSubmit={enviar} className="mt-4 space-y-3 rounded-xl bg-green-900 p-5 ring-1 ring-green-700">
        {criandoConta && (
          <label className="block text-sm">
            Nome
            <input
              className={campo}
              value={form.name}
              onChange={(e) => mudar('name', e.target.value)}
              autoComplete="name"
            />
          </label>
        )}
        <label className="block text-sm">
          E-mail
          <input
            type="email"
            className={campo}
            value={form.email}
            onChange={(e) => mudar('email', e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="block text-sm">
          Senha
          <input
            type="password"
            className={campo}
            value={form.password}
            onChange={(e) => mudar('password', e.target.value)}
            autoComplete={criandoConta ? 'new-password' : 'current-password'}
          />
        </label>
        {criandoConta && <p className="text-xs text-green-200">Mínimo de 8 caracteres.</p>}
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-green-500 px-3 py-2 font-medium text-green-950 hover:bg-green-400 disabled:opacity-50"
        >
          {criandoConta ? 'Cadastrar' : 'Entrar'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setCriandoConta((v) => !v)
          setErro('')
        }}
        className="mt-4 w-full text-center text-sm text-green-200 underline"
      >
        {criandoConta ? 'Já tenho conta' : 'Não tenho conta'}
      </button>
    </section>
  )
}
