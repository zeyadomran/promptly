export function TagName({ name }: { name: string }) {
  const characters = Array.from(name);

  return (
    <span className="tag-name">
      {characters.length > 20 ? characters.slice(0, 20).join('') + '…' : name}
    </span>
  );
}
