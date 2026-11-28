import { Header } from "@/components/layouts/Header";

export default function EscrowLayout({ children }: { children: React.ReactNode }) {
  return <><Header /><main className="mx-auto max-w-6xl px-4 pb-10 pt-24 sm:px-8">{children}</main></>;
}
