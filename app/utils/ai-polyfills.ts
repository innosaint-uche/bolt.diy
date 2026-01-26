import type { Message } from '@ai-sdk/ui-utils';
import type { CoreMessage } from 'ai';

export function convertToCoreMessages(messages: Message[]): CoreMessage[] {
    return messages.map((m) => {
        return {
            role: m.role as any, // Simple cast, valid values are 'user' | 'assistant' | 'system'
            content: m.content,
        };
    });
}
