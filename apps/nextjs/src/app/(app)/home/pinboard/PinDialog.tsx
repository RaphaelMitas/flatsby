"use client";

import type {
  PinDraft,
  PinFormValues,
  PinIcon,
} from "@flatsby/validators/pinboard";
import { useRef, useState } from "react";
import { QrCode, Trash } from "lucide-react";
import { useTranslations } from "next-intl";
import { useWatch } from "react-hook-form";

import { cn } from "@flatsby/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@flatsby/ui/alert-dialog";
import { Button, buttonVariants } from "@flatsby/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@flatsby/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "@flatsby/ui/form";
import { Input } from "@flatsby/ui/input";
import { Textarea } from "@flatsby/ui/textarea";
import {
  MAX_PIN_BODY_LENGTH,
  MAX_PIN_TITLE_LENGTH,
  MAX_WIFI_PASSWORD_LENGTH,
  MAX_WIFI_SSID_LENGTH,
  pinFormSchema,
  pinIcons,
  wifiFromQrText,
} from "@flatsby/validators/pinboard";

import { pinIconComponents } from "./PinIconBadge";
import { qrTextFromFile } from "./qrTextFromFile";

export function PinDialog({
  draft: { id, ...defaultValues },
  onClose,
  onSave,
  onDelete,
}: {
  draft: PinDraft;
  onClose: () => void;
  onSave: (values: PinFormValues) => void;
  onDelete: (id: number) => void;
}) {
  const t = useTranslations();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [scanProblem, setScanProblem] = useState(false);
  const picture = useRef<HTMLInputElement>(null);
  const form = useForm({ schema: pinFormSchema, defaultValues });
  const isWifi = useWatch({ control: form.control, name: "icon" }) === "wifi";

  const pickIcon = (icon: PinIcon) => {
    form.setValue("icon", icon);
    if (icon === "wifi" && form.getValues("title") === "")
      form.setValue("title", t("pinboard.starters.wifi"));
  };

  const scan = async (file: File | undefined) => {
    if (!file) return;
    const text = await qrTextFromFile(file).catch(() => undefined);
    const wifi = wifiFromQrText(text ?? "");
    setScanProblem(!wifi);
    if (!wifi) return;
    form.setValue("ssid", wifi.ssid);
    form.setValue("password", wifi.password);
    form.clearErrors("body");
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-11/12 overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {id === undefined
                ? t("pinboard.newTitle")
                : t("pinboard.editTitle")}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSave)}
              className="flex flex-col gap-4"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("pinboard.form.title")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        data-testid="pin-form-title"
                        placeholder={t("pinboard.starters.bins")}
                        maxLength={MAX_PIN_TITLE_LENGTH}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("pinboard.form.icon")}</FormLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {pinIcons.map((icon) => {
                        const Glyph = pinIconComponents[icon];
                        return (
                          <button
                            key={icon}
                            type="button"
                            data-testid={`pin-form-icon-${icon}`}
                            aria-label={t(`pinboard.icon.${icon}`)}
                            aria-pressed={field.value === icon}
                            onClick={() => pickIcon(icon)}
                            className={cn(
                              "grid size-9 place-items-center rounded-full",
                              field.value === icon
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted",
                            )}
                          >
                            <Glyph className="size-4.5" />
                          </button>
                        );
                      })}
                    </div>
                  </FormItem>
                )}
              />
              {isWifi && (
                <>
                  <FormField
                    control={form.control}
                    name="ssid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("pinboard.form.ssid")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(event) => {
                              field.onChange(event);
                              form.clearErrors("body");
                            }}
                            data-testid="pin-form-ssid"
                            placeholder={t("pinboard.form.ssidPlaceholder")}
                            maxLength={MAX_WIFI_SSID_LENGTH}
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                          />
                        </FormControl>
                        <FormDescription>
                          {t("pinboard.form.ssidHint")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("pinboard.form.password")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            data-testid="pin-form-password"
                            maxLength={MAX_WIFI_PASSWORD_LENGTH}
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-col gap-2">
                    <p className="text-muted-foreground text-[0.8rem]">
                      {t("pinboard.form.wifiHelp")}
                    </p>
                    <input
                      ref={picture}
                      type="file"
                      accept="image/*"
                      data-testid="pin-form-scan-file"
                      className="hidden"
                      onChange={(event) => {
                        void scan(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      data-testid="pin-form-scan"
                      onClick={() => picture.current?.click()}
                    >
                      <QrCode />
                      {t("pinboard.form.scanFile")}
                    </Button>
                    {scanProblem && (
                      <p
                        data-testid="pin-form-scan-problem"
                        className="text-destructive text-[0.8rem] font-medium"
                      >
                        {t("pinboard.form.noCode")}
                      </p>
                    )}
                  </div>
                </>
              )}
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-baseline gap-1.5">
                      {isWifi
                        ? t("pinboard.form.note")
                        : t("pinboard.form.body")}
                      {isWifi && (
                        <span className="text-muted-foreground font-normal">
                          {t("pinboard.form.optional")}
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        data-testid="pin-form-body"
                        placeholder={
                          isWifi
                            ? t("pinboard.form.notePlaceholder")
                            : t("pinboard.form.bodyPlaceholder")
                        }
                        maxLength={MAX_PIN_BODY_LENGTH}
                        className={isWifi ? "min-h-16" : "min-h-28"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" data-testid="pin-form-save">
                {id === undefined
                  ? t("pinboard.form.create")
                  : t("common.save")}
              </Button>
            </form>
          </Form>
          {id !== undefined && (
            <Button
              variant="ghost"
              data-testid="pin-form-delete"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash className="size-4" />
              {t("pinboard.delete.title")}
            </Button>
          )}
        </DialogContent>
      </Dialog>
      {id !== undefined && (
        <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
          <AlertDialogContent data-testid="pin-delete-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("pinboard.delete.title")}</AlertDialogTitle>
              <AlertDialogDescription className="wrap-break-word">
                {t("pinboard.delete.description", {
                  title: defaultValues.title,
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                data-testid="pin-delete-confirm"
                onClick={() => onDelete(id)}
                className={buttonVariants({ variant: "destructive" })}
              >
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
