<script lang="ts">
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "$lib/components/ui/card/index.js";
import { Input } from "$lib/components/ui/input/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
import * as Tabs from "$lib/components/ui/tabs/index.js";
  import { toast, Toaster } from "svelte-sonner";
import { enhance } from "$app/forms";
import { goto } from '$app/navigation';
    import { browser } from '$app/environment';
let { data, form }: { 
  data: { user: { id: string; name: string; email: string } | null }, 
  form: { type?: string; message?: string; redirect?: string } 
} = $props();
$effect(() => {
if (form?.message) {
  if (form.type === "success") {
    toast.success(form.message);
    if (form.redirect === 'signin') goto('/chat');
  } else {
    toast.error(form.message);
  }
}
});
  $effect(() => {
    if (browser && data.user) goto('/chat');
  });
</script>
<div class="min-h-screen flex flex-col">
<header class="w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 text-white text-center py-6">
<h1 class="text-4xl font-bold">Welcome to Your Chat Hub</h1>
<p class="mt-2 text-indigo-100">Connect and chat with friends and collegues</p>
</header>
  <div class="flex-1 flex items-center justify-center">
    <Card class="w-full max-w-md">
      <CardHeader class="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white p-6">
        <CardTitle class="text-3xl font-bold">Welcome</CardTitle>
        <CardDescription class="mt-1 text-indigo-100">
          Sign up or sign in to start chatting
        </CardDescription>
      </CardHeader>
      <CardContent class="p-6">
        <Tabs.Root value="signin">
          <Tabs.List class="space-x-2 mb-4">
            <Tabs.Trigger
              value="signin"
              class="data-[state=active]:bg-blue-500 data-[state=active]:text-white hover:bg-blue-100">
              Sign In
            </Tabs.Trigger>
            <Tabs.Trigger
              value="signup"
              class="data-[state=active]:bg-indigo-500 data-[state=active]:text-white hover:bg-indigo-100">
              Sign Up
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="signin">
            <form method="POST" action="?/signin" use:enhance class="flex flex-col gap-4">
              <Input type="email" name="email" placeholder="Email" required />
              <Input type="password" name="password" placeholder="Password" required />
              <Button type="submit" class="mt-2 bg-blue-500 hover:bg-blue-600 text-white">
                Sign In
              </Button>
            </form>
          </Tabs.Content>
          <Tabs.Content value="signup">
            <form method="POST" action="?/signup" use:enhance class="flex flex-col gap-4">
              <Input name="name" placeholder="Name" required />
              <Input type="email" name="email" placeholder="Email" required />
              <Input id="signup-password" type="password" name="password" placeholder="Password" required />
              <Button type="submit" class="mt-2 bg-indigo-500 hover:bg-indigo-600 text-white">
                Sign Up
              </Button>
            </form>
          </Tabs.Content>
        </Tabs.Root>
      </CardContent>
    </Card>
  </div>
</div>
<Toaster position="top-right" />
