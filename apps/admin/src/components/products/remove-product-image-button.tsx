"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { removeProductImageAction } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function RemoveProductImageButton({
  productId,
}: {
  productId: string;
}) {
  const t = useTranslations("ProductActions");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function removeImage() {
    setMessage("");
    startTransition(async () => {
      const result = await removeProductImageAction(productId);
      if (result.error) {
        setMessage(result.error);
        setOpen(false);
        return;
      }
      setMessage(result.warning ?? result.success ?? t("imageRemoved"));
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-2">
      <Button onClick={() => setOpen(true)} size="sm" variant="danger">
        {t("removeImage")}
      </Button>
      {message && (
        <p aria-live="polite" className="mt-2 max-w-xs text-xs text-admin-muted">
          {message}
        </p>
      )}
      <Dialog
        description={t("removeImageDescription")}
        onClose={() => setOpen(false)}
        open={open}
        title={t("removeImageTitle")}
      >
        <div className="flex justify-end gap-2">
          <Button onClick={() => setOpen(false)}>{t("keepImage")}</Button>
          <Button disabled={pending} onClick={removeImage} variant="danger">
            {pending ? t("removing") : t("removeImage")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
