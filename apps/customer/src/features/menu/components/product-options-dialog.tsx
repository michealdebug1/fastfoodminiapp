"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Product, ProductOptionValue } from "../types";

export function ProductOptionsDialog({
  open,
  product,
  formatPrice,
  onAdd,
  onClose,
}: {
  open: boolean;
  product: Product;
  formatPrice: (amount: number) => string;
  onAdd: (
    optionValueIds: readonly string[],
    selectedValues: readonly ProductOptionValue[],
  ) => void;
  onClose: () => void;
}) {
  const t = useTranslations("ProductOptions");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedByGroup, setSelectedByGroup] = useState<
    Record<string, string[]>
  >({});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  const selectedValues = useMemo(
    () =>
      product.options.flatMap((group) => {
        const selected = new Set(selectedByGroup[group.id] ?? []);
        return group.values.filter((value) => selected.has(value.id));
      }),
    [product.options, selectedByGroup],
  );
  const selectedIds = selectedValues.map(({ id }) => id);
  const optionsTotal = selectedValues.reduce(
    (total, value) => total + value.priceDelta,
    0,
  );
  const canAdd = product.options.every((group) => {
    const count = (selectedByGroup[group.id] ?? []).length;
    const minimum = Math.max(group.minSelections, group.isRequired ? 1 : 0);
    return (
      count >= minimum &&
      (group.maxSelections === null || count <= group.maxSelections)
    );
  });

  function selectValue(groupId: string, valueId: string, max: number | null) {
    setSelectedByGroup((current) => {
      const currentSelection = current[groupId] ?? [];
      if (currentSelection.includes(valueId)) {
        return {
          ...current,
          [groupId]: currentSelection.filter((id) => id !== valueId),
        };
      }
      if (max === 1) return { ...current, [groupId]: [valueId] };
      if (max !== null && currentSelection.length >= max) return current;
      return { ...current, [groupId]: [...currentSelection, valueId] };
    });
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) handleClose();
  }

  function handleClose() {
    setSelectedByGroup({});
    onClose();
  }

  function handleAdd() {
    onAdd(selectedIds, selectedValues);
    setSelectedByGroup({});
  }

  return (
    <dialog
      ref={dialogRef}
      className="product-dialog"
      aria-labelledby={`product-options-title-${product.id}`}
      onClose={handleClose}
      onClick={handleBackdropClick}
    >
      <section className="max-h-[85dvh] overflow-y-auto rounded-3xl bg-cream-50 p-5 shadow-float sm:p-6">
        <h2
          className="font-display text-xl font-black text-ink-900"
          id={`product-options-title-${product.id}`}
        >
          {product.name}
        </h2>
        {product.description ? (
          <p className="mt-2 text-sm leading-6 text-ink-600">
            {product.description}
          </p>
        ) : null}
        <p className="mt-2 text-sm font-bold text-ink-900">
          {formatPrice(product.priceUzs + optionsTotal)}
        </p>

        <div className="mt-5 space-y-5">
          {product.options.map((group) => {
            const selected = new Set(selectedByGroup[group.id] ?? []);
            const minimum = Math.max(
              group.minSelections,
              group.isRequired ? 1 : 0,
            );
            return (
              <fieldset className="space-y-2" key={group.id}>
                <legend className="text-sm font-extrabold text-ink-900">
                  {group.name}
                  <span className="ml-2 text-[11px] font-semibold text-ink-500">
                    {minimum > 0
                      ? t("chooseAtLeast", { count: minimum })
                      : t("optional")}
                  </span>
                </legend>
                {group.values.length === 0 ? (
                  <p className="text-xs text-tomato-600">{t("unavailable")}</p>
                ) : (
                  group.values.map((value) => {
                    const inputType =
                      group.maxSelections === 1 ? "radio" : "checkbox";
                    return (
                      <label
                        className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-white px-3 py-2 text-sm"
                        key={value.id}
                      >
                        <input
                          checked={selected.has(value.id)}
                          name={`option-${group.id}`}
                          onChange={() =>
                            selectValue(
                              group.id,
                              value.id,
                              group.maxSelections,
                            )
                          }
                          type={inputType}
                        />
                        <span className="flex-1">{value.name}</span>
                        {value.priceDelta > 0 ? (
                          <span className="text-xs font-semibold text-ink-500">
                            +{formatPrice(value.priceDelta)}
                          </span>
                        ) : null}
                      </label>
                    );
                  })
                )}
              </fieldset>
            );
          })}
        </div>

        <div className="mt-6 flex gap-2">
          <Button
            className="flex-1"
            onClick={handleClose}
            type="button"
            variant="outline"
          >
            {t("cancel")}
          </Button>
          <Button
            className="flex-1"
            disabled={!canAdd}
            onClick={handleAdd}
            type="button"
          >
            {t("add")}
          </Button>
        </div>
      </section>
    </dialog>
  );
}
