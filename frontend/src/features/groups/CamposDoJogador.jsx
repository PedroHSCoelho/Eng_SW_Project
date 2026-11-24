import { POSICOES } from '../players/PlayerForm.jsx'
import { campo } from './estilos.js'

// Apelido e posição do MEU jogador no grupo (o nome vem da conta, no back-end).
// Usado ao criar um grupo ("também jogo") e ao entrar por convite.
export default function CamposDoJogador({ valor, aoMudar, obrigatorio = true }) {
  return (
    <>
      <label className="text-sm">
        Seu apelido no grupo
        <input
          className={campo}
          value={valor.nickname}
          onChange={(e) => aoMudar({ ...valor, nickname: e.target.value })}
          minLength={2}
          maxLength={30}
          required={obrigatorio}
        />
      </label>
      <label className="text-sm">
        Posição
        <select
          className={campo}
          value={valor.position}
          onChange={(e) => aoMudar({ ...valor, position: e.target.value })}
          required={obrigatorio}
        >
          <option value="">Escolha…</option>
          {Object.entries(POSICOES).map(([v, texto]) => (
            <option key={v} value={v}>
              {texto}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}
