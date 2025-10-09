<script lang="ts">
  import {
    Avatar,
    AvatarImage,
    AvatarFallback,
  } from "$lib/components/ui/avatar";
  import { Button } from "$lib/components/ui/button";
  import { Card, CardTitle, CardContent } from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
  } from "$lib/components/ui/tabs";
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import type { PageData } from "./$types";
  import { toast, Toaster } from "svelte-sonner";
  import type { Mess } from "$lib/stores";
  import {
    messagesStore,
    unseenMessages,
    setCurrentUser,
    currentChatUser,
  } from "$lib/stores";
  import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
  } from "$lib/components/ui/dropdown-menu";

  $effect(() => {
    if (data?.user?.id) setCurrentUser(data.user.id);
  });

  let { data }: { data: PageData } = $props();
  const myId = data.user.id;

  interface User {
    id: string;
    name: string;
    avatar: string;
  }

  let users = $state<User[]>(data.users || []);
  let allUsers = $state<User[]>(data.allUsers || []);
  let chatUsers = $state<User[]>(data.chatUsers || []);
  let select = $state<User | null>(null);
  let mes = $state<Mess[]>([]);
  let input = $state("");
  let activeTab = $state("chats");
  let dropdownOpen = $state(false);
  async function markAsSeen(msg: Mess) {
    messagesStore.update(($messages) =>
      $messages.map((m) => (m.id === msg.id ? { ...m, seen: true } : m)),
    );

    try {
      await fetch(`/chat/mark-seen/${msg.id}`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Failed to mark message as seen", err);
    }
  }

  $effect(() => {
    const source = new EventSource("/chat/stream");
    source.onmessage = (ev: MessageEvent) => {
      try {
        const payload: Mess = JSON.parse(ev.data);
        if (payload.receiver_id === myId && payload.sender_id !== myId) {
          const sender = users.find((u) => u.id === payload.sender_id);
          const senderName = sender ? sender.name : "Unknown";
          messagesStore.update(($messages) => [
            ...$messages,
            { ...payload, seen: false, fromSelf: false },
          ]);
          toast(`New message from ${senderName}: ${payload.content}`);
        }
      } catch (err) {
        console.error("Error parsing SSE:", err);
      }
    };
    return () => source.close();
  });
  let _initSelected = (() => {
    if (data.selectedUserId) {
      const preselect = [...chatUsers, ...allUsers].find(
        (u) => u.id === data.selectedUserId,
      );
      if (preselect) select = preselect;
    }
  })();

  $effect(() => {
    let intervalId: number | null = null;
    intervalId = window.setInterval(() => {
      if (select?.id) loadMessages(select.id);
    }, 1000);
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  });

  $effect(() => {
    function onFocus() {
      if (select?.id) {
        loadMessages(select.id);
      }
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  });

  $effect(() => {
    const source = new EventSource("/chat/stream");
    source.onmessage = (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data);
        if (!select) return;
        const isForActiveChat =
          (payload.sender_id === select.id && payload.receiver_id === myId) ||
          (payload.receiver_id === select.id && payload.sender_id === myId);
        if (isForActiveChat) {
          if (payload.sender_id === select.id) {
            const exists = mes.some(
              (m) => m.id === payload.id && m.content === payload.content,
            );
            if (!exists) {
              mes = [
                ...mes,
                {
                  id: payload.id ?? Date.now(),
                  sender_id: payload.sender_id,
                  receiver_id: payload.receiver_id,
                  content: payload.content,
                  created_at: new Date(),
                  seen: false,
                  fromSelf: false,
                },
              ];
            }
          }
          setTimeout(() => select && loadMessages(select.id), 200);
        }
      } catch {}
    };
    return () => source.close();
  });

  $effect(() => {
    if (data.messages && data.selectedUserId) {
      mes = data.messages.map((msg: any) => ({
        ...msg,
        fromSelf: msg.sender_id === data.user.id,
        created_at: parseToDate(msg.created_at),
      }));
      const selectedUser = [...chatUsers, ...allUsers].find(
        (u) => u.id === data.selectedUserId,
      );
      if (selectedUser) select = selectedUser;
    }
  });
  async function sel(selectedUser: User) {
    if (select && select.id === selectedUser.id) return;

    if (select !== null) {
      const previousUserId = select.id;

      messagesStore.update(($messages) =>
        $messages.map((msg) =>
          msg.sender_id === previousUserId && !msg.fromSelf
            ? { ...msg, seen: true }
            : msg,
        ),
      );

      try {
        await fetch(`/chat/mark-seen-by-user/${previousUserId}`, {
          method: "POST",
        });
      } catch (err) {
        console.error("Failed to mark previous chat messages as seen", err);
      }
    }

    select = selectedUser;
    currentChatUser.set(selectedUser.id);

    mes = [];
    await loadMessages(selectedUser.id);

    messagesStore.update(($messages) =>
      $messages.map((msg) =>
        msg.sender_id === selectedUser.id && !msg.fromSelf
          ? { ...msg, seen: true }
          : msg,
      ),
    );

    try {
      await fetch(`/chat/mark-seen-by-user/${selectedUser.id}`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Failed to mark current chat messages as seen", err);
    }

    const url = new URL(window.location.href);
    url.searchParams.set("user", selectedUser.id);
    goto(url.pathname + url.search, { replaceState: true });
  }

  async function loadMessages(userId: string) {
    try {
      const targetUserId = userId;
      const formData = new FormData();
      formData.append("user_id", userId);
      const response = await fetch("?/loadMessages", {
        method: "POST",
        body: formData,
        cache: "no-store",
        credentials: "include",
      });
      const result = await response.json();
      if (result.messages && select && select.id == targetUserId) {
        mes = result.messages.map((msg: any) => ({
          ...msg,
          fromSelf: msg.sender_id === data.user.id,
          created_at: new Date(msg.created_at),
        }));
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }

  async function message() {
    if (!input.trim() || !select) return;
    const messageContent = input;
    input = "";
    const newMessage = {
      id: Date.now(),
      sender_id: data.user.id,
      receiver_id: select.id,
      content: messageContent,
      created_at: new Date(),
      fromSelf: true,
      seen: true,
    };

    mes = [...mes, newMessage];

    try {
      const formData = new FormData();
      formData.append("content", messageContent);
      formData.append("receiver_id", select.id);
      const response = await fetch("?/sendMessage", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const result = await response.json();
      if (!result.success)
        console.error("Failed to save message:", result.message);
      if (select?.id) {
        await loadMessages(select.id);
      }
    } catch (error) {
      console.error("Error saving message:", error);
    }
  }

  function parseToDate(input: string | Date): Date {
    if (input instanceof Date) return input;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(input)) {
      return new Date(input.replace(" ", "T") + "Z");
    }

    return new Date(input);
  }

  function formatTime(date: Date) {
    const d = new Date(date);
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }
</script>

<div class="flex flex-col md:flex-row h-screen bg-gray-50">
  <div
    class="w-full sm:w-1/2 md:w-1/4 h-1/3 md:h-screen flex flex-col bg-white shadow-lg"
  >
    <div
      class="p-4 font-bold text-lg border-b border-gray-200 flex flex-wrap items-center justify-between bg-[#0073B1] text-white rounded-t-md"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span>Chats</span>
        <Badge variant="secondary" class="bg-blue-100 text-blue-800"
          >{activeTab === "chats" ? chatUsers.length : allUsers.length}</Badge
        >
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs sm:text-sm">Welcome {data.user.name}</span>
        <div class="relative">
          <DropdownMenu bind:open={dropdownOpen}>
            <DropdownMenuTrigger>
              <button
                class="relative px-3 py-2 bg-[#0073B1] text-white rounded-full"
              >
                {String.fromCodePoint(0x1f514)}
                {#if $unseenMessages.length > 0}
                  <span
                    class="absolute top-0 right-0 bg-red-600 text-white rounded-full px-1 text-xs"
                  >
                    {$unseenMessages.length}
                  </span>
                {/if}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              class="w-64 bg-[#0073B1] shadow-lg border rounded-lg"
            >
              {#each $unseenMessages as msg (msg.id)}
                <DropdownMenuItem
                  class="p-2 bg-[#0073B1] hover:bg-blue-500 cursor-pointer w-full text-left flex justify-between items-center text-white"
                  onclick={() => markAsSeen(msg)}
                >
                  <div class="font-semibold truncate">
                    {users.find((u) => u.id === msg.sender_id)?.name ??
                      "Unknown"}
                  </div>
                  <div class="text-sm truncate">{msg.content}</div>
                </DropdownMenuItem>
              {/each}

              {#if $unseenMessages.length === 0}
                <DropdownMenuItem
                  class="text-white cursor-default bg-[#0073B1]"
                >
                  No new messages
                </DropdownMenuItem>
              {/if}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <form method="POST" action="?/logout" use:enhance>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            class="text-[#0073B1] border-blue-300 hover:bg-blue-100"
          >
            Logout
          </Button>
        </form>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto custom-scrollbar">
      <Tabs bind:value={activeTab} class="h-full flex flex-col">
        <div class="px-4 flex justify-center py-1 bg-gray-100">
          <TabsList class="grid w-full grid-cols-2 bg-gray-100 rounded-full">
            <TabsTrigger value="chats" class="rounded-full px-4 py-1">
              Chats
              <Badge variant="secondary" class="ml-2 bg-blue-100 text-blue-800">
                {chatUsers.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="all-users" class="rounded-full px-4 py-1">
              All Users
              <Badge
                variant="secondary"
                class="ml-2 bg-green-100 text-green-800"
              >
                {allUsers.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chats" class="flex-1 overflow-y-auto">
          <div class="px-4 py-2">
            {#if chatUsers.length === 0}
              <div class="p-4 text-gray-400 font-bold">
                No conversations yet
              </div>
            {/if}
            {#each chatUsers as userItem}
              <button
                type="button"
                class="w-full text-left mb-2 transition-transform hover:scale-[1.02]"
                onclick={() => sel(userItem)}
              >
                <Card
                  class={`rounded-xl shadow-md ${select?.id === userItem.id ? "bg-blue-100" : "bg-white hover:bg-gray-50"}`}
                >
                  <CardContent class="flex gap-3 p-3">
                    <Avatar>
                      <AvatarImage src={userItem.avatar} alt={userItem.name} />
                      <AvatarFallback class="bg-[#0073B1] text-white"
                        >{userItem.name[0]}</AvatarFallback
                      >
                    </Avatar>
                    <span class="font-medium text-gray-800"
                      >{userItem.name}</span
                    >
                  </CardContent>
                </Card>
              </button>
            {/each}
          </div>
        </TabsContent>

        <TabsContent value="all-users" class="flex-1 overflow-y-auto ">
          <div class="px-4 py-2 pr-0.5">
            {#if allUsers.length === 0}
              <div class="p-4 text-gray-400 font-bold">No users yet</div>
            {/if}
            {#each allUsers as userItem}
              <button
                type="button"
                class="w-full text-left mb-2 transition-transform hover:scale-[1.02]"
                onclick={() => sel(userItem)}
              >
                <Card
                  class={`rounded-xl shadow-md ${select?.id === userItem.id ? "bg-blue-100" : "bg-white hover:bg-gray-50"}`}
                >
                  <CardContent class="flex gap-3 p-3">
                    <Avatar>
                      <AvatarImage src={userItem.avatar} alt={userItem.name} />
                      <AvatarFallback class="bg-[#0073B1] text-white"
                        >{userItem.name[0]}</AvatarFallback
                      >
                    </Avatar>
                    <span class="font-medium text-gray-800"
                      >{userItem.name}</span
                    >
                  </CardContent>
                </Card>
              </button>
            {/each}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </div>

  <div class="flex-1 flex flex-col custom-scrollbar">
    <div
      class="h-16 flex items-center px-4 bg-gray-100 border-b border-gray-200"
    >
      {#if select}
        <Avatar>
          <AvatarImage src={select.avatar} alt={select.name} />
          <AvatarFallback class="bg-[#0073B1] text-white"
            >{select.name[0]}</AvatarFallback
          >
        </Avatar>
        <CardTitle class="text-gray-800 font-bold ml-3">{select.name}</CardTitle
        >
      {:else}
        <CardTitle class="text-gray-500 font-bold ml-3"
          >Select a user to start chatting</CardTitle
        >
      {/if}
    </div>

    <div
      class="flex-1 overflow-y-auto p-4 bg-gray-50"
      style="max-height: calc(100vh - 64px);"
    >
      {#if !select}
        <div class="text-gray-400 font-bold text-center">No chat selected</div>
      {:else if mes.length === 0}
        <div class="text-gray-400 font-bold text-center mt-10">
          No messages yet
        </div>
      {/if}

      {#each mes as msg}
        <div
          class="flex"
          class:justify-end={msg.fromSelf}
          class:justify-start={!msg.fromSelf}
        >
          <div
            class={`p-3 rounded-2xl max-w-[70%] break-words shadow-md text-sm flex justify-between items-center gap-2 ${msg.fromSelf ? "bg-[#0073B1] text-white" : "bg-gray-200 text-gray-800"}`}
          >
            <span>{msg.content}</span>
            <span class="text-xs text-black-500"
              >{formatTime(msg.created_at)}</span
            >
          </div>
        </div>
      {/each}
    </div>

    <div class="p-4 flex gap-2 bg-gray-100 border-t border-gray-200">
      <input
        type="text"
        placeholder="Type a message..."
        bind:value={input}
        class="flex-1 border rounded-full px-4 py-2 bg-white focus:ring-[#0073B1] focus:border-[#0073B1]"
        onkeydown={(e: KeyboardEvent) => e.key === "Enter" && message()}
        disabled={!select}
      />
      <Button
        onclick={message}
        disabled={!select}
        class="rounded-full px-6 bg-[#0073B1] hover:bg-[#005582] text-white"
        >Send</Button
      >
    </div>
  </div>
</div>

<Toaster position="top-right" />

<style>
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
  }
</style>
