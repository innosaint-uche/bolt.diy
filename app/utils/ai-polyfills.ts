import type { Message } from '@ai-sdk/ui-utils';

export function convertToCoreMessages(messages: Array<Pick<Message, 'role' | 'content'>>): any[] {
  return messages.map((message) => ({
    role: message.role as any,
    content: message.content,
  }));
}
