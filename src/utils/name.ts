export interface NameLike {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
}

const trimOrEmpty = (value?: string | null): string => (value ?? '').trim();

export const getFullName = (user?: NameLike | null): string => {
  if (!user) return '';
  const first = trimOrEmpty(user.first_name);
  const last = trimOrEmpty(user.last_name);
  if (first || last) {
    return [first, last].filter(Boolean).join(' ').trim();
  }
  return trimOrEmpty(user.name);
};

export const getFirstName = (user?: NameLike | null): string => {
  if (!user) return '';
  const first = trimOrEmpty(user.first_name);
  if (first) return first;
  const full = trimOrEmpty(user.name);
  if (!full) return '';
  return full.split(/\s+/)[0] || '';
};

export const getLastName = (user?: NameLike | null): string => {
  if (!user) return '';
  const last = trimOrEmpty(user.last_name);
  if (last) return last;
  const full = trimOrEmpty(user.name);
  if (!full) return '';
  const parts = full.split(/\s+/);
  if (parts.length <= 1) {
    return '';
  }
  parts.shift();
  return parts.join(' ');
};

export const getDisplayName = (
  user?: NameLike | null,
  options: { lastInitial?: boolean; fallback?: 'full' | 'first' } = {}
): string => {
  const { lastInitial = false, fallback = 'full' } = options;
  const first = getFirstName(user);
  const last = getLastName(user);

  if (first) {
    if (lastInitial && last) {
      return `${first} ${last.charAt(0).toUpperCase()}.`;
    }
    if (last) {
      return `${first} ${last}`;
    }
    return first;
  }

  if (fallback === 'first') {
    return first || '';
  }

  return getFullName(user);
};

export const getInitials = (user?: NameLike | null): string => {
  const first = getFirstName(user);
  const last = getLastName(user);
  const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  if (initials.trim()) {
    return initials;
  }
  const full = getFullName(user);
  return full
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
