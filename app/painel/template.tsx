'use client'
// ============================================================
// CLINIO - Template Global de Transição
// Diferente do layout (que não recarrega), o template recria
// a estrutura e permite rodarmos animações na troca de rotas.
// ============================================================

export default function TemplateAnimado({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in w-full h-full">
      {children}
    </div>
  )
}
