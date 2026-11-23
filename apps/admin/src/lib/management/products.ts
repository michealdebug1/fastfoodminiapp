import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@food-platform/shared";
import type { OptionGroupInput } from "./product-contracts";

export type ProductOptionSyncError =
  | "groupsLoadFailed"
  | "groupUnavailable"
  | "valuesLoadFailed"
  | "valueUnavailable"
  | "groupUpdateFailed"
  | "groupChanged"
  | "groupCreateFailed"
  | "groupIdentifyFailed"
  | "valueUpdateFailed"
  | "valueChanged"
  | "valueCreateFailed"
  | "valuesArchiveFailed"
  | "groupExtrasArchiveFailed"
  | "groupsArchiveFailed";

export async function syncProductOptions(
  supabase: SupabaseClient<Database>,
  restaurantId: string,
  productId: string,
  groups: OptionGroupInput[],
): Promise<ProductOptionSyncError | null> {
  const { data: existingGroups, error: groupsError } = await supabase
    .from("product_options")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("product_id", productId)
    .is("deleted_at", null);

  if (groupsError) {
    console.error("Could not read product option groups", groupsError);
    return "groupsLoadFailed";
  }

  const existingGroupIds = new Set((existingGroups ?? []).map(({ id }) => id));
  const submittedGroupIds = groups.flatMap((group) =>
    group.id ? [group.id] : [],
  );
  if (
    new Set(submittedGroupIds).size !== submittedGroupIds.length ||
    submittedGroupIds.some((id) => !existingGroupIds.has(id))
  ) {
    return "groupUnavailable";
  }

  const existingOptionIds = [...existingGroupIds];
  const { data: existingValues, error: valuesError } = existingOptionIds.length
    ? await supabase
        .from("product_option_values")
        .select("id, option_id")
        .eq("restaurant_id", restaurantId)
        .in("option_id", existingOptionIds)
        .is("deleted_at", null)
    : { data: [], error: null };

  if (valuesError) {
    console.error("Could not read product option values", valuesError);
    return "valuesLoadFailed";
  }

  const valueIdsByOption = new Map<string, Set<string>>();
  for (const value of existingValues ?? []) {
    const valuesForOption = valueIdsByOption.get(value.option_id) ?? new Set();
    valuesForOption.add(value.id);
    valueIdsByOption.set(value.option_id, valuesForOption);
  }

  const submittedValueIds = groups.flatMap((group) =>
    group.values.flatMap((value) => (value.id ? [value.id] : [])),
  );
  if (
    new Set(submittedValueIds).size !== submittedValueIds.length ||
    groups.some((group) => {
      const allowedValueIds = group.id
        ? (valueIdsByOption.get(group.id) ?? new Set<string>())
        : new Set<string>();
      return group.values.some(
        (value) => value.id && !allowedValueIds.has(value.id),
      );
    })
  ) {
    return "valueUnavailable";
  }

  const now = new Date().toISOString();
  const retainedGroupIds = new Set<string>();

  for (const group of groups) {
    const groupPayload = {
      restaurant_id: restaurantId,
      product_id: productId,
      name: group.name,
      is_required: group.isRequired,
      min_selections: group.minSelections,
      max_selections: group.maxSelections,
      deleted_at: null,
    };

    let optionId = group.id;
    if (group.id) {
      const { data, error } = await supabase
        .from("product_options")
        .update(groupPayload)
        .eq("id", group.id)
        .eq("product_id", productId)
        .eq("restaurant_id", restaurantId)
        .select("id")
        .maybeSingle();
      if (error) {
        console.error("Could not update a product option group", error);
        return "groupUpdateFailed";
      }
      if (!data) {
        return "groupChanged";
      }
    } else {
      const { data, error } = await supabase
        .from("product_options")
        .insert(groupPayload)
        .select("id")
        .single();
      if (error) {
        console.error("Could not create a product option group", error);
        return "groupCreateFailed";
      }
      optionId = data.id;
    }

    if (!optionId) {
      return "groupIdentifyFailed";
    }
    retainedGroupIds.add(optionId);

    const retainedValueIds = new Set<string>();
    for (const value of group.values) {
      const valuePayload = {
        restaurant_id: restaurantId,
        option_id: optionId,
        name: value.name,
        price_delta: value.priceDelta,
        is_available: value.isAvailable,
        deleted_at: null,
      };

      if (value.id) {
        const { data, error } = await supabase
          .from("product_option_values")
          .update(valuePayload)
          .eq("id", value.id)
          .eq("option_id", optionId)
          .eq("restaurant_id", restaurantId)
          .select("id")
          .maybeSingle();
        if (error) {
          console.error("Could not update a product option value", error);
          return "valueUpdateFailed";
        }
        if (!data) {
          return "valueChanged";
        }
        retainedValueIds.add(value.id);
      } else {
        const { data, error } = await supabase
          .from("product_option_values")
          .insert(valuePayload)
          .select("id")
          .single();
        if (error) {
          console.error("Could not create a product option value", error);
          return "valueCreateFailed";
        }
        retainedValueIds.add(data.id);
      }
    }

    const oldValueIds = valueIdsByOption.get(optionId) ?? new Set();
    const removedValueIds = [...oldValueIds].filter(
      (id) => !retainedValueIds.has(id),
    );
    if (removedValueIds.length > 0) {
      const { error } = await supabase
        .from("product_option_values")
        .update({ deleted_at: now, is_available: false })
        .in("id", removedValueIds)
        .eq("restaurant_id", restaurantId);
      if (error) {
        console.error("Could not archive removed product option values", error);
        return "valuesArchiveFailed";
      }
    }
  }

  const removedGroupIds = [...existingGroupIds].filter(
    (id) => !retainedGroupIds.has(id),
  );
  if (removedGroupIds.length > 0) {
    const removedValueIds = removedGroupIds.flatMap((id) => [
      ...(valueIdsByOption.get(id) ?? []),
    ]);
    if (removedValueIds.length > 0) {
      const { error: removedValuesError } = await supabase
        .from("product_option_values")
        .update({ deleted_at: now, is_available: false })
        .in("id", removedValueIds)
        .eq("restaurant_id", restaurantId);
      if (removedValuesError) {
        console.error(
          "Could not archive extras for removed product option groups",
          removedValuesError,
        );
        return "groupExtrasArchiveFailed";
      }
    }

    const { error } = await supabase
      .from("product_options")
      .update({ deleted_at: now })
      .in("id", removedGroupIds)
      .eq("restaurant_id", restaurantId);
    if (error) {
      console.error("Could not archive removed product option groups", error);
      return "groupsArchiveFailed";
    }
  }

  return null;
}
