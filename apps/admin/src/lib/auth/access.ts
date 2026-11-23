import "server-only";

import { STAFF_ROLES, type StaffRole } from "@food-platform/shared";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@food-platform/shared";
import { canAccessArea, type AdminArea } from "./permissions";
import { createClient } from "@/lib/supabase/server";

export type StaffAccess = {
  userId: string;
  email: string | null;
  role: StaffRole;
  restaurantId: string;
  restaurantName: string;
};

export type StaffAccessResult =
  | { kind: "unauthenticated"; reason?: "session-expired" }
  | { kind: "unauthorized" }
  | { kind: "error"; error: Error }
  | { kind: "authorized"; staff: StaffAccess };

function isStaffRole(value: string): value is StaffRole {
  return STAFF_ROLES.some((role) => role === value);
}

export async function getStaffAccess(
  supabase: SupabaseClient<Database>,
): Promise<StaffAccessResult> {
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError?.name === "AuthSessionMissingError") {
    return { kind: "unauthenticated" };
  }
  if (
    claimsError &&
    (claimsError.status === 400 || claimsError.status === 401)
  ) {
    return { kind: "unauthenticated", reason: "session-expired" };
  }
  if (claimsError) {
    return { kind: "error", error: claimsError };
  }
  if (typeof claimsData?.claims?.sub !== "string") {
    return { kind: "unauthenticated" };
  }

  const userId = claimsData.claims.sub;
  const email =
    typeof claimsData.claims.email === "string"
      ? claimsData.claims.email
      : null;

  const { data: memberships, error: membershipError } = await supabase
    .from("restaurant_staff")
    .select("restaurant_id, role_id")
    .eq("auth_user_id", userId)
    .eq("is_active", true);

  if (membershipError) {
    return { kind: "error", error: membershipError };
  }

  if (!memberships || memberships.length !== 1) {
    return { kind: "unauthorized" };
  }

  const membership = memberships[0];
  if (!membership) {
    return { kind: "unauthorized" };
  }
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id, slug")
    .eq("id", membership.role_id)
    .maybeSingle();

  if (roleError) {
    return { kind: "error", error: roleError };
  }

  if (!role || !isStaffRole(role.slug)) {
    return { kind: "unauthorized" };
  }

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("id", membership.restaurant_id)
    .eq("is_active", true)
    .maybeSingle();

  if (restaurantError) {
    return { kind: "error", error: restaurantError };
  }

  if (!restaurant) {
    return { kind: "unauthorized" };
  }

  return {
    kind: "authorized",
    staff: {
      userId,
      email,
      role: role.slug,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    },
  };
}

export async function requireStaffSession(
  supabase?: SupabaseClient<Database>,
) {
  const client = supabase ?? (await createClient());
  const result = await getStaffAccess(client);

  if (result.kind === "unauthenticated") {
    redirect(
      result.reason === "session-expired"
        ? "/login?reason=session-expired"
        : "/login",
    );
  }

  if (result.kind === "error") {
    throw new Error("Unable to verify restaurant staff access", {
      cause: result.error,
    });
  }

  if (result.kind === "unauthorized") {
    redirect("/unauthorized");
  }

  return result.staff;
}

export async function requireAdminArea(
  area: AdminArea,
  supabase?: SupabaseClient<Database>,
) {
  const staff = await requireStaffSession(supabase);

  if (!canAccessArea(staff.role, area)) {
    redirect("/unauthorized");
  }

  return staff;
}
