"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignup = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);

      if (password.length < 8) {
        setError("Wachtwoord moet minimaal 8 tekens bevatten");
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }

        // If user is returned with a session, auto-confirm is on — redirect
        if (data.session) {
          window.location.href = "/leads";
          return;
        }

        setSuccess(true);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Er ging iets mis bij het registreren.";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [email, password, name],
  );

  if (success) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Check je inbox</CardTitle>
          <CardDescription>
            We hebben een bevestigingslink gestuurd naar{" "}
            <strong>{email}</strong>. Klik op de link om je account te
            activeren.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link href="/login">
            <Button variant="outline">Terug naar inloggen</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-brand shadow-brand">
              <span className="text-lg font-bold text-white">P</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">PROLEAD</span>
          </div>
        </div>
        <CardTitle className="text-xl">Account aanmaken</CardTitle>
        <CardDescription>Start met PROLEAD</CardDescription>
      </CardHeader>
      <form onSubmit={handleSignup}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Naam</Label>
            <Input
              id="name"
              type="text"
              placeholder="Je volledige naam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="naam@bedrijf.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Wachtwoord</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimaal 8 tekens"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registreren
          </Button>
          <p className="text-sm text-muted-foreground">
            Al een account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Inloggen
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
