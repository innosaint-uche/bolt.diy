import {
  //   experimental_createMCPClient,
  type ToolSet,
  // type Message,
  // type DataStreamWriter,
} from 'ai';
import { formatDataStreamPart, type Message } from '@ai-sdk/ui-utils';
import { convertToCoreMessages } from '~/utils/ai-polyfills';

// Stub for missing type
type DataStreamWriter = any;

// ... imports ...

  private async _createStreamableHTTPClient(
  serverName: string,
  config: StreamableHTTPServerConfig,
): Promise < MCPClient > {
  logger.debug(`Creating Streamable-HTTP client for ${serverName} with URL: ${config.url}`);

  throw new Error("MCP Experimental Client not supported in this build.");
  /*
  const client = await experimental_createMCPClient({
    transport: new StreamableHTTPClientTransport(new URL(config.url), {
      requestInit: {
        headers: config.headers,
      },
    }),
  });

  return Object.assign(client, { serverName });
  */
}

  private async _createSSEClient(serverName: string, config: SSEServerConfig): Promise < MCPClient > {
  logger.debug(`Creating SSE client for ${serverName} with URL: ${config.url}`);

  throw new Error("MCP Experimental Client not supported in this build.");
  /*
  const client = await experimental_createMCPClient({
    transport: config,
  });

  return Object.assign(client, { serverName });
  */
}

  private async _createStdioClient(serverName: string, config: STDIOServerConfig): Promise < MCPClient > {
  logger.debug(
    `Creating STDIO client for '${serverName}' with command: '${config.command}' ${config.args?.join(' ') || ''}`,
  );

  throw new Error("MCP Experimental Client not supported in this build.");
  /*
  const client = await experimental_createMCPClient({ transport: new Experimental_StdioMCPTransport(config) });

  return Object.assign(client, { serverName });
  */
}

  private _registerTools(serverName: string, tools: ToolSet) {
  for (const [toolName, tool] of Object.entries(tools)) {
    if (this._tools[toolName]) {
      const existingServerName = this._toolNamesToServerNames.get(toolName);

      if (existingServerName && existingServerName !== serverName) {
        logger.warn(`Tool conflict: "${toolName}" from "${serverName}" overrides tool from "${existingServerName}"`);
      }
    }

    this._tools[toolName] = tool;
    this._toolsWithoutExecute[toolName] = { ...tool, execute: undefined };
    this._toolNamesToServerNames.set(toolName, serverName);
  }
}

  private async _createMCPClient(serverName: string, serverConfig: MCPServerConfig): Promise < MCPClient > {
  const validatedConfig = this._validateServerConfig(serverName, serverConfig);

  if(validatedConfig.type === 'stdio') {
  return await this._createStdioClient(serverName, serverConfig as STDIOServerConfig);
} else if (validatedConfig.type === 'sse') {
  return await this._createSSEClient(serverName, serverConfig as SSEServerConfig);
} else {
  return await this._createStreamableHTTPClient(serverName, serverConfig as StreamableHTTPServerConfig);
}
  }

  private async _createClients() {
  await this._closeClients();

  const createClientPromises = Object.entries(this._config?.mcpServers || []).map(async ([serverName, config]) => {
    let client: MCPClient | null = null;

    try {
      client = await this._createMCPClient(serverName, config);

      try {
        const tools = await client.tools();

        this._registerTools(serverName, tools);

        this._mcpToolsPerServer[serverName] = {
          status: 'available',
          client,
          tools,
          config,
        };
      } catch (error) {
        logger.error(`Failed to get tools from server ${serverName}:`, error);
        this._mcpToolsPerServer[serverName] = {
          status: 'unavailable',
          error: 'could not retrieve tools from server',
          client,
          config,
        };
      }
    } catch (error) {
      logger.error(`Failed to initialize MCP client for server: ${serverName}`, error);
      this._mcpToolsPerServer[serverName] = {
        status: 'unavailable',
        error: (error as Error).message,
        client,
        config,
      };
    }
  });

  await Promise.allSettled(createClientPromises);
}

  async checkServersAvailabilities() {
  this._tools = {};
  this._toolsWithoutExecute = {};
  this._toolNamesToServerNames.clear();

  const checkPromises = Object.entries(this._mcpToolsPerServer).map(async ([serverName, server]) => {
    let client = server.client;

    try {
      logger.debug(`Checking MCP server "${serverName}" availability: start`);

      if (!client) {
        client = await this._createMCPClient(serverName, this._config?.mcpServers[serverName]);
      }

      try {
        const tools = await client.tools();

        this._registerTools(serverName, tools);

        this._mcpToolsPerServer[serverName] = {
          status: 'available',
          client,
          tools,
          config: server.config,
        };
      } catch (error) {
        logger.error(`Failed to get tools from server ${serverName}:`, error);
        this._mcpToolsPerServer[serverName] = {
          status: 'unavailable',
          error: 'could not retrieve tools from server',
          client,
          config: server.config,
        };
      }

      logger.debug(`Checking MCP server "${serverName}" availability: end`);
    } catch (error) {
      logger.error(`Failed to connect to server ${serverName}:`, error);
      this._mcpToolsPerServer[serverName] = {
        status: 'unavailable',
        error: 'could not connect to server',
        client,
        config: server.config,
      };
    }
  });

  await Promise.allSettled(checkPromises);

  return this._mcpToolsPerServer;
}

  private async _closeClients(): Promise < void> {
  const closePromises = Object.entries(this._mcpToolsPerServer).map(async ([serverName, server]) => {
    if (!server.client) {
      return;
    }

    logger.debug(`Closing client for server "${serverName}"`);

    try {
      await server.client.close();
    } catch (error) {
      logger.error(`Error closing client for ${serverName}:`, error);
    }
  });

  await Promise.allSettled(closePromises);
  this._tools = {};
  this._toolsWithoutExecute = {};
  this._mcpToolsPerServer = {};
  this._toolNamesToServerNames.clear();
}

isValidToolName(toolName: string): boolean {
  return toolName in this._tools;
}

processToolCall(toolCall: ToolCall, dataStream: DataStreamWriter): void {
  const { toolCallId, toolName } = toolCall;

  if(this.isValidToolName(toolName)) {
  const { description = 'No description available' } = this.toolsWithoutExecute[toolName];
  const serverName = this._toolNamesToServerNames.get(toolName);

  if (serverName) {
    dataStream.writeMessageAnnotation({
      type: 'toolCall',
      toolCallId,
      serverName,
      toolName,
      toolDescription: description,
    } satisfies ToolCallAnnotation);
  }
}
  }

  async processToolInvocations(messages: Message[], dataStream: DataStreamWriter): Promise < Message[] > {
  const lastMessage = messages[messages.length - 1];
  const parts = lastMessage.parts;

  if(!parts) {
    return messages;
  }

    const processedParts = await Promise.all(
    parts.map(async (part) => {
      // Only process tool invocations parts
      if (part.type !== 'tool-invocation') {
        return part;
      }

      const { toolInvocation } = part;
      const { toolName, toolCallId } = toolInvocation;

      // return part as-is if tool does not exist, or if it's not a tool call result
      if (!this.isValidToolName(toolName) || toolInvocation.state !== 'result') {
        return part;
      }

      let result;

      if (toolInvocation.result === TOOL_EXECUTION_APPROVAL.APPROVE) {
        const toolInstance = this._tools[toolName];

        if (toolInstance && typeof toolInstance.execute === 'function') {
          logger.debug(`calling tool "${toolName}" with args: ${JSON.stringify(toolInvocation.args)}`);

          try {
            result = await toolInstance.execute(toolInvocation.args, {
              messages: convertToCoreMessages(messages),
              toolCallId,
            });
          } catch (error) {
            logger.error(`error while calling tool "${toolName}":`, error);
            result = TOOL_EXECUTION_ERROR;
          }
        } else {
          result = TOOL_NO_EXECUTE_FUNCTION;
        }
      } else if (toolInvocation.result === TOOL_EXECUTION_APPROVAL.REJECT) {
        result = TOOL_EXECUTION_DENIED;
      } else {
        // For any unhandled responses, return the original part.
        return part;
      }

      // Forward updated tool result to the client.
      dataStream.write(
        formatDataStreamPart('tool_result', {
          toolCallId,
          result,
        }),
      );

      // Return updated toolInvocation with the actual result.
      return {
        ...part,
        toolInvocation: {
          ...toolInvocation,
          result,
        },
      };
    }),
  );

  // Finally return the processed messages
  return [...messages.slice(0, -1), { ...lastMessage, parts: processedParts }];
}

  get tools() {
  return this._tools;
}

  get toolsWithoutExecute() {
  return this._toolsWithoutExecute;
}
}
