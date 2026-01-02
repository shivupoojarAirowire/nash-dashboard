import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { User, Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type UserType = "airowire" | "vendor" | "customer";

const getAuthSchema = (userType: UserType) => {
  if (userType === "airowire") {
    return z.object({
      password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72),
      fullName: z.string().trim().min(1, "Full name is required").max(100),
      phone: z.string().trim().min(10, "Phone number is required"),
      email: z.string().trim().email({ message: "Invalid email address" }).max(255)
        .refine((email) => email.endsWith("@airowire.com"), {
          message: "Airowire users must use @airowire.com email",
        }),
      department: z.string().min(1, "Department is required"),
    });
  } else {
    return z.object({
      password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72),
      fullName: z.string().trim().min(1, "Full name is required").max(100),
      phone: z.string().trim().min(10, "Phone number is required"),
      address: z.string().trim().min(5, "Address is required"),
      email: z.string().trim().email({ message: "Invalid email address" }).max(255),
    });
  }
};

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState<UserType>("airowire");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showOtpAuth, setShowOtpAuth] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
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
      if (isLogin) {
        // Simple validation for login
        if (!email || !password) {
          throw new Error("Email and password are required");
        }
        
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          const msg = (error.message || "").toLowerCase();
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
        // Validate signup data based on user type
        const schema = getAuthSchema(userType);
        const validatedData = schema.parse({
          email,
          password,
          fullName,
          phone,
          ...(userType === "airowire" ? { department } : { address }),
        });

        const redirectUrl = `${window.location.origin}/`;
        
        // Determine role based on user type
        // Airowire users get 'user' role, vendors get 'vendor', customers get 'customer'
        const userRole = userType === "airowire" ? "user" : userType; // vendor or customer
        
        // Sign up with Supabase Auth
        const { data: authData, error: signupError } = await supabase.auth.signUp({
          email: validatedData.email,
          password: validatedData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: validatedData.fullName,
              phone: validatedData.phone,
              address: userType === "airowire" ? null : (validatedData as any).address,
              department: userType === "airowire" ? (validatedData as any).department : null,
              user_type: userType,
              role: userRole, // Pass the role to the trigger
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
          // Wait for trigger to create profile
          await new Promise(resolve => setTimeout(resolve, 500));

          toast({
            title: "Success",
            description: "Account created successfully! Please check your email to confirm.",
          });
          
          // Switch to login view
          setIsLogin(true);
          setNeedsConfirmation(true);
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Error", description: "Please enter your email address", variant: "destructive" });
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=recovery`,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password reset link sent to your email. Check your inbox.",
      });
      setShowForgotPassword(false);
      setEmail("");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpEmail) {
      toast({ title: "Error", description: "Please enter your email address", variant: "destructive" });
      return;
    }

    setOtpLoading(true);
    try {
      // Use Supabase passwordless sign in with OTP
      const { error } = await supabase.auth.signInWithOtp({
        email: otpEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      setOtpSent(true);
      toast({
        title: "OTP Sent",
        description: "Check your email for the one-time password",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      toast({ title: "Error", description: "Please enter a valid OTP", variant: "destructive" });
      return;
    }

    setOtpLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: otpEmail,
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Logged in successfully via OTP",
      });
      setShowOtpAuth(false);
      setOtp("");
      setOtpEmail("");
      setOtpSent(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Invalid OTP",
        variant: "destructive",
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    if (newPassword.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully",
      });

      setNewPassword("");
      setConfirmPassword("");
      navigate("/auth");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
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
            {showForgotPassword
              ? "Reset your password"
              : showOtpAuth
              ? "Sign in with OTP"
              : isLogin
              ? "Sign in to your account"
              : "Create a new account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Forgot Password Form */}
          {showForgotPassword && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail">Email Address *</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="your@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={resetLoading}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                We'll send you a link to reset your password.
              </p>
              <Button type="submit" className="w-full" disabled={resetLoading}>
                {resetLoading ? "Sending..." : "Send Reset Link"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowForgotPassword(false);
                  setEmail("");
                }}
                disabled={resetLoading}
              >
                Back to Sign In
              </Button>
            </form>
          )}

          {/* OTP Authentication Form */}
          {showOtpAuth && (
            <form className="space-y-4">
              {!otpSent ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="otpEmail">Email Address *</Label>
                    <Input
                      id="otpEmail"
                      type="email"
                      placeholder="your@example.com"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      required
                      disabled={otpLoading}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    We'll send you a one-time password via email.
                  </p>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={handleSendOtp}
                    disabled={otpLoading}
                  >
                    {otpLoading ? "Sending..." : "Send OTP"}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="otpCode">Enter OTP *</Label>
                    <Input
                      id="otpCode"
                      type="text"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                      maxLength={6}
                      required
                      disabled={otpLoading}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Check your email for the 6-digit code
                  </p>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={handleVerifyOtp}
                    disabled={otpLoading || otp.length < 6}
                  >
                    {otpLoading ? "Verifying..." : "Verify OTP"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setOtpSent(false)}
                    disabled={otpLoading}
                  >
                    Back
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShowOtpAuth(false);
                  setOtp("");
                  setOtpEmail("");
                  setOtpSent(false);
                }}
              >
                Cancel
              </Button>
            </form>
          )}

          {/* Password Reset Form (from recovery email) */}
          {typeof window !== "undefined" &&
            new URLSearchParams(window.location.search).get("mode") === "recovery" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password *</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={resetLoading}
                />
                <p className="text-xs text-muted-foreground">At least 8 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={resetLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={resetLoading}>
                {resetLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}

          {/* Standard Sign In / Sign Up Form */}
          {!showForgotPassword && !showOtpAuth && !new URLSearchParams(window.location.search).get("mode") && (
            <>
              <form onSubmit={handleAuth} className="space-y-4">
                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="userType">I am a</Label>
                      <Select value={userType} onValueChange={(v) => setUserType(v as UserType)}>
                        <SelectTrigger id="userType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="airowire">Airowire User</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={userType === "airowire" && !isLogin ? "you@airowire.com" : "you@example.com"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                  {!isLogin && userType === "airowire" && (
                    <p className="text-xs text-muted-foreground">Must be an @airowire.com email</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password *</Label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotPassword(true);
                          setEmail("");
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  {!isLogin && (
                    <p className="text-xs text-muted-foreground">At least 6 characters</p>
                  )}
                </div>

                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 234 567 8900"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>

                    {userType !== "airowire" && (
                      <div className="space-y-2">
                        <Label htmlFor="address">Address *</Label>
                        <Input
                          id="address"
                          type="text"
                          placeholder="123 Main St, City, State"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          required
                          disabled={loading}
                        />
                      </div>
                    )}

                    {userType === "airowire" && (
                      <div className="space-y-2">
                        <Label htmlFor="department">Department *</Label>
                        <Select value={department} onValueChange={setDepartment} required>
                          <SelectTrigger id="department">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PMO">PMO</SelectItem>
                            <SelectItem value="Passive-Vendor">Passive-Vendor</SelectItem>
                            <SelectItem value="Operations">Operations</SelectItem>
                            <SelectItem value="Finance">Finance</SelectItem>
                            <SelectItem value="Management">Management</SelectItem>
                            <SelectItem value="Engineering">Engineering</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}

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

              <div className="mt-4 space-y-2 text-center text-sm">
                <div>
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
                {isLogin && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOtpAuth(true);
                        setOtpEmail("");
                        setOtp("");
                        setOtpSent(false);
                      }}
                      className="text-primary hover:underline text-xs"
                    >
                      Sign in with OTP instead
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
