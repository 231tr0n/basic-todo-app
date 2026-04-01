import { Pipe, PipeTransform } from '@angular/core';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';

@Pipe({
	name: 'markdownToHtml'
})
export class MarkdownToHtmlPipe implements PipeTransform {
	marked = new Marked(
		markedHighlight({
			emptyLangClass: 'hljs',
			langPrefix: 'hljs language-',
			highlight(code, lang) {
				const language = hljs.getLanguage(lang) ? lang : 'plaintext';
				return hljs.highlight(code, { language }).value;
			}
		})
	);

	transform(value: string): string {
		return DOMPurify.sanitize(this.marked.parse(value) as string);
	}
}
