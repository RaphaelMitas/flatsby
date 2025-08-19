"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@flatsby/ui/button";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";

import { signOut } from "~/auth/client";

const UserLogoutButton = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <Button
      variant="secondary"
      className="w-full"
      onClick={async () => {
        setLoading(true);
        await signOut({
          fetchOptions: {
            onSuccess: () => {
              router.push("/auth/login");
            },
          },
        });
        setLoading(false);
      }}
      disabled={loading}
    >
      {loading ? <LoadingSpinner /> : "Logout"}
    </Button>
  );
};

export default UserLogoutButton;
