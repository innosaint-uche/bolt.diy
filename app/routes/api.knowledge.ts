
import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { extractTextFromFile, isSupportedFileType } from '~/lib/.server/knowledge';

export async function action({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
        return json({ error: 'No file provided' }, { status: 400 });
    }

    if (!isSupportedFileType(file.type)) {
        // Allow passing anyway? No, validation is good.
        // But lets be lenient with text/*
        if (!file.type.startsWith('text/')) {
            return json({ error: 'Unsupported file type' }, { status: 400 });
        }
    }

    try {
        const text = await extractTextFromFile(file);
        return json({ text, filename: file.name });
    } catch (error) {
        return json({ error: 'Failed to parse file' }, { status: 500 });
    }
}
