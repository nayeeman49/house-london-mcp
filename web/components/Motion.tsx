type MotionStaggerProps = {
  children: React.ReactNode;
  className?: string;
};

type MotionItemProps = {
  children: React.ReactNode;
  className?: string;
};

/** Staggered reveal for page sections */
export function MotionStagger({ children, className = "" }: MotionStaggerProps) {
  return <div className={`motion-stagger ${className}`.trim()}>{children}</div>;
}

/** Single element in a stagger group */
export function MotionItem({ children, className = "" }: MotionItemProps) {
  return <div className={`motion-item ${className}`.trim()}>{children}</div>;
}
