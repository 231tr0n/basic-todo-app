import { Pipe, PipeTransform } from '@angular/core';
import type {
	ChatCompletionAssistantMessageParam,
	ChatCompletionMessageParam
} from 'openai/resources/chat/completions';
import { renderMarkdown } from '../library/markdown';

@Pipe({
	name: 'chatCompletionMessageToolCallToMarkdownHtmlPipe'
})
export class ChatCompletionMessageToolCallToMarkdownHtmlPipe implements PipeTransform {
	transform(value: ChatCompletionMessageParam): string {
		const assistantMessage = value as ChatCompletionAssistantMessageParam;
		if (!assistantMessage.tool_calls) return '';

		let content = '';
		for (const toolCall of assistantMessage.tool_calls) {
			if (toolCall.type !== 'function') continue;
			content += `\`\`${toolCall.id} - ${toolCall.function.name}\`\``;
			content += `\n\`\`\`json\n`;
			try {
				content += JSON.stringify(JSON.parse(toolCall.function.arguments), null, 2);
			} catch {
				content += toolCall.function.arguments;
			}
			content += `\n\`\`\`\n`;
		}
		return renderMarkdown(content);
	}
}
