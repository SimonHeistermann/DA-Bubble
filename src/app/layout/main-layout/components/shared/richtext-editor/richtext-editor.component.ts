  import {Component, ElementRef, ViewChild, Input, AfterViewInit, ChangeDetectionStrategy, Output, EventEmitter, ViewEncapsulation} from '@angular/core';
import { User } from '../../../../../core/models/user.interface';


  @Component({
    selector: 'app-richtext-editor',
    standalone: true,
    imports: [],
    templateUrl: './richtext-editor.component.html',
    styleUrl: './richtext-editor.component.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
  })
  export class RichtextEditorComponent {
    @ViewChild('editor') editorRef!: ElementRef<HTMLDivElement>;

    @Output() editorReady = new EventEmitter<HTMLDivElement>();
    @Output() editorValueChanged = new EventEmitter<string>();
    @Output() hasTag = new EventEmitter<boolean>();
    @Output() tagIDsChanges = new EventEmitter<Array<string>>();

    ngAfterViewInit() {
      const el = this.editorRef.nativeElement;
      this.focusEditorAndMoveCaretToEnd();
      this.editorReady.emit(el);

    }

    checkIfHasTag() {
      const editor = this.editorRef.nativeElement;
      this.hasTag.emit(editor.querySelectorAll('.tag').length > 0);

      const tagIDArr: string[] = [];
      editor.querySelectorAll('.tag').forEach(tag => {
        const id = tag.getAttribute('id') || '';
        tagIDArr.push(id);
      })
      this.tagIDsChanges.emit(tagIDArr);
    }

    editorValueChange() {
      this.checkIfHasTag();

      const editor = this.editorRef.nativeElement;
      const clone = editor.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('div').forEach(div => div.remove());
      const plainText = clone.textContent?.trim() ?? '';

      this.editorValueChanged.emit(plainText);
    }

   
    handleKeyup(event: KeyboardEvent) {
      
      const isBackspace = event.key === 'Backspace';
      if (!isBackspace) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        this.createSpace();
        return ;
      };

      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      const offset = range.startOffset;

      let previousNode: Node | null = null;

      if (node.nodeType === Node.TEXT_NODE && offset === 0) {
        previousNode = node.previousSibling;
      } else if (node.nodeType === Node.ELEMENT_NODE && offset > 0) {
        previousNode = node.childNodes[offset - 1] ?? null;
      }

      if (previousNode instanceof HTMLElement && previousNode.classList.contains('tag')) {
        event.preventDefault();
        previousNode.remove();
      }
      
      this.focusEditorAndMoveCaretToEnd();
      this.editorValueChange();
    }

  

    createSpace () {
      const editor = this.editorRef.nativeElement;
      const space = document.createTextNode('\u00A0\u00A0'); 
      editor.appendChild(space);
      
      const range = document.createRange();
      range.setStartAfter(space);
      range.collapse(false);
      this.setNewRange(range);

      editor.focus();
      this.editorValueChange();
    }


    public insertTag(u: User) {
      const tagEl = this.createNewTag(u);
      const editor = this.editorRef.nativeElement;
      this.clearUserText();
      editor.appendChild(tagEl);
      this.createSpace();
    }

    createNewTag(u: User) {
      const tagEl = document.createElement('div');
      tagEl.className = 'tag';
      tagEl.setAttribute('id', u.uid);
      tagEl.contentEditable = 'false';
      tagEl.innerHTML = this.getTagTemplate(u);

      tagEl.querySelector('.tag-close')?.addEventListener('click', e => {
        e.stopPropagation();
        tagEl.remove();
      });

      return tagEl;
    }

    clearUserText() {
      const editor = this.editorRef.nativeElement;
      const nodes = Array.from(editor.childNodes);
      for(const node of nodes) {
        if (node.nodeType === Node.TEXT_NODE ) {
          if (editor.querySelector('.tag') === null) {
            editor.removeChild(node);
          } else {
            node.textContent = '\u00A0';
          }
        }
        if (node.nodeType === Node.ELEMENT_NODE && !(node as HTMLElement).classList.contains('tag')) {
          editor.removeChild(node);
        }
      }
    }
    
    public getEditorElement(): HTMLDivElement {
      return this.editorRef.nativeElement;
    }

    getTagTemplate(u: User) {
      return `
      <img src="${u.photoURL}" />
      <span class="tag-name">${u.displayName}</span>
      <div class="tag-close"></div>
      `;
    }

    focusEditorAndMoveCaretToEnd() {
      const editor = this.editorRef.nativeElement;
      editor.focus();

      const range = document.createRange();
      let lastChild = editor.lastChild;
      if (lastChild && lastChild.nodeName === 'BR' && editor.querySelector('.tag') === null) editor.innerHTML = '';
      
      if (lastChild && editor.contains(lastChild)) {
        if (lastChild.nodeType === Node.TEXT_NODE) {
          range.setStart(lastChild, lastChild.textContent?.length ?? 0);
        } else {
          range.setStartAfter(lastChild);
        }
      } else {
        range.selectNodeContents(editor);
        range.collapse(false);
      }
    
      range.collapse(true);
      this.setNewRange(range);
    }

    setNewRange(range: Range) {
      const selection = window.getSelection();
      if (!selection) return;
      selection.removeAllRanges();
      selection.addRange(range);
    }

  }
