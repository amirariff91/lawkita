import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-4 text-muted-foreground">
          The page you are looking for does not exist or may have moved.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/lawyers">Find a Lawyer</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/firms">Browse Law Firms</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
