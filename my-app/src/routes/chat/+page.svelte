<script lang="ts">
import { Avatar, AvatarImage, AvatarFallback } from "$lib/components/ui/avatar";
  import { Button } from "$lib/components/ui/button";
  import { Card, CardTitle, CardContent } from "$lib/components/ui/card";
    import { Badge } from "$lib/components/ui/badge";
import { enhance } from "$app/forms";
import { goto } from '$app/navigation';
  import type { PageData } from './$types';
import { toast ,Toaster} from 'svelte-sonner';
let { data }: { data: PageData } = $props();
const myId = data.user.id;
interface User {
  id: string;
  name: string;
  avatar: string;
}
interface Mess {
id: number;
  sender_id: string;
  receiver_id: string;
content: string;
created_at: Date;
fromSelf: boolean;
}
let users = $state<User[]>(data.users || []);
let select = $state<User | null>(null);
let mes = $state<Mess[]>([]);
let input = $state("");

$effect(() => {
  const source = new EventSource('/chat/stream');
  source.onmessage = (ev: MessageEvent) => {
    try {
      const payload = JSON.parse(ev.data);
      if (payload.receiver_id === myId && payload.sender_id !== myId) {
         const sender = users.find(u => u.id === payload.sender_id);
        const senderName = sender ? sender.name : 'Unknown';

        toast(`New message from ${senderName}: ${payload.content}`);
      }
    } catch (err) {
      console.error('Error parsing SSE:', err);
    }
  };
  return () => source.close();
});
let _initSelected = (() => {
  if (data.selectedUserId) {
    const preselect = users.find(u => u.id === data.selectedUserId);
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
window.addEventListener('focus', onFocus);
return () => window.removeEventListener('focus', onFocus);
});
$effect(() => {
const source = new EventSource('/chat/stream');
source.onmessage = (ev: MessageEvent) => {
  try {
    const payload = JSON.parse(ev.data);
    if (!select) return;
    const isForActiveChat = (
      (payload.sender_id === select.id && payload.receiver_id === myId) ||
      (payload.receiver_id === select.id && payload.sender_id === myId)
    );
    if (isForActiveChat) {
      if (payload.sender_id === select.id) {
        const exists = mes.some(m => m.id === payload.id && m.content === payload.content);
        if (!exists) {
          mes = [
            ...mes,
            {
              id: payload.id ?? Date.now(),
              sender_id: payload.sender_id,
              receiver_id: payload.receiver_id,
              content: payload.content,
              created_at: new Date(),
              fromSelf: false
            }
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
   created_at: new Date(msg.created_at)
}));
const selectedUser = users.find(u => u.id === data.selectedUserId);
if (selectedUser) select = selectedUser;
}
});
async function sel(selectedUser: User) {
  if (select && select.id === selectedUser.id) return;
  select = selectedUser;
  mes = [];
  await loadMessages(selectedUser.id);

  const url = new URL(window.location.href);
  url.searchParams.set('user', selectedUser.id);
  goto(url.pathname + url.search, { replaceState: true });
}
async function loadMessages(userId: string) {
  try {
    const targetUserId = userId; 
    const formData = new FormData();
    formData.append('user_id', userId);
    const response = await fetch('?/loadMessages', {
      method: 'POST',
      body: formData,
      cache: 'no-store',
      credentials: 'include'
    });
    const result = await response.json();
    if (result.messages && select && select.id == targetUserId) {
      mes = result.messages.map((msg: any) => ({
        ...msg,
        fromSelf: msg.sender_id === data.user.id,
        created_at: new Date(msg.created_at)
      }));

    }
  } catch (error) {
    console.error('Error loading messages:', error);
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
  fromSelf: true
};
mes = [...mes, newMessage];
try {
  const formData = new FormData();
  formData.append('content', messageContent);
  formData.append('receiver_id', select.id);
  const response = await fetch('?/sendMessage', {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });
  const result = await response.json();
  if (!result.success) console.error('Failed to save message:', result.message);
  if (select?.id) {
    await loadMessages(select.id);
  }
} catch (error) {
  console.error('Error saving message:', error);
}
}
function formatTime(date: Date) {
  const d = new Date(date);
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

</script>
 <div class="flex flex-col md:flex-row h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-blue-100">
<div class="w-full sm:w-1/2 md:w-1/4 h-1/3 md:h-screen flex flex-col bg-gradient-to-b from-indigo-600 to-purple-700 text-white">
<div class="p-4 font-bold text-lg border-b border-indigo-400 flex flex-wrap items-center justify-between bg-gradient-to-r from-indigo-700 to-purple-600">
<div class="flex flex-wrap items-center gap-2">
<span>Chats</span>
<Badge variant="secondary" class="bg-indigo-200 text-indigo-800">{users.length}</Badge>
</div>
<div class="flex items-center gap-2">
<span class="text-xs sm:text-sm">Welcome {data.user.name}</span>
<form method="POST" action="?/logout" use:enhance>
  <Button type="submit" variant="outline" size="sm" class="text-indigo-800 border-indigo-300 hover:bg-indigo-200">
    Logout
  </Button>
</form>
</div>
</div>
<div class="flex-1 overflow-y-auto custom-scrollbar">
<div class="px-4 py-2">
{#if users.length === 0}
<div class="p-4 text-indigo-200 font-bold">No users yet</div>
{/if}
{#each users as userItem}
<button type="button" class="w-full text-left mb-2 transition-transform hover:scale-[1.02]" onclick={() => sel(userItem)}>
<Card class={`rounded-xl shadow-md ${select?.id === userItem.id ? 'bg-gradient-to-r from-purple-300 to-indigo-300' : 'bg-white hover:bg-indigo-50'}`}>
<CardContent class="flex gap-3 p-3">
<Avatar>
  <AvatarImage src={userItem.avatar} alt={userItem.name} />
  <AvatarFallback class="bg-indigo-500 text-white">{userItem.name[0]}</AvatarFallback>
</Avatar>
<span class="font-medium">{userItem.name}</span>

</CardContent></Card></button>
{/each}</div></div></div>
<div class="flex-1 flex flex-col">
<div class="h-16 flex items-center px-4 bg-gradient-to-r from-indigo-100 to-purple-100">
  {#if select}
    <Avatar>
      <AvatarImage src={select.avatar} alt={select.name} />
      <AvatarFallback class="bg-indigo-500 text-white">{select.name[0]}</AvatarFallback>
    </Avatar>
    <CardTitle class="text-indigo-800 font-bold ml-3">{select.name}</CardTitle>
  {:else}
    <CardTitle class="text-gray-500 font-bold ml-3">Select a user to start chatting</CardTitle>
  {/if}
</div>
<div class="flex-1 overflow-y-auto p-4 bg-gradient-to-br from-white via-indigo-50 to-purple-50" style="max-height: calc(100vh - 64px);">
{#if !select}
<div class="text-gray-400 font-bold text-center">No chat selected</div>
{:else if mes.length === 0}
<div class="text-gray-400 font-bold text-center mt-10">No messages yet</div>
{/if}
{#each mes as msg}
<div class="flex" class:justify-end={msg.fromSelf} class:justify-start={!msg.fromSelf}>
  <div class={`p-3 rounded-2xl  max-w-[70%] break-words shadow-md text-sm flex justify-between items-center gap-2 ${msg.fromSelf ? 
    'bg-gradient-to-r from-indigo-500 to-purple-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
    <span>{msg.content}</span>
    <span class="text-xs text-black-500">{formatTime(msg.created_at)}</span>
  </div>
</div>
{/each}
</div>
<div class="p-4 flex gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-t border-gray-200">
<input type="text" placeholder="Type a message..." bind:value={input} class="flex-1 border rounded-full px-4 py-2 bg-white" 
onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && message()} disabled={!select} />
<Button onclick={message} disabled={!select} class="rounded-full px-6 bg-gradient-to-r from-indigo-500 to-purple-600 
hover:from-indigo-600 hover:to-purple-700 text-white ">Send</Button>
</div></div></div>
<Toaster position="top-right" />
<style>
.custom-scrollbar::-webkit-scrollbar {
  width: 1px; 
}

</style>

