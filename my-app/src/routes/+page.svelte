<script lang="ts">
  import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
  } from "$lib/components/ui/card/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";
  import { writable } from "svelte/store";
  import type { AuthUser } from "$lib/types";

  let {
    data,
    form,
  }: {
    data: { user: AuthUser | null };
    form: { type?: string; message?: string; redirect?: string };
  } = $props();
  const loadingSignIn = writable(false);
  const loadingSignUp = writable(false);

  $effect(() => {
    if (form?.type === "success" && form.redirect === "signin") {
      goto("/chat");
    }
  });

  $effect(() => {
    if (browser && data.user) goto("/chat");
  });
</script>

<div class="min-h-screen flex flex-col">
  <header class="w-full bg-[#0073B1] text-white text-center py-6">
    <h1 class="text-4xl font-bold">Welcome to Your Chat Hub</h1>
    <p class="mt-2 text-white/80">
      Connect and chat with friends and collegues
    </p>
  </header>

  <div class="flex-1 flex items-center justify-center">
    <Card class="w-full max-w-md">
      <CardHeader class="bg-[#0073B1] text-white p-6">
        <CardTitle class="text-3xl font-bold">Welcome</CardTitle>
        <CardDescription class="mt-1 text-white/80">
          Sign up or sign in to start chatting
        </CardDescription>
      </CardHeader>
      <CardContent class="p-6">
        <Tabs.Root value="signin">
          <Tabs.List class="space-x-2 mb-4">
            <Tabs.Trigger
              value="signin"
              class="data-[state=active]:bg-[#0073B1] data-[state=active]:text-white hover:bg-[#0073B1]/20"
            >
              Sign In
            </Tabs.Trigger>
            <Tabs.Trigger
              value="signup"
              class="data-[state=active]:bg-[#0073B1] data-[state=active]:text-white hover:bg-[#0073B1]/20"
            >
              Sign Up
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="signin">
            <form
              method="POST"
              action="?/signin"
              use:enhance={() => {
                return async ({ result }) => {
                  loadingSignIn.set(false);

            
                  if (result.type === "success") {
                    const res = result.data as {
                      type?: string;
                      message?: string;
                      redirect?: string;
                    };
                    form = res; 
                    if (res.redirect === "signin") {
                      goto("/chat"); 
                    }
                  }

       
                  if (result.type === "failure") {
                    const res = result.data as {
                      type?: string;
                      message?: string;
                    };
                    form = res; 
                  }
                };
              }}
              onsubmit={() => loadingSignIn.set(true)}
              class="flex flex-col gap-4"
            >
              <Input type="email" name="email" placeholder="Email" required />
              <Input
                type="password"
                name="password"
                placeholder="Password"
                required
              />
              <a
                href="/forgot-password"
                class="text-sm text-[#0073b1] hover:underline mt-1 self-end"
              >
                Forgot Password?
              </a>
              {#if form?.type === "signin-success"}
                <p class="text-green-600">{form.message}</p>
              {/if}
              {#if form?.type === "error"}
                <p class="text-red-600">{form.message}</p>
              {/if}
              <Button
                type="submit"
                class="mt-2 bg-[#0073B1] hover:bg-[#005582] text-white"
              >
                {$loadingSignIn ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          </Tabs.Content>

          <Tabs.Content value="signup">
            <form
              method="POST"
              action="?/signup"
              use:enhance={() => {
                return async ({ result }) => {
                  loadingSignUp.set(false);

               
                  if (result.type === "success") {
                    const res = result.data as {
                      type?: string;
                      message?: string;
                      redirect?: string;
                    };
                    form = res;
                  }

                
                  if (result.type === "failure") {
                    const res = result.data as {
                      type?: string;
                      message?: string;
                    };
                    form = res; 
                  }
                };
              }}
              onsubmit={() => loadingSignUp.set(true)}
              class="flex flex-col gap-4"
            >
              <Input name="name" placeholder="Name" required />
              <Input type="email" name="email" placeholder="Email" required />
              <Input
                id="signup-password"
                type="password"
                name="password"
                placeholder="Password"
                required
              />
              {#if form?.type === "signup-success"}
                <p class="text-green-600">{form.message}</p>
              {/if}
              {#if form?.type === "error"}
                <p class="text-red-600">{form.message}</p>
              {/if}
              <Button
                type="submit"
                class="mt-2 bg-[#0073B1] hover:bg-[#005582] text-white"
              >
                {$loadingSignUp ? "Signing Up..." : "Sign Up"}
              </Button>
            </form>
          </Tabs.Content>
        </Tabs.Root>
      </CardContent>
    </Card>
  </div>
</div>
