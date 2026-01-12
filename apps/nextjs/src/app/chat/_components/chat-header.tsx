interface ChatHeaderProps {
  title: string;
}

export function ChatHeader({ title }: ChatHeaderProps) {
  return (
    <div className="shrink-0 border-b px-4 py-2">
      <h1 className="text-sm font-medium">{title}</h1>
    </div>
  );
}
