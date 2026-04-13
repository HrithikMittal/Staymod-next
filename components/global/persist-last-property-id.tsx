"use client";

import { useEffect } from "react";

import { writeLastPropertyId } from "@/utils/last-property-id";

type PersistLastPropertyIdProps = {
  propertyId: string;
};

/** Keeps localStorage in sync when viewing a property dashboard (incl. refresh). */
export function PersistLastPropertyId({ propertyId }: PersistLastPropertyIdProps) {
  useEffect(() => {
    writeLastPropertyId(propertyId);
  }, [propertyId]);

  return null;
}
