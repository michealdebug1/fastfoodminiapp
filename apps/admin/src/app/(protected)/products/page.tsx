import Link from "next/link";
import { Plus, Search, Utensils } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/config";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type TableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { requireAdminArea } from "@/lib/auth/access";
import {
  escapeLikePattern,
  localizedValue,
  PRODUCT_PAGE_SIZE,
} from "@/lib/management/product-contracts";
import { formatNumber, formatUzs } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type ProductRow = {
  id: string;
  name: string;
  category: string;
  price: string;
  availability: boolean;
};

export async function generateMetadata() {
  const t = await getTranslations("Products");
  return { title: t("title") };
}

function listHref(page: number, query?: string, category?: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  const value = params.toString();
  return value ? `/products?${value}` : "/products";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const requestedPage = Number(params.page ?? 1);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, 10_000)
      : 1;
  const query = (params.q ?? "").trim().slice(0, 80);
  const categoryId =
    typeof params.category === "string" && /^[0-9a-f-]{36}$/i.test(params.category)
      ? params.category
      : "";
  const locale = resolveLocale(await getLocale());
  const t = await getTranslations("Products");

  const supabase = await createClient();
  const staff = await requireAdminArea("products", supabase);
  const [{ data: categories, error: categoriesError }, productsResult] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name")
        .eq("restaurant_id", staff.restaurantId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("display_order", { ascending: true }),
      (async () => {
        let productsQuery = supabase
          .from("products")
          .select("id, name, category_id, price, is_available", {
            count: "exact",
          })
          .eq("restaurant_id", staff.restaurantId)
          .is("deleted_at", null)
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: false })
          .range(
            (page - 1) * PRODUCT_PAGE_SIZE,
            page * PRODUCT_PAGE_SIZE - 1,
          );
        if (categoryId) productsQuery = productsQuery.eq("category_id", categoryId);
        if (query) {
          productsQuery = productsQuery          .ilike(
            `name->>${locale}`,
            `%${escapeLikePattern(query)}%`,
          );
        }
        return productsQuery;
      })(),
    ]);

  if (categoriesError) {
    throw new Error("Unable to load restaurant categories", {
      cause: categoriesError,
    });
  }
  if (productsResult.error) {
    throw new Error("Unable to load restaurant products", {
      cause: productsResult.error,
    });
  }

  const categoryNames = new Map(
    (categories ?? []).map((category) => [
      category.id,
      localizedValue(category.name, locale) || t("unnamedCategory"),
    ]),
  );
  const rows: ProductRow[] = (productsResult.data ?? []).map((product) => ({
    id: product.id,
    name: localizedValue(product.name, locale) || t("unnamedProduct"),
    category: product.category_id
      ? (categoryNames.get(product.category_id) ?? t("archivedCategory"))
      : t("uncategorized"),
    price: String(product.price),
    availability: product.is_available,
  }));
  const pageCount = Math.max(
    1,
    Math.ceil((productsResult.count ?? 0) / PRODUCT_PAGE_SIZE),
  );
  const columns: TableColumn<ProductRow>[] = [
    {
      key: "name",
      header: t("product"),
      render: (row) => (
        <Link
          className="font-semibold text-admin-orange hover:underline"
          href={`/products/${row.id}`}
        >
          {row.name}
        </Link>
      ),
    },
    { key: "category", header: t("category"), render: (row) => row.category },
    {
      key: "price",
      header: t("price"),
      render: (row) => (
        <span className="whitespace-nowrap font-medium">
          {formatUzs(row.price, locale)}
        </span>
      ),
    },
    {
      key: "availability",
      header: t("availability"),
      render: (row) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            row.availability
              ? "bg-admin-green-soft text-admin-green"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {row.availability ? t("available") : t("unavailable")}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeading
        description={t("description")}
        eyebrow={t("eyebrow")}
        title={t("title")}
        action={
          <Link href="/products/new">
            <Button variant="primary">
              <Plus aria-hidden="true" size={16} />
              {t("add")}
            </Button>
          </Link>
        }
      />
      <div className="mb-4 flex justify-end lg:hidden">
        <Link href="/products/new">
          <Button variant="primary">
            <Plus aria-hidden="true" size={16} />
            {t("add")}
          </Button>
        </Link>
      </div>
      <Card className="overflow-hidden">
        <form className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">{t("catalog")}</h2>
            <p className="mt-1 text-xs text-admin-muted">
              {t("activeCount", {
                count: productsResult.count ?? 0,
              })}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(190px,1fr)_190px_auto]">
            <label className="relative">
              <span className="sr-only">{t("searchLabel")}</span>
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={15}
              />
              <Input
                className="pl-9"
                defaultValue={query}
                name="q"
                placeholder={t("searchPlaceholder")}
              />
            </label>
            <label>
              <span className="sr-only">{t("categoryFilterLabel")}</span>
              <select
                className="h-10 w-full rounded-lg border bg-white px-3 text-sm focus:border-admin-orange focus:outline-none"
                defaultValue={categoryId}
                name="category"
              >
                <option value="">{t("allCategories")}</option>
                {(categories ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {localizedValue(category.name, locale) || t("unnamedCategory")}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit">{t("search")}</Button>
          </div>
        </form>
        <DataTable
          columns={columns}
          emptyDescription={
            query || categoryId
              ? t("emptyFilteredDescription")
              : t("emptyDescription")
          }
          emptyTitle={
            query || categoryId ? t("emptyFilteredTitle") : t("emptyTitle")
          }
          getRowKey={(row) => row.id}
          rows={rows}
        />
        <div className="flex flex-col gap-3 border-t px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="text-admin-muted">
            {t("page", {
              page: formatNumber(page, locale),
              total: formatNumber(pageCount, locale),
            })}
          </p>
          <div className="flex gap-2">
            {page <= 1 ? (
              <span
                aria-disabled="true"
                className="inline-flex h-8 items-center rounded-lg border px-3 font-medium text-slate-400"
              >
                {t("previous")}
              </span>
            ) : (
              <Link
                className="inline-flex h-8 items-center rounded-lg border bg-white px-3 font-medium text-slate-700 hover:bg-slate-50"
                href={listHref(page - 1, query, categoryId)}
              >
                {t("previous")}
              </Link>
            )}
            {page >= pageCount ? (
              <span
                aria-disabled="true"
                className="inline-flex h-8 items-center rounded-lg border px-3 font-medium text-slate-400"
              >
                {t("next")}
              </span>
            ) : (
              <Link
                className="inline-flex h-8 items-center rounded-lg border bg-white px-3 font-medium text-slate-700 hover:bg-slate-50"
                href={listHref(page + 1, query, categoryId)}
              >
                {t("next")}
              </Link>
            )}
          </div>
        </div>
      </Card>
      <div className="mt-4 flex items-center gap-2 text-xs text-admin-muted">
        <Utensils aria-hidden="true" size={15} />
        {t("securityNote")}
      </div>
    </>
  );
}
