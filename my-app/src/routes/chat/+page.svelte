<script lang="ts">
  import {
    Avatar,
    AvatarImage,
    AvatarFallback,
  } from "$lib/components/ui/avatar";
  import { Button } from "$lib/components/ui/button";
  import { Card, CardTitle, CardContent } from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
  } from "$lib/components/ui/tabs";
  import type { PageData } from "./$types";
  let { data }: { data: PageData } = $props();
  const myId = data.user.id;
  interface User {
    id: string;
    name: string;
    avatar: string;
    isOnline?: boolean;
  }
  interface Mess {
    id: number;
    sender_id: string;
    receiver_id: string;
    content: string;
    message_type: "text" | "image";
    file_path?: string;
    created_at: Date;
    fromSelf: boolean;
    sequence?: number;
    clientTimestamp?: number; // Client-side timestamp for ordering
  }
  let users = $state<User[]>(data.users || []);
  let select = $state<User | null>(null);
  let mes = $state<Mess[]>([]);
  let input = $state("");
  let notificationCount = $state(0);
  let showNotifications = $state(false);
  let unseenMessages = $state<{ [userId: string]: number }>({});
  let messagesBySender = $state<{ [userId: string]: any[] }>({});
  let isUploading = $state(false);
  let selectedFile = $state<File | null>(null);
  let activeTab = $state<"chats" | "all-users">("chats");
  let allMessages = $state<Mess[]>([]);
  let loadingLogout = $state(false);
  let chatUsers = $state<User[]>([]);
  let allUsers = $state<User[]>([]);
  let showImageModal = $state(false);
  let modalImageSrc = $state<string | null>(null);
  let pendingMessageIds = $state<Set<number>>(new Set());
  let pendingMessagesMap = $state<Map<number, {content: string, receiver_id: string, timestamp: number, sequence: number}>>(new Map());
  let messageSequence = 0;
  let clientSequence = 0; // Global sequence counter for all messages
  let processedMessageIds = $state<Set<number>>(new Set());
  let verifyMessagesTimeout: ReturnType<typeof setTimeout> | null = null;
  let messageOrderMap = $state<Map<number, number>>(new Map());
  let sentMessageIds = $state<Set<number>>(new Set()); // Track IDs of messages we sent 
  
  // Derived state: unique messages sorted correctly
  let uniqueMessages = $derived.by(() => {
    const seen = new Set<number>();
    const unique: Mess[] = [];
    
    for (const msg of mes) {
      if (!seen.has(msg.id)) {
        seen.add(msg.id);
        unique.push(msg);
      } else {
        console.warn(`[DUPLICATE DETECTED] Filtering out duplicate message ID: ${msg.id}`);
      }
    }
    
    // Sort messages with intelligent ordering
    return unique.sort((a, b) => {
      // For messages with client timestamp (our sent messages), use it
      const hasClientTimestampA = a.clientTimestamp !== undefined;
      const hasClientTimestampB = b.clientTimestamp !== undefined;
      
      // If both have client timestamps (both are our messages), sort by client time + sequence
      if (hasClientTimestampA && hasClientTimestampB) {
        if (a.clientTimestamp! !== b.clientTimestamp!) {
          return a.clientTimestamp! - b.clientTimestamp!;
        }
        if (a.sequence !== undefined && b.sequence !== undefined) {
          return a.sequence - b.sequence;
        }
        return a.id - b.id;
      }
      
      // If neither has client timestamp (both received), use database ID (auto-increment = chronological)
      if (!hasClientTimestampA && !hasClientTimestampB) {
        return a.id - b.id;
      }
      
      // Mixed case: compare server timestamps
      const timeA = a.clientTimestamp || new Date(a.created_at).getTime();
      const timeB = b.clientTimestamp || new Date(b.created_at).getTime();
      
      // If timestamps are very close (within 100ms), use ID for stability
      const timeDiff = Math.abs(timeA - timeB);
      if (timeDiff < 100) {
        return a.id - b.id;
      }
      
      return timeA - timeB;
    });
  });

  function openImageModal(src: string) {
    modalImageSrc = src;
    showImageModal = true;
  }

  function closeImageModal() {
    modalImageSrc = null;
    showImageModal = false;
  }

  function scheduleMessageVerification() {

    if (verifyMessagesTimeout) {
      clearTimeout(verifyMessagesTimeout);
    }
    

    verifyMessagesTimeout = setTimeout(() => {
      if (select?.id && pendingMessagesMap.size > 0) {
        console.log("Some messages still pending, verifying...");
        loadMessages(select.id);
      }
    }, 5000);
  }

  function getChatUsersWithHistory(): User[] {
    const usersWithMessages = new Set<string>();

    allMessages.forEach((msg) => {
      usersWithMessages.add(msg.sender_id);
      usersWithMessages.add(msg.receiver_id);
    });

    usersWithMessages.delete(myId);

    return users.filter((u) => usersWithMessages.has(u.id));
  }

  $effect(() => {
    allUsers = users.map((u) => ({
      ...u,
      avatar:
        u.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          u.name,
        )}&background=0073B1&color=ffffff&size=128`,
      isOnline: u.isOnline ?? false,
    }));

    chatUsers = getChatUsersWithHistory().map((u) => ({
      ...u,
      avatar:
        u.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          u.name,
        )}&background=0073B1&color=ffffff&size=128`,
      isOnline: u.isOnline ?? false,
    }));
  });

  let loadingMessages = $state(false);

  const _initSelected = (() => {
    if (data.selectedUserId) {
      const preselect = users.find((u) => u.id === data.selectedUserId);
      if (preselect) select = preselect;
    }
  })();

  let sseSource: EventSource | null = null;

  let currentSelectedId = $state<string | null>(null);

  $effect(() => {
    currentSelectedId = select?.id || null;
  });

  $effect(() => {
    let intervalId: number | null = null;
    if (currentSelectedId) {
      const selectedUserId = currentSelectedId;
      intervalId = window.setInterval(() => {
        if (
          unseenMessages[selectedUserId] &&
          unseenMessages[selectedUserId] > 0
        ) {
          markMessagesAsSeen(selectedUserId);
        }
      }, 5000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  });
  import { onMount } from "svelte";

  onMount(() => {
    fetch("/chat/heartbeat", { method: "POST", credentials: "include" });

    const interval = setInterval(() => {
      fetch("/chat/heartbeat", { method: "POST", credentials: "include" });
    }, 20000);

    return () => clearInterval(interval);
  });

  let messagesContainer: HTMLDivElement | null = null;

  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }
  $effect(() => {
    if (uniqueMessages.length > 0) {
      scrollToBottom();
    }
  });

  $effect(() => {
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch("/chat/online-users", {
          credentials: "include",
        });
        const data = await res.json();
        const onlineUserIds = new Set(data.onlineUserIds);

        const selectedUserId = select?.id;

        users = users.map((u) => ({
          ...u,
          isOnline: onlineUserIds.has(u.id),
        }));

        if (selectedUserId) {
          const updatedSelect = users.find((u) => u.id === selectedUserId);
          if (updatedSelect) select = updatedSelect;
        }
      } catch (e) {
        console.error("Error fetching online users:", e);
      }
    }, 5000);

    return () => clearInterval(intervalId);
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
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch("/chat/notifications", {
          credentials: "include",
        });
        const data = await res.json();
        unseenMessages = data.unseenMessages;
        messagesBySender = data.messagesBySender;
        updateTotalNotificationCount();
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  });

  $effect(() => {
    if (sseSource) {
      sseSource.close();
    }

    sseSource = new EventSource("/chat/stream");

    sseSource.onopen = () => {
      console.log("SSE connection opened successfully");
    };

    sseSource.onerror = (error) => {
      console.error("SSE connection error:", error);

      setTimeout(() => {
        if (sseSource) {
          sseSource.close();
          sseSource = new EventSource("/chat/stream");
        }
      }, 3000);
    };

    sseSource.onmessage = (ev: MessageEvent) => {
      console.log("SSE message received:", ev.data);
      try {
        const payload = JSON.parse(ev.data);
        console.log("Parsed SSE payload:", payload);

        // CRITICAL FIRST CHECK: If this message was sent by me, NEVER process it
        // We already have the optimistic update in place
        if (payload.sender_id === myId) {
          console.log("[BLOCKED] Message sent by me - ignoring from SSE");
          
          // Mark this ID as sent by us to prevent any future processing
          sentMessageIds.add(payload.id);
          processedMessageIds.add(payload.id);
          
          // Only update if we're in the active chat with the receiver
          if (select && payload.receiver_id === select.id) {
            // Find the pending message by content and receiver
            const pendingEntry = Array.from(pendingMessagesMap.entries()).find(
              ([_, data]) => data.content === payload.content && data.receiver_id === payload.receiver_id
            );
            
            if (pendingEntry) {
              const [tempId, msgData] = pendingEntry;
              console.log(`[UPDATE] Replacing temp ID ${tempId} with real ID ${payload.id}`);
              
              // Find the optimistic message in the array
              const messageIndex = mes.findIndex(m => m.id === tempId);
              
              if (messageIndex !== -1) {
                // Create a new message object with the real ID, preserving client timestamp and sequence
                const updatedMessage = {
                  ...mes[messageIndex],
                  id: payload.id,
                  file_path: payload.file_path || mes[messageIndex].file_path,
                  created_at: payload.created_at ? new Date(payload.created_at) : mes[messageIndex].created_at,
                  // Keep client timestamp and sequence for proper ordering
                  clientTimestamp: mes[messageIndex].clientTimestamp,
                  sequence: mes[messageIndex].sequence
                };
                
                // Replace the message in a new array
                const newMes = [...mes];
                newMes[messageIndex] = updatedMessage;
                mes = newMes;
                
                // Update allMessages too
                const allMessageIndex = allMessages.findIndex(m => m.id === tempId);
                if (allMessageIndex !== -1) {
                  const newAllMessages = [...allMessages];
                  newAllMessages[allMessageIndex] = updatedMessage;
                  allMessages = newAllMessages;
                }
                
                console.log(`[SUCCESS] Updated message from temp ID ${tempId} to real ID ${payload.id}`);
              }
              
              // Clean up tracking
              pendingMessageIds.delete(tempId);
              pendingMessagesMap.delete(tempId);
            } else {
              console.warn(`[WARNING] No pending message found for content: "${payload.content}"`);
            }
          }
          
          return; // ALWAYS return here - never add our own messages from SSE
        }

        // Handle notifications if no chat is selected
        if (!select) {
          console.log("No user selected, handling as notification");
          handleNotificationMessage(payload);
          return;
        }

        // Check if this message is for the active chat (only messages FROM other user TO me)
        const isForActiveChat =
          (payload.sender_id === select.id && payload.receiver_id === myId);

        if (isForActiveChat) {
          console.log("[RECEIVE] Message for active chat from other user");
          
          // Triple safety check - this should never be our own message
          if (payload.sender_id === myId) {
            console.error("[ERROR] Our own message passed first check - blocking");
            return;
          }
          
          if (sentMessageIds.has(payload.id)) {
            console.log("[BLOCKED] Message ID in sent list");
            return;
          }
          
          // Prevent duplicate processing
          if (processedMessageIds.has(payload.id)) {
            console.log("[BLOCKED] Message already processed");
            return;
          }
          
          // Check if message already exists
          if (mes.some((m) => m.id === payload.id)) {
            console.log("[BLOCKED] Message already in list");
            return;
          }
          
          processedMessageIds.add(payload.id);
          
          const newMessage: Mess = {
            id: payload.id ?? Date.now(),
            sender_id: payload.sender_id,
            receiver_id: payload.receiver_id,
            content: payload.content,
            message_type: payload.message_type || "text",
            file_path: payload.file_path,
            created_at: payload.created_at ? new Date(payload.created_at) : new Date(),
            fromSelf: false,
            clientTimestamp: new Date(payload.created_at).getTime(),
          };

          console.log(`[ADD] Adding new message ID ${payload.id} to chat`);
          // Add message - sorting will be handled by uniqueMessages derived state
          mes = [...mes, newMessage];
          allMessages = [...allMessages, newMessage];
          
          markMessageAsSeenImmediately(payload.id, payload.sender_id);
        } else {
          console.log(
            "Message is not for active chat, handling as notification",
          );
          handleNotificationMessage(payload);
        }
      } catch (error) {
        console.error("Error parsing SSE message:", error);
      }
    };

    return () => {
      console.log("Cleaning up SSE connection");
      if (sseSource) {
        sseSource.close();
        sseSource = null;
      }
    };
  });

  function handleNotificationMessage(payload: any) {
    if (payload.receiver_id === myId && payload.sender_id !== myId) {
      const isActivelyChatting = select && select.id === payload.sender_id;

      if (!isActivelyChatting) {
        console.log(
          "Adding real-time notification for user:",
          payload.sender_id,
        );
        updateNotificationCount(payload.sender_id, 1);

        const newMessage = {
          id: payload.id,
          content: payload.content,
          created_at: payload.created_at,
          message_type: payload.message_type,
          file_path: payload.file_path,
          sender_name:
            users.find((u) => u.id === payload.sender_id)?.name || "Unknown",
        };

        console.log("New message for notifications:", newMessage);

        if (!messagesBySender[payload.sender_id]) {
          messagesBySender[payload.sender_id] = [];
        }
        messagesBySender[payload.sender_id] = [
          newMessage,
          ...messagesBySender[payload.sender_id],
        ];
        console.log("Updated messagesBySender:", messagesBySender);
      } else {
        console.log("Actively chatting with this user, marking as seen");

        markMessageAsSeenImmediately(payload.id, payload.sender_id);
      }
    }
  }
  let hasInitialized = false;

  $effect(() => {
    if (data.messages && !hasInitialized) {
      hasInitialized = true;
      const formatted = data.messages.map((msg: any) => ({
        ...msg,
        fromSelf: msg.sender_id === data.user.id,
      }));
      allMessages = formatted;
      
      // Track all initial messages to prevent SSE duplicates
      formatted.forEach((msg: any) => {
        processedMessageIds.add(msg.id);
        if (msg.sender_id === myId) {
          sentMessageIds.add(msg.id);
        }
      });

      if (data.selectedUserId) {
        mes = formatted.filter(
          (msg) =>
            msg.sender_id === data.selectedUserId ||
            msg.receiver_id === data.selectedUserId,
        );
        const selectedUser = users.find((u) => u.id === data.selectedUserId);
        if (selectedUser) select = selectedUser;
      }
    }
  });

  async function sel(selectedUser: User) {
    if (select && select.id === selectedUser.id) return;
    select = selectedUser;
    currentSelectedId = selectedUser.id;
    mes = [];
    processedMessageIds.clear(); 
    pendingMessageIds.clear(); 
    pendingMessagesMap.clear();
    sentMessageIds.clear(); // Clear sent message tracking
    messageSequence = 0; 
    loadingMessages = true;

    if (
      selectedUser.id in unseenMessages ||
      selectedUser.id in messagesBySender
    ) {
      unseenMessages = { ...unseenMessages };
      delete unseenMessages[selectedUser.id];

      messagesBySender = { ...messagesBySender };
      delete messagesBySender[selectedUser.id];

      updateTotalNotificationCount();

      await markMessagesAsSeen(selectedUser.id);
    }

    await loadMessages(selectedUser.id);
    loadingMessages = false;
    const url = new URL(window.location.href);
    url.searchParams.set("user", selectedUser.id);
    goto(url.pathname + url.search, { replaceState: true });
  }

  let isLoadingMessages = false;

  async function loadMessages(userId: string) {
    if (isLoadingMessages) return;
    if (currentSelectedId !== userId) return;

    isLoadingMessages = true;

    try {
      const formData = new FormData();
      formData.append("user_id", userId);
      const response = await fetch("/chat/loadMessages", {
        method: "POST",
        body: formData,
        cache: "no-store",
        credentials: "include",
      });
      const result = await response.json();

      if (result.messages && currentSelectedId === userId) {
        const serverMessages: Mess[] = result.messages.map((msg: any) => ({
          ...msg,
          message_type: msg.message_type || "text",
          fromSelf: msg.sender_id === data.user.id,
        }));


        const serverMessageMap = new Map<number, Mess>(serverMessages.map((m) => [m.id, m]));
        
  
        serverMessages.forEach((msg: any) => {
          processedMessageIds.add(msg.id);
          // Track our own messages to prevent SSE duplicates
          if (msg.sender_id === myId) {
            sentMessageIds.add(msg.id);
          }
        });
        

        // Merge server messages with pending optimistic messages
        const finalMessages: Mess[] = [];
        const addedIds = new Set<number>();
        
        // First, add all pending optimistic messages (keep them in order)
        for (const msg of mes) {
          if (pendingMessageIds.has(msg.id)) {
            finalMessages.push(msg);
            addedIds.add(msg.id);
          }
        }
        
        // Then add all server messages that aren't duplicates
        for (const serverMsg of serverMessages) {
          if (!addedIds.has(serverMsg.id)) {
            finalMessages.push(serverMsg);
            addedIds.add(serverMsg.id);
          }
        }
        
        // Sort by ID (database auto-increment ensures correct order)
        // Negative IDs (optimistic) will appear first, then positive IDs in order
        finalMessages.sort((a, b) => {
          // Keep pending messages at the end (they have negative IDs)
          if (a.id < 0 && b.id > 0) return 1;
          if (a.id > 0 && b.id < 0) return -1;
          return a.id - b.id;
        });
        
        mes = finalMessages;
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      isLoadingMessages = false;
    }
  }

  async function message() {
    if (!input.trim() || !select) return;
    const messageContent = input;
    const receiverId = select.id;
    input = "";

    // Create optimistic message with temporary negative ID
    const tempId = -(Date.now());
    const currentClientTimestamp = Date.now();
    const currentSequence = clientSequence++; // Increment global sequence
    
    const optimisticMessage: Mess = {
      id: tempId,
      sender_id: myId,
      receiver_id: receiverId,
      content: messageContent,
      message_type: "text",
      created_at: new Date(),
      fromSelf: true,
      clientTimestamp: currentClientTimestamp,
      sequence: currentSequence,
    };
    
    // Track pending message
    pendingMessageIds.add(tempId);
    pendingMessagesMap.set(tempId, { 
      content: messageContent, 
      receiver_id: receiverId,
      timestamp: currentClientTimestamp,
      sequence: currentSequence
    });
    
    // Add optimistic message to UI immediately
    mes = [...mes, optimisticMessage];
    allMessages = [...allMessages, optimisticMessage];

    try {
      const formData = new FormData();
      formData.append("content", messageContent);
      formData.append("receiver_id", receiverId);
      const response = await fetch("/chat/sendMessage", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const result = await response.json();
      
      if (result.success) {
        // Message sent successfully - SSE will handle updating the temp ID to real ID
        console.log(`Message sent successfully with ID ${result.id}`);
      } else {
        console.error("Failed to send message", result.message);
        // Remove optimistic message on failure
        mes = mes.filter(m => m.id !== tempId);
        allMessages = allMessages.filter(m => m.id !== tempId);
        pendingMessageIds.delete(tempId);
        pendingMessagesMap.delete(tempId);
      }
    } catch (error) {
      console.error("Error saving message:", error);
      // Remove optimistic message on error
      mes = mes.filter(m => m.id !== tempId);
      allMessages = allMessages.filter(m => m.id !== tempId);
      pendingMessageIds.delete(tempId);
      pendingMessagesMap.delete(tempId);
    }
  }

  function updateNotificationCount(userId: string, increment: number) {
    console.log(
      `Updating notification count for user ${userId} by ${increment}`,
    );
    console.log("Current unseenMessages before update:", unseenMessages);

    unseenMessages = {
      ...unseenMessages,
      [userId]: (unseenMessages[userId] || 0) + increment,
    };

    console.log("Updated unseenMessages:", unseenMessages);
    updateTotalNotificationCount();
  }

  function updateTotalNotificationCount() {
    let total = 0;
    console.log("Updating notification count. Current select:", select?.id);
    console.log("unseenMessages:", unseenMessages);

    for (const [userId, count] of Object.entries(unseenMessages)) {
      if (!select || select.id !== userId) {
        total += count;
        console.log(`Adding ${count} notifications from user ${userId}`);
      } else {
        console.log(
          `Skipping ${count} notifications from active chat user ${userId}`,
        );
      }
    }

    console.log("Total notification count:", total);
    notificationCount = total;
  }

  async function loadNotificationCounts() {
    try {
      console.log("Loading notification counts...");
      const response = await fetch("/chat/notifications", {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Notification data received:", data);
        unseenMessages = data.unseenMessages || {};
        messagesBySender = data.messagesBySender || {};
        console.log("unseenMessages:", unseenMessages);
        console.log("messagesBySender:", messagesBySender);
        updateTotalNotificationCount();
      } else {
        console.error("Failed to load notifications:", response.status);
      }
    } catch (error) {
      console.error("Error loading notification counts:", error);
    }
  }

  async function markMessagesAsSeen(senderId: string) {
    try {
      const formData = new FormData();
      formData.append("sender_id", senderId);

      const response = await fetch("/chat/markAsSeen", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const result = await response.json();
      if (!result.success) {
        console.error("Failed to mark messages as seen:", result.message);
      }
    } catch (error) {
      console.error("Error marking messages as seen:", error);
    }
  }

  async function markMessageAsSeenImmediately(msgId: number, senderId: string) {
    if (!select) return;

    try {
      const response = await fetch("/chat/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msgId }),
        credentials: "include",
      });

      if (response.ok && messagesBySender[senderId]) {
        messagesBySender[senderId] = messagesBySender[senderId].filter(
          (msg) => msg.id !== msgId,
        );

        if (messagesBySender[senderId].length === 0) {
          delete messagesBySender[senderId];
          delete unseenMessages[senderId];
        } else {
          unseenMessages[senderId] = messagesBySender[senderId].length;
        }

        updateTotalNotificationCount();
      }
    } catch (error) {
      console.error("Error marking message as seen immediately:", error);
    }
  }

  async function markMessageAsSeen(messageId: string, senderId: string) {
    try {
      const response = await fetch("/chat/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messageId }),
        credentials: "include",
      });

      if (response.ok) {
        if (messagesBySender[senderId]) {
          messagesBySender[senderId] = messagesBySender[senderId].filter(
            (msg) => msg.id != messageId,
          );
          if (messagesBySender[senderId].length === 0) {
            delete messagesBySender[senderId];
            delete unseenMessages[senderId];
          } else {
            unseenMessages[senderId] = messagesBySender[senderId].length;
          }
          updateTotalNotificationCount();
        }
      }
    } catch (error) {
      console.error("Error marking message as seen:", error);
    }
  }

  async function uploadImage() {
    console.log("uploadImage called");
    console.log("selectedFile:", selectedFile);
    console.log("select:", select);

    if (!selectedFile || !select) {
      console.log("Missing selectedFile or select, returning");
      return;
    }

    isUploading = true;
    const fileToUpload = selectedFile;
    const receiverId = select.id;
    selectedFile = null; // Clear immediately
    console.log("Starting upload...");

    // Create optimistic message
    const tempId = -(Date.now());
    const currentClientTimestamp = Date.now();
    const currentSequence = clientSequence++; // Increment global sequence
    
    const optimisticMessage: Mess = {
      id: tempId,
      sender_id: myId,
      receiver_id: receiverId,
      content: fileToUpload.name,
      message_type: "image",
      file_path: URL.createObjectURL(fileToUpload), // Temporary preview
      created_at: new Date(),
      fromSelf: true,
      clientTimestamp: currentClientTimestamp,
      sequence: currentSequence,
    };
    
    // Track pending message
    pendingMessageIds.add(tempId);
    pendingMessagesMap.set(tempId, { 
      content: fileToUpload.name, 
      receiver_id: receiverId,
      timestamp: currentClientTimestamp,
      sequence: currentSequence
    });
    
    // Add optimistic message to UI
    mes = [...mes, optimisticMessage];
    allMessages = [...allMessages, optimisticMessage];

    try {
      const formData = new FormData();
      formData.append("image", fileToUpload);
      formData.append("receiver_id", receiverId);

      console.log("Sending request to /chat/upload");
      const response = await fetch("/chat/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      console.log("Response status:", response.status);
      const result = await response.json();
      console.log("Upload result:", result);

      if (result.success) {
        console.log(`Image uploaded successfully with ID ${result.id}`);
        // SSE will handle updating the temp ID to real ID with actual base64 data
      } else {
        console.error("Failed to upload image:", result.error);
        // Remove optimistic message on failure
        mes = mes.filter(m => m.id !== tempId);
        allMessages = allMessages.filter(m => m.id !== tempId);
        pendingMessageIds.delete(tempId);
        pendingMessagesMap.delete(tempId);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      // Remove optimistic message on error
      mes = mes.filter(m => m.id !== tempId);
      allMessages = allMessages.filter(m => m.id !== tempId);
      pendingMessageIds.delete(tempId);
      pendingMessagesMap.delete(tempId);
    } finally {
      isUploading = false;
    }
  }

  function handleFileSelect(event: Event) {
    console.log("File selection triggered");
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    console.log("Selected file:", file);
    if (file) {
      selectedFile = file;
      console.log("File set to selectedFile:", selectedFile);
      console.log("File name:", file.name);
      console.log("File size:", file.size);
      console.log("File type:", file.type);
    } else {
      console.log("No file selected");
    }
  }

  $effect(() => {
    if (data.users && data.users.length > 0) {
      loadNotificationCounts();
    }
  });

  $effect(() => {
    updateTotalNotificationCount();
  });

  $effect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (
        showNotifications &&
        !target.closest("[data-notification-dropdown]") &&
        !target.closest("[data-notification-button]")
      ) {
        showNotifications = false;
      }
    }

    if (typeof window !== "undefined") {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  });
</script>

<div class="flex flex-col md:flex-row h-screen">
  <div class="w-full md:w-1/4 flex flex-col bg-[#0073B1] text-white">
    <div
      class="p-4 font-bold text-lg border-b border-white flex items-center justify-between bg-[#0073B1]"
    >
      <div class="flex items-center gap-2">
        <span>Chats</span>
        <Badge variant="secondary" class="bg-white text-[#0073B1]"
          >{users.length}</Badge
        >
      </div>

      <div class="flex items-center gap-2">
        <span class="text-sm">Welcome {data.user.name}</span>

        <button
          type="button"
          class="relative p-2 text-white hover:text-[#0073B1] hover:bg-white rounded-lg transition-colors"
          data-notification-button
          onclick={(e) => {
            e.stopPropagation();
            showNotifications = !showNotifications;
          }}
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            ></path>
          </svg>
          {#if notificationCount > 0}
            <span
              class="absolute -top-1 -right-1 bg-white text-[#0073B1] text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold"
            >
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          {/if}
        </button>
        <form
          method="POST"
          action="?/logout"
          onsubmit={() => (loadingLogout = true)}
        >
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={loadingLogout}
            class="text-[#0073B1] border-white hover:bg-white hover:text-[#0073B1]"
          >
            {loadingLogout ? "Logging out..." : "Logout"}
          </Button>
        </form>
      </div>
    </div>
 
    {#if showImageModal && modalImageSrc}
      <button
        type="button"
        class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
        onclick={closeImageModal}
      >
        <img
          src={modalImageSrc}
          class="max-h-[90vh] max-w-[90vw] rounded-lg shadow-lg pointer-events-none"
          alt=""
          aria-hidden="true"
        />
      </button>
    {/if}

    {#if showNotifications}
      <div
        class="absolute top-16 right-0 z-50 w-full md:w-96 max-h-96 overflow-y-auto rounded-xl shadow-md bg-[#0073B1]/10 border border-[#0073B1]"
        data-notification-dropdown
      >
        <div class="p-4 border-b border-[#0073B1]">
          <h3 class="font-semibold text-[#0073B1]">Notifications</h3>
        </div>

        <div class="p-2">
          {#if Object.keys(messagesBySender).length === 0}
            <div class="text-gray-500 text-center py-4">No new messages</div>
          {:else}
            {#each Object.entries(messagesBySender) as [userId, messages]}
              {@const user = users.find((u) => u.id === userId)}
              {@const isActiveChat = select && select.id === userId}
              {#if user && !isActiveChat}
                <button
                  type="button"
                  class="w-full text-left mb-2 p-2 bg-white hover:bg-[#0073B1]/20 rounded-lg flex items-center gap-3 transition-colors shadow-sm"
                  onclick={() => {
                    sel(user);
                    showNotifications = false;
                    markMessagesAsSeen(userId);
                  }}
                >
                  <Avatar class="relative">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback class="bg-[#0073B1] text-white"
                      >{user.name[0]}</AvatarFallback
                    >
                    <span
                      class={`w-3 h-3 rounded-full absolute top-0 right-0 border border-white ${
                        user.isOnline ? "bg-green-500" : "bg-gray-400"
                      }`}
                    ></span>
                  </Avatar>

                  <div class="flex-1">
                    <div class="font-medium text-[#0073B1]">{user.name}</div>
                    <div class="text-sm text-gray-500">
                      {messages.length} new message{messages.length > 1
                        ? "s"
                        : ""}
                    </div>
                  </div>

                  <Badge class="bg-[#0073B1] text-white"
                    >{messages.length}</Badge
                  >
                </button>
              {/if}
            {/each}
          {/if}
        </div>
      </div>
    {/if}

    <div class="flex-1 flex flex-col bg-[#0073B1]">
      <Tabs bind:value={activeTab} class="flex-1 flex flex-col">
        <div class="px-4 flex justify-center py-1 bg-gray-100">
          <TabsList class="grid w-full grid-cols-2 bg-white rounded-full">
            <TabsTrigger
              value="chats"
              class="rounded-full px-4 py-1 flex items-center justify-center hover:bg-gray-50"
            >
              Chats
              <Badge variant="secondary" class="ml-2 bg-blue-100 text-blue-800"
                >{chatUsers.length}</Badge
              >
            </TabsTrigger>
            <TabsTrigger
              value="all-users"
              class="rounded-full px-4 py-1 flex items-center justify-center hover:bg-gray-50"
            >
              All Users
              <Badge
                variant="secondary"
                class="ml-2 bg-green-100 text-green-800"
                >{allUsers.length}</Badge
              >
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="chats"
          class="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar"
        >
          {#if chatUsers.length === 0}
            <div class="p-4 text-gray-400 font-bold">No conversations yet</div>
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
                <CardContent
                  class="flex items-center justify-between p-3 w-full"
                >
                  <div class="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={userItem.avatar} alt={userItem.name} />
                      <AvatarFallback class="bg-[#0073B1] text-white"
                        >{userItem.name[0]}</AvatarFallback
                      >
                    </Avatar>
                    <span class="font-medium text-gray-800"
                      >{userItem.name}</span
                    >
                  </div>

                  <div class="flex items-center">
                    <span
                      class={`w-3 h-3 rounded-full ${
                        userItem.isOnline ? "bg-green-500" : "bg-gray-400"
                      }`}
                    ></span>
                  </div>
                </CardContent>
              </Card>
            </button>
          {/each}
        </TabsContent>

        <TabsContent value="all-users" class="flex-1 overflow-y-auto px-4 py-2">
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
                <CardContent
                  class="flex items-center justify-between p-3 w-full"
                >
                  <div class="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={userItem.avatar} alt={userItem.name} />
                      <AvatarFallback class="bg-[#0073B1] text-white"
                        >{userItem.name[0]}</AvatarFallback
                      >
                    </Avatar>
                    <span class="font-medium text-gray-800"
                      >{userItem.name}</span
                    >
                  </div>

                  <div class="flex items-center">
                    <span
                      class={`w-3 h-3 rounded-full ${
                        userItem.isOnline ? "bg-green-500" : "bg-gray-400"
                      }`}
                    ></span>
                  </div>
                </CardContent>
              </Card>
            </button>
          {/each}
        </TabsContent>
      </Tabs>
    </div>
  </div>

  <div class="flex-1 flex flex-col h-screen custom-scrollbar">
    <div
      class="h-17 flex items-center px-4 bg-[#E6F2FA] border-b border-gray-300 shadow-sm"
    >
      {#if select}
        <Avatar class="relative">
          <AvatarImage src={select.avatar} alt={select.name} />
          <AvatarFallback class="bg-[#0073B1] text-white"
            >{select.name[0]}</AvatarFallback
          >
        </Avatar>

        <div class="ml-3 flex flex-col">
          <span class="font-semibold text-gray-800">{select.name}</span>
          <span class="text-xs text-gray-500">
            {select.isOnline ? "Online" : "Offline"}
          </span>
        </div>
      {:else}
        <span class="text-gray-400 font-bold"
          >Select a user to start chatting</span
        >
      {/if}
    </div>

    <div
      class="flex-1 overflow-y-auto p-4 bg-white"
      bind:this={messagesContainer}
    >
      {#if !select}
        <div class="text-gray-400 font-bold text-center">No chat selected</div>
      {:else if loadingMessages}
        <div class="text-gray-400 font-bold text-center mt-10">
          Loading messages...
        </div>
      {:else if uniqueMessages.length === 0}
        <div class="text-gray-400 font-bold text-center mt-10">
          No messages yet
        </div>
      {/if}

      {#each uniqueMessages as msg (msg.id)}
        <div
          class="flex mb-3"
          class:justify-end={msg.fromSelf}
          class:justify-start={!msg.fromSelf}
        >
          <div
            class={`p-3 rounded-2xl max-w-md break-words whitespace-normal shadow-md text-sm ${msg.fromSelf ? "bg-[#0073B1] text-white" : "bg-gray-200 text-[#0073B1]"}`}
          >
            {#if msg.message_type === "image"}
              <div class="mb-2">
                <button
                  type="button"
                  class="p-0 border-0 bg-transparent cursor-pointer"
                  onclick={() =>
                    msg.file_path && openImageModal(msg.file_path!)}
                >
                  <img
                    src={msg.file_path ?? ""}
                    alt={msg.content}
                    class="max-w-full h-auto rounded-lg hover:opacity-90 transition"
                  />
                </button>
              </div>
              <div class="text-xs opacity-75">{msg.content}</div>
            {:else}
              {msg.content}
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <div class="p-4 flex gap-2 bg-[#D0E6F8] border-t">
      <input
        type="text"
        placeholder="Type a message..."
        bind:value={input}
        class="flex-1 border rounded-full px-4 py-2 text-[#0073B1] bg-white"
        onkeydown={(e: KeyboardEvent) => e.key === "Enter" && message()}
        disabled={!select}
      />

      <button
        type="button"
        disabled={!select}
        class="rounded-full px-4 py-2 bg-[#0073B1] hover:bg-[#005c91] text-white disabled:opacity-50"
        onclick={() => {
          const fileInput = document.getElementById(
            "image-upload",
          ) as HTMLInputElement;
          if (fileInput) fileInput.click();
        }}
      >
        📷
      </button>
      <input
        id="image-upload"
        type="file"
        accept="image/*"
        class="hidden"
        onchange={handleFileSelect}
      />

      {#if selectedFile}
        <div class="flex items-center gap-2">
          <span class="text-sm text-[#0073B1] truncate max-w-32"
            >{selectedFile.name}</span
          >
          <Button
            onclick={uploadImage}
            disabled={!select || isUploading}
            class="rounded-full px-4 bg-[#0073B1] hover:bg-[#005c91] text-white"
          >
            {isUploading ? "⏳" : "📤"}
          </Button>
        </div>
      {/if}

      <Button
        onclick={message}
        disabled={!select}
        class="rounded-full px-6 bg-[#0073B1] hover:bg-[#005c91] text-white"
      >
        Send
      </Button>
    </div>
  </div>
</div>
<style>
  .custom-scrollbar {
    scrollbar-color: grey transparent;
  }
</style>