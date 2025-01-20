import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Image
            src="/placeholder.svg"
            alt="Company Logo"
            width={32}
            height={32}
            className="rounded"
          />
          <span className="text-sm font-semibold">SafeTrust</span>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SafeTrust. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
