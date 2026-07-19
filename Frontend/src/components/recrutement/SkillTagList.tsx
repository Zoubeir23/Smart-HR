interface SkillTagListProps {
  skills: string[];
  maxVisible?: number;
}

export function SkillTagList({ skills, maxVisible = 3 }: SkillTagListProps) {
  const visibleSkills = skills.slice(0, maxVisible);
  const remainingSkillsCount = skills.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1">
      {visibleSkills.map((skill) => (
        <span
          key={skill}
          className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium border border-primary/20"
        >
          {skill}
        </span>
      ))}
      {remainingSkillsCount > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-medium">
          +{remainingSkillsCount}
        </span>
      )}
    </div>
  );
}
