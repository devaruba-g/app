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

  let {
    data,
    form,
  }: {
    data: { user: { id: string; name: string; email: string } | null };
    form: { type?: string; message?: string; redirect?: string };
  } = $props();

  $effect(() => {
    if (form?.type === "success" && form.redirect === "signin") {
      goto("/chat");
    }
  });

  $effect(() => {
    if (browser && data.user) goto("/chat");
  });
</script>

<div class="min-h-screen flex flex-col bg-gray-50">
  <header class="w-full bg-[#0073b1] text-white text-center py-6 shadow">
    <h1 class="text-4xl font-bold">Welcome to Your Chat Hub</h1>
    <p class="mt-2 text-blue-100">
      Connect and chat with friends and colleagues
    </p>
  </header>

  <div class="flex-1 flex items-center justify-center p-4">
    <Card class="w-full max-w-md bg-white shadow-lg rounded-lg">
      <CardHeader class="bg-[#0073b1] text-white p-6 rounded-t-lg">
        <CardTitle class="text-3xl font-bold">Welcome</CardTitle>
        <CardDescription class="mt-1 text-blue-100">
          Sign up or sign in to start chatting
        </CardDescription>
      </CardHeader>
      <CardContent class="p-6">
        <Tabs.Root value="signin">
          <Tabs.List class="flex space-x-2 mb-4 border-b border-gray-200">
            <Tabs.Trigger
              value="signin"
              class="data-[state=active]:border-[#0073b1] data-[state=active]:text-[#0073b1] text-gray-700 px-4 py-2 hover:text-[#0073b1]"
            >
              Sign In
            </Tabs.Trigger>
            <Tabs.Trigger
              value="signup"
              class="data-[state=active]:border-[#0073b1] data-[state=active]:text-[#0073b1] text-gray-700 px-4 py-2 hover:text-[#0073b1]"
            >
              Sign Up
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="signin">
            <form
              method="POST"
              action="?/signin"
              use:enhance
              class="flex flex-col gap-4"
            >
              <Input
                type="email"
                name="email"
                placeholder="Email"
                required
                class="border-gray-300 focus:ring-[#0073b1] focus:border-[#0073b1]"
              />
              <Input
                type="password"
                name="password"
                placeholder="Password"
                required
                class="border-gray-300 focus:ring-[#0073b1] focus:border-[#0073b1]"
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
                class="mt-2 bg-[#0073b1] hover:bg-blue-700 text-white"
              >
                Sign In
              </Button>
            </form>
          </Tabs.Content>

          <Tabs.Content value="signup">
            <form
              method="POST"
              action="?/signup"
              use:enhance
              class="flex flex-col gap-4"
            >
              <Input
                name="name"
                placeholder="Name"
                required
                class="border-gray-300 focus:ring-[#0073b1] focus:border-[#0073b1]"
              />
              <Input
                type="email"
                name="email"
                placeholder="Email"
                required
                class="border-gray-300 focus:ring-[#0073b1] focus:border-[#0073b1]"
              />
              <Input
                id="signup-password"
                type="password"
                name="password"
                placeholder="Password"
                required
                class="border-gray-300 focus:ring-[#0073b1] focus:border-[#0073b1]"
              />
              {#if form?.type === "signup-success"}
                <p class="text-green-600">{form.message}</p>
              {/if}
              {#if form?.type === "error"}
                <p class="text-red-600">{form.message}</p>
              {/if}

              <Button
                type="submit"
                class="mt-2 bg-[#0073b1] hover:bg-blue-700 text-white"
              >
                Sign Up
              </Button>
            </form>
          </Tabs.Content>
        </Tabs.Root>
      </CardContent>
    </Card>
  </div>
</div>
