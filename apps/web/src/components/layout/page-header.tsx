export type PageHeaderProps = {
  title: string;
  description?: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header>
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      {description ? <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p> : null}
    </header>
  );
}
