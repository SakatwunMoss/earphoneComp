type ImagePlaceholderProps = {
  alt: string;
  className?: string;
  label?: string;
};

export function ImagePlaceholder({
  alt,
  className = "",
  label = "No Image",
}: ImagePlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={`flex items-center justify-center bg-gray-200 text-sm text-gray-500 ${className}`}
    >
      {label}
    </div>
  );
}
