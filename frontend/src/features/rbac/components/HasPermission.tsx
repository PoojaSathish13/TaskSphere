"use client";

import React from "react";
import { useAuthorization } from "../hooks/useAuthorization";

interface HasPermissionProps {
  children: React.ReactNode;
  permission: string;
  fallback?: React.ReactNode;
}

export const HasPermission: React.FC<HasPermissionProps> = ({
  children,
  permission,
  fallback = null,
}) => {
  const { hasPermission } = useAuthorization();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
export default HasPermission;
