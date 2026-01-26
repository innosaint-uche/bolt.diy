


export type KnowledgeFile = {
    filename: string;
    content: string; // Extracted text
    type: string; // mime type
};

export async function extractTextFromFile(file: File): Promise<string> {
    // Simple text extraction for now
    // Extend this to support PDF/Docx using libraries if environment permits
    if (file.type === 'application/pdf') {
        return `[PDF Content extraction not yet implemented for ${file.name}]`;
    }

    return await file.text();
}

// Helper to filter supported types
export function isSupportedFileType(type: string): boolean {
    return (
        type.startsWith('text/') ||
        type === 'application/json' ||
        type === 'application/javascript' ||
        type === 'application/typescript' ||
        type.includes('markdown') ||
        type.includes('xml')
    );
}
