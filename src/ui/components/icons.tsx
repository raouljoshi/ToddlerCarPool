interface IconProps {
  className?: string;
}

export function PeopleWaitingIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="9" r="2.5" />
      <path d="M3.5 19c.8-3.1 2.5-4.7 4.5-4.7s3.7 1.6 4.5 4.7" />
      <path d="M12.5 18.7c.7-2.4 2-3.7 3.5-3.7 1.8 0 3.2 1.3 4 3.7" />
    </svg>
  );
}

export function CarIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 13l1.7-4.2A3 3 0 0 1 9.5 7h5a3 3 0 0 1 2.8 1.8L19 13" />
      <path d="M4 13h16v5H4z" />
      <circle cx="7" cy="18" r="1.7" />
      <circle cx="17" cy="18" r="1.7" />
      <path d="M7 13h10" />
    </svg>
  );
}

