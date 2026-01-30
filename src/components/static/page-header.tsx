interface PageHeaderProps {
  title: string;
  description?: string;
  centered?: boolean;
}

export function PageHeader({ title, description, centered = false }: PageHeaderProps) {
  return (
    <div className={`py-12 bg-muted/30 border-b ${centered ? "text-center" : ""}`}>
      <div className="container mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
