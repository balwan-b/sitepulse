"use client";

import { useState } from "react";

import {
  useRegister,
  useRefineOptions,
  useLink,
} from "@refinedev/core";
import { BriefcaseBusiness } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { InputPassword } from "@/components/refine-ui/form/input-password";
import { PUBLIC_ROLE_OPTIONS, USER_ROLES } from "@/constants";
import { cn } from "@/lib/utils";

export const SignUpForm = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const Link = useLink();

  const { title } = useRefineOptions();

  const { mutate: register } = useRegister();

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Passwords must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");

      return;
    }

    register({
      name,
      email,
      password,
      role: USER_ROLES.CLIENT,
    });
  };

  return (
    <div
      className={cn(
        "flex",
        "flex-col",
        "items-center",
        "justify-center",
        "px-6",
        "py-8",
        "min-h-svh"
      )}
    >
      <div className={cn("flex", "items-center", "justify-center", "gap-2")}>
        {title.icon && (
          <div
            className={cn("text-foreground", "[&>svg]:w-12", "[&>svg]:h-12")}
          >
            {title.icon}
          </div>
        )}
      </div>

      <Card className={cn("sm:w-[456px]", "p-12", "mt-6")}>
        <CardHeader className={cn("px-0")}>
          <CardTitle
            className={cn(
              "text-green-600",
              "dark:text-green-400",
              "text-3xl",
              "font-semibold"
            )}
          >
            Sign up
          </CardTitle>
          <CardDescription
            className={cn("text-muted-foreground", "font-medium")}
          >
            Public registration is available for client accounts only.
          </CardDescription>
        </CardHeader>

        <Separator />

        <CardContent className={cn("px-0")}>
          <form onSubmit={handleSignUp}>
            <div className={cn("flex", "flex-col", "gap-2")}>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className={cn("mt-6", "rounded-md", "border", "bg-muted/40", "p-4")}>
              <div className={cn("flex", "items-center", "gap-3")}>
                <div className={cn("rounded-md", "border", "bg-background", "p-2")}>
                  <BriefcaseBusiness className={cn("h-4", "w-4")} />
                </div>
                <div>
                  <p className={cn("text-sm", "font-medium")}>
                    {PUBLIC_ROLE_OPTIONS[0].label} account
                  </p>
                  <p className={cn("text-sm", "text-muted-foreground")}>
                    Staff roles are provisioned by an admin after onboarding.
                  </p>
                </div>
              </div>
            </div>

            <div className={cn("flex", "flex-col", "gap-2")}>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder=""
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div
              className={cn("relative", "flex", "flex-col", "gap-2", "mt-6")}
            >
              <Label htmlFor="password">Password</Label>
              <InputPassword
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div
              className={cn("relative", "flex", "flex-col", "gap-2", "mt-6")}
            >
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <InputPassword
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            {error ? (
              <p className={cn("mt-4", "text-sm", "text-destructive")}>{error}</p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className={cn(
                "w-full",
                "mt-6",
                "bg-green-600",
                "hover:bg-green-700",
                "text-white"
              )}
            >
              Sign up
            </Button>
          </form>
        </CardContent>

        <Separator />

        <CardFooter>
          <div className={cn("w-full", "text-center text-sm")}>
            <span className={cn("text-sm", "text-muted-foreground")}>
              Have an account?{" "}
            </span>
            <Link
              to="/login"
              className={cn(
                "text-blue-600",
                "dark:text-blue-400",
                "font-semibold",
                "underline"
              )}
            >
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

SignUpForm.displayName = "SignUpForm";
