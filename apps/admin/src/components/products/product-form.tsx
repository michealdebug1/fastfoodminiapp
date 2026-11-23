"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { saveProductAction, type ProductActionState } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Localized = { uz: string; ru: string };
type ProductValue = {
  id?: string;
  name: Localized;
  price_delta: number;
  is_available: boolean;
};
type ProductOptionGroup = {
  id?: string;
  name: Localized;
  is_required: boolean;
  min_selections: number;
  max_selections: number | null;
  values: ProductValue[];
};
type EditableValue = {
  id?: string;
  nameUz: string;
  nameRu: string;
  priceDelta: string;
  isAvailable: boolean;
};
type EditableGroup = {
  id?: string;
  nameUz: string;
  nameRu: string;
  isRequired: boolean;
  minSelections: string;
  maxSelections: string;
  values: EditableValue[];
};

const initialState: ProductActionState = {};

export function ProductForm({
  product,
  categories,
  optionGroups,
  imageUrl,
}: {
  product?: {
    id: string;
    name: Localized;
    description: Localized;
    price: number;
    categoryId: string;
    isAvailable: boolean;
    isFeatured: boolean;
    displayOrder: number;
  };
  categories: { id: string; name: string }[];
  optionGroups: ProductOptionGroup[];
  imageUrl?: string | null;
}) {
  const t = useTranslations("ProductForm");
  const router = useRouter();
  const [state, action, pending] = useActionState(saveProductAction, initialState);
  const handledState = useRef<ProductActionState | null>(null);
  const [groups, setGroups] = useState<EditableGroup[]>(
    optionGroups.map((group) => ({
      id: group.id,
      nameUz: group.name.uz,
      nameRu: group.name.ru,
      isRequired: group.is_required,
      minSelections: String(group.min_selections),
      maxSelections:
        group.max_selections === null ? "" : String(group.max_selections),
      values: group.values.map((value) => ({
        id: value.id,
        nameUz: value.name.uz,
        nameRu: value.name.ru,
        priceDelta: String(value.price_delta),
        isAvailable: value.is_available,
      })),
    })),
  );
  const [message, setMessage] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState<
    | { kind: "group"; groupIndex: number }
    | { kind: "value"; groupIndex: number; valueIndex: number }
    | null
  >(null);

  useEffect(() => {
    if (
      !state.success ||
      !state.productId ||
      handledState.current === state
    ) {
      return;
    }
    handledState.current = state;
    setMessage(state.success);
    if (!product) {
      router.push(`/products/${state.productId}?saved=1`);
      return;
    }
    router.refresh();
  }, [product, router, state]);

  function updateGroup(index: number, patch: Partial<EditableGroup>) {
    setGroups((current) =>
      current.map((group, groupIndex) =>
        groupIndex === index ? { ...group, ...patch } : group,
      ),
    );
  }

  function updateValue(
    groupIndex: number,
    valueIndex: number,
    patch: Partial<EditableValue>,
  ) {
    setGroups((current) =>
      current.map((group, currentGroupIndex) =>
        currentGroupIndex === groupIndex
          ? {
              ...group,
              values: group.values.map((value, currentValueIndex) =>
                currentValueIndex === valueIndex
                  ? { ...value, ...patch }
                  : value,
              ),
            }
          : group,
      ),
    );
  }

  function confirmRemoval() {
    if (!pendingRemoval) return;
    if (pendingRemoval.kind === "group") {
      setGroups((current) =>
        current.filter((_, index) => index !== pendingRemoval.groupIndex),
      );
    } else {
      setGroups((current) =>
        current.map((group, index) =>
          index === pendingRemoval.groupIndex
            ? {
                ...group,
                values: group.values.filter(
                  (_, valueIndex) => valueIndex !== pendingRemoval.valueIndex,
                ),
              }
            : group,
        ),
      );
    }
    setPendingRemoval(null);
  }

  const optionPayload = groups.map((group) => ({
    ...(group.id ? { id: group.id } : {}),
    name: { uz: group.nameUz, ru: group.nameRu },
    isRequired: group.isRequired,
    minSelections: Number(group.minSelections || 0),
    maxSelections:
      group.maxSelections === "" ? null : Number(group.maxSelections),
    values: group.values.map((value) => ({
      ...(value.id ? { id: value.id } : {}),
      name: { uz: value.nameUz, ru: value.nameRu },
      priceDelta: Number(value.priceDelta || 0),
      isAvailable: value.isAvailable,
    })),
  }));

  return (
    <form
      action={action}
      className="space-y-4"
      onSubmit={() => setMessage("")}
    >
      <input name="id" type="hidden" value={product?.id ?? ""} />
      <input
        name="optionGroups"
        type="hidden"
        value={JSON.stringify(optionPayload)}
      />
      <Card>
        <CardHeader>
          <div>
            <h2 className="text-sm font-semibold">{t("information")}</h2>
            <p className="mt-1 text-xs text-admin-muted">
              {t("informationDescription")}
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-medium">
            {t("nameUz")}
            <Input defaultValue={product?.name.uz ?? ""} maxLength={160} name="nameUz" required />
          </label>
          <label className="space-y-1.5 text-xs font-medium">
            {t("nameRu")}
            <Input defaultValue={product?.name.ru ?? ""} maxLength={160} name="nameRu" required />
          </label>
          <label className="space-y-1.5 text-xs font-medium sm:col-span-2">
            {t("descriptionUz")}
            <textarea
              className="min-h-20 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:border-admin-orange focus:outline-none"
              defaultValue={product?.description.uz ?? ""}
              maxLength={2000}
              name="descriptionUz"
              rows={3}
            />
          </label>
          <label className="space-y-1.5 text-xs font-medium sm:col-span-2">
            {t("descriptionRu")}
            <textarea
              className="min-h-20 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:border-admin-orange focus:outline-none"
              defaultValue={product?.description.ru ?? ""}
              maxLength={2000}
              name="descriptionRu"
              rows={3}
            />
          </label>
          <label className="space-y-1.5 text-xs font-medium">
            {t("price")}
            <Input
              defaultValue={product?.price ?? ""}
              inputMode="numeric"
              min="0"
              name="price"
              required
              step="1"
              type="number"
            />
          </label>
          <label className="space-y-1.5 text-xs font-medium">
            {t("category")}
            <select
              className="h-10 w-full rounded-lg border bg-white px-3 text-sm focus:border-admin-orange focus:outline-none"
              defaultValue={product?.categoryId ?? ""}
              name="categoryId"
            >
              <option value="">{t("uncategorized")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-medium">
            {t("displayOrder")}
            <Input
              defaultValue={product?.displayOrder ?? 0}
              min="0"
              name="displayOrder"
              step="1"
              type="number"
            />
          </label>
          <label className="space-y-1.5 text-xs font-medium">
            {t("image")}
            <Input
              accept="image/jpeg,image/png,image/webp"
              name="image"
              type="file"
            />
            <span className="block font-normal text-admin-muted">
              {t("imageHelp")}
            </span>
          </label>
          {imageUrl && (
            <div className="text-xs">
              <p className="mb-1.5 font-medium">{t("currentImage")}</p>
              {/* Product images are public assets in the dedicated Storage bucket. */}
              <img
                alt={t("currentImageAlt")}
                className="size-24 rounded-lg border object-cover"
                height={96}
                src={imageUrl}
                width={96}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-5 sm:col-span-2">
            <label className="inline-flex items-center gap-2 text-xs">
              <input
                defaultChecked={product?.isAvailable ?? true}
                name="isAvailable"
                type="checkbox"
                value="true"
              />
              {t("availableToOrder")}
              <input name="isAvailable" type="hidden" value="false" />
            </label>
            <label className="inline-flex items-center gap-2 text-xs">
              <input
                defaultChecked={product?.isFeatured ?? false}
                name="isFeatured"
                type="checkbox"
                value="true"
              />
              {t("featured")}
              <input name="isFeatured" type="hidden" value="false" />
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h2 className="text-sm font-semibold">{t("options")}</h2>
            <p className="mt-1 text-xs text-admin-muted">
              {t("optionsDescription")}
            </p>
          </div>
          <Button
            onClick={() =>
              setGroups((current) => [
                ...current,
                {
                  nameUz: "",
                  nameRu: "",
                  isRequired: false,
                  minSelections: "0",
                  maxSelections: "",
                  values: [],
                },
              ])
            }
            size="sm"
            type="button"
          >
            <Plus aria-hidden="true" size={14} />
            {t("addGroup")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {groups.length === 0 && (
            <p className="rounded-lg border border-dashed p-5 text-center text-xs text-admin-muted">
              {t("noOptions")}
            </p>
          )}
          {groups.map((group, groupIndex) => (
            <section className="rounded-xl border bg-slate-50/60 p-4" key={group.id ?? `new-${groupIndex}`}>
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-[150px] flex-1 space-y-1.5 text-xs font-medium">
                  {t("groupNameUz")}
                  <Input
                    onChange={(event) => updateGroup(groupIndex, { nameUz: event.target.value })}
                    value={group.nameUz}
                  />
                </label>
                <label className="min-w-[150px] flex-1 space-y-1.5 text-xs font-medium">
                  {t("groupNameRu")}
                  <Input
                    onChange={(event) => updateGroup(groupIndex, { nameRu: event.target.value })}
                    value={group.nameRu}
                  />
                </label>
                <label className="w-24 space-y-1.5 text-xs font-medium">
                  {t("minPicks")}
                  <Input
                    min="0"
                    onChange={(event) => updateGroup(groupIndex, { minSelections: event.target.value })}
                    type="number"
                    value={group.minSelections}
                  />
                </label>
                <label className="w-24 space-y-1.5 text-xs font-medium">
                  {t("maxPicks")}
                  <Input
                    min="0"
                    onChange={(event) => updateGroup(groupIndex, { maxSelections: event.target.value })}
                    placeholder={t("any")}
                    type="number"
                    value={group.maxSelections}
                  />
                </label>
                <label className="inline-flex h-10 items-center gap-2 text-xs">
                  <input
                    checked={group.isRequired}
                    onChange={(event) => updateGroup(groupIndex, { isRequired: event.target.checked })}
                    type="checkbox"
                  />
                  {t("required")}
                </label>
                <Button
                  aria-label={t("removeGroup")}
                  onClick={() => setPendingRemoval({ kind: "group", groupIndex })}
                  type="button"
                  variant="ghost"
                >
                  <Trash2 aria-hidden="true" size={15} />
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {group.values.map((value, valueIndex) => (
                  <div className="grid gap-2 rounded-lg border bg-white p-3 sm:grid-cols-[1fr_1fr_140px_auto_auto]" key={value.id ?? `new-${valueIndex}`}>
                    <label className="space-y-1 text-[11px] font-medium">
                      {t("extraUz")}
                      <Input
                        onChange={(event) => updateValue(groupIndex, valueIndex, { nameUz: event.target.value })}
                        value={value.nameUz}
                      />
                    </label>
                    <label className="space-y-1 text-[11px] font-medium">
                      {t("extraRu")}
                      <Input
                        onChange={(event) => updateValue(groupIndex, valueIndex, { nameRu: event.target.value })}
                        value={value.nameRu}
                      />
                    </label>
                    <label className="space-y-1 text-[11px] font-medium">
                      {t("priceAddition")}
                      <Input
                        min="0"
                        onChange={(event) => updateValue(groupIndex, valueIndex, { priceDelta: event.target.value })}
                        type="number"
                        value={value.priceDelta}
                      />
                    </label>
                    <label className="inline-flex items-center gap-2 self-end pb-2 text-[11px]">
                      <input
                        checked={value.isAvailable}
                        onChange={(event) => updateValue(groupIndex, valueIndex, { isAvailable: event.target.checked })}
                        type="checkbox"
                      />
                      {t("extraAvailable")}
                    </label>
                    <Button
                      aria-label={t("removeExtra")}
                      className="self-end"
                      onClick={() =>
                        setPendingRemoval({
                          kind: "value",
                          groupIndex,
                          valueIndex,
                        })
                      }
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" size={15} />
                    </Button>
                  </div>
                ))}
                <Button
                  onClick={() =>
                    updateGroup(groupIndex, {
                      values: [
                        ...group.values,
                        {
                          nameUz: "",
                          nameRu: "",
                          priceDelta: "0",
                          isAvailable: true,
                        },
                      ],
                    })
                  }
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  <Plus aria-hidden="true" size={13} />
                  {t("addExtra")}
                </Button>
              </div>
            </section>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div aria-live="polite" className="text-xs">
          {state.error && <p className="text-admin-red">{state.error}</p>}
          {state.warning && <p className="text-admin-amber">{state.warning}</p>}
          {message && <p className="text-admin-green">{message}</p>}
          {state.error && state.productId && (
            <a className="mt-1 inline-block text-admin-orange underline" href={`/products/${state.productId}`}>
              {t("openSavedProduct")}
            </a>
          )}
        </div>
        <Button disabled={pending} type="submit" variant="primary">
          {pending
            ? t("saving")
            : product
              ? t("saveChanges")
              : t("createProduct")}
        </Button>
      </div>
      <Dialog
        description={
          pendingRemoval?.kind === "group"
            ? t("removeGroupDescription")
            : t("removeExtraDescription")
        }
        onClose={() => setPendingRemoval(null)}
        open={pendingRemoval !== null}
        title={
          pendingRemoval?.kind === "group"
            ? t("removeGroupTitle")
            : t("removeExtraTitle")
        }
      >
        <div className="flex justify-end gap-2">
          <Button onClick={() => setPendingRemoval(null)}>{t("keep")}</Button>
          <Button onClick={confirmRemoval} variant="danger">
            {t("remove")}
          </Button>
        </div>
      </Dialog>
    </form>
  );
}
