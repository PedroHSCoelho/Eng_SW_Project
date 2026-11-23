// Posições: o valor é o do enum Position do back-end; o texto é o que a tela mostra.
export const POSICOES = {
  GOALKEEPER: 'Goleiro',
  DEFENDER: 'Defensor',
  MIDFIELDER: 'Meio-campista',
  FORWARD: 'Atacante',
}

const campo =
  'w-full rounded-lg bg-green-950 px-3 py-2 text-white ring-1 ring-green-700 focus:outline-none focus:ring-2 focus:ring-green-400'
const botao = 'rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50'

// Componente de apresentação: não sabe da API. Recebe os valores e avisa o que o usuário fez;
// quem decide o que fazer (chamar a API, limpar, etc.) é a página.
export default function PlayerForm({ valores, editando, enviando, aoMudar, aoEnviar, aoCancelar }) {
  return (
    <form
      onSubmit={aoEnviar}
      className="mt-4 grid gap-3 rounded-xl bg-green-900 p-5 ring-1 ring-green-700 sm:grid-cols-4"
    >
      <h3 className="font-semibold sm:col-span-4">{editando ? 'Editar jogador' : 'Novo jogador'}</h3>
      <label className="text-sm">
        Nome
        <input
          className={campo}
          value={valores.name}
          onChange={(e) => aoMudar('name', e.target.value)}
          required
        />
      </label>
      <label className="text-sm">
        Apelido
        <input
          className={campo}
          value={valores.nickname}
          onChange={(e) => aoMudar('nickname', e.target.value)}
          required
        />
      </label>
      <label className="text-sm">
        Posição
        <select
          className={campo}
          value={valores.position}
          onChange={(e) => aoMudar('position', e.target.value)}
          required
        >
          <option value="" disabled>
            Escolha…
          </option>
          {Object.entries(POSICOES).map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end gap-2">
        <button
          type="submit"
          disabled={enviando}
          className={`${botao} bg-green-500 text-green-950 hover:bg-green-400`}
        >
          {editando ? 'Salvar alterações' : 'Cadastrar'}
        </button>
        {editando && (
          <button
            type="button"
            onClick={aoCancelar}
            className={`${botao} bg-green-800 hover:bg-green-700`}
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
