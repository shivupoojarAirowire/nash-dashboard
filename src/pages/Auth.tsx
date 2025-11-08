import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { User, Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const authSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72),
  fullName: z.string().trim().max(100).optional(),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Redirect authenticated users to dashboard
        if (session?.user) {
          navigate("/");
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const data = authSchema.parse({
        email,
        password,
        fullName: isLogin ? undefined : fullName,
      });

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (error) {
          const msg = (error.message || "").toLowerCase();
          // Handle the common Supabase error for unconfirmed emails
          if (msg.includes("confirm") || msg.includes("not confirmed")) {
            setNeedsConfirmation(true);
            toast({
              title: "Email not confirmed",
              description: "Please confirm your email address. You can resend the confirmation email below.",
              variant: "destructive",
            });
            return;
          }
          throw error;
        }

        toast({
          title: "Success",
          description: "Logged in successfully",
        });
      } else {
        const redirectUrl = `${window.location.origin}/`;
        
        // 1. Sign up with Supabase Auth
        const { data: authData, error: signupError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: data.fullName || "",
            },
          },
        });

        if (signupError) {
          if (signupError.message.includes("already registered")) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Please login instead.",
              variant: "destructive",
            });
            setIsLogin(true);
          } else {
            throw signupError;
          }
        } else if (authData.user) {
          // 2. Insert into profiles table
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: data.email,
              full_name: data.fullName || null,
            } satisfies Database['public']['Tables']['profiles']['Insert']);

          if (profileError) {
            console.error("Failed to create profile:", profileError);
            // Don't throw here as the user is already created
            toast({
              title: "Warning",
              description: "Account created but profile setup incomplete. Please contact support.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Success",
              description: "Account created successfully! You can now sign in.",
            });
            // Switch to login view
            setIsLogin(true);
          }
        }
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        const message = (error.message || "").toLowerCase();
        if (message.includes("confirm") || message.includes("not confirmed")) {
          setNeedsConfirmation(true);
          toast({
            title: "Email not confirmed",
            description: "Please confirm your email address. You can resend the confirmation email below.",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Error",
          description: error.message || "An error occurred",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      toast({ title: "Email required", description: "Enter your email above first.", variant: "destructive" });
      return;
    }
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      toast({ title: "Email sent", description: "Check your inbox for the confirmation link." });
    } catch (err: any) {
      toast({ title: "Resend failed", description: err.message || String(err), variant: "destructive" });
    } finally {
      setResendLoading(false);
    }
  };

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-accent/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            NaaS Dashboard
          </CardTitle>
          <CardDescription>
            {isLogin ? "Sign in to your account" : "Create a new account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          {needsConfirmation && (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              Your email is not confirmed. Click the button below to resend the confirmation email.
              <div className="mt-2">
                <Button size="sm" onClick={handleResendConfirmation} disabled={resendLoading}>
                  {resendLoading ? "Sending..." : "Resend confirmation email"}
                </Button>
              </div>
            </div>
          )}

          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
              disabled={loading}
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
