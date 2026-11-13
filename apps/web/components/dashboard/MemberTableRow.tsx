import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Member } from "@/lib/dashboard/types";
import { memberStatusVariants } from "@/lib/dashboard/utils";

interface MemberTableRowProps {
  member: Member;
  onSelect: (id: string) => void;
  showJoined?: boolean;
  /** Joined recently: shows a soft "New" tag beside the name. */
  isNew?: boolean;
}

export function MemberTableRow({
  member,
  onSelect,
  showJoined = false,
  isNew = false,
}: MemberTableRowProps) {
  return (
    <TableRow
      className="cursor-pointer hover:bg-accent/50"
      onClick={() => onSelect(member.id)}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <PersonAvatar name={member.name} src={member.avatarUrl} />
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{member.name}</p>
            {isNew ? (
              <Badge className="border-transparent bg-primary/10 text-[color-mix(in_srgb,var(--primary)_70%,black)]">
                New
              </Badge>
            ) : null}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" size="lg">
          {member.role}
        </Badge>
      </TableCell>
      <TableCell>{member.group}</TableCell>
      <TableCell>
        <Badge
          variant={
            memberStatusVariants[
              member.status as keyof typeof memberStatusVariants
            ] ?? "outline"
          }
          size="lg"
        >
          {member.status}
        </Badge>
      </TableCell>
      {showJoined ? (
        <TableCell className="text-muted-foreground">{member.joined}</TableCell>
      ) : null}
      <TableCell className="text-right">
        <Button
          size="sm"
          aria-label={`View ${member.name}`}
          aria-haspopup="dialog"
        >
          View
        </Button>
      </TableCell>
    </TableRow>
  );
}
