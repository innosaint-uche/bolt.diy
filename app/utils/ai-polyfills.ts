import type { Message } from '@ai-sdk/ui-utils';

export function convertToCoreMessages(
  messages: Array<Pick<Message, 'role' | 'content'>>,
): Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string }> {
  return messages.map((message) => ({
    role: message.role as any,
    content: message.content,
  }));
}
