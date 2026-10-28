import { Pipe, PipeTransform } from '@angular/core';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { renderMarkdown } from '../library/markdown';

@Pipe({
	name: 'chatCompletionMessageParamMarkdownToHtml'
})
export class ChatCompletionMessageParamMarkdownToHtmlPipe implements PipeTransform {
	transform(value: ChatCompletionMessageParam): string {
		if (typeof value.content !== 'string') return '';
		return renderMarkdown(value.content);
	}
}
