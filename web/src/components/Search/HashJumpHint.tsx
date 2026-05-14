import { CornerDownLeft } from "lucide-react";

interface Props {
  hash: string;
  onJump: () => void;
}

export function HashJumpHint({ hash, onJump }: Props) {
  return (
    <button
      type="button"
      onClick={onJump}
      className="flex items-center gap-1 px-2 h-8 text-xs rounded-md border bg-background hover:bg-accent"
      title={`Jump to commit ${hash}`}
    >
      <CornerDownLeft className="h-3 w-3" />
      <span>Jump {hash.slice(0, 7)}</span>
    </button>
  );
}
