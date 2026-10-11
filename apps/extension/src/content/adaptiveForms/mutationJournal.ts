/**
 * Mutation Journal for Adaptive Forms.
 * Tracks and cleanly reverses all extension-applied presentation modifications.
 * Guarantees zero loss of user-entered data, listeners, or DOM order.
 */

export interface TrackedNode {
  node: Node;
  parent: Node;
  nextSibling: Node | null;
}

export class MutationJournal {
  private addedNodes: TrackedNode[] = [];
  private addedClasses: Map<Element, Set<string>> = new Map();
  private originalStyles: Map<HTMLElement, string | null> = new Map();

  recordAddedNode(node: Node, parent: Node, nextSibling: Node | null = null): void {
    this.addedNodes.push({ node, parent, nextSibling });
  }

  recordAddedClass(el: Element, className: string): void {
    if (!this.addedClasses.has(el)) {
      this.addedClasses.set(el, new Set());
    }
    this.addedClasses.get(el)!.add(className);
    el.classList.add(className);
  }

  recordStyle(el: HTMLElement): void {
    if (!this.originalStyles.has(el)) {
      this.originalStyles.set(el, el.getAttribute('style'));
    }
  }

  restore(): void {
    // 1. Remove added DOM nodes (in reverse insertion order)
    for (let i = this.addedNodes.length - 1; i >= 0; i--) {
      const { node, parent } = this.addedNodes[i];
      if (node.parentNode === parent) {
        parent.removeChild(node);
      } else if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
    this.addedNodes = [];

    // 2. Remove added CSS classes
    for (const [el, classes] of this.addedClasses.entries()) {
      for (const cls of classes) {
        el.classList.remove(cls);
      }
    }
    this.addedClasses.clear();

    // 3. Restore original inline styles
    for (const [el, originalStyle] of this.originalStyles.entries()) {
      if (originalStyle === null) {
        el.removeAttribute('style');
      } else {
        el.setAttribute('style', originalStyle);
      }
    }
    this.originalStyles.clear();
  }

  get isModified(): boolean {
    return this.addedNodes.length > 0 || this.addedClasses.size > 0 || this.originalStyles.size > 0;
  }
}
