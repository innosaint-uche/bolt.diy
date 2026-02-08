import { formatDataStreamPart } from '@ai-sdk/ui-utils';
import type { StreamTextResult, ToolSet, TextStreamPart } from 'ai';

export type DataStreamWriter = {
  write(chunk: string): void;
  writeData(data: unknown): void;
  writeMessageAnnotation(annotation: unknown): void;
};

type CreateDataStreamOptions = {
  execute: (writer: DataStreamWriter) => Promise<void> | void;
  onError?: (error: unknown) => string;
};

const stringifyError = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);

export function createDataStream({ execute, onError }: CreateDataStreamOptions) {
  return new ReadableStream<string>({
    start(controller) {
      const writer: DataStreamWriter = {
        write: (chunk) => controller.enqueue(chunk),
        writeData: (data) => controller.enqueue(formatDataStreamPart('data', [data as any])),
        writeMessageAnnotation: (annotation) =>
          controller.enqueue(formatDataStreamPart('message_annotations', [annotation as any])),
      };

      Promise.resolve()
        .then(() => execute(writer))
        .then(() => controller.close())
        .catch((error) => {
          const message = onError ? onError(error) : stringifyError(error);
          controller.enqueue(formatDataStreamPart('error', message));
          controller.close();
        });
    },
  });
}

type MergeStreamOptions<TOOLS extends ToolSet> = {
  onPart?: (part: TextStreamPart<TOOLS>) => void;
};

export async function mergeStreamIntoDataStream<TOOLS extends ToolSet>(
  result: StreamTextResult<TOOLS, any>,
  writer: DataStreamWriter,
  options?: MergeStreamOptions<TOOLS>,
) {
  for await (const part of result.fullStream) {
    options?.onPart?.(part);

    switch (part.type) {
      case 'text-delta':
        writer.write(formatDataStreamPart('text', part.text));
        break;
      case 'reasoning-delta':
        writer.write(formatDataStreamPart('reasoning', part.text));
        break;
      case 'tool-call': {
        const toolCall = {
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          args: part.input,
        };
        writer.write(formatDataStreamPart('tool_call', toolCall as any));
        break;
      }
      case 'tool-result': {
        const toolResult = {
          toolCallId: part.toolCallId,
          result: (part as TextStreamPart<TOOLS> & { output?: unknown }).output,
        };
        writer.write(formatDataStreamPart('tool_result', toolResult as any));
        break;
      }
      case 'error':
        writer.write(formatDataStreamPart('error', stringifyError(part.error)));
        break;
      default:
        break;
    }
  }
}
