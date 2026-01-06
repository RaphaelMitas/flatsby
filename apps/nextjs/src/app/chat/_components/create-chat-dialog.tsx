"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@flatsby/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@flatsby/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@flatsby/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@flatsby/ui/sheet";

import { useTRPC } from "~/trpc/react";

const AVAILABLE_MODELS = [
  { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  { id: "openai/gpt-4o", name: "GPT-4o" },
] as const;

const createChatSchema = z.object({
  model: z.string().min(1, "Model is required"),
});

type CreateChatFormValues = z.infer<typeof createChatSchema>;

interface CreateChatDialogProps {
  children: ReactNode;
}

export function CreateChatDialog({ children }: CreateChatDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<CreateChatFormValues>({
    resolver: zodResolver(createChatSchema),
    defaultValues: {
      model: AVAILABLE_MODELS[0].id,
    },
  });

  const createConversation = useMutation(
    trpc.chat.createConversation.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.chat.getUserConversations.queryKey(),
        });
        setOpen(false);
        form.reset();
        router.push(`/chat/${data.id}`);
      },
    }),
  );

  const onSubmit = (values: CreateChatFormValues) => {
    createConversation.mutate({
      model: values.model,
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create New Chat</SheetTitle>
          <SheetDescription>
            Start a new conversation with an AI model. The title will be
            auto-generated from your first message.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AVAILABLE_MODELS.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={createConversation.isPending}
            >
              {createConversation.isPending ? "Creating..." : "Create Chat"}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
