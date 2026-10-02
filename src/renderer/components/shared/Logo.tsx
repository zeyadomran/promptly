import logo from '../../assets/brand/logo.svg';
import logoOnDark from '../../assets/brand/logo-on-dark.svg';
import { cn } from '../../lib/utils';

interface LogoProps {
  size?: 16 | 18 | 20 | 32 | 64;
  wordmark?: boolean;
  className?: string;
}

export function Logo({ size = 32, wordmark = false, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span aria-hidden="true">
        <img className="brand-light" src={logo} width={size} height={size} alt="" />
        <img className="brand-dark" src={logoOnDark} width={size} height={size} alt="" />
      </span>
      {wordmark ? (
        <span className="font-medium tracking-[-0.03em]">Promptly</span>
      ) : (
        <span className="sr-only">Promptly</span>
      )}
    </span>
  );
}
