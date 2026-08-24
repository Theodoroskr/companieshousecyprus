import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SignOutButton({ className }: { className?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return (
    <Button
      variant='ghost'
      size='sm'
      className={cn('gap-2 text-muted-foreground hover:text-foreground', className)}
      onClick={async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        await supabase.auth.signOut();
        navigate({ to: '/auth', replace: true });
      }}
    >
      <LogOut className='size-4' />
      Sign out
    </Button>
  );
}
