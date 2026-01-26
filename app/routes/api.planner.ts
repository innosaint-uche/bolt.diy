
import { type ActionFunctionArgs } from '@remix-run/cloudflare';

import { streamText } from '~/lib/.server/llm/stream-text';
import { stripIndents } from '~/utils/stripIndent';
import { PLANNER_PROMPT } from '~/lib/common/prompts/prompts';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';

export async function action(args: ActionFunctionArgs) {
    return plannerAction(args);
}

async function plannerAction({ context, request }: ActionFunctionArgs) {
    const { messages, model, provider } = await request.json<{
        messages: any[];
        model: string;
        provider: any;
    }>();

    const cookieHeader = request.headers.get('Cookie');
    const apiKeys = getApiKeysFromCookie(cookieHeader);
    const providerSettings = getProviderSettingsFromCookie(cookieHeader);

    const result = await streamText({
        messages: [
            {
                role: 'system',
                content: PLANNER_PROMPT,
            },
            ...messages,
        ],
        env: context.cloudflare?.env,
        options: {
        },
        apiKeys,
        files: {},
        providerSettings,
        chatMode: 'discuss',
    });

    return result.toTextStreamResponse({
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
        },
    });
}
