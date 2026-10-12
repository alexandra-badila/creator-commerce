import Link from "next/link"

import { Logo, Wordmark } from "@/components/logo"
import { Button } from "@/components/ui/button"

const FOOTER_LINKS = ["Features", "Pricing", "Docs", "Terms", "Privacy"]

export function MarketingShell({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1080px] items-center gap-2 px-4 py-3 sm:gap-4 sm:px-6 sm:py-3.5">
          <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            <Logo size={28} />
            <Wordmark className="hidden text-[17px] min-[380px]:inline" />
          </Link>
          <nav className="ml-6 hidden gap-[22px] text-sm md:flex">
            <a href="#features" className="text-muted-foreground hover:text-foreground">
              Features
            </a>
            <a href="#how" className="text-muted-foreground hover:text-foreground">
              How it works
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground">
              Pricing
            </a>
          </nav>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login" />}>
            Sign in
          </Button>
          <Button size="sm" nativeButton={false} render={<Link href="/signup" />}>
            Start selling
          </Button>
        </div>
      </header>
      {children}
      <footer className="border-t">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-4 px-6 py-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={22} />
            <Wordmark className="text-[15px]" />
          </Link>
          <div className="flex-1" />
          <nav className="flex flex-wrap gap-5 text-[13px]">
            {FOOTER_LINKS.map((label) => (
              <a key={label} href="#" className="text-muted-foreground hover:text-foreground">
                {label}
              </a>
            ))}
          </nav>
          <span className="w-full text-right font-mono text-xs text-muted-foreground">
            © 2026 Creator Commerce
          </span>
        </div>
      </footer>
    </>
  )
}
