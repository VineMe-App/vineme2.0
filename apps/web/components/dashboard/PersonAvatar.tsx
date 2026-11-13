import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/dashboard/utils";
import { cn } from "@/lib/utils";

interface PersonAvatarProps {
  name: string;
  /** `users.avatar_url`. Falls back to initials if empty or the image fails. */
  src?: string | null;
  className?: string;
  fallbackClassName?: string;
}

export function PersonAvatar({
  name,
  src,
  className,
  fallbackClassName,
}: PersonAvatarProps) {
  return (
    <Avatar className={cn("shrink-0", className)}>
      {src ? <AvatarImage src={src} alt="" referrerPolicy="no-referrer" /> : null}
      <AvatarFallback className={fallbackClassName}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
