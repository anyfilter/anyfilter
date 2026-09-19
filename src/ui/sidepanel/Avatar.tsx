const SIZE_CLASSES = {
  xs: 'h-4.5 w-4.5',
  sm: 'h-5.5 w-5.5',
  lg: 'h-10 w-10',
} as const;

export function Avatar({ url, size }: { url: string; size: keyof typeof SIZE_CLASSES }) {
  const sizeClass = SIZE_CLASSES[size];
  if (url) {
    return <img className={`flex-none rounded-full object-cover ${sizeClass}`} src={url} alt="" />;
  }
  return (
    <span
      className={`grid flex-none place-items-center rounded-full bg-[#cfd9de] text-white ${sizeClass}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-[60%] w-[60%]">
        <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z" />
      </svg>
    </span>
  );
}
