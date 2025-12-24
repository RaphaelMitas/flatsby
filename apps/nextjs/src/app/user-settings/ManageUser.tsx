"use client";

import type { UpdateUserNameFormValues } from "@flatsby/validators/user";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  AlertCircle,
  CircleCheckBig,
  LoaderCircle,
  Upload,
} from "lucide-react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@flatsby/ui/avatar";
import { Button } from "@flatsby/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import { Form, FormControl, FormField } from "@flatsby/ui/form";
import { Input } from "@flatsby/ui/input";
import { Label } from "@flatsby/ui/label";
import { updateUserNameFormSchema } from "@flatsby/validators/user";

import { useTRPC } from "~/trpc/react";

const UserDetails = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: user } = useSuspenseQuery(
    trpc.user.getCurrentUser.queryOptions(),
  );

  const onUpdateUserNameError = (errorMessage: string) => {
    form.setError("name", {
      message: errorMessage,
    });
  };

  const updateUserNameMutation = useMutation(
    trpc.user.updateUserName.mutationOptions({
      onSuccess: (data) => {
        if (!data.success) {
          onUpdateUserNameError(data.error.message);
          return;
        }

        void queryClient.invalidateQueries(
          trpc.user.getCurrentUser.queryOptions(),
        );
        void queryClient.invalidateQueries(
          trpc.user.getCurrentUserWithGroups.queryOptions(),
        );
      },
      onError: (err) => {
        onUpdateUserNameError(err.message);
      },
    }),
  );

  const form = useForm<UpdateUserNameFormValues>({
    resolver: zodResolver(updateUserNameFormSchema),
    defaultValues: {
      name: user.name,
    },
  });

  const handleSubmit = (values: UpdateUserNameFormValues) => {
    const newName = values.name;
    if (!newName) return;
    updateUserNameMutation.mutate({
      name: newName,
    });
  };

  const isSuccess =
    updateUserNameMutation.isSuccess && updateUserNameMutation.data.success;

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Details</CardTitle>
        <CardDescription>
          Update your user&apos;s name and profile picture.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="name">User Name</Label>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="flex flex-col items-center gap-4 md:flex-row"
              >
                <FormField
                  name="name"
                  control={form.control}
                  render={({ field }) => (
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full"
                        placeholder="Enter user name"
                      />
                    </FormControl>
                  )}
                />
                <Button
                  disabled={form.formState.isSubmitting}
                  className="w-full min-w-37.5 md:w-fit"
                  type="submit"
                >
                  {form.formState.isSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </form>
            </Form>
            {form.formState.errors.name && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {form.formState.errors.name.message}
                </AlertDescription>
              </Alert>
            )}
            {isSuccess && (
              <>
                <Alert variant="success">
                  <CircleCheckBig className="h-4 w-4" />
                  <AlertTitle>Name changed successfully!</AlertTitle>
                </Alert>
              </>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-picture">Profile Picture</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage alt="User Avatar" />
                <AvatarFallback>
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button disabled variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Upload New
              </Button>
              <div className="text-muted-foreground">feature coming soon!</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserDetails;
