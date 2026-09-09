import { Link } from '@tanstack/react-router'
export function SiteFooter() {
  return <footer className="mt-12 border-t bg-card/40"><div className="page-container flex flex-wrap items-center justify-between gap-6 py-8"><div><p className="font-serif text-xl font-semibold">NTMR</p><p className="mt-1 text-sm text-muted-foreground">Núcleo Triângulo Mineiro de Rédeas</p></div><nav aria-label="Links do rodapé" className="flex flex-wrap gap-5 text-sm text-muted-foreground"><Link to="/eventos">Eventos</Link><Link to="/ranking">Ranking</Link><Link to="/noticias">Notícias</Link><Link to="/minha-area" hash="sugestoes">Suporte</Link></nav></div></footer>
}
