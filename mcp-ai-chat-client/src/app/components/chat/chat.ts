import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	inject,
	input,
	OnInit,
	output,
	viewChild
} from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/select';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
	selector: 'app-home',
	imports: [
		MatCard,
		MatCardHeader,
		MatLabel,
		MatIconButton,
		MatSuffix,
		MatIcon,
		MatCardContent,
		MatCardTitle,
		MatFormField,
		MatInput,
		FormsModule
	],
	templateUrl: './chat.html',
	styleUrl: './chat.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class Chat implements OnInit {
	readonly session = input<{ content: string; author: 'User' | 'Bot' | 'Tool' }[]>();
	readonly chatMessageEvent = output<string>();

	private readonly changeDetector = inject(ChangeDetectorRef);

	protected readonly scrollableElement = viewChild<ElementRef<HTMLDivElement>>('scrollable');
	protected readonly message: string = '';
	protected readonly title = 'session 1';
	protected readonly sessionData: { content: string; author: 'User' | 'Bot' | 'Tool' }[] = [];

	protected darkMode = false;

	ngOnInit() {
		if (document.body.classList.contains('dark')) {
			this.darkMode = true;
		}
		this.session()?.forEach((message) => {
			this.sessionData.push(message);
		});
		this.sessionData.push(
			{
				content:
					"Long, complex sentences are constructed by linking multiple ideas, facts, and reasons together, often utilizing conjunctions (and, but, because) and clauses to improve flow, rhythm, and detail. Effective long sentences avoid choppiness by keeping related subjects, verbs, and modifiers close together while combining the five W's (who, what, when, where, why).",
				author: 'Bot'
			},
			{
				content:
					"Long, complex sentences are constructed by linking multiple ideas, facts, and reasons together, often utilizing conjunctions (and, but, because) and clauses to improve flow, rhythm, and detail. Effective long sentences avoid choppiness by keeping related subjects, verbs, and modifiers close together while combining the five W's (who, what, when, where, why).",
				author: 'Bot'
			},
			{
				content:
					"Long, complex sentences are constructed by linking multiple ideas, facts, and reasons together, often utilizing conjunctions (and, but, because) and clauses to improve flow, rhythm, and detail. Effective long sentences avoid choppiness by keeping related subjects, verbs, and modifiers close together while combining the five W's (who, what, when, where, why).",
				author: 'Bot'
			},
			{
				content:
					"Long, complex sentences are constructed by linking multiple ideas, facts, and reasons together, often utilizing conjunctions (and, but, because) and clauses to improve flow, rhythm, and detail. Effective long sentences avoid choppiness by keeping related subjects, verbs, and modifiers close together while combining the five W's (who, what, when, where, why).",
				author: 'Bot'
			},
			{
				content:
					"Long, complex sentences are constructed by linking multiple ideas, facts, and reasons together, often utilizing conjunctions (and, but, because) and clauses to improve flow, rhythm, and detail. Effective long sentences avoid choppiness by keeping related subjects, verbs, and modifiers close together while combining the five W's (who, what, when, where, why).",
				author: 'Bot'
			},
			{
				content:
					"Long, complex sentences are constructed by linking multiple ideas, facts, and reasons together, often utilizing conjunctions (and, but, because) and clauses to improve flow, rhythm, and detail. Effective long sentences avoid choppiness by keeping related subjects, verbs, and modifiers close together while combining the five W's (who, what, when, where, why).",
				author: 'Bot'
			},
			{
				content:
					"Long, complex sentences are constructed by linking multiple ideas, facts, and reasons together, often utilizing conjunctions (and, but, because) and clauses to improve flow, rhythm, and detail. Effective long sentences avoid choppiness by keeping related subjects, verbs, and modifiers close together while combining the five W's (who, what, when, where, why).",
				author: 'Tool'
			},
			{
				content:
					"Long, complex sentences are constructed by linking multiple ideas, facts, and reasons together, often utilizing conjunctions (and, but, because) and clauses to improve flow, rhythm, and detail. Effective long sentences avoid choppiness by keeping related subjects, verbs, and modifiers close together while combining the five W's (who, what, when, where, why).",
				author: 'User'
			}
		);
	}

	toggleMode() {
		if (document.body.classList.contains('dark')) {
			document.body.classList.remove('dark');
			this.darkMode = false;
		} else {
			document.body.classList.add('dark');
			this.darkMode = true;
		}
	}

	onScroll() {
		const element = this.scrollableElement()?.nativeElement;
		if (element) {
			element.scrollTo({
				top: element.scrollHeight,
				behavior: 'smooth'
			});
		}
	}

	onSend() {
		if (this.message && this.message.length > 0) {
			this.sessionData.push({
				content: this.message,
				author: 'User'
			});
			this.changeDetector.detectChanges();
			this.onScroll();
			this.chatMessageEvent.emit(this.message);
		}
	}
}
