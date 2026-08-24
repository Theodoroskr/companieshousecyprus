import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { useAuthContext } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SignOutButton({ className }: { className?: string }) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signOut } = useAuthContext();

  return (
    <Button
      variant='ghost'
      size='sm'
      className={cn('gap-2 text-muted-foreground hover:text-foreground', className)}
      onClick={async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        await signOut();
        await router.invalidate();
        await navigate({ to: '/auth', replace: true });
      }}
    >
      <LogOut className='size-4' />
      Sign out
    </Button>
  );
}
