"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { archiveProductAction } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function ArchiveProductButton({ productId }: { productId: string }) {
  const t = useTranslations("ProductActions");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function archive() {
    startTransition(async () => {
      const result = await archiveProductAction(productId);
      if (result.error) {
        setError(result.error);
        setOpen(false);
        return;
      }
      router.push("/products");
      router.refresh();
    });
  }

  return (
    <>
      {error && (
        <p aria-live="polite" className="text-xs text-admin-red">
          {error}
        </p>
      )}
      <Button onClick={() => setOpen(true)} variant="danger">
        {t("archive")}
      </Button>
      <Dialog
        description={t("archiveDescription")}
        onClose={() => setOpen(false)}
        open={open}
        title={t("archiveTitle")}
      >
        <div className="flex justify-end gap-2">
          <Button onClick={() => setOpen(false)}>{t("keepProduct")}</Button>
          <Button disabled={pending} onClick={archive} variant="danger">
            {pending ? t("archiving") : t("archive")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
