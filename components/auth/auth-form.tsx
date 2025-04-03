"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";

// Base schema with common fields
const baseSchema = {
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
};

// Create separate schemas for sign-in and sign-up
const signUpSchema = z.object({
  ...baseSchema,
  full_name: z.string().min(2, {
    message: "Full name must be at least 2 characters.",
  }).optional(),
});

const signInSchema = z.object({
  ...baseSchema,
});

type SignUpFormValues = z.infer<typeof signUpSchema>;
type SignInFormValues = z.infer<typeof signInSchema>;

interface AuthFormProps {
  mode: "signin" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Use different forms based on mode
  const signUpForm = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
    },
  });

  const signInForm = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Choose the active form based on mode
  const form = mode === "signup" ? signUpForm : signInForm;

  async function onSubmit(values: SignUpFormValues | SignInFormValues) {
    setIsLoading(true);

    try {
      const supabase = createClient();

      if (mode === "signup") {
        console.log("Signing up...");
        const signUpValues = values as SignUpFormValues;

        // Check if email already exists
        const { data: existingUser, error: userCheckError } = await supabase
          .from("users")
          .select("id")
          .eq("email", signUpValues.email as any)
          .maybeSingle();

        if (userCheckError) throw userCheckError;
        if (existingUser) {
          throw new Error("This email is already registered. Please sign in.");
        }

        const { data: { user }, error } = await supabase.auth.signUp({
          email: signUpValues.email,
          password: signUpValues.password,
          options: {
            data: { full_name: signUpValues.full_name }, // Store metadata
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        if (user) {
          // Insert user into `users` table
          const { error: insertError } = await supabase
            .from("users")
            .insert({
              id: user.id,
              email: user.email,
              full_name: signUpValues.full_name,
              created_at: new Date(),
              verified: false,
            } as any);

          if (insertError) throw insertError;
        }

        toast({
          title: "Account created!",
          description: "Please check your email to verify your account.",
        });

      } else {
        console.log("Signing in...");
        const signInValues = values as SignInFormValues;
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email: signInValues.email,
          password: signInValues.password,
        });

        if (error) throw error;

        if (data.session) {
          console.log(data.user?.id);
          console.log(data.user);
          
          const { error: confirmerror } = await supabase
            .from("users")
            .update({ verified: true } as any)
            .eq("id", data.user?.id as any);

          if (confirmerror) throw confirmerror;

          const { error: updateerror } = await supabase
            .from("users")
            .update({ updated_at: new Date() } as any)
            .eq("id", data.user?.id as any);
          
          if(updateerror) throw updateerror;
          console.log("changed db");
          router.push("/dashboard");
          router.refresh();

          
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Render different forms based on mode
  if (mode === "signup") {
    return (
      <Form {...signUpForm}>
        <form onSubmit={signUpForm.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={signUpForm.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={signUpForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="you@example.com" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={signUpForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Sign Up
          </Button>
        </form>
      </Form>
    );
  }

  // Sign In form
  return (
    <Form {...signInForm}>
      <form onSubmit={signInForm.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={signInForm.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={signInForm.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          Sign In
        </Button>
      </form>
    </Form>
  );
}