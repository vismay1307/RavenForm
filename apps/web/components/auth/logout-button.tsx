"use client";

import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";

export function LogoutButton() {
  const router = useRouter();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      toast.success("Signed out.");
      router.push("/login");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Button
      variant="outline"
      disabled={logoutMutation.isPending}
      onClick={() => logoutMutation.mutate({})}
      className="border-stone-700 bg-transparent text-stone-100 hover:bg-stone-900"
    >
      Sign out
    </Button>
  );
}
