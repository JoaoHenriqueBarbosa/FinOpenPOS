"use client";

import { useTranslations } from "next-intl";
import { Button } from "@finopenpos/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@finopenpos/ui/components/dialog";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  description?: string;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  description,
}: DeleteConfirmationDialogProps) {
  const t = useTranslations("common");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("confirmDeletion")}</DialogTitle>
          <DialogDescription>{description ?? t("defaultDeleteMessage")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
