import { comJson, pedir } from '../../api/http.js'

export const cadastrar = (dados) => pedir('/api/auth/register', comJson('POST', dados))
export const entrar = (dados) => pedir('/api/auth/login', comJson('POST', dados))
export const sair = () => pedir('/api/auth/logout', { method: 'POST' })
export const buscarUsuarioLogado = () => pedir('/api/auth/me')
