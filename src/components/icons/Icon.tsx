import { SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export function createIcon(
  name: string,
  children: React.ReactNode
): React.FC<IconProps> {
  const Icon: React.FC<IconProps> = ({
    size = 24,
    className,
    ...props
  }) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        className={className}
        aria-hidden="true"
        {...props}
      >
        {children}
      </svg>
    );
  };
  Icon.displayName = name;
  return Icon;
}
