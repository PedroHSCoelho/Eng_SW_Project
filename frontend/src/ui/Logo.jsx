// Logo do Cobra da Bola: uma cobra enrolada numa bola de futebol, mais o nome.
// A mesma marca (só o desenho) está em public/favicon.svg, que é o ícone da aba.
// As cores vêm dos tokens (index.css), então o logo acompanha a paleta.

export function MarcaCobra({ tamanho = 36, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={tamanho}
      height={tamanho}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {/* Bola */}
      <circle cx="30" cy="36" r="17" fill="var(--color-texto)" stroke="var(--color-fundo)" strokeWidth="2.5" />
      <polygon points="30,29.5 36.2,34 33.8,41.3 26.2,41.3 23.8,34" fill="var(--color-fundo)" />
      <path
        d="M30 29.5V23M36.2 34l6.2-2M33.8 41.3l3.8 5.3M26.2 41.3l-3.8 5.3M23.8 34l-6.2-2"
        stroke="var(--color-fundo)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Corpo da cobra, dando a volta na bola */}
      <path
        d="M54 46C46 60 22 60 13 52 3 42 4 24 16 15 26 7 41 7 50 13"
        fill="none"
        stroke="var(--color-gramado)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* Escamas douradas */}
      <path
        d="M54 46C46 60 22 60 13 52 3 42 4 24 16 15 26 7 41 7 50 13"
        fill="none"
        stroke="var(--color-ouro)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1.5 6"
      />
      {/* Cabeça, olho e língua */}
      <ellipse cx="52" cy="14.5" rx="7" ry="5.5" transform="rotate(25 52 14.5)" fill="var(--color-gramado)" />
      <circle cx="54" cy="12.5" r="1.6" fill="var(--color-fundo)" />
      <path
        d="M58 18l4.5 3m0 0 2-1.6m-2 1.6-.4 2.6"
        fill="none"
        stroke="var(--color-perigo)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function Logo({ tamanho = 36 }) {
  return (
    <span className="flex items-center gap-2">
      <MarcaCobra tamanho={tamanho} />
      <span className="titulo whitespace-nowrap text-2xl text-texto">
        Cobra <span className="text-ouro">da Bola</span>
      </span>
    </span>
  )
}
