import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';

export function TagName({ name }: { name: string }) {
  const characters = Array.from(name);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="tag-name">
          {characters.length > 20 ? characters.slice(0, 20).join('') + '…' : name}
        </span>
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  );
}
