"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@flatsby/ui/button";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";

import { signOutAndRedirect } from "~/auth/client";

const UserLogoutButton = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <Button
      variant="secondary"
      className="w-full"
      onClick={async () => {
        setLoading(true);
        await signOutAndRedirect(router);
        setLoading(false);
      }}
      disabled={loading}
    >
      {loading ? <LoadingSpinner /> : "Logout"}
    </Button>
  );
};

export default UserLogoutButton;
