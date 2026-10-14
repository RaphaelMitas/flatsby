import type React from "react";

import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";

const Loading: React.FC = () => {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <LoadingSpinner />
    </div>
  );
};

export default Loading;
