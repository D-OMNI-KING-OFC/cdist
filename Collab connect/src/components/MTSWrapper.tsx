import React from "react";
import MTS from "../components/MTS";

export type MTSWrapperProps = {
  lang: string;
  className?: string;
};

export const MTSWrapper: React.FC<MTSWrapperProps> = ({ lang, className }) => {
  // MTS default export expects props differently in original file; pass lang as prop name to be safe
  return (
    <div className={className} aria-label="multi-platform-search">
      {/* @ts-ignore - MTS has a default export signature that accepts lang as the only param */}
      <MTS {...( { lang } as any)} />
    </div>
  );
};

export default MTSWrapper;
