<script lang="ts">
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { toast, Toaster } from "svelte-sonner";
  import { enhance } from "$app/forms";
  import { onMount } from "svelte";
  import type { FormResult } from "$lib/types";

  let token = "";
  let formElement: HTMLFormElement;

  onMount(() => {
    token = new URLSearchParams(window.location.search).get("token") || "";
  });
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
  <div class="w-full max-w-md bg-white shadow-lg rounded-xl p-6">
    <h1 class="text-2xl font-bold text-[#0073B1] mb-4">Reset Password</h1>
    <p class="text-gray-600 mb-4">Enter your new password below</p>

    <form
      bind:this={formElement}
      method="POST"
      use:enhance={() => {
        return async ({ result }) => {
          if (result.type === "success") {
            const data = result.data as FormResult;
            if (data?.success && data.message) {
              toast.success(data.message);
              formElement.reset();
            } else if (data?.invalid && data.message) {
              toast.error(data.message);
            }
          }
        };
      }}
      class="flex flex-col gap-4"
    >
      <input type="hidden" name="token" value={token} />
      <Input
        type="password"
        name="password"
        placeholder="New Password"
        required
        class="border-gray-300 focus:ring-[#0073B1] focus:border-[#0073B1]"
      />
      <Input
        type="password"
        name="confirmPassword"
        placeholder="Confirm Password"
        required
        class="border-gray-300 focus:ring-[#0073B1] focus:border-[#0073B1]"
      />
      <Button type="submit" class="bg-[#0073B1] hover:bg-[#005582] text-white">
        Reset Password
      </Button>
    </form>
  </div>
</div>

<Toaster position="top-right" />
