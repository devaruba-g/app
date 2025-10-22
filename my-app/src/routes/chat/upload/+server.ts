import type { RequestHandler } from '@sveltejs/kit';
import { publish } from '$lib/realtime';
import { insertImageMessage, getMessageById } from '$lib/db/queries';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const receiver_id = formData.get('receiver_id') as string;
    const sender_id = locals.user.id;

    if (!file || !receiver_id) {
      return new Response(JSON.stringify({ error: 'Missing file or receiver_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

// Validate file type and size (e.g., max 5MB, only images)
    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'File must be an image' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

 
    if (file.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File size must be less than 5MB' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

   
    const arrayBuffer = await file.arrayBuffer();
    const base64String = Buffer.from(arrayBuffer).toString('base64');
    const base64DataUrl = `data:${file.type};base64,${base64String}`;

  
    const insertedId = await insertImageMessage(sender_id, receiver_id, file.name, base64DataUrl);

    const message = await getMessageById(insertedId);

    
    publish({
      type: 'message',
      data: {
        id: insertedId,
        sender_id,
        receiver_id,
        content: file.name,
        message_type: 'image',
        file_path: base64DataUrl,
        created_at: message.created_at
      },
      excludeUserId: sender_id 
    });

    return new Response(JSON.stringify({
      success: true,
      id: insertedId,
      file_path: base64DataUrl,
      created_at: message.created_at
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    return new Response(JSON.stringify({ error: 'Upload failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
