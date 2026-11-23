import assert from "node:assert/strict";
import test from "node:test";
import {
  optionGroupsSchema,
  productInputSchema,
} from "../src/lib/management/product-contracts.ts";

test("product form validation accepts localized UZS catalog data", () => {
  const result = productInputSchema.safeParse({
    id: "",
    nameUz: "Burger",
    nameRu: "Бургер",
    descriptionUz: "",
    descriptionRu: "",
    price: "89000",
    categoryId: "",
    isAvailable: "true",
    isFeatured: "false",
    displayOrder: "0",
  });

  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.price, 89000);
});

test("product form validation rejects fractional and unsafe prices", () => {
  const base = {
    id: "",
    nameUz: "Burger",
    nameRu: "Бургер",
    descriptionUz: "",
    descriptionRu: "",
    categoryId: "",
    isAvailable: "true",
    isFeatured: "false",
    displayOrder: "0",
  };

  assert.equal(productInputSchema.safeParse({ ...base, price: "89.5" }).success, false);
  assert.equal(
    productInputSchema.safeParse({ ...base, price: "9007199254740992" }).success,
    false,
  );
});

test("required option groups require a valid selectable extra", () => {
  const requiredWithoutValues = optionGroupsSchema.safeParse([
    {
      name: { uz: "Extra", ru: "Добавка" },
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      values: [],
    },
  ]);
  assert.equal(requiredWithoutValues.success, false);

  const validGroup = optionGroupsSchema.safeParse([
    {
      name: { uz: "Extra", ru: "Добавка" },
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      values: [
        {
          name: { uz: "Cheese", ru: "Сыр" },
          priceDelta: 8000,
          isAvailable: true,
        },
      ],
    },
  ]);
  assert.equal(validGroup.success, true);
});
